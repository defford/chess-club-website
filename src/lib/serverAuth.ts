// Server-side authentication functions for API routes
export async function isAdminAuthenticatedServer(request: Request): Promise<boolean> {
  try {
    // In development, allow dev@example.com
    if (process.env.NODE_ENV === 'development') {
      const url = new URL(request.url)
      const email = url.searchParams.get('email')
      return email === 'dev@example.com'
    }
    
    // For production, you would implement proper server-side session validation
    // This is a simplified version - in production you'd check JWT tokens, etc.
    const url = new URL(request.url)
    const email = url.searchParams.get('email')
    
    // For now, allow any email in development mode
    // In production, you'd validate against your user database
    return !!email
  } catch (error) {
    console.error('Error checking admin authentication:', error)
    return false
  }
}
