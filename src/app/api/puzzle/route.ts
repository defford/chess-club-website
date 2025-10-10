import { NextRequest, NextResponse } from 'next/server';
import type { PuzzleData, PuzzleParams } from '@/lib/types';

// GET /api/puzzle - Fetch puzzle from Lichess API
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract query parameters
    const themes = searchParams.get('themes')?.split(',') || [];
    const ratingMin = searchParams.get('ratingMin');
    const ratingMax = searchParams.get('ratingMax');
    const color = searchParams.get('color') as 'white' | 'black' | 'random' | null;
    
    // Build Lichess API URL - use the next puzzle endpoint which supports filtering
    let lichessUrl = 'https://lichess.org/api/puzzle/next';
    
    // Lichess DOES support filtering through the /api/puzzle/next endpoint!
    // We can use: angle (theme), difficulty, color parameters
    
    console.log(`[Puzzle API] Fetching puzzle with filters:`, {
      themes,
      ratingMin,
      ratingMax,
      color
    });
    
    // Build query parameters for Lichess API filtering
    const lichessParams = new URLSearchParams();
    
    // Add theme filtering (angle parameter)
    if (themes.length > 0 && themes[0] !== '') {
      // Use the first theme as the primary filter
      // Lichess supports themes like: pin, fork, skewer, mateIn1, mateIn2, etc.
      lichessParams.append('angle', themes[0]);
    }
    
    // Add difficulty filtering based on rating range
    if (ratingMin && ratingMax) {
      const min = parseInt(ratingMin);
      const max = parseInt(ratingMax);
      const avg = (min + max) / 2;
      
      // Map rating ranges to Lichess difficulty levels
      if (avg < 1000) {
        lichessParams.append('difficulty', 'easiest');
      } else if (avg < 1300) {
        lichessParams.append('difficulty', 'easier');
      } else if (avg < 1700) {
        lichessParams.append('difficulty', 'normal');
      } else if (avg < 2000) {
        lichessParams.append('difficulty', 'harder');
      } else {
        lichessParams.append('difficulty', 'hardest');
      }
    }
    
    // Add color filtering
    if (color && color !== 'random') {
      lichessParams.append('color', color);
    }
    
    // Build the complete URL with parameters
    if (lichessParams.toString()) {
      lichessUrl += '?' + lichessParams.toString();
    }
    
    console.log(`[Puzzle API] Using Lichess URL: ${lichessUrl}`);
    
    try {
      // Fetch puzzle from Lichess with proper filtering
      const response = await fetch(lichessUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ChessClubWebsite/1.0'
        }
      });
      
      if (!response.ok) {
        console.error(`[Puzzle API] Lichess API error: ${response.status} ${response.statusText}`);
        return NextResponse.json(
          { error: 'Failed to fetch puzzle from Lichess' },
          { status: response.status }
        );
      }
      
      const lichessData = await response.json();
      console.log(`[Puzzle API] Received puzzle data:`, {
        id: lichessData.puzzle?.id,
        rating: lichessData.puzzle?.rating,
        themes: lichessData.puzzle?.themes,
        initialPly: lichessData.puzzle?.initialPly,
        solution: lichessData.puzzle?.solution
      });
      
      // Transform Lichess response to our PuzzleData format
      const puzzleData: PuzzleData = {
        id: lichessData.puzzle.id,
        rating: lichessData.puzzle.rating,
        plays: lichessData.puzzle.plays,
        solution: lichessData.puzzle.solution,
        themes: lichessData.puzzle.themes,
        initialPly: lichessData.puzzle.initialPly,
        game: {
          id: lichessData.game.id,
          pgn: lichessData.game.pgn
        }
      };
      
      // Log information about the requested filters vs actual puzzle
      console.log(`[Puzzle API] Requested filters:`, {
        themes: themes.length > 0 ? themes : 'any',
        ratingRange: ratingMin && ratingMax ? `${ratingMin}-${ratingMax}` : 'any',
        color: color || 'any'
      });
      
      console.log(`[Puzzle API] Actual puzzle:`, {
        themes: puzzleData.themes,
        rating: puzzleData.rating
      });
      
      return NextResponse.json({
        success: true,
        puzzle: puzzleData,
        timestamp: new Date().toISOString(),
        note: "Puzzle fetched with Lichess filtering. Different selections will provide different puzzles.",
        filters: {
          themes: themes.length > 0 ? themes : 'any',
          ratingRange: ratingMin && ratingMax ? `${ratingMin}-${ratingMax}` : 'any',
          color: color || 'any'
        }
      }, {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
        }
      });
      
    } catch (error) {
      console.error('[Puzzle API] Error fetching puzzle:', error);
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to fetch puzzle',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[Puzzle API] Error fetching puzzle:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch puzzle',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
