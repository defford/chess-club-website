/**
 * Script to add test students and games for defford@gmail.com parent account
 * 
 * Usage:
 *   npx tsx scripts/add-defford-students.ts
 * 
 * This creates:
 *   - 2 test students for defford@gmail.com parent account
 *   - Several games for each student
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

const PARENT_EMAIL = 'defford@gmail.com';
const PARENT_NAME = 'Dan Efford';

async function addDeffordStudents() {
  console.log(`\n🔍 Checking for parent account: ${PARENT_EMAIL}\n`);

  // Check if parent already exists
  const normalizedEmail = PARENT_EMAIL.toLowerCase().trim();
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
      name: PARENT_NAME,
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
    console.log(`   Name: ${PARENT_NAME}`);
    console.log(`   Email: ${PARENT_EMAIL}`);
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
      name: 'Emma Efford',
      age: '11',
      grade: '6',
      emergency_contact: 'Dan Efford',
      emergency_phone: '555-0101',
      medical_info: 'No known allergies',
    },
    {
      name: 'Lucas Efford',
      age: '9',
      grade: '4',
      emergency_contact: 'Dan Efford',
      emergency_phone: '555-0101',
      medical_info: 'No known allergies',
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
      elo_rating: 1000, // Default ELO rating
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
  const { data: allStudents, error: allStudentsError } = await supabase
    .from('students')
    .select('*')
    .eq('parent_id', parentId);

  if (allStudentsError) {
    console.error(`❌ Error fetching students: ${allStudentsError.message}`);
    process.exit(1);
  }

  if (!allStudents || allStudents.length < 2) {
    console.log(`\n⚠️  Need at least 2 students to create games. Found: ${allStudents?.length || 0}`);
    console.log(`\n📊 Summary:`);
    console.log(`   Parent: ${PARENT_NAME} (${PARENT_EMAIL})`);
    console.log(`   Parent ID: ${parentId}`);
    console.log(`   Total Students: ${allStudents?.length || 0}`);
    console.log(`\n🎉 Students created successfully!`);
    return;
  }

  // Get Emma and Lucas student IDs
  const emmaStudent = allStudents.find(s => s.name === 'Emma Efford');
  const lucasStudent = allStudents.find(s => s.name === 'Lucas Efford');

  if (!emmaStudent || !lucasStudent) {
    console.log(`\n⚠️  Could not find Emma Efford or Lucas Efford students`);
    console.log(`\n📊 Summary:`);
    console.log(`   Parent: ${PARENT_NAME} (${PARENT_EMAIL})`);
    console.log(`   Parent ID: ${parentId}`);
    console.log(`   Total Students: ${allStudents?.length || 0}`);
    console.log(`\n🎉 Students created successfully!`);
    return;
  }

  // Get some other students to play against (optional - for variety)
  const { data: otherStudents } = await supabase
    .from('students')
    .select('id, name')
    .neq('parent_id', parentId)
    .limit(5);

  const opponents = otherStudents || [];
  console.log(`\n📋 Found ${opponents.length} other student(s) to play against`);

  // Check for existing games
  const { data: existingGames, error: gamesCheckError } = await supabase
    .from('games')
    .select('id')
    .or(`player1_id.eq.${emmaStudent.id},player2_id.eq.${emmaStudent.id},player1_id.eq.${lucasStudent.id},player2_id.eq.${lucasStudent.id}`);

  if (gamesCheckError) {
    console.error(`❌ Error checking existing games: ${gamesCheckError.message}`);
  }

  const existingGameCount = existingGames?.length || 0;
  console.log(`\n📋 Found ${existingGameCount} existing game(s) for these students`);

  // Create games for each student
  const gamesToCreate: any[] = [];
  const today = new Date();

  // Games between Emma and Lucas (3 games)
  const emmaVsLucasResults: Array<'player1' | 'player2' | 'draw'> = ['player1', 'player2', 'draw'];
  for (let i = 0; i < 3; i++) {
    const daysAgo = (3 - i) * 5; // Spread games over past 15 days
    const gameDate = new Date(today);
    gameDate.setDate(gameDate.getDate() - daysAgo);
    
    const gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();

    gamesToCreate.push({
      id: gameId,
      player1_id: emmaStudent.id,
      player1_name: emmaStudent.name,
      player2_id: lucasStudent.id,
      player2_name: lucasStudent.name,
      result: emmaVsLucasResults[i],
      game_date: gameDate.toISOString().split('T')[0],
      game_time: 30 + Math.floor(Math.random() * 30), // 30-60 minutes
      game_type: 'ladder',
      event_id: null,
      notes: `Test game ${i + 1} between siblings`,
      recorded_by: PARENT_EMAIL,
      recorded_at: timestamp,
      opening: ['Italian Game', 'Sicilian Defense', 'French Defense'][i] || null,
      endgame: ['Checkmate', 'Resignation', 'Draw by agreement'][i] || null,
      rating_change: null, // Will be calculated automatically
      is_verified: true,
      verified_by: PARENT_EMAIL,
      verified_at: timestamp,
      created_at: timestamp,
      updated_at: timestamp,
    });
  }

  // Games for Emma against other opponents (3 games)
  if (opponents.length > 0) {
    const emmaOpponentResults: Array<'player1' | 'player2' | 'draw'> = ['player1', 'player1', 'player2'];
    for (let i = 0; i < Math.min(3, opponents.length); i++) {
      const opponent = opponents[i];
      const daysAgo = (3 - i) * 7; // Spread games weekly
      const gameDate = new Date(today);
      gameDate.setDate(gameDate.getDate() - daysAgo);
      
      const gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const timestamp = new Date().toISOString();

      gamesToCreate.push({
        id: gameId,
        player1_id: emmaStudent.id,
        player1_name: emmaStudent.name,
        player2_id: opponent.id,
        player2_name: opponent.name,
        result: emmaOpponentResults[i],
        game_date: gameDate.toISOString().split('T')[0],
        game_time: 25 + Math.floor(Math.random() * 35), // 25-60 minutes
        game_type: 'ladder',
        event_id: null,
        notes: `Test game for Emma against ${opponent.name}`,
        recorded_by: PARENT_EMAIL,
        recorded_at: timestamp,
        opening: ['Ruy Lopez', 'Queen\'s Gambit', 'King\'s Indian Defense'][i] || null,
        endgame: ['Checkmate', 'Time control', 'Resignation'][i] || null,
        rating_change: null,
        is_verified: true,
        verified_by: PARENT_EMAIL,
        verified_at: timestamp,
        created_at: timestamp,
        updated_at: timestamp,
      });
    }
  }

  // Games for Lucas against other opponents (3 games)
  if (opponents.length > 0) {
    const lucasOpponentResults: Array<'player1' | 'player2' | 'draw'> = ['player2', 'player1', 'draw'];
    for (let i = 0; i < Math.min(3, opponents.length); i++) {
      const opponent = opponents[i];
      const daysAgo = (3 - i) * 6; // Spread games over past 18 days
      const gameDate = new Date(today);
      gameDate.setDate(gameDate.getDate() - daysAgo);
      
      const gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const timestamp = new Date().toISOString();

      gamesToCreate.push({
        id: gameId,
        player1_id: opponent.id,
        player1_name: opponent.name,
        player2_id: lucasStudent.id,
        player2_name: lucasStudent.name,
        result: lucasOpponentResults[i] === 'player1' ? 'player1' : lucasOpponentResults[i] === 'player2' ? 'player2' : 'draw',
        game_date: gameDate.toISOString().split('T')[0],
        game_time: 20 + Math.floor(Math.random() * 40), // 20-60 minutes
        game_type: 'ladder',
        event_id: null,
        notes: `Test game for Lucas against ${opponent.name}`,
        recorded_by: PARENT_EMAIL,
        recorded_at: timestamp,
        opening: ['English Opening', 'Nimzo-Indian Defense', 'Dutch Defense'][i] || null,
        endgame: ['Checkmate', 'Draw by agreement', 'Resignation'][i] || null,
        rating_change: null,
        is_verified: true,
        verified_by: PARENT_EMAIL,
        verified_at: timestamp,
        created_at: timestamp,
        updated_at: timestamp,
      });
    }
  }

  // Filter out games that might already exist (simple check by date and players)
  const gamesToInsert = gamesToCreate.filter(game => {
    // Check if a game with same players and date already exists
    const existing = existingGames?.find(existingGame => {
      // We can't easily check without fetching full game data, so we'll insert and let DB handle duplicates
      return false;
    });
    return !existing;
  });

  if (gamesToInsert.length > 0) {
    console.log(`\n➕ Creating ${gamesToInsert.length} game(s)...`);

    const { error: gamesInsertError } = await supabase
      .from('games')
      .insert(gamesToInsert);

    if (gamesInsertError) {
      console.error(`❌ Error creating games: ${gamesInsertError.message}`);
      console.error(`   Code: ${gamesInsertError.code}`);
      // Don't exit - show what was created
    } else {
      console.log(`✅ Successfully created ${gamesToInsert.length} game(s)!`);
      gamesToInsert.forEach((game, idx) => {
        const winner = game.result === 'player1' ? game.player1_name : 
                      game.result === 'player2' ? game.player2_name : 'Draw';
        console.log(`   ${idx + 1}. ${game.player1_name} vs ${game.player2_name}: ${winner} (${game.game_type}, ${game.game_date})`);
      });
    }
  } else {
    console.log(`\n✅ All games already exist!`);
  }

  // Show final summary
  const { data: finalGames } = await supabase
    .from('games')
    .select('id')
    .or(`player1_id.eq.${emmaStudent.id},player2_id.eq.${emmaStudent.id},player1_id.eq.${lucasStudent.id},player2_id.eq.${lucasStudent.id}`);

  console.log(`\n📊 Summary:`);
  console.log(`   Parent: ${PARENT_NAME} (${PARENT_EMAIL})`);
  console.log(`   Parent ID: ${parentId}`);
  console.log(`   Total Students: ${allStudents?.length || 0}`);
  console.log(`   - Emma Efford: ${emmaStudent.id}`);
  console.log(`   - Lucas Efford: ${lucasStudent.id}`);
  console.log(`   Total Games: ${finalGames?.length || 0}`);
  console.log(`\n🎉 Test students and games created successfully!`);
}

// Run if executed directly
if (require.main === module) {
  addDeffordStudents().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { addDeffordStudents };


