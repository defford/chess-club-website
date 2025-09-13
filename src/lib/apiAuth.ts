import { NextRequest } from 'next/server'
import { googleSheetsService } from './googleSheets'

export async function requireAdminAuth(request: NextRequest): Promise<{ isAdmin: boolean; error?: string }> {
  try {
    // Get the email from the request headers or query params
    const email = request.headers.get('x-user-email') || request.nextUrl.searchParams.get('email')
    
    if (!email) {
      return { isAdmin: false, error: 'No email provided' }
    }

    // Get the parent account from Google Sheets
    const parentAccount = await googleSheetsService.getParentAccount(email)
    
    if (!parentAccount) {
      return { isAdmin: false, error: 'Parent account not found' }
    }

    if (!parentAccount.isAdmin) {
      return { isAdmin: false, error: 'Admin privileges required' }
    }

    return { isAdmin: true }
  } catch (error) {
    console.error('Error checking admin auth:', error)
    return { isAdmin: false, error: 'Authentication error' }
  }
}

export async function requireParentAuth(request: NextRequest): Promise<{ isAuthenticated: boolean; email?: string; error?: string }> {
  try {
    // Get the email from the request headers or query params
    const email = request.headers.get('x-user-email') || request.nextUrl.searchParams.get('email')
    
    if (!email) {
      return { isAuthenticated: false, error: 'No email provided' }
    }

    // Get the parent account from Google Sheets
    const parentAccount = await googleSheetsService.getParentAccount(email)
    
    if (!parentAccount) {
      return { isAuthenticated: false, error: 'Parent account not found' }
    }

    return { isAuthenticated: true, email }
  } catch (error) {
    console.error('Error checking parent auth:', error)
    return { isAuthenticated: false, error: 'Authentication error' }
  }
}
