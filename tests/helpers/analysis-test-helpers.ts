import { Page, expect } from '@playwright/test';
import { GameHistory } from '../../src/lib/types';

/**
 * Set up game history on the server via API POST request.
 * This initializes the shared state that both controller and board will sync to.
 */
export async function setupGameHistory(
  page: Page,
  gameHistory: GameHistory,
  baseURL: string = 'http://localhost:3000'
): Promise<void> {
  const response = await page.request.post(`${baseURL}/api/analysis/state`, {
    data: {
      gameHistory,
      currentMoveIndex: gameHistory.currentMoveIndex,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to setup game history: ${response.status()} ${response.statusText()}`);
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(`Failed to setup game history: ${JSON.stringify(result)}`);
  }

  // Wait a bit for state to propagate
  await page.waitForTimeout(500);
}

/**
 * Wait for SSE connection to be established and initial state received.
 * Checks for connection status indicator or console logs.
 */
export async function waitForSSEConnection(page: Page, timeout: number = 10000): Promise<void> {
  // Wait for connection indicator to show "Connected"
  // The controller page shows connection status in the UI
  await page.waitForFunction(
    () => {
      const statusElement = document.querySelector('[class*="text-green"]');
      return statusElement?.textContent?.includes('Connected') || false;
    },
    { timeout }
  ).catch(() => {
    // Fallback: just wait for page to be fully loaded
    return page.waitForLoadState('networkidle', { timeout });
  });
}

/**
 * Extract current FEN from the chessboard component.
 * Uses JavaScript evaluation to access the react-chessboard component's position prop.
 * Falls back to reading from localStorage game history if component access fails.
 */
export async function getCurrentFEN(page: Page): Promise<string> {
  // First, wait for the board to be visible
  await page.waitForSelector('div[class*="react-chessboard"], div[class*="chessboard"]', {
    timeout: 10000,
    state: 'visible',
  }).catch(() => {
    // If board selector not found, continue with fallback methods
  });

  // Method: Access React component props via React DevTools or fiber tree
  const fen = await page.evaluate(() => {
    // Find the chessboard container element
    const boardContainer = document.querySelector('div[class*="react-chessboard"]') ||
                           document.querySelector('div[class*="chessboard"]') ||
                           Array.from(document.querySelectorAll('div')).find(el => 
                             el.querySelector('svg') && el.querySelectorAll('svg').length === 1
                           );

    if (!boardContainer) {
      return null;
    }

    // Try to access React fiber to get component props
    const reactKey = Object.keys(boardContainer).find(key => 
      key.startsWith('__reactFiber') || key.startsWith('__reactInternalInstance')
    );

    if (reactKey) {
      let fiber = (boardContainer as any)[reactKey];
      
      // Walk up the fiber tree to find the component with position prop
      while (fiber) {
        if (fiber.memoizedProps?.position) {
          return fiber.memoizedProps.position;
        }
        if (fiber.pendingProps?.position) {
          return fiber.pendingProps.position;
        }
        fiber = fiber.return;
      }
    }

    // Alternative: Try to find React root and search component tree
    const reactRoot = (boardContainer as any).__reactContainer$ ||
                      (boardContainer as any)._reactRootContainer;
    
    if (reactRoot) {
      let current = reactRoot.current;
      while (current) {
        if (current.memoizedProps?.position) {
          return current.memoizedProps.position;
        }
        current = current.child || current.sibling;
      }
    }

    return null;
  });

  if (fen && typeof fen === 'string') {
    return fen;
  }

  // Fallback: Extract from game history state in localStorage or window
  const fallbackFEN = await page.evaluate(() => {
    // Check localStorage for game history
    try {
      const saved = localStorage.getItem('chess-analysis-history');
      if (saved) {
        const history = JSON.parse(saved);
        const currentIndex = history.currentMoveIndex || -1;
        if (currentIndex === -1) {
          return history.startFen;
        }
        if (history.moves && history.moves[currentIndex]) {
          return history.moves[currentIndex].fen;
        }
      }
    } catch (e) {
      // Ignore localStorage errors
    }

    // Check for FEN in page text (if displayed somewhere)
    const allText = document.body.innerText;
    const fenPattern = /([rnbqkbnrRNBQKBNR\/\d]+\s+[wb]\s+[KQkq\-]+\s+[a-h1-8\-]+\s+\d+\s+\d+)/;
    const match = allText.match(fenPattern);
    if (match) {
      return match[1];
    }

    return null;
  });

  if (fallbackFEN) {
    return fallbackFEN;
  }

  throw new Error('Could not extract FEN from chessboard. The board may not be fully loaded.');
}

/**
 * Wait for the board FEN to match the expected FEN.
 * Useful for waiting for SSE updates to propagate.
 */
export async function waitForFEN(
  page: Page,
  expectedFEN: string,
  timeout: number = 5000
): Promise<void> {
  await expect(async () => {
    const currentFEN = await getCurrentFEN(page);
    // Normalize FEN strings (remove extra whitespace)
    const normalizedCurrent = currentFEN.trim().replace(/\s+/g, ' ');
    const normalizedExpected = expectedFEN.trim().replace(/\s+/g, ' ');
    
    if (normalizedCurrent !== normalizedExpected) {
      throw new Error(`FEN mismatch. Expected: ${normalizedExpected}, Got: ${normalizedCurrent}`);
    }
  }).toPass({ timeout });
}

/**
 * Get the current move index from the controller page.
 * Reads from the move count display.
 */
export async function getCurrentMoveIndex(page: Page): Promise<number> {
  // Try to find the move count text element
  const moveTextElement = page.locator('text=/Move \\d+ of \\d+/').first();
  
  try {
    const moveText = await moveTextElement.textContent({ timeout: 5000 });
    
    if (moveText) {
      // Parse "Move X of Y" format
      const match = moveText.match(/Move\s+(\d+)\s+of\s+(\d+)/);
      if (match) {
        return parseInt(match[1], 10) - 1; // Convert to 0-based index (Move 1 = index 0)
      }
    }
  } catch (e) {
    // Element not found, try fallback
  }

  // Fallback: try to read from state via JavaScript
  return await page.evaluate(() => {
    // Try to find state in React DevTools or window object
    return (window as any).__analysisState__?.currentMoveIndex ?? -1;
  });
}

/**
 * Click controller button and wait for action to complete.
 */
export async function clickControllerButton(
  page: Page,
  buttonText: 'First Move' | 'Previous' | 'Next',
  waitForUpdate: boolean = true
): Promise<void> {
  // Find button by text
  const button = page.getByRole('button', { name: buttonText, exact: false });
  
  // Wait for button to be enabled
  await expect(button).toBeEnabled({ timeout: 5000 });
  
  // Click button
  await button.click();
  
  // Wait for network request to complete
  await page.waitForResponse(
    (response) => response.url().includes('/api/analysis/state') && response.request().method() === 'POST',
    { timeout: 5000 }
  ).catch(() => {
    // If no response detected, just wait a bit
    return page.waitForTimeout(1000);
  });

  if (waitForUpdate) {
    // Wait a bit more for SSE to propagate
    await page.waitForTimeout(500);
  }
}

/**
 * Verify board position matches expected FEN.
 */
export async function verifyBoardPosition(
  page: Page,
  expectedFEN: string,
  timeout: number = 5000
): Promise<void> {
  await waitForFEN(page, expectedFEN, timeout);
}

/**
 * Get connection status from controller page.
 */
export async function getConnectionStatus(page: Page): Promise<'connected' | 'disconnected'> {
  const statusElement = await page.$('text=/Connected|Disconnected/');
  if (!statusElement) {
    return 'disconnected';
  }
  
  const text = await statusElement.textContent();
  return text?.includes('Connected') ? 'connected' : 'disconnected';
}

