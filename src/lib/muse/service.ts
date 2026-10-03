import { AchievementService } from '../achievements';
import {
  ensureHistoricalAchievements,
  getStoredAchievements,
  persistAchievements,
  replacePlayerAchievements,
} from '../achievementRepository';
import { dataService } from '../dataService';
import { CURRENT_SEASON, LADDER_CONFIG } from '../config';
import { supabaseAdmin } from '../supabaseClient';
import type { Achievement, GameData, PlayerData } from '../types';
import type {
  MuseAmbiguousPlayer,
  MuseApplyResult,
  MuseIntent,
  MusePlayerMatch,
  MusePreview,
} from './types';

type StudentRow = {
  id: string;
  name: string;
  grade?: string | null;
};

function getClient() {
  if (!supabaseAdmin) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for Muse');
  }
  return supabaseAdmin;
}

function normalizeName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshtein(a: string, b: string) {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix = Array.from({ length: rows }, () => Array<number>(cols).fill(0));

  for (let i = 0; i < rows; i += 1) matrix[i][0] = i;
  for (let j = 0; j < cols; j += 1) matrix[0][j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[a.length][b.length];
}

function dateInNewfoundland() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/St_Johns',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function playerQueriesForIntent(intent: MuseIntent): string[] {
  if (intent.type === 'game_result') return [intent.player1, intent.player2];
  if (intent.type === 'attendance') return intent.players;
  return [intent.player];
}

function uniqueById(players: MusePlayerMatch[]) {
  return players.filter(
    (player, index, all) => all.findIndex((candidate) => candidate.id === player.id) === index
  );
}

function summarizeGames(games: GameData[], playerId: string) {
  let wins = 0;
  let draws = 0;
  let losses = 0;

  for (const game of games) {
    if (game.result === 'draw') {
      draws += 1;
    } else if (
      (game.player1Id === playerId && game.result === 'player1') ||
      (game.player2Id === playerId && game.result === 'player2')
    ) {
      wins += 1;
    } else {
      losses += 1;
    }
  }

  return {
    gamesPlayed: games.length,
    wins,
    draws,
    losses,
    winRate: games.length > 0 ? wins / games.length : 0,
  };
}

function currentSeasonStatus() {
  return dateInNewfoundland() < CURRENT_SEASON.START_DATE ? 'preseason' : 'active';
}

export class MuseService {
  private static async getStudents(): Promise<StudentRow[]> {
    const client = getClient();
    const { data, error } = await client
      .from('students')
      .select('id, name, grade')
      .order('name');

    if (error) throw new Error(`Failed to load players: ${error.message}`);
    return (data || []) as StudentRow[];
  }

  private static resolvePlayer(
    query: string,
    students: StudentRow[]
  ): { match?: MusePlayerMatch; ambiguous?: MuseAmbiguousPlayer; missing?: string } {
    const normalizedQuery = normalizeName(query);
    if (!normalizedQuery) return { missing: query };

    const exact = students.filter((student) => normalizeName(student.name) === normalizedQuery);
    if (exact.length === 1) {
      return {
        match: {
          query,
          id: exact[0].id,
          name: exact[0].name,
          grade: exact[0].grade || undefined,
          confidence: 'exact',
        },
      };
    }
    if (exact.length > 1) {
      return {
        ambiguous: {
          query,
          candidates: exact.map((student) => ({
            id: student.id,
            name: student.name,
            grade: student.grade || undefined,
          })),
        },
      };
    }

    const tokenMatches = students.filter((student) => {
      const normalizedName = normalizeName(student.name);
      const tokens = normalizedName.split(' ');
      return tokens.includes(normalizedQuery) || normalizedName.startsWith(`${normalizedQuery} `);
    });

    if (tokenMatches.length === 1) {
      const student = tokenMatches[0];
      return {
        match: {
          query,
          id: student.id,
          name: student.name,
          grade: student.grade || undefined,
          confidence: 'strong',
        },
      };
    }
    if (tokenMatches.length > 1) {
      return {
        ambiguous: {
          query,
          candidates: tokenMatches.map((student) => ({
            id: student.id,
            name: student.name,
            grade: student.grade || undefined,
          })),
        },
      };
    }

    const fuzzy = students
      .map((student) => ({
        student,
        distance: levenshtein(normalizedQuery, normalizeName(student.name)),
      }))
      .filter(({ distance }) => distance <= Math.max(1, Math.floor(normalizedQuery.length / 5)))
      .sort((a, b) => a.distance - b.distance);

    if (fuzzy.length === 1 || (fuzzy.length > 1 && fuzzy[0].distance < fuzzy[1].distance)) {
      const student = fuzzy[0].student;
      return {
        match: {
          query,
          id: student.id,
          name: student.name,
          grade: student.grade || undefined,
          confidence: 'strong',
        },
      };
    }

    if (fuzzy.length > 1) {
      return {
        ambiguous: {
          query,
          candidates: fuzzy.slice(0, 5).map(({ student }) => ({
            id: student.id,
            name: student.name,
            grade: student.grade || undefined,
          })),
        },
      };
    }

    return { missing: query };
  }

