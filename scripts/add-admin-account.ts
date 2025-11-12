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
import { GoogleSheetsService } from '../src/lib/googleSheets';

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

  // First, check if account exists in Google Sheets (to get full details)
  const googleSheetsService = new GoogleSheetsService();
  let parentData = null;
  
  try {
    parentData = await googleSheetsService.getParentByEmail(email);
    if (parentData) {
      console.log(`✅ Found account in Google Sheets:`);
      console.log(`   ID: ${parentData.id}`);
      console.log(`   Name: ${parentData.name}`);
      console.log(`   Email: ${parentData.email}`);
      console.log(`   Phone: ${parentData.phone || 'N/A'}`);
    }
  } catch (error) {
    console.log(`⚠️  Could not check Google Sheets (this is okay if you're adding a new account)`);
  }

  // Check if account already exists in Supabase
  const normalizedEmail = email.toLowerCase().trim();
  let existing = null;
  let checkError = null;
  
  // First, try to find by ID from Google Sheets (if we have it)
  if (parentData?.id) {
    const { data: idMatch, error: idError } = await supabase
      .from('parents')
      .select('*')
      .eq('id', parentData.id)
      .maybeSingle();
    
    if (idMatch) {
      existing = idMatch;
      console.log(`✅ Found account in Supabase by ID: ${parentData.id}`);
    } else if (idError && idError.code !== 'PGRST116') {
      checkError = idError;
    }
  }
  
  // If not found by ID, try by email (case-insensitive)
  if (!existing) {
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

  const parentId = parentData?.id || `parent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const parentName = name || parentData?.name || 'Admin User';
  const parentPhone = parentData?.phone || null;
  const timestamp = parentData?.timestamp || new Date().toISOString();

  const { error: insertError } = await supabase.from('parents').insert({
    id: parentId,
    name: parentName,
    email: email.toLowerCase().trim(),
    phone: parentPhone,
    hear_about_us: parentData?.hearAboutUs || null,
    provincial_interest: parentData?.provincialInterest || null,
    volunteer_interest: parentData?.volunteerInterest || null,
    consent: parentData?.consent || false,
    photo_consent: parentData?.photoConsent || false,
    values_acknowledgment: parentData?.valuesAcknowledgment || false,
    newsletter: parentData?.newsletter || false,
    create_account: parentData?.createAccount || false,
    timestamp: timestamp,
    registration_type: parentData?.registrationType || 'parent',
    is_admin: true, // Set as admin
    created_at: timestamp,
    updated_at: timestamp,
  });

  if (insertError) {
    // If it's a duplicate key error, the account exists but we didn't find it by email
    // Try to find it by ID and update it
    if (insertError.code === '23505' && parentData?.id) {
      console.log(`\n⚠️  Account with ID ${parentData.id} already exists. Updating to admin...`);
      
      const { data: existingById, error: findError } = await supabase
        .from('parents')
        .select('*')
        .eq('id', parentData.id)
        .single();
      
      if (existingById) {
        const { error: updateError } = await supabase
          .from('parents')
          .update({ is_admin: true })
          .eq('id', parentData.id);

        if (updateError) {
          console.error(`❌ Error updating account: ${updateError.message}`);
          process.exit(1);
        }

        console.log(`\n✅ Successfully updated existing account to admin!`);
        console.log(`   ID: ${existingById.id}`);
        console.log(`   Name: ${existingById.name}`);
        console.log(`   Email: ${existingById.email}`);
        console.log(`   Is Admin: ✅ Yes`);
        console.log(`\n🎉 You can now use this account to access admin features!`);
        process.exit(0);
      } else {
        console.error(`❌ Could not find account by ID: ${findError?.message || 'Unknown error'}`);
        process.exit(1);
      }
    } else {
      console.error(`❌ Error creating account: ${insertError.message}`);
      console.error(`   Code: ${insertError.code}`);
      process.exit(1);
    }
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

