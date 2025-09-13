// Game Management Types

export interface GameData {
  id: string;
  player1Id: string;
  player1Name: string;
  player2Id: string;
  player2Name: string;
  result: 'player1' | 'player2' | 'draw';
  gameDate: string;
  gameTime: number; // Duration in minutes
  eventId?: string; // Optional: if part of a tournament/event
  gameType: 'ladder' | 'tournament' | 'friendly' | 'practice';
  notes?: string;
  recordedBy: string; // Admin who recorded the game
  recordedAt: string;
  // Advanced game details
  opening?: string;
  endgame?: string;
  ratingChange?: {
    player1: number;
    player2: number;
  };
  // Validation
  isVerified: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
}

export interface GameFilters {
  playerId?: string;
  gameType?: string;
  dateFrom?: string;
  dateTo?: string;
  result?: string;
  eventId?: string;
  isVerified?: boolean;
}

export interface GameStats {
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  averageGameTime: number;
  favoriteOpponents: Array<{
    playerId: string;
    playerName: string;
    gamesPlayed: number;
  }>;
  recentGames: GameData[];
  monthlyStats: Array<{
    month: string;
    games: number;
    wins: number;
    losses: number;
  }>;
}

export interface PlayerGameStats {
  playerId: string;
  playerName: string;
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  averageGameTime: number;
  currentStreak: {
    type: 'win' | 'loss' | 'draw' | 'none';
    count: number;
  };
  bestStreak: {
    type: 'win' | 'loss';
    count: number;
  };
  recentGames: GameData[];
  monthlyStats: Array<{
    month: string;
    games: number;
    wins: number;
    losses: number;
    winRate: number;
  }>;
}

export interface GameFormData {
  player1Id: string;
  player2Id: string;
  result: 'player1' | 'player2' | 'draw' | '';
  gameDate: string;
  gameTime: number;
  gameType: 'ladder' | 'tournament' | 'friendly' | 'practice';
  eventId?: string;
  notes?: string;
  opening?: string;
  endgame?: string;
}

export interface BulkGameData {
  games: GameFormData[];
  recordedBy: string;
}

// Export existing types for backward compatibility
export type { PlayerData } from './googleSheets';
export type { CleanMemberData, PlayerWithRanking } from './cleanDataService';