  static async searchPlayers(query: string): Promise<Array<{ id: string; name: string; grade?: string }>> {
    const students = await this.getStudents();
    const normalizedQuery = normalizeName(query);
    if (!normalizedQuery) return [];

    return students
      .map((student) => {
        const normalizedName = normalizeName(student.name);
        let score = 100;

        if (normalizedName === normalizedQuery) score = 0;
        else if (normalizedName.startsWith(`${normalizedQuery} `)) score = 1;
        else if (normalizedName.split(' ').includes(normalizedQuery)) score = 2;
        else if (normalizedName.includes(normalizedQuery)) score = 3;
        else score = 10 + levenshtein(normalizedQuery, normalizedName);

        return { student, score };
      })
      .filter(({ score }) => score <= 10 + Math.max(2, Math.floor(normalizedQuery.length / 4)))
      .sort((a, b) => a.score - b.score || a.student.name.localeCompare(b.student.name))
      .slice(0, 10)
      .map(({ student }) => ({
        id: student.id,
        name: student.name,
        grade: student.grade || undefined,
      }));
  }

  static async getLadderStandings(limit = 10) {
    const safeLimit = Math.min(Math.max(Math.trunc(limit) || 10, 1), 100);
    const rankings = await dataService.calculateRankingsFromGames();
    const rankedPlayers = rankings
      .filter(
        (player) =>
          !player.isSystemPlayer &&
          player.gamesPlayed > 0 &&
          player.rank !== undefined &&
          player.rank > 0
      )
      .sort((a, b) => (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER));

    const status = currentSeasonStatus();

    return {
      season: {
        key: CURRENT_SEASON.KEY,
        label: CURRENT_SEASON.LABEL,
        startDate: CURRENT_SEASON.START_DATE,
        status,
      },
      totalRankedPlayers: rankedPlayers.length,
      standings: rankedPlayers.slice(0, safeLimit).map((player) => ({
        rank: player.rank,
        playerId: player.id,
        name: player.name,
        grade: player.grade,
        gamesPlayed: player.gamesPlayed,
        wins: player.wins,
        draws: player.draws,
        losses: player.losses,
        points: player.points,
        eloRating: player.eloRating ?? 1000,
      })),
      message:
        rankedPlayers.length === 0
          ? status === 'preseason'
            ? `The ${CURRENT_SEASON.LABEL} ladder has not started yet. Players are unranked until the first ladder games are recorded on or after ${CURRENT_SEASON.START_DATE}.`
            : `No ladder games have been recorded yet for the ${CURRENT_SEASON.LABEL} season.`
          : undefined,
    };
  }

