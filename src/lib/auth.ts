"use client"

const ADMIN_PASSWORD = "password"
const AUTH_KEY = "chess-club-admin-auth"

export interface AuthState {
  isAuthenticated: boolean
  timestamp: number
}

// Development environment bypass
function isDevelopmentMode(): boolean {
  return process.env.NODE_ENV === 'development'
}

export function authenticate(password: string): boolean {
  // In development, bypass authentication
  if (isDevelopmentMode()) {
    const authState: AuthState = {
      isAuthenticated: true,
      timestamp: Date.now()
    }
    localStorage.setItem(AUTH_KEY, JSON.stringify(authState))
    return true
  }
  
  // Production authentication
  if (password === ADMIN_PASSWORD) {
    const authState: AuthState = {
      isAuthenticated: true,
      timestamp: Date.now()
    }
    localStorage.setItem(AUTH_KEY, JSON.stringify(authState))
    return true
  }
  return false
}

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false
  
  // In development, always return true (bypass authentication)
  if (isDevelopmentMode()) {
    return true
  }
  
  try {
    const stored = localStorage.getItem(AUTH_KEY)
    if (!stored) return false
    
    const authState: AuthState = JSON.parse(stored)
    
    // Session expires after 24 hours
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000
    const isExpired = Date.now() - authState.timestamp > TWENTY_FOUR_HOURS
    
    if (isExpired) {
      logout()
      return false
    }
    
    return authState.isAuthenticated
  } catch {
    logout()
    return false
  }
}

export function logout(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(AUTH_KEY)
  }
}

export function refreshSession(): void {
  if (isAuthenticated()) {
    const authState: AuthState = {
      isAuthenticated: true,
      timestamp: Date.now()
    }
    localStorage.setItem(AUTH_KEY, JSON.stringify(authState))
  }
}
