// Client-safe authentication utilities
// This file only contains browser-safe code without Node.js dependencies

export interface ParentSession {
  parentId: string;
  email: string;
  loginTime: number;
}

export class ClientAuthService {
  private readonly AUTH_KEY = 'chess-club-parent-auth';

  // Check if parent is authenticated (client-side only)
  isParentAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    
    try {
      const stored = localStorage.getItem(this.AUTH_KEY);
      if (!stored) return false;
      
      const session: ParentSession = JSON.parse(stored);
      return !!session.parentId;
    } catch {
      return false;
    }
  }

  // Get current parent session (client-side only)
  getCurrentParentSession(): ParentSession | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const stored = localStorage.getItem(this.AUTH_KEY);
      if (!stored) return null;
      
      return JSON.parse(stored) as ParentSession;
    } catch {
      return null;
    }
  }

  // Logout parent (client-side only)
  logoutParent(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.AUTH_KEY);
      // Dispatch custom event for same-tab authentication changes
      window.dispatchEvent(new CustomEvent('authStateChanged', { 
        detail: { authenticated: false } 
      }));
    }
  }

  // Set parent session (for use after successful login)
  setParentSession(session: ParentSession): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.AUTH_KEY, JSON.stringify(session));
      // Dispatch custom event for same-tab authentication changes
      window.dispatchEvent(new CustomEvent('authStateChanged', { 
        detail: { authenticated: true, session } 
      }));
    }
  }
}

export const clientAuthService = new ClientAuthService();
