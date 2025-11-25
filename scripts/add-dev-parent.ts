/**
 * Script to add a dev parent account with test students to Supabase
 * 
 * Usage:
 *   npm run add-dev-parent
 * 
 * This creates:
 *   - Parent account: dev@example.com
 *   - 2 test students linked to that parent
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

const DEV_EMAIL = 'dev@example.com';
const DEV_NAME = 'Dev Test Parent';

async function addDevParent() {
  console.log(`\n🔍 Checking for parent account: ${DEV_EMAIL}\n`);

  // Check if parent already exists
  const normalizedEmail = DEV_EMAIL.toLowerCase().trim();
  const { data: existingParent, error: checkError } = await supabase
    .from('parents')
    .select('*')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (checkError && checkError.code !== 'PGRST116') {
    console.error(`❌ Error checking Supabase: ${checkError.message}`);
    process.exit(1);
  }

  let parentId: string;

  if (existingParent) {
    console.log(`✅ Parent account already exists:`);
    console.log(`   ID: ${existingParent.id}`);
    console.log(`   Name: ${existingParent.name}`);
    console.log(`   Email: ${existingParent.email}`);
    parentId = existingParent.id;
  } else {
    // Create new parent account
    console.log(`\n➕ Creating new parent account...`);
    parentId = `parent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();

    const { error: insertError } = await supabase.from('parents').insert({
      id: parentId,
      name: DEV_NAME,
      email: normalizedEmail,
      phone: '555-0100',
      consent: true,
      photo_consent: true,
      values_acknowledgment: true,
      newsletter: false,
      create_account: true,
      registration_type: 'parent',
      is_admin: false,
      created_at: timestamp,
      updated_at: timestamp,
    });

    if (insertError) {
      console.error(`❌ Error creating parent account: ${insertError.message}`);
      console.error(`   Code: ${insertError.code}`);
      process.exit(1);
    }

    console.log(`✅ Successfully created parent account!`);
    console.log(`   ID: ${parentId}`);
    console.log(`   Name: ${DEV_NAME}`);
    console.log(`   Email: ${DEV_EMAIL}`);
  }

  // Check existing students for this parent
  const { data: existingStudents, error: studentsError } = await supabase
    .from('students')
    .select('*')
    .eq('parent_id', parentId);

  if (studentsError) {
    console.error(`❌ Error checking existing students: ${studentsError.message}`);
    process.exit(1);
  }

  const existingStudentNames = existingStudents?.map(s => s.name) || [];
  console.log(`\n📋 Found ${existingStudents?.length || 0} existing student(s) for this parent`);

  // Create test students if they don't exist
  const testStudents = [
    {
      name: 'Alice Test',
      age: '10',
      grade: '5',
      emergency_contact: 'Emergency Contact 1',
      emergency_phone: '555-0101',
      medical_info: 'No known allergies',
    },
    {
      name: 'Bob Test',
      age: '12',
      grade: '7',
      emergency_contact: 'Emergency Contact 2',
      emergency_phone: '555-0102',
      medical_info: 'Asthma - uses inhaler',
    },
  ];

  const studentsToCreate = testStudents.filter(
    student => !existingStudentNames.includes(student.name)
  );

  if (studentsToCreate.length === 0) {
    console.log(`\n✅ All test students already exist!`);
    if (existingStudents) {
      console.log(`\n📋 Existing students:`);
      existingStudents.forEach(student => {
        console.log(`   - ${student.name} (ID: ${student.id}, Grade: ${student.grade || 'N/A'})`);
      });
    }
  }

  if (studentsToCreate.length > 0) {
    console.log(`\n➕ Creating ${studentsToCreate.length} test student(s)...`);

    const timestamp = new Date().toISOString();
    const studentsToInsert = studentsToCreate.map(student => ({
      id: `student_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      parent_id: parentId,
      name: student.name,
      age: student.age,
      grade: student.grade,
      emergency_contact: student.emergency_contact,
      emergency_phone: student.emergency_phone,
      medical_info: student.medical_info,
      timestamp,
      created_at: timestamp,
      updated_at: timestamp,
    }));

    const { error: studentsInsertError } = await supabase
      .from('students')
      .insert(studentsToInsert);

    if (studentsInsertError) {
      console.error(`❌ Error creating students: ${studentsInsertError.message}`);
      console.error(`   Code: ${studentsInsertError.code}`);
      process.exit(1);
    }

    console.log(`\n✅ Successfully created ${studentsToCreate.length} test student(s)!`);
    studentsToInsert.forEach(student => {
      console.log(`   - ${student.name} (ID: ${student.id}, Grade: ${student.grade})`);
    });
  }

  // Get all students for this parent (including newly created ones)
  const { data: allStudents } = await supabase
    .from('students')
    .select('*')
    .eq('parent_id', parentId);

  if (!allStudents || allStudents.length < 2) {
    console.log(`\n⚠️  Need at least 2 students to create games. Found: ${allStudents?.length || 0}`);
    console.log(`\n📊 Summary:`);
    console.log(`   Parent: ${DEV_NAME} (${DEV_EMAIL})`);
    console.log(`   Parent ID: ${parentId}`);
    console.log(`   Total Students: ${allStudents?.length || 0}`);
    console.log(`\n🎉 Dev parent account is ready for testing!`);
    return;
  }

  // Get Alice and Bob student IDs
  const aliceStudent = allStudents.find(s => s.name === 'Alice Test');
  const bobStudent = allStudents.find(s => s.name === 'Bob Test');

  if (!aliceStudent || !bobStudent) {
    console.log(`\n⚠️  Could not find Alice Test or Bob Test students`);
    console.log(`\n📊 Summary:`);
    console.log(`   Parent: ${DEV_NAME} (${DEV_EMAIL})`);
    console.log(`   Parent ID: ${parentId}`);
    console.log(`   Total Students: ${allStudents?.length || 0}`);
    console.log(`\n🎉 Dev parent account is ready for testing!`);
    return;
  }

  // Check for existing games between these players
  const { data: existingGames, error: gamesCheckError } = await supabase
    .from('games')
    .select('id')
    .or(`and(player1_id.eq.${aliceStudent.id},player2_id.eq.${bobStudent.id}),and(player1_id.eq.${bobStudent.id},player2_id.eq.${aliceStudent.id})`);

  if (gamesCheckError) {
    console.error(`❌ Error checking existing games: ${gamesCheckError.message}`);
  }

  const existingGameCount = existingGames?.length || 0;
  console.log(`\n📋 Found ${existingGameCount} existing game(s) between Alice and Bob`);

  // Create sample games if we don't have many already
  if (existingGameCount < 5) {
    const gamesToCreate = 5 - existingGameCount;
    console.log(`\n➕ Creating ${gamesToCreate} sample game(s)...`);

    // Generate dates spread over the past 2 months
    const today = new Date();
    const games = [];
    
    // Define game results: Alice wins 2, Bob wins 2, 1 draw
    const results: Array<'player1' | 'player2' | 'draw'> = ['player1', 'player2', 'draw', 'player1', 'player2'];
    const gameTypes: Array<'ladder' | 'tournament' | 'friendly' | 'practice'> = ['ladder', 'friendly', 'practice', 'ladder', 'friendly'];
    const openings = ['Italian Game', 'Sicilian Defense', 'French Defense', 'Ruy Lopez', 'Queen\'s Gambit'];
    const endgames = ['Checkmate', 'Resignation', 'Draw by agreement', 'Time control', 'Checkmate'];
    
    for (let i = 0; i < gamesToCreate; i++) {
      const daysAgo = (gamesToCreate - i) * 7; // Spread games weekly
      const gameDate = new Date(today);
      gameDate.setDate(gameDate.getDate() - daysAgo);
      
      // Alice is always player1, Bob is always player2
      const player1Id = aliceStudent.id;
      const player1Name = aliceStudent.name;
      const player2Id = bobStudent.id;
      const player2Name = bobStudent.name;
      const result = results[i % results.length];

      const gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const timestamp = new Date().toISOString();

      games.push({
        id: gameId,
        player1_id: player1Id,
        player1_name: player1Name,
        player2_id: player2Id,
        player2_name: player2Name,
        result: result,
        game_date: gameDate.toISOString().split('T')[0],
        game_time: 30 + Math.floor(Math.random() * 30), // 30-60 minutes
        game_type: gameTypes[i % gameTypes.length] || 'ladder',
        event_id: null,
        notes: `Sample game ${i + 1} for testing`,
        recorded_by: 'dev@example.com',
        recorded_at: timestamp,
        opening: openings[i % openings.length] || null,
        endgame: endgames[i % endgames.length] || null,
        rating_change: null, // Will be calculated automatically
        is_verified: true, // Mark as verified so they show in rankings
        verified_by: 'dev@example.com',
        verified_at: timestamp,
        created_at: timestamp,
        updated_at: timestamp,
      });
    }

    const { error: gamesInsertError } = await supabase
      .from('games')
      .insert(games);

    if (gamesInsertError) {
      console.error(`❌ Error creating games: ${gamesInsertError.message}`);
      console.error(`   Code: ${gamesInsertError.code}`);
    } else {
      console.log(`✅ Successfully created ${gamesToCreate} sample game(s)!`);
      games.forEach((game, idx) => {
        const winner = game.result === 'player1' ? game.player1_name : 
                      game.result === 'player2' ? game.player2_name : 'Draw';
        console.log(`   - ${game.player1_name} vs ${game.player2_name}: ${winner} (${game.game_type}, ${game.game_date})`);
      });
    }
  }

  // Show summary
  const { data: finalGames } = await supabase
    .from('games')
    .select('id')
    .or(`and(player1_id.eq.${aliceStudent.id},player2_id.eq.${bobStudent.id}),and(player1_id.eq.${bobStudent.id},player2_id.eq.${aliceStudent.id})`);

  console.log(`\n📊 Summary:`);
  console.log(`   Parent: ${DEV_NAME} (${DEV_EMAIL})`);
  console.log(`   Parent ID: ${parentId}`);
  console.log(`   Total Students: ${allStudents?.length || 0}`);
  console.log(`   Total Games: ${finalGames?.length || 0}`);
  console.log(`\n🎉 Dev parent account is ready for testing!`);
}

// Run if executed directly
if (require.main === module) {
  addDevParent().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { addDevParent };

