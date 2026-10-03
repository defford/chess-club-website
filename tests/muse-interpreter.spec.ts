import { expect, test } from '@playwright/test';
import { interpretMuseTranscript } from '../src/lib/muse/interpreter';

test.describe('Muse transcript interpreter', () => {
  test('parses a ladder game without folding the game type into the opponent name', () => {
    expect(interpretMuseTranscript('Lucas beat Ethan in a ladder game.')).toEqual({
      type: 'game_result',
      player1: 'Lucas',
      player2: 'Ethan',
      outcome: 'player1',
      gameType: 'ladder',
      notes: 'Lucas beat Ethan in a ladder game.',
    });
  });

  test('parses attendance lists', () => {
    expect(interpretMuseTranscript('Attendance: Ben, Sarah, Ethan and Noah are here.')).toMatchObject({
      type: 'attendance',
      players: ['Ben', 'Sarah', 'Ethan', 'Noah'],
    });
  });

  test('parses Stockfish survival as decision-making development', () => {
    expect(
      interpretMuseTranscript('Sophie captained the Stockfish game tonight. They survived 27 moves.')
    ).toMatchObject({
      type: 'development',
      player: 'Sophie',
      eventType: 'stockfish_survival',
      skillKey: 'decision_making',
      value: 27,
      activity: 'stockfish_survival',
    });
  });

  test('parses threat-detection observations', () => {
    expect(interpretMuseTranscript('Give Emma credit for threat detection tonight.')).toMatchObject({
      type: 'development',
      player: 'Emma',
      eventType: 'skill_observation',
      skillKey: 'threat_detection',
    });
  });
});
