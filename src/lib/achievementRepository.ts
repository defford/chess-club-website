import { supabaseAdmin } from './supabaseClient';
import { AchievementService } from './achievements';
import type { Achievement, AchievementType, GameData, PlayerData } from './types';

function getClient() {
  if (!supabaseAdmin) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for achievement persistence');
  }
  return supabaseAdmin;
}

export async function getExistingAchievementMap(
  playerIds?: string[]
): Promise<Map<string, Set<AchievementType>>> {
  const client = getClient();
  let query = client
    .from('achievements')
    .select('player_id, achievement_type');

  if (playerIds?.length) {
    query = query.in('player_id', playerIds);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load achievements: ${error.message}`);

  const map = new Map<string, Set<AchievementType>>();
  for (const row of data || []) {
    const current = map.get(row.player_id) || new Set<AchievementType>();
    current.add(row.achievement_type as AchievementType);
    map.set(row.player_id, current);
  }
  return map;
}

export async function persistAchievements(achievements: Achievement[]): Promise<void> {
  if (achievements.length === 0) return;

  const client = getClient();
  const rows = achievements.map((achievement) => ({
    player_id: achievement.playerId,
    player_name: achievement.playerName,
    achievement_type: achievement.type,
    title: achievement.title,
    description: achievement.description,
    earned_at: achievement.earnedAt,
    game_id: achievement.gameId || null,
    metadata: achievement.metadata || {},
  }));

  const { error } = await client
    .from('achievements')
    .upsert(rows, {
      onConflict: 'player_id,achievement_type',
      ignoreDuplicates: true,
    });

  if (error) throw new Error(`Failed to persist achievements: ${error.message}`);
}

export async function replacePlayerAchievements(
  playerId: string,
  achievements: Achievement[]
): Promise<void> {
  const client = getClient();
  const { error: deleteError } = await client
    .from('achievements')
    .delete()
    .eq('player_id', playerId);

  if (deleteError) throw new Error(`Failed to reset achievements: ${deleteError.message}`);
  await persistAchievements(achievements);
}

export async function getStoredAchievements(playerId: string): Promise<Achievement[]> {
  const client = getClient();
  const { data, error } = await client
    .from('achievements')
    .select('*')
    .eq('player_id', playerId)
    .order('earned_at', { ascending: true });

  if (error) throw new Error(`Failed to load player achievements: ${error.message}`);

  return (data || []).map((row) => ({
    id: row.id,
    playerId: row.player_id,
    playerName: row.player_name,
    type: row.achievement_type as AchievementType,
    title: row.title,
    description: row.description,
    earnedAt: row.earned_at,
    gameId: row.game_id || undefined,
    metadata: (row.metadata || {}) as Record<string, unknown>,
  }));
}


export async function ensureHistoricalAchievements(
  playerIds: string[],
  allGames: GameData[],
  allPlayers: PlayerData[],
  excludeGameId?: string
): Promise<Map<string, Set<AchievementType>>> {
  const historicalGames = excludeGameId
    ? allGames.filter((game) => game.id !== excludeGameId)
    : allGames;

  for (const playerId of playerIds) {
    const historical = await AchievementService.getPlayerAchievements(
      playerId,
      historicalGames,
      allPlayers
    );
    await persistAchievements(historical);
  }

  return getExistingAchievementMap(playerIds);
}
