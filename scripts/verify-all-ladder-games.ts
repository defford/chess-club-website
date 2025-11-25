/**
 * Script to verify all ladder games in Supabase
 * 
 * Usage:
 *   npm run verify-ladder-games
 * 
 * This sets is_verified = true for all ladder games that are currently unverified
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

async function verifyAllLadderGames() {
  console.log(`\n🔍 Checking ladder games status...\n`);

  // Get all ladder games
  const { data: allLadderGames, error: fetchError } = await supabase
    .from('games')
    .select('id, is_verified, player1_name, player2_name, game_date')
    .eq('game_type', 'ladder');

  if (fetchError) {
    console.error(`❌ Error fetching games: ${fetchError.message}`);
    process.exit(1);
  }

  if (!allLadderGames || allLadderGames.length === 0) {
    console.log(`⚠️  No ladder games found in database`);
    process.exit(0);
  }

  const verifiedCount = allLadderGames.filter(g => g.is_verified).length;
  const unverifiedCount = allLadderGames.filter(g => !g.is_verified).length;

  console.log(`📊 Ladder Games Status:`);
  console.log(`   Total ladder games: ${allLadderGames.length}`);
  console.log(`   Already verified: ${verifiedCount}`);
  console.log(`   Unverified: ${unverifiedCount}`);

  if (unverifiedCount === 0) {
    console.log(`\n✅ All ladder games are already verified!`);
    process.exit(0);
  }

  // Get unverified game IDs
  const unverifiedGameIds = allLadderGames
    .filter(g => !g.is_verified)
    .map(g => g.id);

  console.log(`\n➕ Verifying ${unverifiedCount} ladder game(s)...`);

  const verifiedBy = 'admin';
  const verifiedAt = new Date().toISOString();

  // Update games in batches to avoid overwhelming the database
  const batchSize = 50;
  let updatedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < unverifiedGameIds.length; i += batchSize) {
    const batch = unverifiedGameIds.slice(i, i + batchSize);
    
    const { error: updateError } = await supabase
      .from('games')
      .update({
        is_verified: true,
        verified_by: verifiedBy,
        verified_at: verifiedAt,
      })
      .in('id', batch);

    if (updateError) {
      console.error(`❌ Error updating batch ${i / batchSize + 1}: ${updateError.message}`);
      errorCount += batch.length;
    } else {
      updatedCount += batch.length;
      console.log(`   ✅ Verified batch ${i / batchSize + 1}: ${batch.length} game(s) (${updatedCount}/${unverifiedCount})`);
    }
  }

  if (errorCount > 0) {
    console.error(`\n⚠️  Completed with errors:`);
    console.error(`   Successfully verified: ${updatedCount}`);
    console.error(`   Failed: ${errorCount}`);
    process.exit(1);
  }

  console.log(`\n✅ Successfully verified ${updatedCount} ladder game(s)!`);
  
  // Verify the update
  const { data: verifyData, error: verifyError } = await supabase
    .from('games')
    .select('id, is_verified')
    .eq('game_type', 'ladder');

  if (!verifyError && verifyData) {
    const nowVerified = verifyData.filter(g => g.is_verified).length;
    const stillUnverified = verifyData.filter(g => !g.is_verified).length;
    console.log(`\n📊 Final Status:`);
    console.log(`   Verified: ${nowVerified}`);
    console.log(`   Unverified: ${stillUnverified}`);
    
    if (stillUnverified === 0) {
      console.log(`\n🎉 All ladder games are now verified!`);
    }
  }
}

// Run if executed directly
if (require.main === module) {
  verifyAllLadderGames().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { verifyAllLadderGames };


