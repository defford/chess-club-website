import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;

  return NextResponse.json({
    openapi: '3.1.0',
    info: {
      title: 'CNLSCC Chess Club Connector',
      version: '1.0.0',
      description:
        'Private connector for the Central NL Scholastic Chess Club. Use it to find players, read the authoritative current-season ladder standings, read individual chess progress, record verified club events, and undo connector-recorded events. Never reconstruct ladder standings from player search results or guess between ambiguous player matches.',
    },
    servers: [{ url: origin }],
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/api/meta-muse/players': {
        get: {
          operationId: 'searchPlayers',
          summary: 'Search chess club players',
          description:
            'READ tool. Search players by name before a write when the spoken name may be ambiguous. Returns only student ID, name, and grade.',
          parameters: [
            {
              name: 'q',
              in: 'query',
              required: true,
              schema: { type: 'string', minLength: 1 },
              description: 'Full or partial player name.',
            },
          ],
          responses: {
            '200': {
              description: 'Matching players.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      query: { type: 'string' },
                      players: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/PlayerMatch' },
                      },
                    },
                    required: ['query', 'players'],
                  },
                },
              },
            },
          },
        },
      },
      '/api/meta-muse/ladder-standings': {
        get: {
          operationId: 'getLadderStandings',
          summary: 'Get current-season ladder standings',
          description:
            'READ tool. This is the authoritative source for questions such as top players, ladder rank, standings, or leaderboard. Do not reconstruct standings by searching players individually. Before the season begins, or before any current-season ladder games are recorded, standings is empty and players are unranked.',
          parameters: [
            {
              name: 'limit',
              in: 'query',
              required: false,
              schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
              description: 'Maximum number of ranked players to return.',
            },
          ],
          responses: {
            '200': {
              description: 'Current-season ladder standings and season status.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      season: {
                        type: 'object',
                        properties: {
                          key: { type: 'string' },
                          label: { type: 'string' },
                          startDate: { type: 'string', format: 'date' },
                          status: { type: 'string', enum: ['preseason', 'active'] },
                        },
                        required: ['key', 'label', 'startDate', 'status'],
                      },
                      totalRankedPlayers: { type: 'integer' },
                      standings: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            rank: { type: 'integer' },
                            playerId: { type: 'string' },
                            name: { type: 'string' },
                            grade: { type: 'string' },
                            gamesPlayed: { type: 'integer' },
                            wins: { type: 'integer' },
                            draws: { type: 'integer' },
                            losses: { type: 'integer' },
                            points: { type: 'number' },
                            eloRating: { type: 'integer' },
                          },
                          required: [
                            'rank',
                            'playerId',
                            'name',
                            'gamesPlayed',
                            'wins',
                            'draws',
                            'losses',
                            'points',
                            'eloRating',
                          ],
                        },
                      },
                      message: { type: 'string' },
                    },
                    required: ['season', 'totalRankedPlayers', 'standings'],
                  },
                },
              },
            },
          },
        },
      },
      '/api/meta-muse/player-summary': {
        get: {
          operationId: 'getPlayerSummary',
          summary: 'Get chess progress for one player',
          description:
            'READ tool. Returns current-season ladder stats separately from all-time verified career stats, plus Elo, attendance count, achievements, and recent chess-development observations. Use getLadderStandings for leaderboard/top-player questions and a playerId returned by searchPlayers for individual progress.',
          parameters: [
            {
              name: 'playerId',
              in: 'query',
              required: true,
              schema: { type: 'string', minLength: 1 },
            },
          ],
          responses: {
            '200': {
              description: 'Player progress summary.',
              content: {
                'application/json': {
                  schema: { type: 'object', additionalProperties: true },
                },
              },
            },
          },
        },
      },
      '/api/meta-muse/record': {
        post: {
          operationId: 'recordChessEvent',
          summary: 'Record a chess club event',
          description:
            'WRITE tool. Records a verified game result, attendance, or a chess-development observation. Player names are resolved against the club database. If a name is ambiguous, the API returns HTTP 409 with candidates; do not retry by guessing.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  oneOf: [
                    { $ref: '#/components/schemas/GameResultEvent' },
                    { $ref: '#/components/schemas/AttendanceEvent' },
                    { $ref: '#/components/schemas/DevelopmentEvent' },
                  ],
                  discriminator: { propertyName: 'type' },
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Event recorded successfully.',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/AppliedAction' },
                },
              },
            },
            '409': {
              description: 'Player name is ambiguous or missing. Ask the user which player they meant.',
              content: {
                'application/json': {
                  schema: { type: 'object', additionalProperties: true },
                },
              },
            },
          },
        },
      },
      '/api/meta-muse/undo': {
        post: {
          operationId: 'undoChessEvent',
          summary: 'Undo a Meta Muse-recorded chess event',
          description:
            'WRITE tool. Reverses a previously recorded connector action. If actionId is omitted, reverses the latest applied Meta Muse connector action. Game undo rebuilds Elo and affected achievements.',
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    actionId: {
                      type: 'string',
                      description: 'Optional action ID returned by recordChessEvent.',
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Action reversed.',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/AppliedAction' },
                },
              },
            },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key',
          description:
            'Private CNLSCC connector key. Store it in Muse Secure Credentials Store; never include it in conversation text.',
        },
      },
      schemas: {
        PlayerMatch: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            grade: { type: 'string' },
          },
          required: ['id', 'name'],
        },
        GameResultEvent: {
          type: 'object',
          properties: {
            type: { type: 'string', const: 'game_result' },
            player1: {
              type: 'string',
              description: 'First player name. For a decisive game this can be the winner.',
            },
            player2: { type: 'string', description: 'Second player name.' },
            outcome: {
              type: 'string',
              enum: ['player1', 'player2', 'draw'],
              description: 'Which named player won, or draw.',
            },
            gameType: {
              type: 'string',
              enum: ['ladder', 'tournament', 'friendly', 'practice'],
              default: 'ladder',
            },
            gameDate: {
              type: 'string',
              format: 'date',
              description: 'Optional YYYY-MM-DD. If omitted, uses the current date in Newfoundland.',
            },
            notes: { type: 'string' },
          },
          required: ['type', 'player1', 'player2', 'outcome', 'gameType'],
        },
        AttendanceEvent: {
          type: 'object',
          properties: {
            type: { type: 'string', const: 'attendance' },
            players: {
              type: 'array',
              minItems: 1,
              items: { type: 'string' },
              description: 'Player names to mark present.',
            },
            meetId: { type: 'string' },
            meetDate: {
              type: 'string',
              format: 'date',
              description: 'Optional YYYY-MM-DD. Uses or creates that club meet.',
            },
            notes: { type: 'string' },
          },
          required: ['type', 'players'],
        },
        DevelopmentEvent: {
          type: 'object',
          properties: {
            type: { type: 'string', const: 'development' },
            player: { type: 'string' },
            eventType: {
              type: 'string',
              description:
                'Short factual event type, for example skill_observation or stockfish_survival.',
            },
            skillKey: {
              type: 'string',
              enum: [
                'candidate_generation',
                'threat_detection',
                'calculation',
                'position_evaluation',
                'decision_making',
                'helping_others',
              ],
            },
            activity: {
              type: 'string',
              description: 'Activity context such as stockfish_survival.',
            },
            value: {
              type: 'number',
              description: 'Optional measurable value, such as 27 moves survived.',
            },
            valueText: { type: 'string' },
            notes: {
              type: 'string',
              description: 'Brief factual observation supplied by the club leader.',
            },
            metadata: { type: 'object', additionalProperties: true },
          },
          required: ['type', 'player', 'eventType'],
        },
        AppliedAction: {
          type: 'object',
          properties: {
            actionId: { type: 'string' },
            summary: { type: 'string' },
            result: { type: 'object', additionalProperties: true },
          },
          required: ['actionId', 'summary', 'result'],
        },
      },
    },
  });
}
