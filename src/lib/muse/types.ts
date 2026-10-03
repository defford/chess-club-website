export type DevelopmentSkill =
  | 'candidate_generation'
  | 'threat_detection'
  | 'calculation'
  | 'position_evaluation'
  | 'decision_making'
  | 'helping_others';

export type MuseGameType = 'ladder' | 'tournament' | 'friendly' | 'practice';

export type MuseIntent =
  | {
      type: 'game_result';
      player1: string;
      player2: string;
      outcome: 'player1' | 'player2' | 'draw';
      gameType: MuseGameType;
      gameDate?: string;
      notes?: string;
    }
  | {
      type: 'attendance';
      players: string[];
      meetId?: string;
      meetDate?: string;
      notes?: string;
    }
  | {
      type: 'development';
      player: string;
      eventType: string;
      skillKey?: DevelopmentSkill;
      activity?: string;
      value?: number;
      valueText?: string;
      notes?: string;
      metadata?: Record<string, unknown>;
    };

export interface MusePlayerMatch {
  query: string;
  id: string;
  name: string;
  grade?: string;
  confidence: 'exact' | 'strong';
}

export interface MuseAmbiguousPlayer {
  query: string;
  candidates: Array<{
    id: string;
    name: string;
    grade?: string;
  }>;
}

export interface MusePreview {
  intent: MuseIntent;
  summary: string;
  resolvedPlayers: MusePlayerMatch[];
  ambiguousPlayers: MuseAmbiguousPlayer[];
  missingPlayers: string[];
  canApply: boolean;
}

export interface MuseApplyResult {
  actionId: string;
  summary: string;
  result: Record<string, unknown>;
}
