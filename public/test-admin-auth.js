// Test script to verify admin authentication in development
// Run this in your browser console on localhost:3000

console.log('🧪 Testing Admin Authentication...\n');

// Test 1: Check current session
function testCurrentSession() {
  console.log('1. Current Session Test:');
  const session = JSON.parse(localStorage.getItem('chess-club-parent-auth') || 'null');
  console.log('   Session:', session);
  console.log('   Is Admin:', session?.isAdmin);
  console.log('   Email:', session?.email);
  console.log('');
}

// Test 2: Set test admin session
function setTestAdminSession() {
  console.log('2. Setting Test Admin Session:');
  const testSession = {
    parentId: 'test_admin_123',
    email: 'testadmin@example.com',
    loginTime: Date.now(),
    isSelfRegistered: false,
    registrationType: 'parent',
    isAdmin: true
  };
  
  localStorage.setItem('chess-club-parent-auth', JSON.stringify(testSession));
  console.log('   ✅ Test admin session set');
  console.log('   Email: testadmin@example.com');
  console.log('   Is Admin: true');
  console.log('');
}

// Test 3: Set test non-admin session
function setTestNonAdminSession() {
  console.log('3. Setting Test Non-Admin Session:');
  const testSession = {
    parentId: 'test_user_456',
    email: 'testuser@example.com',
    loginTime: Date.now(),
    isSelfRegistered: false,
    registrationType: 'parent',
    isAdmin: false
  };
  
  localStorage.setItem('chess-club-parent-auth', JSON.stringify(testSession));
  console.log('   ✅ Test non-admin session set');
  console.log('   Email: testuser@example.com');
  console.log('   Is Admin: false');
  console.log('');
}

// Test 4: Set dev session
function setDevSession() {
  console.log('4. Setting Dev Session:');
  const testSession = {
    parentId: 'dev-parent-123',
    email: 'dev@example.com',
    loginTime: Date.now(),
    isSelfRegistered: false,
    isAdmin: true
  };
  
  localStorage.setItem('chess-club-parent-auth', JSON.stringify(testSession));
  console.log('   ✅ Dev session set');
  console.log('   Email: dev@example.com');
  console.log('   Is Admin: true');
  console.log('');
}

// Test 5: Clear session
function clearSession() {
  console.log('5. Clearing Session:');
  localStorage.removeItem('chess-club-parent-auth');
  console.log('   ✅ Session cleared');
  console.log('');
}

// Test 6: Test admin page access
function testAdminPageAccess() {
  console.log('6. Testing Admin Page Access:');
  console.log('   Try accessing: http://localhost:3000/admin/games');
  console.log('   Expected behavior:');
  console.log('   - With admin session: Should show game management page');
  console.log('   - With non-admin session: Should redirect to /parent/dashboard');
  console.log('   - With no session: Should redirect to /admin/login');
  console.log('');
}

// Run all tests
function runAllTests() {
  console.log('🚀 Running All Admin Auth Tests...\n');
  
  testCurrentSession();
  setTestAdminSession();
  testCurrentSession();
  
  console.log('📋 Next Steps:');
  console.log('1. Try accessing /admin/games - should work with admin session');
  console.log('2. Run setTestNonAdminSession() and try again - should redirect');
  console.log('3. Run setDevSession() and try again - should work in dev mode');
  console.log('4. Run clearSession() and try again - should redirect to login');
}

// Export functions for manual testing
window.testAdminAuth = {
  testCurrentSession,
  setTestAdminSession,
  setTestNonAdminSession,
  setDevSession,
  clearSession,
  testAdminPageAccess,
  runAllTests
};

console.log('✅ Test functions loaded!');
console.log('Available functions:');
console.log('- testAdminAuth.runAllTests() - Run all tests');
console.log('- testAdminAuth.setTestAdminSession() - Set admin session');
console.log('- testAdminAuth.setTestNonAdminSession() - Set non-admin session');
console.log('- testAdminAuth.setDevSession() - Set dev session');
console.log('- testAdminAuth.clearSession() - Clear session');
console.log('- testAdminAuth.testCurrentSession() - Check current session');
console.log('');
console.log('Run testAdminAuth.runAllTests() to start testing!');
