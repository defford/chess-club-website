# Testing Admin Access in Development

## Method 1: Add Test Admin Account to Google Sheets

1. **Open your Google Sheets Parents table**
2. **Add a new row with these values:**
   - Column A (ID): `test_admin_123`
   - Column B (Name): `Test Admin`
   - Column C (Email): `testadmin@example.com`
   - Column D (Phone): `555-0123`
   - Column E-O: Leave empty or add dummy data
   - Column O (Is Admin): `true` ⭐ **This is the key field**

3. **Test the login flow:**
   - Go to `/parent/login`
   - Enter `testadmin@example.com`
   - Click "Send Login Link"
   - Check your email for the magic link
   - Click the magic link to log in
   - Try accessing `/admin/games`

## Method 2: Use Environment Variable Override

Add this to your `.env.local` file:
```
TEST_ADMIN_EMAIL=testadmin@example.com
```

## Method 3: Temporary Code Override

Temporarily modify `src/lib/adminAuth.ts` to test with any email:

```typescript
export function isAdminAuthenticated(): boolean {
  // In development, check if we're using the dev email OR test admin email
  if (process.env.NODE_ENV === 'development') {
    const session = clientAuthService.getCurrentParentSession()
    return session?.email === 'dev@example.com' || session?.email === 'testadmin@example.com'
  }
  
  const session = clientAuthService.getCurrentParentSession()
  return session?.isAdmin === true
}
```

## Method 4: Browser Console Testing

1. **Open browser console on your site**
2. **Manually set a test session:**
```javascript
// Set a test admin session
const testSession = {
  parentId: 'test_admin_123',
  email: 'testadmin@example.com',
  loginTime: Date.now(),
  isSelfRegistered: false,
  registrationType: 'parent',
  isAdmin: true
};

localStorage.setItem('chess-club-parent-auth', JSON.stringify(testSession));

// Reload the page
window.location.reload();
```

3. **Test admin access:**
   - Try accessing `/admin/games`
   - Check if the admin check works

## Method 5: API Testing

Test the API directly:

```bash
# Test the admin auth API
curl -X POST http://localhost:3000/api/games \
  -H "Content-Type: application/json" \
  -H "x-user-email: testadmin@example.com" \
  -d '{"player1Id":"test1","player2Id":"test2","result":"player1","gameDate":"2024-01-01","gameTime":30,"gameType":"ladder"}'
```

## Method 6: Debug Mode

Add temporary logging to see what's happening:

```typescript
// In src/lib/adminAuth.ts
export function isAdminAuthenticated(): boolean {
  const session = clientAuthService.getCurrentParentSession()
  
  console.log('🔍 Admin Auth Debug:', {
    isDevelopment: process.env.NODE_ENV === 'development',
    sessionEmail: session?.email,
    sessionIsAdmin: session?.isAdmin,
    devEmailCheck: session?.email === 'dev@example.com',
    finalResult: process.env.NODE_ENV === 'development' 
      ? session?.email === 'dev@example.com' 
      : session?.isAdmin === true
  })
  
  if (process.env.NODE_ENV === 'development') {
    return session?.email === 'dev@example.com'
  }
  
  return session?.isAdmin === true
}
```

## Recommended Approach

**Start with Method 1** (Google Sheets test account) as it most closely mimics production behavior and tests the full flow.
