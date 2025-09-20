// Shared type definitions for the Chess Club application
// This file consolidates all interface definitions to avoid duplication

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
  wins: number;
  losses: number;
  points: number;
  rank?: number;
  lastActive: string;
  email?: string;
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

