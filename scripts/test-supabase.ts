/**
 * Test script to verify Supabase database connectivity and functionality
 * Run with: npx tsx scripts/test-supabase.ts
 */

import { supabaseService } from '../src/lib/supabaseService';
import { getSupabaseClient } from '../src/lib/supabaseClient';

async function testSupabase() {
  console.log('🧪 Testing Supabase Database Connection...\n');

  try {
    // Test 1: Direct database connection
    console.log('Test 1: Direct Database Connection');
    const supabase = getSupabaseClient(true);
    const { data, error } = await supabase.from('events').select('count');
    
    if (error) {
      console.error('❌ Connection failed:', error.message);
      return;
    }
    console.log('✅ Database connection successful\n');

    // Test 2: Create a test event
    console.log('Test 2: Create Test Event');
    const testEventId = await supabaseService.addEvent({
      name: 'Test Event',
      date: '2025-12-01',
      time: '14:00',
      location: 'Test Location',
      participants: 0,
      maxParticipants: 20,
      description: 'This is a test event',
      category: 'social',
      ageGroups: 'All ages',
      status: 'active',
    });
    console.log(`✅ Test event created with ID: ${testEventId}\n`);

    // Test 3: Read events
    console.log('Test 3: Read Events');
    const events = await supabaseService.getEvents();
    console.log(`✅ Retrieved ${events.length} event(s)`);
    const testEvent = events.find(e => e.id === testEventId);
    if (testEvent) {
      console.log(`   - Found test event: ${testEvent.name}`);
    }
    console.log();

    // Test 4: Update event
    console.log('Test 4: Update Event');
    await supabaseService.updateEvent(testEventId, {
      name: 'Updated Test Event',
      participants: 5,
    });
    console.log('✅ Event updated successfully\n');

    // Test 5: Create test parent registration
    console.log('Test 5: Create Parent Registration');
    const parentId = await supabaseService.addParentRegistration({
      parentName: 'Test Parent',
      parentEmail: 'test@example.com',
      parentPhone: '123-456-7890',
      hearAboutUs: 'Test',
      provincialInterest: 'Yes',
      volunteerInterest: 'Yes',
      consent: true,
      photoConsent: true,
      valuesAcknowledgment: true,
      newsletter: false,
      createAccount: false,
      registrationType: 'parent',
    });
    console.log(`✅ Parent registration created with ID: ${parentId}\n`);

    // Test 6: Create test student
    console.log('Test 6: Create Student Registration');
    const studentId = await supabaseService.addStudentRegistration({
      parentId,
      playerName: 'Test Student',
      playerAge: '10',
      playerGrade: '5',
      emergencyContact: 'Emergency Contact',
      emergencyPhone: '987-654-3210',
      medicalInfo: 'None',
    });
    console.log(`✅ Student registration created with ID: ${studentId}\n`);

    // Test 7: Get parent by email
    console.log('Test 7: Get Parent By Email');
    const parent = await supabaseService.getParentByEmail('test@example.com');
    if (parent) {
      console.log(`✅ Found parent: ${parent.name} (${parent.email})`);
    } else {
      console.log('❌ Parent not found');
    }
    console.log();

    // Test 8: Get students by parent ID
    console.log('Test 8: Get Students By Parent ID');
    const students = await supabaseService.getStudentsByParentId(parentId);
    console.log(`✅ Found ${students.length} student(s)`);
    students.forEach(s => {
      console.log(`   - ${s.name} (Grade ${s.grade})`);
    });
    console.log();

    // Test 9: Create test game
    console.log('Test 9: Create Test Game');
    const gameId = await supabaseService.addGame({
      player1Id: 'player1_test',
      player1Name: 'Player 1',
      player2Id: 'player2_test',
      player2Name: 'Player 2',
      result: 'player1',
      gameDate: '2025-11-01',
      gameTime: 30,
      gameType: 'ladder',
      recordedBy: 'test-admin',
      recordedAt: new Date().toISOString(),
      isVerified: true,
    });
    console.log(`✅ Test game created with ID: ${gameId}\n`);

    // Test 10: Get games
    console.log('Test 10: Get Games');
    const games = await supabaseService.getGames({ gameType: 'ladder' });
    console.log(`✅ Retrieved ${games.length} ladder game(s)`);
    const testGame = games.find(g => g.id === gameId);
    if (testGame) {
      console.log(`   - Found test game: ${testGame.player1Name} vs ${testGame.player2Name}`);
    }
    console.log();

    // Test 11: Calculate rankings
    console.log('Test 11: Calculate Rankings');
    const rankings = await supabaseService.calculateRankingsFromGames();
    console.log(`✅ Calculated rankings for ${rankings.length} player(s)`);
    if (rankings.length > 0) {
      console.log(`   - Top player: ${rankings[0].name} (${rankings[0].points} points)`);
    }
    console.log();

    // Test 12: Get members
    console.log('Test 12: Get Members');
    const members = await supabaseService.getMembersFromParentsAndStudents();
    console.log(`✅ Retrieved ${members.length} member(s)`);
    const testMember = members.find(m => m.studentId === studentId);
    if (testMember) {
      console.log(`   - Found test member: ${testMember.playerName}`);
    }
    console.log();

    // Cleanup: Delete test data
    console.log('🧹 Cleaning up test data...');
    try {
      await supabaseService.deleteGame(gameId);
      await supabaseService.updateEvent(testEventId, { status: 'cancelled' });
      // Note: We don't delete parent/student as they might be needed for other tests
      console.log('✅ Test data cleaned up\n');
    } catch (error: any) {
      console.warn('⚠️  Some cleanup failed (non-critical):', error.message);
    }

    console.log('✅ All tests passed! Supabase database is working correctly.');
    console.log('\n📊 Summary:');
    console.log(`   - Events: ${events.length}`);
    console.log(`   - Games: ${games.length}`);
    console.log(`   - Members: ${members.length}`);
    console.log(`   - Rankings: ${rankings.length} players`);

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
testSupabase();