  static async getPlayerSummary(playerId: string) {
    const client = getClient();
    const { data: student, error: studentError } = await client
      .from('students')
      .select('id, name, grade, elo_rating')
      .eq('id', playerId)
      .single();

    if (studentError || !student) {
      throw new Error('Player not found.');
    }

    const [
      careerGames,
      seasonLadderGames,
      allRankings,
      achievements,
      developmentResult,
      attendanceResult,
    ] = await Promise.all([
      dataService.getGames({ playerId, isVerified: true }),
      dataService.getGames({
        playerId,
        gameType: 'ladder',
        dateFrom: LADDER_CONFIG.CURRENT_SEASON_START_DATE,
        isVerified: true,
      }),
      dataService.calculateRankingsFromGames(),
      getStoredAchievements(playerId),
      client
        .from('player_events')
        .select('id, event_type, activity, skill_key, value_numeric, value_text, notes, metadata, recorded_at')
        .eq('player_id', playerId)
        .is('reversed_at', null)
        .order('recorded_at', { ascending: false })
        .limit(20),
      client
        .from('attendance')
        .select('id', { count: 'exact', head: true })
        .eq('player_id', playerId),
    ]);

    if (developmentResult.error) {
      throw new Error(`Failed to load player development: ${developmentResult.error.message}`);
    }
    if (attendanceResult.error) {
      throw new Error(`Failed to load attendance: ${attendanceResult.error.message}`);
    }

    const seasonStats = summarizeGames(seasonLadderGames, playerId);
    const careerStats = summarizeGames(careerGames, playerId);
    const ranking = allRankings.find((player) => player.id === playerId);
    const status = currentSeasonStatus();
    const hasSeasonLadderGames = seasonStats.gamesPlayed > 0;

    return {
      player: {
        id: student.id,
        name: student.name,
        grade: student.grade || undefined,
      },
      season: {
        key: CURRENT_SEASON.KEY,
        label: CURRENT_SEASON.LABEL,
        startDate: CURRENT_SEASON.START_DATE,
        status,
      },
      // Backward-compatible "stats" now has one clear meaning:
      // current-season ladder performance only.
      stats: {
        scope: 'current-season-ladder',
        ...seasonStats,
        ladderRank: hasSeasonLadderGames ? ranking?.rank ?? null : null,
        ladderPoints: hasSeasonLadderGames ? ranking?.points ?? 0 : 0,
        eloRating: student.elo_rating ?? ranking?.eloRating ?? 1000,
        attendanceCount: attendanceResult.count ?? 0,
      },
      careerStats: {
        scope: 'all-verified-games',
        ...careerStats,
        eloRating: student.elo_rating ?? ranking?.eloRating ?? 1000,
      },
      achievements: achievements.map((achievement) => ({
        type: achievement.type,
        title: achievement.title,
        description: achievement.description,
        earnedAt: achievement.earnedAt,
      })),
      recentDevelopment: (developmentResult.data || []).map((event) => ({
        id: event.id,
        eventType: event.event_type,
        activity: event.activity || undefined,
        skillKey: event.skill_key || undefined,
        value: event.value_numeric ?? undefined,
        valueText: event.value_text || undefined,
        notes: event.notes || undefined,
        metadata: event.metadata || {},
        recordedAt: event.recorded_at,
      })),
    };
  }

  static async preview(intent: MuseIntent): Promise<MusePreview> {
    const students = await this.getStudents();
    const resolvedPlayers: MusePlayerMatch[] = [];
    const ambiguousPlayers: MuseAmbiguousPlayer[] = [];
    const missingPlayers: string[] = [];

    for (const query of playerQueriesForIntent(intent)) {
      const resolution = this.resolvePlayer(query, students);
      if (resolution.match) resolvedPlayers.push(resolution.match);
      if (resolution.ambiguous) ambiguousPlayers.push(resolution.ambiguous);
      if (resolution.missing) missingPlayers.push(resolution.missing);
    }

    const uniquePlayers = uniqueById(resolvedPlayers);
    const canApply =
      ambiguousPlayers.length === 0 &&
      missingPlayers.length === 0 &&
      uniquePlayers.length === playerQueriesForIntent(intent).length;

    return {
      intent,
      summary: this.describe(intent, uniquePlayers),
      resolvedPlayers: uniquePlayers,
      ambiguousPlayers,
      missingPlayers,
      canApply,
    };
  }

