"use client"

import { useState, useEffect } from 'react'
import { clientAuthService } from '@/lib/clientAuth'

export function useAdmin() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAdminStatus = () => {
      try {
        const session = clientAuthService.getCurrentParentSession()
        setIsAdmin(session?.isAdmin || false)
      } catch (error) {
        console.error('Error checking admin status:', error)
        setIsAdmin(false)
      } finally {
        setIsLoading(false)
      }
    }

    checkAdminStatus()

    // Listen for auth state changes
    const handleAuthStateChange = (event: CustomEvent) => {
      const { authenticated, session } = event.detail
      if (authenticated && session) {
        setIsAdmin(session.isAdmin || false)
      } else {
        setIsAdmin(false)
      }
    }

    // Listen for storage changes (when user logs in/out in another tab)
    const handleStorageChange = () => {
      checkAdminStatus()
    }

    window.addEventListener('authStateChanged', handleAuthStateChange as EventListener)
    window.addEventListener('storage', handleStorageChange)

    return () => {
      window.removeEventListener('authStateChanged', handleAuthStateChange as EventListener)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  return { isAdmin, isLoading }
}
