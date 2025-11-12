/**
 * Test script to verify admin account exists and is accessible
 * 
 * Usage:
 *   npm run test-admin -- --email=defford@gmail.com
 */

// Load environment variables FIRST before any imports
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

// Verify required environment variables
if (!process.env.SUPABASE_URL) {
  console.error('❌ Error: SUPABASE_URL environment variable is required');
  process.exit(1);
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

// Now import services after env vars are loaded
import { createClient } from '@supabase/supabase-js';
// Don't import dataService here - it imports supabaseClient which checks env vars at import time
// We'll test it separately

// Create Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Get email from command line args or environment
const getEmail = (): string => {
  const emailArg = process.argv.find(arg => arg.startsWith('--email='));
  if (emailArg) {
    return emailArg.split('=')[1];
  }
  return process.env.TEST_EMAIL || '';
};

async function testAdminAccount() {
  const email = getEmail();

  if (!email) {
    console.error('❌ Error: Email is required');
    console.error('   Usage: npm run test-admin -- --email=your@email.com');
    process.exit(1);
  }

  console.log(`\n🔍 Testing account lookup for: ${email}\n`);

  // Test 1: Direct Supabase query
  console.log('📋 Test 1: Direct Supabase query');
  const normalizedEmail = email.toLowerCase().trim();
  
  // Try exact match
  const { data: exactMatch, error: exactError } = await supabase
    .from('parents')
    .select('*')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (exactMatch) {
    console.log(`✅ Found with exact match:`);
    console.log(`   ID: ${exactMatch.id}`);
    console.log(`   Name: ${exactMatch.name}`);
    console.log(`   Email: ${exactMatch.email}`);
    console.log(`   Is Admin: ${exactMatch.is_admin ? '✅ Yes' : '❌ No'}`);
  } else {
    console.log(`❌ Not found with exact match (error: ${exactError?.code || 'none'})`);
    
    // Try case-insensitive
    const { data: caseMatch, error: caseError } = await supabase
      .from('parents')
      .select('*')
      .filter('email', 'ilike', normalizedEmail)
      .maybeSingle();
    
    if (caseMatch) {
      console.log(`✅ Found with case-insensitive search:`);
      console.log(`   ID: ${caseMatch.id}`);
      console.log(`   Name: ${caseMatch.name}`);
      console.log(`   Email: ${caseMatch.email}`);
      console.log(`   Is Admin: ${caseMatch.is_admin ? '✅ Yes' : '❌ No'}`);
    } else {
      console.log(`❌ Not found with case-insensitive search (error: ${caseError?.code || 'none'})`);
    }
  }

  // Test 2: Using dataService (what the API actually uses)
  // Import dataService dynamically after env vars are loaded
  console.log(`\n📋 Test 2: Using dataService.getParentAccount()`);
  try {
    // Dynamic import to avoid import-time env var checks
    const { dataService } = await import('../src/lib/dataService');
    const account = await dataService.getParentAccount(email);
    if (account) {
      console.log(`✅ Found via dataService:`);
      console.log(`   ID: ${account.id}`);
      console.log(`   Email: ${account.email}`);
      console.log(`   Is Admin: ${account.isAdmin ? '✅ Yes' : '❌ No'}`);
    } else {
      console.log(`❌ Not found via dataService`);
    }
  } catch (error: any) {
    console.error(`❌ Error using dataService: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);
  }

  // Test 3: List all emails in database (for debugging)
  console.log(`\n📋 Test 3: Checking all parent emails in database`);
  const { data: allParents, error: allError } = await supabase
    .from('parents')
    .select('id, email, name, is_admin')
    .limit(50);

  if (allError) {
    console.error(`❌ Error fetching parents: ${allError.message}`);
  } else {
    console.log(`Found ${allParents?.length || 0} parents in database`);
    const matchingParents = allParents?.filter(p => 
      p.email?.toLowerCase().includes(normalizedEmail) || 
      normalizedEmail.includes(p.email?.toLowerCase() || '')
    );
    
    if (matchingParents && matchingParents.length > 0) {
      console.log(`\n🔍 Parents with similar emails:`);
      matchingParents.forEach(p => {
        console.log(`   - ${p.email} (ID: ${p.id}, Admin: ${p.is_admin ? 'Yes' : 'No'})`);
      });
    } else {
      console.log(`\n⚠️  No parents found with similar email`);
    }
  }
}

// Run if executed directly
if (require.main === module) {
  testAdminAccount().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { testAdminAccount };