  private static describe(intent: MuseIntent, players: MusePlayerMatch[]) {
    const nameFor = (query: string) =>
      players.find((player) => player.query === query)?.name || query;

    if (intent.type === 'game_result') {
      const p1 = nameFor(intent.player1);
      const p2 = nameFor(intent.player2);
      if (intent.outcome === 'draw') {
        return `Record a ${intent.gameType} draw between ${p1} and ${p2}.`;
      }
      const winner = intent.outcome === 'player1' ? p1 : p2;
      const loser = intent.outcome === 'player1' ? p2 : p1;
      return `Record ${winner} defeating ${loser} in a ${intent.gameType} game.`;
    }

    if (intent.type === 'attendance') {
      const names = intent.players.map(nameFor);
      return `Mark attendance for ${names.join(', ')}.`;
    }

    const player = nameFor(intent.player);
    if (intent.eventType === 'stockfish_survival') {
      return `Record ${player} surviving Stockfish for ${intent.value ?? '?'} moves as captain.`;
    }

    const skill = intent.skillKey?.replace(/_/g, ' ') || intent.eventType.replace(/_/g, ' ');
    return `Record ${skill} development for ${player}.`;
  }

  private static matchFor(preview: MusePreview, query: string) {
    const match = preview.resolvedPlayers.find((player) => player.query === query);
    if (!match) throw new Error(`Player could not be resolved: ${query}`);
    return match;
  }

  private static async createAction(
    intent: MuseIntent,
    transcript: string | undefined,
    recordedBy: string
  ) {
    const client = getClient();
    const { data, error } = await client
      .from('muse_actions')
      .insert({
        action_type: intent.type,
        transcript: transcript || null,
        status: 'pending',
        payload: intent,
        recorded_by: recordedBy,
      })
      .select('id')
      .single();

    if (error || !data) throw new Error(`Failed to create Muse audit record: ${error?.message}`);
    return data.id as string;
  }

  private static async markActionApplied(
    actionId: string,
    result: Record<string, unknown>
  ) {
    const client = getClient();
    const { error } = await client
      .from('muse_actions')
      .update({
        status: 'applied',
        result,
        applied_at: new Date().toISOString(),
        error_message: null,
      })
      .eq('id', actionId);

    if (error) throw new Error(`Failed to finalize Muse action: ${error.message}`);
  }

  private static async markActionFailed(actionId: string, error: unknown) {
    const client = getClient();
    const message = error instanceof Error ? error.message : String(error);
    await client
      .from('muse_actions')
      .update({ status: 'failed', error_message: message })
      .eq('id', actionId);
  }

  private static async addPlayerEvents(
    rows: Array<Record<string, unknown>>
  ): Promise<string[]> {
    if (rows.length === 0) return [];

    const client = getClient();
    const { data, error } = await client
      .from('player_events')
      .insert(rows)
      .select('id');

    if (error) throw new Error(`Failed to record player development event: ${error.message}`);
    return (data || []).map((row) => row.id as string);
  }

  private static async persistGameAchievements(game: GameData) {
    const allGames = await dataService.getGames();
    const allPlayers = await dataService.calculateRankingsFromGames();
    const existing = await ensureHistoricalAchievements(
      [game.player1Id, game.player2Id],
      allGames,
      allPlayers,
      game.id
    );

    const newAchievements = await AchievementService.checkAchievements(
      game,
      allGames,
      allPlayers,
      existing
    );
    await persistAchievements(newAchievements);
    return newAchievements;
  }

