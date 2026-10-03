import { NextRequest, NextResponse } from 'next/server';
import { requireMetaMuseConnector } from '@/lib/muse/connectorAuth';
import { MuseService } from '@/lib/muse/service';
import type { DevelopmentSkill, MuseGameType, MuseIntent } from '@/lib/muse/types';

export const dynamic = 'force-dynamic';

const GAME_TYPES: MuseGameType[] = ['ladder', 'tournament', 'friendly', 'practice'];
const SKILLS: DevelopmentSkill[] = [
  'candidate_generation',
  'threat_detection',
  'calculation',
  'position_evaluation',
  'decision_making',
  'helping_others',
];

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function parseIntent(body: any): MuseIntent {
  if (!body || typeof body !== 'object') {
    throw new Error('Request body must be an object.');
  }

  if (body.type === 'game_result') {
    if (!nonEmptyString(body.player1) || !nonEmptyString(body.player2)) {
      throw new Error('player1 and player2 are required.');
    }
    if (!['player1', 'player2', 'draw'].includes(body.outcome)) {
      throw new Error('outcome must be player1, player2, or draw.');
    }
    if (!GAME_TYPES.includes(body.gameType)) {
      throw new Error('gameType must be ladder, tournament, friendly, or practice.');
    }

    return {
      type: 'game_result',
      player1: body.player1.trim(),
      player2: body.player2.trim(),
      outcome: body.outcome,
      gameType: body.gameType,
      gameDate: nonEmptyString(body.gameDate) ? body.gameDate.trim() : undefined,
      notes: nonEmptyString(body.notes) ? body.notes.trim() : undefined,
    };
  }

  if (body.type === 'attendance') {
    if (!Array.isArray(body.players) || body.players.length === 0) {
      throw new Error('players must contain at least one player name.');
    }
    const players = body.players.filter(nonEmptyString).map((name: string) => name.trim());
    if (players.length !== body.players.length) {
      throw new Error('Every attendance player must be a non-empty name.');
    }

    return {
      type: 'attendance',
      players,
      meetId: nonEmptyString(body.meetId) ? body.meetId.trim() : undefined,
      meetDate: nonEmptyString(body.meetDate) ? body.meetDate.trim() : undefined,
      notes: nonEmptyString(body.notes) ? body.notes.trim() : undefined,
    };
  }

  if (body.type === 'development') {
    if (!nonEmptyString(body.player)) {
      throw new Error('player is required.');
    }
    if (!nonEmptyString(body.eventType)) {
      throw new Error('eventType is required.');
    }
    if (body.skillKey !== undefined && !SKILLS.includes(body.skillKey)) {
      throw new Error('skillKey is not a supported development skill.');
    }

    return {
      type: 'development',
      player: body.player.trim(),
      eventType: body.eventType.trim(),
      skillKey: body.skillKey,
      activity: nonEmptyString(body.activity) ? body.activity.trim() : undefined,
      value: typeof body.value === 'number' && Number.isFinite(body.value) ? body.value : undefined,
      valueText: nonEmptyString(body.valueText) ? body.valueText.trim() : undefined,
      notes: nonEmptyString(body.notes) ? body.notes.trim() : undefined,
      metadata:
        body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata)
          ? body.metadata
          : undefined,
    };
  }

  throw new Error('type must be game_result, attendance, or development.');
}

export async function POST(request: NextRequest) {
  const auth = requireMetaMuseConnector(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const intent = parseIntent(body);
    const preview = await MuseService.preview(intent);

    if (!preview.canApply) {
      return NextResponse.json(
        {
          error: 'Player name needs clarification before this can be recorded.',
          preview,
        },
        { status: 409 }
      );
    }

    const result = await MuseService.apply(intent, auth.actor);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not record chess event.' },
      { status: 400 }
    );
  }
}
