/**
 * Script to add an admin account to Supabase
 * 
 * Usage:
 *   npm run add-admin --email=defford@gmail.com --name="Your Name"
 * 
 * Or set environment variables:
 *   ADMIN_EMAIL=defford@gmail.com ADMIN_NAME="Your Name" npm run add-admin
 * 
 * Environment variables required:
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
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

// Create Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Get email and name from command line args or environment
const getEmail = (): string => {
  const emailArg = process.argv.find(arg => arg.startsWith('--email='));
  if (emailArg) {
    return emailArg.split('=')[1];
  }
  return process.env.ADMIN_EMAIL || '';
};

const getName = (): string => {
  const nameArg = process.argv.find(arg => arg.startsWith('--name='));
  if (nameArg) {
    return nameArg.split('=')[1].replace(/"/g, '');
  }
  return process.env.ADMIN_NAME || '';
};

async function addAdminAccount() {
  const email = getEmail();
  const name = getName();

  if (!email) {
    console.error('❌ Error: Email is required');
    console.error('   Usage: npm run add-admin --email=your@email.com --name="Your Name"');
    console.error('   Or set ADMIN_EMAIL and ADMIN_NAME environment variables');
    process.exit(1);
  }

  console.log(`\n🔍 Checking for account: ${email}\n`);

  // Check if account already exists in Supabase
  const normalizedEmail = email.toLowerCase().trim();
  let existing = null;
  let checkError = null;
  
  // Try exact match first
  const { data: exactMatch, error: exactError } = await supabase
    .from('parents')
    .select('*')
    .eq('email', normalizedEmail)
    .maybeSingle();
  
  if (exactMatch) {
    existing = exactMatch;
    console.log(`✅ Found account in Supabase by email (exact match)`);
  } else if (exactError && exactError.code !== 'PGRST116') {
    checkError = exactError;
  } else {
    // Try case-insensitive search using ilike filter
    const { data: caseInsensitiveMatch, error: caseError } = await supabase
      .from('parents')
      .select('*')
      .filter('email', 'ilike', normalizedEmail)
      .maybeSingle();
    
    if (caseInsensitiveMatch) {
      existing = caseInsensitiveMatch;
      console.log(`✅ Found account in Supabase by email (case-insensitive)`);
    } else if (caseError && caseError.code !== 'PGRST116') {
      checkError = caseError;
    }
  }

  if (checkError && checkError.code !== 'PGRST116') {
    console.error(`❌ Error checking Supabase: ${checkError.message}`);
    process.exit(1);
  }

  if (existing) {
    console.log(`\n📋 Account already exists in Supabase:`);
    console.log(`   ID: ${existing.id}`);
    console.log(`   Name: ${existing.name}`);
    console.log(`   Email: ${existing.email}`);
    console.log(`   Is Admin: ${existing.is_admin ? '✅ Yes' : '❌ No'}`);

    if (existing.is_admin) {
      console.log(`\n✅ Account already has admin privileges!`);
      process.exit(0);
    }

    // Update to admin
    console.log(`\n🔄 Updating account to admin...`);
    const { error: updateError } = await supabase
      .from('parents')
      .update({ is_admin: true })
      .eq('id', existing.id);

    if (updateError) {
      console.error(`❌ Error updating account: ${updateError.message}`);
      process.exit(1);
    }

    console.log(`\n✅ Successfully updated account to admin!`);
    process.exit(0);
  }

  // Create new account (only if it doesn't exist)
  console.log(`\n➕ Creating new admin account in Supabase...`);

  const parentId = `parent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const parentName = name || 'Admin User';
  const timestamp = new Date().toISOString();

  const { error: insertError } = await supabase.from('parents').insert({
    id: parentId,
    name: parentName,
    email: email.toLowerCase().trim(),
    is_admin: true, // Set as admin
    created_at: timestamp,
    updated_at: timestamp,
  });

  if (insertError) {
      console.error(`❌ Error creating account: ${insertError.message}`);
      console.error(`   Code: ${insertError.code}`);
      process.exit(1);
  } else {
    console.log(`\n✅ Successfully created admin account!`);
    console.log(`   ID: ${parentId}`);
    console.log(`   Name: ${parentName}`);
    console.log(`   Email: ${email}`);
    console.log(`   Is Admin: ✅ Yes`);
    console.log(`\n🎉 You can now use this account to access admin features!`);
  }
}

// Run if executed directly
if (require.main === module) {
  addAdminAccount().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { addAdminAccount };

