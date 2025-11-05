/**
 * Script to calculate ELO ratings retroactively for all games
 * 
 * Usage:
 *   npx tsx scripts/calculate-elo.ts
 * 
 * Environment variables required:
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 */

// Load environment variables FIRST before any imports
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') }); // Fallback to .env

// Verify required environment variables
if (!process.env.SUPABASE_URL) {
  console.error('❌ Error: SUPABASE_URL environment variable is required');
  console.error('   Please add it to your .env.local file');
  process.exit(1);
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  console.error('   Please add it to your .env.local file');
  process.exit(1);
}

import { EloService } from '../src/lib/eloService';

async function main() {
  console.log('🚀 Starting ELO rating calculation...\n');
  
  try {
    // Initialize all players with 1000 ELO
    console.log('Step 1: Initializing all players with 1000 ELO...');
    await EloService.initializeAllPlayerEloRatings();
    console.log('✅ All players initialized with 1000 ELO\n');
    
    // Calculate ELO for all games retroactively
    console.log('Step 2: Calculating ELO for all historical games...');
    const result = await EloService.calculateEloForAllGames();
    
    console.log('\n✅ ELO calculation completed!');
    console.log(`   Games processed: ${result.processed}`);
    console.log(`   Errors: ${result.errors}`);
    
    if (result.errors > 0) {
      console.log('\n⚠️  Some games had errors during processing. Check the logs above for details.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error calculating ELO ratings:', error);
    process.exit(1);
  }
}

main();