  static async apply(
    intent: MuseIntent,
    recordedBy: string,
    transcript?: string
  ): Promise<MuseApplyResult> {
    const preview = await this.preview(intent);
    if (!preview.canApply) {
      throw new Error('The connector cannot apply this action until every player is unambiguous.');
    }

    const actionId = await this.createAction(intent, transcript, recordedBy);

    try {
      let result: Record<string, unknown>;

      if (intent.type === 'game_result') {
        const player1 = this.matchFor(preview, intent.player1);
        const player2 = this.matchFor(preview, intent.player2);
        const gameDate = intent.gameDate || dateInNewfoundland();
        const now = new Date().toISOString();

        const gameData: GameData = {
          id: '',
          player1Id: player1.id,
          player1Name: player1.name,
          player2Id: player2.id,
          player2Name: player2.name,
          result: intent.outcome,
          gameDate,
          gameTime: 0,
          gameType: intent.gameType,
          notes: intent.notes,
          recordedBy,
          recordedAt: now,
          isVerified: true,
          verifiedBy: recordedBy,
          verifiedAt: now,
        };

        const gameId = await dataService.addGame(gameData);
        const finalGame = { ...gameData, id: gameId };
        const achievements = await this.persistGameAchievements(finalGame);

        const outcomeFor = (playerId: string) => {
          if (intent.outcome === 'draw') return 'draw';
          const winnerId = intent.outcome === 'player1' ? player1.id : player2.id;
          return playerId === winnerId ? 'win' : 'loss';
        };

        const playerEventIds = await this.addPlayerEvents([
          {
            muse_action_id: actionId,
            player_id: player1.id,
            player_name: player1.name,
            event_type: 'game_result',
            game_id: gameId,
            source: 'meta_muse_connector',
            metadata: {
              outcome: outcomeFor(player1.id),
              opponentId: player2.id,
              opponentName: player2.name,
              gameType: intent.gameType,
            },
            recorded_by: recordedBy,
          },
          {
            muse_action_id: actionId,
            player_id: player2.id,
            player_name: player2.name,
            event_type: 'game_result',
            game_id: gameId,
            source: 'meta_muse_connector',
            metadata: {
              outcome: outcomeFor(player2.id),
              opponentId: player1.id,
              opponentName: player1.name,
              gameType: intent.gameType,
            },
            recorded_by: recordedBy,
          },
        ]);

        result = {
          gameId,
          playerIds: [player1.id, player2.id],
          playerEventIds,
          achievements: achievements.map((achievement) => ({
            playerId: achievement.playerId,
            type: achievement.type,
            title: achievement.title,
          })),
        };
      } else if (intent.type === 'attendance') {
        const players = intent.players.map((query) => this.matchFor(preview, query));
        const meetDate = intent.meetDate || dateInNewfoundland();
        let meetId = intent.meetId;

        if (meetId) {
          const meet = await dataService.getClubMeetById(meetId);
          if (!meet) throw new Error('The selected club meet no longer exists.');
        } else {
          const meets = await dataService.getClubMeets();
          const existingMeet = meets.find((meet) => meet.meetDate === meetDate);
          meetId = existingMeet?.id;

          if (!meetId) {
            meetId = await dataService.createClubMeet({
              meetDate,
              meetName: 'Club Night',
              notes: 'Created through Meta Muse connector',
              createdBy: recordedBy,
            });
          }
        }

        await dataService.addAttendance(meetId, players.map((player) => player.id));

        const playerEventIds = await this.addPlayerEvents(
          players.map((player) => ({
            muse_action_id: actionId,
            player_id: player.id,
            player_name: player.name,
            event_type: 'attendance',
            meet_id: meetId,
            source: 'meta_muse_connector',
            metadata: { meetDate },
            notes: intent.notes || null,
            recorded_by: recordedBy,
          }))
        );

        result = {
          meetId,
          meetDate,
          playerIds: players.map((player) => player.id),
          playerEventIds,
        };
      } else {
        const player = this.matchFor(preview, intent.player);
        const playerEventIds = await this.addPlayerEvents([
          {
            muse_action_id: actionId,
            player_id: player.id,
            player_name: player.name,
            event_type: intent.eventType,
            activity: intent.activity || null,
            skill_key: intent.skillKey || null,
            value_numeric: intent.value ?? null,
            value_text: intent.valueText || null,
            notes: intent.notes || null,
            source: 'meta_muse_connector',
            metadata: intent.metadata || {},
            recorded_by: recordedBy,
          },
        ]);

        result = {
          playerIds: [player.id],
          playerEventIds,
          skillKey: intent.skillKey || null,
          value: intent.value ?? null,
        };
      }

      await this.markActionApplied(actionId, result);
      return {
        actionId,
        summary: preview.summary,
        result,
      };
    } catch (error) {
      await this.markActionFailed(actionId, error);
      throw error;
    }
  }

