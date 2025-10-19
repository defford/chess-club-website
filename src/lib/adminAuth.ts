"use client"

import { clientAuthService } from './clientAuth'

export function isAdminAuthenticated(): boolean {
  // In development, check if we're using the dev email
  if (process.env.NODE_ENV === 'development') {
    const session = clientAuthService.getCurrentParentSession()
    return session?.email === 'dev@example.com'
  }
  
  const session = clientAuthService.getCurrentParentSession()
  return session?.isAdmin === true
}

export function requireAdmin(): boolean {
  if (typeof window === 'undefined') return false
  
  const isAdmin = isAdminAuthenticated()
  
  if (!isAdmin) {
    // Redirect to login or show error
    window.location.href = '/parent/login'
    return false
  }
  
  return true
}

