import type { DevelopmentSkill, MuseIntent, MuseGameType } from './types';

const cleanTranscript = (value: string) =>
  value
    .trim()
    .replace(/^muse[,:]?\s*/i, '')
    .replace(/\s+/g, ' ');

const stripTimeWords = (value: string) =>
  value
    .replace(/\b(today|tonight|this evening|right now|just now)\b/gi, '')
    .replace(/[.!?]+$/g, '')
    .trim();

const splitNames = (value: string) =>
  stripTimeWords(value)
    .replace(/\b(?:are|is) here\b/gi, '')
    .replace(/\band\b/gi, ',')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);

const inferGameType = (value?: string): MuseGameType => {
  const normalized = value?.toLowerCase();
  if (normalized === 'tournament' || normalized === 'friendly' || normalized === 'practice') {
    return normalized;
  }
  return 'ladder';
};

const skillAliases: Array<{ skill: DevelopmentSkill; patterns: RegExp[] }> = [
  {
    skill: 'candidate_generation',
    patterns: [/candidate moves?/i, /candidate generation/i, /suggested .*move/i, /found .*move/i],
  },
  {
    skill: 'threat_detection',
    patterns: [/threat detection/i, /opponent'?s threat/i, /spotted .*threat/i, /identified .*threat/i, /noticed .*threat/i],
  },
  {
    skill: 'calculation',
    patterns: [/\bcalculation\b/i, /\bcalculated\b/i, /calculating lines?/i],
  },
  {
    skill: 'position_evaluation',
    patterns: [/position evaluation/i, /evaluated the position/i, /evaluating the position/i],
  },
  {
    skill: 'decision_making',
    patterns: [/decision making/i, /made the (?:final )?choice/i, /captain(?:ed)?/i],
  },
  {
    skill: 'helping_others',
    patterns: [/helped (?:another|a) player/i, /helped .* understand/i, /coached .* player/i],
  },
];

function extractDevelopmentPlayer(transcript: string): string | null {
  const patterns = [
    /give\s+(.+?)\s+credit\s+for\b/i,
    /mark\s+(.+?)\s+as\b/i,
    /record\s+(.+?)\s+for\b/i,
    /^(.+?)\s+(?:spotted|identified|noticed|demonstrated|showed|suggested|found|calculated|evaluated|helped|captained)\b/i,
    /^(.+?)\s+was\s+(?:really\s+)?(?:good|strong|better)\s+at\b/i,
  ];

  for (const pattern of patterns) {
    const match = transcript.match(pattern);
    if (match?.[1]) return stripTimeWords(match[1]);
  }

  return null;
}

export function interpretMuseTranscript(rawTranscript: string): MuseIntent {
  const transcript = cleanTranscript(rawTranscript);
  if (!transcript) {
    throw new Error('I did not hear anything to record.');
  }

  // Attendance commands: "Attendance: Ben, Sarah and Noah are here."
  if (/\battendance\b/i.test(transcript) || /\bare here\b/i.test(transcript)) {
    const colonIndex = transcript.indexOf(':');
    let namesText = colonIndex >= 0
      ? transcript.slice(colonIndex + 1)
      : transcript.replace(/^\s*(?:mark\s+)?attendance\s*(?:for)?\s*/i, '');

    if (/\bare here\b/i.test(namesText)) {
      namesText = namesText.replace(/\bare here\b.*$/i, '');
    }

    const players = splitNames(namesText);
    if (players.length === 0) {
      throw new Error('I heard an attendance command, but not any player names.');
    }

    return {
      type: 'attendance',
      players,
      notes: rawTranscript.trim(),
    };
  }

  // Draw: "Ethan drew with Lucas."
  const drawMatch = transcript.match(
    /^(.+?)\s+(?:drew|draws?)\s+(?:with|against)\s+(.+?)(?:\s+(?:in|during)\s+(?:a\s+)?(ladder|friendly|practice|tournament)(?:\s+game)?)?$/i
  );
  if (drawMatch) {
    return {
      type: 'game_result',
      player1: stripTimeWords(drawMatch[1]),
      player2: stripTimeWords(drawMatch[2]),
      outcome: 'draw',
      gameType: inferGameType(drawMatch[3]),
      notes: rawTranscript.trim(),
    };
  }

  // Decisive game: "Lucas beat Ethan in a ladder game."
  const gameMatch = transcript.match(
    /^(.+?)\s+(?:beat|beats|defeated|defeats|won against|won over)\s+(.+?)(?:\s+(?:in|during)\s+(?:a\s+)?(ladder|friendly|practice|tournament)(?:\s+game)?)?$/i
  );
  if (gameMatch) {
    return {
      type: 'game_result',
      player1: stripTimeWords(gameMatch[1]),
      player2: stripTimeWords(gameMatch[2]),
      outcome: 'player1',
      gameType: inferGameType(gameMatch[3]),
      notes: rawTranscript.trim(),
    };
  }

  // Stockfish survival: "Sophie captained the Stockfish game. They survived 27 moves."
  if (/stockfish/i.test(transcript)) {
    const movesMatch = transcript.match(/(\d+)\s+moves?/i);
    const captainMatch = transcript.match(/^(.+?)\s+captain(?:ed)?\b/i);
    const survivalMatch = transcript.match(/^(.+?)\s+surviv(?:ed|ing)\b/i);
    const player = captainMatch?.[1] || survivalMatch?.[1];

    if (player && movesMatch) {
      const moves = Number(movesMatch[1]);
      return {
        type: 'development',
        player: stripTimeWords(player),
        eventType: 'stockfish_survival',
        skillKey: 'decision_making',
        activity: 'stockfish_survival',
        value: moves,
        valueText: `${moves} moves`,
        notes: rawTranscript.trim(),
        metadata: { movesSurvived: moves },
      };
    }
  }

  // General development observations.
  const alias = skillAliases.find(({ patterns }) => patterns.some((pattern) => pattern.test(transcript)));
  if (alias) {
    const player = extractDevelopmentPlayer(transcript);
    if (!player) {
      throw new Error('I recognized the chess skill, but could not tell which player you meant.');
    }

    return {
      type: 'development',
      player,
      eventType: 'skill_observation',
      skillKey: alias.skill,
      activity: /stockfish/i.test(transcript) ? 'stockfish_survival' : undefined,
      notes: rawTranscript.trim(),
    };
  }

  throw new Error(
    'I could not confidently interpret that yet. Try a game result, attendance list, Stockfish survival result, or a named skill observation.'
  );
}
