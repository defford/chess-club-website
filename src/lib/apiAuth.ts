import { NextRequest } from 'next/server'
import { dataService } from './dataService'

export async function requireAdminAuth(request: NextRequest): Promise<{ isAdmin: boolean; error?: string }> {
  try {
    // Get the email from the request headers or query params
    const email = request.headers.get('x-user-email') || request.nextUrl.searchParams.get('email')
    
    if (!email) {
      console.error('[requireAdminAuth] No email provided in request')
      return { isAdmin: false, error: 'No email provided' }
    }

    console.log(`[requireAdminAuth] Checking admin auth for email: ${email}`)

    // In development, allow dev@example.com to be admin
    if (process.env.NODE_ENV === 'development' && email === 'dev@example.com') {
      console.log('[requireAdminAuth] Development mode - allowing dev@example.com')
      return { isAdmin: true }
    }

    // Get the parent account from dataService (routes to Supabase or Google Sheets)
    const parentAccount = await dataService.getParentAccount(email)
    
    if (!parentAccount) {
      console.error(`[requireAdminAuth] Parent account not found for email: ${email}`)
      return { isAdmin: false, error: `Parent account not found for email: ${email}. Please ensure your account exists in the database.` }
    }

    console.log(`[requireAdminAuth] Found parent account: ${parentAccount.id}, isAdmin: ${parentAccount.isAdmin}`)

    if (!parentAccount.isAdmin) {
      console.warn(`[requireAdminAuth] User ${email} does not have admin privileges`)
      return { isAdmin: false, error: 'Admin privileges required' }
    }

    return { isAdmin: true }
  } catch (error) {
    console.error('[requireAdminAuth] Error checking admin auth:', error)
    return { isAdmin: false, error: `Authentication error: ${error instanceof Error ? error.message : 'Unknown error'}` }
  }
}

export async function requireParentAuth(request: NextRequest): Promise<{ isAuthenticated: boolean; email?: string; error?: string }> {
  try {
    // Get the email from the request headers or query params
    const email = request.headers.get('x-user-email') || request.nextUrl.searchParams.get('email')
    
    if (!email) {
      return { isAuthenticated: false, error: 'No email provided' }
    }

    // Get the parent account from dataService (routes to Supabase or Google Sheets)
    const parentAccount = await dataService.getParentAccount(email)
    
    if (!parentAccount) {
      return { isAuthenticated: false, error: 'Parent account not found' }
    }

    return { isAuthenticated: true, email }
  } catch (error) {
    console.error('Error checking parent auth:', error)
    return { isAuthenticated: false, error: 'Authentication error' }
  }
}