  private static async rebuildAchievementsForPlayers(playerIds: string[]) {
    const allGames = await dataService.getGames();
    const allPlayers = await dataService.calculateRankingsFromGames();

    for (const playerId of playerIds) {
      const achievements: Achievement[] = await AchievementService.getPlayerAchievements(
        playerId,
        allGames,
        allPlayers
      );
      await replacePlayerAchievements(playerId, achievements);
    }
  }

  static async undo(recordedBy: string, actionId?: string): Promise<MuseApplyResult> {
    const client = getClient();
    let query = client
      .from('muse_actions')
      .select('*')
      .eq('status', 'applied');

    if (actionId) {
      query = query.eq('id', actionId);
    } else {
      query = query.eq('recorded_by', recordedBy).order('created_at', { ascending: false }).limit(1);
    }

    const { data, error } = actionId ? await query.single() : await query.maybeSingle();
    if (error || !data) {
      throw new Error(actionId ? 'Connector action not found or already undone.' : 'There is no connector action to undo.');
    }

    const result = (data.result || {}) as Record<string, unknown>;
    const playerIds = Array.isArray(result.playerIds)
      ? result.playerIds.filter((value): value is string => typeof value === 'string')
      : [];

    if (data.action_type === 'game_result') {
      const gameId = typeof result.gameId === 'string' ? result.gameId : null;
      if (!gameId) throw new Error('This game action is missing its game ID.');

      await dataService.deleteGame(gameId);
      const { error: eloError } = await client.rpc('recalculate_all_elo_ratings');
      if (eloError) throw new Error(`Game was removed, but ELO rebuild failed: ${eloError.message}`);
      await this.rebuildAchievementsForPlayers(playerIds);
    } else if (data.action_type === 'attendance') {
      const meetId = typeof result.meetId === 'string' ? result.meetId : null;
      if (!meetId) throw new Error('This attendance action is missing its meet ID.');

      for (const playerId of playerIds) {
        await dataService.removeAttendance(meetId, playerId);
      }
    }

    const now = new Date().toISOString();
    const { error: eventError } = await client
      .from('player_events')
      .update({
        reversed_at: now,
        reversed_by: recordedBy,
        reversal_reason: 'Meta Muse connector undo',
      })
      .eq('muse_action_id', data.id)
      .is('reversed_at', null);

    if (eventError) throw new Error(`Action reversed, but event audit update failed: ${eventError.message}`);

    const { error: actionError } = await client
      .from('muse_actions')
      .update({
        status: 'reversed',
        reversed_at: now,
        reversed_by: recordedBy,
      })
      .eq('id', data.id);

    if (actionError) throw new Error(`Action reversed, but audit finalization failed: ${actionError.message}`);

    return {
      actionId: data.id,
      summary: 'Undid the connector action.',
      result: { reversedActionId: data.id },
    };
  }
}
