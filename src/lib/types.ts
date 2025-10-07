// Shared type definitions for the Chess Club application
// This file consolidates all interface definitions to avoid duplication

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
  recordedBy?: string;
}

export interface BulkGameData {
  games: GameFormData[];
  recordedBy: string;
}

// Core Registration Interfaces
export interface RegistrationData {
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  playerName: string;
  playerAge: string;
  playerGrade: string;
  emergencyContact: string;
  emergencyPhone: string;
  medicalInfo: string;
  hearAboutUs: string;
  provincialInterest: string;
  volunteerInterest: string;
  consent: boolean;
  photoConsent: boolean;
  valuesAcknowledgment: boolean;
  newsletter: boolean;
  // Additional metadata
  timestamp?: string;
  rowIndex?: number;
}

export interface ParentRegistrationData {
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  hearAboutUs: string;
  provincialInterest: string;
  volunteerInterest: string;
  consent: boolean;
  photoConsent: boolean;
  valuesAcknowledgment: boolean;
  newsletter: boolean;
  createAccount?: boolean;
  registrationType?: 'parent' | 'self';
}

export interface StudentRegistrationData {
  parentId: string;
  playerName: string;
  playerAge: string;
  playerGrade: string;
  emergencyContact: string;
  emergencyPhone: string;
  medicalInfo: string;
}

export interface SelfRegistrationData {
  playerName: string;
  playerAge: string;
  playerGrade: string;
  playerEmail: string;
  playerPhone: string;
  emergencyContact: string;
  emergencyPhone: string;
  medicalInfo: string;
  hearAboutUs: string;
  provincialInterest: string;
  volunteerInterest: string;
  consent: boolean;
  photoConsent: boolean;
  valuesAcknowledgment: boolean;
  newsletter: boolean;
  createAccount?: boolean;
}

// Event Management Interfaces
export interface EventData {
  id?: string;
  name: string;
  date: string;
  time: string;
  location: string;
  participants: number;
  maxParticipants: number;
  description: string;
  category: 'tournament' | 'workshop' | 'training' | 'social';
  ageGroups: string;
  status?: 'active' | 'cancelled' | 'completed';
  lastUpdated?: string;
}

export interface EventRegistrationData {
  eventId: string;
  playerName: string;
  playerGrade: string;
  additionalNotes: string;
  timestamp?: string;
}

// Player and Ranking Interfaces
export interface PlayerData {
  id?: string;
  name: string;
  grade: string;
  gamesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  rank?: number;
  lastActive: string;
  email?: string;
  isSystemPlayer?: boolean; // Flag to identify system players (like Unknown Opponent)
}

// Enhanced ladder player data with both daily and overall stats
export interface LadderPlayerData extends PlayerData {
  // Daily stats (for selected date)
  dailyRank?: number | null;
  // Overall stats (all-time)
  overallGamesPlayed: number;
  overallWins: number;
  overallLosses: number;
  overallDraws: number;
  overallPoints: number;
  overallRank: number;
}

// Parent Account Management Interfaces
export interface ParentAccount {
  id: string;
  email: string;
  createdDate: string;
  lastLogin: string;
  isActive: boolean;
  isSelfRegistered?: boolean;
  registrationType?: 'parent' | 'self';
  isAdmin?: boolean;
}

export interface ParentData {
  id: string;
  name: string;
  email: string;
  phone: string;
  hearAboutUs: string;
  provincialInterest: string;
  volunteerInterest: string;
  consent: boolean;
  photoConsent: boolean;
  valuesAcknowledgment: boolean;
  newsletter: boolean;
  createAccount: boolean;
  timestamp: string;
  registrationType?: 'parent' | 'self';
}

export interface StudentData {
  id: string;
  parentId: string;
  name: string;
  age: string;
  grade: string;
  emergencyContact: string;
  emergencyPhone: string;
  medicalInfo: string;
  timestamp: string;
}

// Player Ownership Interfaces
export interface PlayerOwnership {
  playerId: string;
  playerName: string;
  playerEmail: string;
  ownerParentId: string;
  pendingParentId?: string;
  approvalStatus: 'none' | 'pending' | 'approved' | 'denied';
  claimDate: string;
}

export interface PlayerOwnershipData extends RegistrationData {
  playerId: string;
  parentAccountId?: string;
}

// Authentication Interfaces
export interface MagicLinkToken {
  email: string;
  type: 'login' | 'approval_request' | 'approval_response';
  playerId?: string;
  requesterId?: string;
  action?: 'approve' | 'deny';
  emailExistsInRegistrations?: boolean;
  isSelfRegistered?: boolean;
  exp: number;
}

export interface ParentSession {
  parentId: string;
  email: string;
  loginTime: number;
  isSelfRegistered?: boolean;
  registrationType?: 'parent' | 'self';
  isAdmin?: boolean;
}

// Member Management Interfaces
export interface MemberData extends RegistrationData {
  id?: string;
  joinDate?: string;
  isActive?: boolean;
  notes?: string;
}

// Game Result Interface
export interface GameResult {
  player1Id: string;
  player2Id: string;
  result: 'player1' | 'player2' | 'draw';
}

// Ladder Session Management Types
export interface LadderSession {
  id: string;
  date: string; // YYYY-MM-DD format
  createdAt: string;
  isActive: boolean;
  gameCount: number;
  playerCount: number;
}

export interface LadderSessionData {
  sessionId: string;
  date: string;
  players: PlayerData[];
  games: GameData[];
  createdAt: string;
  lastUpdated: string;
}

export interface LadderSessionFilters {
  dateFrom?: string;
  dateTo?: string;
  isActive?: boolean;
  limit?: number;
}

// Achievement System Types
export interface Achievement {
  id: string;
  playerId: string;
  playerName: string;
  type: AchievementType;
  title: string;
  description: string;
  earnedAt: string;
  gameId?: string;
  metadata?: Record<string, unknown>;
}

export type AchievementType = 
  | 'first_win'
  | 'win_streak_3'
  | 'win_streak_5'
  | 'win_streak_10'
  | 'games_played_10'
  | 'games_played_25'
  | 'games_played_50'
  | 'perfect_week'
  | 'comeback_king'
  | 'giant_slayer'
  | 'draw_master'
  | 'first_draw'
  | 'undefeated_month';

export interface AchievementNotification {
  id: string;
  playerName: string;
  achievement: Achievement;
  timestamp: string;
}

// Chess Analysis Types
export interface GameHistoryMove {
  moveNumber: number;
  move: string;
  fen: string;
  evaluation?: {
    score: number;
    mate?: number;
    depth: number;
    bestMove?: string;
    pv?: string[];
  };
  timestamp: string;
  isWhiteMove: boolean;
}

export interface GameHistory {
  id: string;
  startFen: string;
  moves: GameHistoryMove[];
  createdAt: string;
  lastUpdated: string;
  currentMoveIndex: number;
}
