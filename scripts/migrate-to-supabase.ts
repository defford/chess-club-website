/**
 * Migration script to migrate data from Google Sheets to Supabase
 * 
 * Usage:
 *   npm run migrate:to-supabase
 * 
 * Environment variables required:
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - GOOGLE_SHEETS_ID (and all Google Sheets credentials)
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

// Now import services after env vars are loaded
// Import GoogleSheetsService class, not the singleton instance
import { GoogleSheetsService } from '../src/lib/googleSheets';
import { supabaseService } from '../src/lib/supabaseService';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client directly here to avoid import-time evaluation issues
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Create a new instance of GoogleSheetsService AFTER env vars are loaded
const googleSheetsService = new GoogleSheetsService();

interface MigrationStats {
  parents: { total: number; migrated: number; errors: number };
  students: { total: number; migrated: number; errors: number };
  events: { total: number; migrated: number; errors: number };
  eventRegistrations: { total: number; migrated: number; errors: number };
  games: { total: number; migrated: number; errors: number };
  tournaments: { total: number; migrated: number; errors: number };
  tournamentResults: { total: number; migrated: number; errors: number };
  playerOwnership: { total: number; migrated: number; errors: number };
  registrations: { total: number; migrated: number; errors: number };
}

class MigrationService {
  private supabase = supabase; // Use the client created above
  private stats: MigrationStats = {
    parents: { total: 0, migrated: 0, errors: 0 },
    students: { total: 0, migrated: 0, errors: 0 },
    events: { total: 0, migrated: 0, errors: 0 },
    eventRegistrations: { total: 0, migrated: 0, errors: 0 },
    games: { total: 0, migrated: 0, errors: 0 },
    tournaments: { total: 0, migrated: 0, errors: 0 },
    tournamentResults: { total: 0, migrated: 0, errors: 0 },
    playerOwnership: { total: 0, migrated: 0, errors: 0 },
    registrations: { total: 0, migrated: 0, errors: 0 },
  };

  async migrateParents(): Promise<void> {
    console.log('\n📋 Migrating parents...');
    
    try {
      // Get all parents from Google Sheets
      const parents = await googleSheetsService.getMembersFromParentsAndStudents();
      const parentEmails = new Set<string>();
      const uniqueParents: any[] = [];

      // Extract unique parents
      for (const member of parents) {
        if (member.parentEmail && !parentEmails.has(member.parentEmail)) {
          parentEmails.add(member.parentEmail);
          const parent = await googleSheetsService.getParentByEmail(member.parentEmail);
          if (parent) {
            uniqueParents.push(parent);
          }
        }
      }

      this.stats.parents.total = uniqueParents.length;
      console.log(`Found ${uniqueParents.length} unique parents`);

      // Migrate in batches
      const batchSize = 50;
      for (let i = 0; i < uniqueParents.length; i += batchSize) {
        const batch = uniqueParents.slice(i, i + batchSize);
        
        for (const parent of batch) {
          try {
            // Check if parent already exists
            const existing = await this.supabase
              .from('parents')
              .select('id')
              .eq('email', parent.email)
              .single();

            if (existing.data) {
              console.log(`  ⏭️  Parent ${parent.email} already exists, skipping`);
              this.stats.parents.migrated++;
              continue;
            }

            // Insert parent
            const { error } = await this.supabase.from('parents').insert({
              id: parent.id,
              name: parent.name,
              email: parent.email,
              phone: parent.phone || null,
              hear_about_us: parent.hearAboutUs || null,
              provincial_interest: parent.provincialInterest || null,
              volunteer_interest: parent.volunteerInterest || null,
              consent: parent.consent || false,
              photo_consent: parent.photoConsent || false,
              values_acknowledgment: parent.valuesAcknowledgment || false,
              newsletter: parent.newsletter || false,
              create_account: parent.createAccount || false,
              timestamp: parent.timestamp || new Date().toISOString(),
              registration_type: parent.registrationType || 'parent',
            });

            if (error) {
              if (error.code === '23505') {
                // Duplicate key - already exists
                console.log(`  ⏭️  Parent ${parent.email} already exists (duplicate key)`);
                this.stats.parents.migrated++;
              } else {
                throw error;
              }
            } else {
              this.stats.parents.migrated++;
              console.log(`  ✅ Migrated parent: ${parent.email}`);
            }
          } catch (error: any) {
            this.stats.parents.errors++;
            console.error(`  ❌ Error migrating parent ${parent.email}:`, error.message);
          }
        }
      }
    } catch (error: any) {
      console.error('Error migrating parents:', error);
      throw error;
    }
  }

  async migrateStudents(): Promise<void> {
    console.log('\n📋 Migrating students...');
    
    try {
      const students = await googleSheetsService.getAllStudents();
      this.stats.students.total = students.length;
      console.log(`Found ${students.length} students`);

      // Migrate in batches
      const batchSize = 50;
      for (let i = 0; i < students.length; i += batchSize) {
        const batch = students.slice(i, i + batchSize);
        
        for (const student of batch) {
          try {
            // Check if student already exists
            const existing = await this.supabase
              .from('students')
              .select('id')
              .eq('id', student.id)
              .single();

            if (existing.data) {
              console.log(`  ⏭️  Student ${student.id} already exists, skipping`);
              this.stats.students.migrated++;
              continue;
            }

            // Verify parent exists before inserting
            const parentCheck = await this.supabase
              .from('parents')
              .select('id')
              .eq('id', student.parentId)
              .single();

            if (!parentCheck.data) {
              console.warn(`  ⚠️  Student ${student.name} (${student.id}) has invalid parent_id: ${student.parentId}`);
              console.warn(`      Skipping - parent not found in parents table`);
              this.stats.students.errors++;
              continue;
            }

            // Insert student
            const { error } = await this.supabase.from('students').insert({
              id: student.id,
              parent_id: student.parentId,
              name: student.name,
              age: student.age || null,
              grade: student.grade || null,
              emergency_contact: student.emergencyContact || null,
              emergency_phone: student.emergencyPhone || null,
              medical_info: student.medicalInfo || null,
              timestamp: student.timestamp || new Date().toISOString(),
            });

            if (error) {
              if (error.code === '23505') {
                console.log(`  ⏭️  Student ${student.id} already exists (duplicate key)`);
                this.stats.students.migrated++;
              } else {
                throw error;
              }
            } else {
              this.stats.students.migrated++;
              console.log(`  ✅ Migrated student: ${student.name} (${student.id})`);
            }
          } catch (error: any) {
            this.stats.students.errors++;
            console.error(`  ❌ Error migrating student ${student.id}:`, error.message);
          }
        }
      }
    } catch (error: any) {
      console.error('Error migrating students:', error);
      throw error;
    }
  }

  async migrateEvents(): Promise<void> {
    console.log('\n📋 Migrating events...');
    
    try {
      const events = await googleSheetsService.getEvents();
      this.stats.events.total = events.length;
      console.log(`Found ${events.length} events`);

      for (const event of events) {
        try {
          // Check if event already exists
          const existing = await this.supabase
            .from('events')
            .select('id')
            .eq('id', event.id)
            .single();

          if (existing.data) {
            console.log(`  ⏭️  Event ${event.id} already exists, skipping`);
            this.stats.events.migrated++;
            continue;
          }

          // Insert event
          const { error } = await this.supabase.from('events').insert({
            id: event.id,
            name: event.name,
            date: event.date,
            time: event.time && event.time.match(/^\d{1,2}:\d{2}$/) ? event.time : null, // Only accept HH:MM format
            location: event.location || null,
            participants: event.participants || 0,
            max_participants: event.maxParticipants || 0,
            description: event.description || null,
            category: event.category || 'social',
            age_groups: event.ageGroups || null,
            status: event.status || 'active',
            last_updated: event.lastUpdated || new Date().toISOString(),
          });

          if (error) {
            if (error.code === '23505') {
              console.log(`  ⏭️  Event ${event.id} already exists (duplicate key)`);
              this.stats.events.migrated++;
            } else {
              throw error;
            }
          } else {
            this.stats.events.migrated++;
            console.log(`  ✅ Migrated event: ${event.name} (${event.id})`);
          }
        } catch (error: any) {
          this.stats.events.errors++;
          console.error(`  ❌ Error migrating event ${event.id}:`, error.message);
        }
      }
    } catch (error: any) {
      console.error('Error migrating events:', error);
      throw error;
    }
  }

  async migrateGames(): Promise<void> {
    console.log('\n📋 Migrating games...');
    
    try {
      const games = await googleSheetsService.getGames();
      this.stats.games.total = games.length;
      console.log(`Found ${games.length} games`);

      // Migrate in batches
      const batchSize = 100;
      for (let i = 0; i < games.length; i += batchSize) {
        const batch = games.slice(i, i + batchSize);
        
        const gameRecords = batch.map((game) => ({
          id: game.id,
          player1_id: game.player1Id,
          player1_name: game.player1Name,
          player2_id: game.player2Id,
          player2_name: game.player2Name,
          result: game.result,
          game_date: game.gameDate,
          game_time: game.gameTime || 0,
          game_type: game.gameType,
          event_id: game.eventId || null,
          notes: game.notes || null,
          recorded_by: game.recordedBy,
          recorded_at: game.recordedAt,
          opening: game.opening || null,
          endgame: game.endgame || null,
          rating_change: game.ratingChange ? JSON.stringify(game.ratingChange) : null,
          is_verified: game.isVerified || false,
          verified_by: game.verifiedBy || null,
          verified_at: game.verifiedAt || null,
        }));

        const { error } = await this.supabase.from('games').insert(gameRecords);

        if (error) {
          // Try inserting individually to find problematic records
          for (const game of batch) {
            try {
              const { error: individualError } = await this.supabase.from('games').insert({
                id: game.id,
                player1_id: game.player1Id,
                player1_name: game.player1Name,
                player2_id: game.player2Id,
                player2_name: game.player2Name,
                result: game.result,
                game_date: game.gameDate,
                game_time: game.gameTime || 0,
                game_type: game.gameType,
                event_id: game.eventId || null,
                notes: game.notes || null,
                recorded_by: game.recordedBy,
                recorded_at: game.recordedAt,
                opening: game.opening || null,
                endgame: game.endgame || null,
                rating_change: game.ratingChange ? JSON.stringify(game.ratingChange) : null,
                is_verified: game.isVerified || false,
                verified_by: game.verifiedBy || null,
                verified_at: game.verifiedAt || null,
              });

              if (individualError) {
                if (individualError.code === '23505') {
                  this.stats.games.migrated++;
                } else {
                  throw individualError;
                }
              } else {
                this.stats.games.migrated++;
              }
            } catch (error: any) {
              this.stats.games.errors++;
              console.error(`  ❌ Error migrating game ${game.id}:`, error.message);
            }
          }
        } else {
          this.stats.games.migrated += batch.length;
          console.log(`  ✅ Migrated batch of ${batch.length} games`);
        }
      }
    } catch (error: any) {
      console.error('Error migrating games:', error);
      throw error;
    }
  }

  async migrateTournaments(): Promise<void> {
    console.log('\n📋 Migrating tournaments...');
    
    try {
      const tournaments = await googleSheetsService.getTournaments();
      this.stats.tournaments.total = tournaments.length;
      console.log(`Found ${tournaments.length} tournaments`);

      for (const tournament of tournaments) {
        try {
          // Check if tournament already exists
          const existing = await this.supabase
            .from('tournaments')
            .select('id')
            .eq('id', tournament.id)
            .single();

          if (existing.data) {
            console.log(`  ⏭️  Tournament ${tournament.id} already exists, skipping`);
            this.stats.tournaments.migrated++;
            continue;
          }

          // Insert tournament
          const { error } = await this.supabase.from('tournaments').insert({
            id: tournament.id,
            name: tournament.name,
            description: tournament.description || null,
            start_date: tournament.startDate,
            status: tournament.status,
            current_round: tournament.currentRound || 1,
            total_rounds: tournament.totalRounds,
            player_ids: tournament.playerIds || [],
            created_by: tournament.createdBy,
            created_at: tournament.createdAt,
            updated_at: tournament.updatedAt,
            current_pairings: tournament.currentPairings ? JSON.parse(tournament.currentPairings) : null,
            current_forced_byes: tournament.currentForcedByes ? JSON.parse(tournament.currentForcedByes) : null,
            current_half_point_byes: tournament.currentHalfPointByes ? JSON.parse(tournament.currentHalfPointByes) : null,
          });

          if (error) {
            if (error.code === '23505') {
              console.log(`  ⏭️  Tournament ${tournament.id} already exists (duplicate key)`);
              this.stats.tournaments.migrated++;
            } else {
              throw error;
            }
          } else {
            this.stats.tournaments.migrated++;
            console.log(`  ✅ Migrated tournament: ${tournament.name} (${tournament.id})`);
          }

          // Migrate tournament results
          const results = await googleSheetsService.getTournamentResults(tournament.id, true);
          this.stats.tournamentResults.total += results.length;

          for (const result of results) {
            try {
              const { error: resultError } = await this.supabase.from('tournament_results').insert({
                tournament_id: result.tournamentId,
                player_id: result.playerId,
                player_name: result.playerName,
                games_played: result.gamesPlayed || 0,
                wins: result.wins || 0,
                losses: result.losses || 0,
                draws: result.draws || 0,
                points: result.points || 0,
                buchholz_score: result.buchholzScore || 0,
                opponents_faced: result.opponentsFaced || [],
                bye_rounds: result.byeRounds || [],
                rank: result.rank || 0,
                last_updated: result.lastUpdated,
                withdrawn: result.withdrawn || false,
                withdrawn_at: result.withdrawnAt || null,
              });

              if (resultError) {
                if (resultError.code === '23505') {
                  this.stats.tournamentResults.migrated++;
                } else {
                  throw resultError;
                }
              } else {
                this.stats.tournamentResults.migrated++;
              }
            } catch (error: any) {
              this.stats.tournamentResults.errors++;
              console.error(`  ❌ Error migrating tournament result ${result.playerId}:`, error.message);
            }
          }
        } catch (error: any) {
          this.stats.tournaments.errors++;
          console.error(`  ❌ Error migrating tournament ${tournament.id}:`, error.message);
        }
      }
    } catch (error: any) {
      console.error('Error migrating tournaments:', error);
      throw error;
    }
  }

  async printStats(): Promise<void> {
    console.log('\n📊 Migration Statistics:');
    console.log('================================');
    
    const categories = [
      'parents',
      'students',
      'events',
      'games',
      'tournaments',
      'tournamentResults',
    ] as const;

    for (const category of categories) {
      const stat = this.stats[category];
      const successRate = stat.total > 0 ? ((stat.migrated / stat.total) * 100).toFixed(1) : '0';
      console.log(`${category}:`);
      console.log(`  Total: ${stat.total}`);
      console.log(`  Migrated: ${stat.migrated} (${successRate}%)`);
      console.log(`  Errors: ${stat.errors}`);
    }

    const totalMigrated = Object.values(this.stats).reduce((sum, stat) => sum + stat.migrated, 0);
    const totalErrors = Object.values(this.stats).reduce((sum, stat) => sum + stat.errors, 0);
    const totalRecords = Object.values(this.stats).reduce((sum, stat) => sum + stat.total, 0);

    console.log('\nSummary:');
    console.log(`  Total records: ${totalRecords}`);
    console.log(`  Successfully migrated: ${totalMigrated}`);
    console.log(`  Errors: ${totalErrors}`);
  }

  async run(): Promise<void> {
    console.log('🚀 Starting migration from Google Sheets to Supabase...\n');

    try {
      // Migrate in order (respecting foreign key constraints)
      await this.migrateParents();
      await this.migrateStudents();
      await this.migrateEvents();
      await this.migrateGames();
      await this.migrateTournaments();

      this.printStats();
      
      console.log('\n✅ Migration completed!');
    } catch (error: any) {
      console.error('\n❌ Migration failed:', error);
      this.printStats();
      process.exit(1);
    }
  }
}

// Run migration if executed directly
if (require.main === module) {
  const migration = new MigrationService();
  migration.run().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { MigrationService };

