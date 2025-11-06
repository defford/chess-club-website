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
  // Use the page's baseURL if available (from Playwright config), otherwise use provided baseURL
  const urlToUse = baseURL || page.url().split('/').slice(0, 3).join('/');
  
  // Navigate to the base URL first to establish the page context
  // This ensures relative URLs resolve correctly
  try {
    await page.goto(urlToUse, { waitUntil: 'domcontentloaded', timeout: 30000 });
  } catch (e) {
    // If navigation fails, the server might not be ready
    throw new Error(
      `Failed to navigate to ${urlToUse}. Is the server running?\n` +
      `Original error: ${e}`
    );
  }

  // Use fetch from within the page context to ensure correct origin
  const result = await page.evaluate(async (data) => {
    const response = await fetch('/api/analysis/state', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `HTTP ${response.status} ${response.statusText}: ${text.substring(0, 500)}`
      );
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await response.text();
      throw new Error(
        `Expected JSON but got ${contentType}: ${text.substring(0, 500)}`
      );
    }

    return await response.json();
  }, {
    gameHistory,
    currentMoveIndex: gameHistory.currentMoveIndex,
  });

  if (!result.success) {
    throw new Error(`Failed to setup game history: ${JSON.stringify(result)}`);
  }

  // Wait a bit for state to propagate
  await page.waitForTimeout(500);
}

/**
 * Wait for SSE connection to be established and initial state received.
 * Checks for connection status indicator or console logs.
 * Returns true if connected, false if not (but doesn't throw - allows tests to proceed)
 */
export async function waitForSSEConnection(page: Page, timeout: number = 15000): Promise<boolean> {
  if (page.isClosed()) {
    console.warn('[SSE Connection] Page is closed, cannot check connection');
    return false;
  }

  try {
    // Wait for connection indicator to show "Connected"
    // The controller page shows connection status in the UI
    await page.waitForFunction(
      () => {
        // Look for green connection status
        const statusElement = document.querySelector('[class*="text-green"]');
        if (statusElement?.textContent?.includes('Connected')) {
          return true;
        }
        // Also check for any connection status text
        const allText = document.body.innerText || '';
        if (allText.includes('Connected')) {
          return true;
        }
        return false;
      },
      { timeout: Math.min(timeout, 10000) }
    );
    console.log('[SSE Connection] Connection established successfully');
    return true;
  } catch (e) {
    // SSE connection failed - this is expected on Vercel sometimes
    console.warn('[SSE Connection] SSE connection not established (this may be expected on Vercel)');
    
    // Fallback: wait for page to be loaded and check if controller/board elements exist
    try {
      if (page.isClosed()) {
        return false;
      }
      await page.waitForLoadState('domcontentloaded', { timeout: 5000 });
      // Check if the page has loaded by looking for key elements
      await page.waitForSelector('button, [class*="controller"], [class*="chessboard"]', { 
        timeout: 5000,
        state: 'visible' 
      }).catch(() => {
        // If elements aren't found, that's okay - just proceed
      });
      console.log('[SSE Connection] Page loaded, proceeding without SSE verification');
      return false; // SSE not connected, but page is usable
    } catch (fallbackError) {
      // If even fallback fails, log but don't throw - let tests proceed
      console.warn('[SSE Connection] Could not verify connection status, proceeding anyway');
      return false;
    }
  }
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
 * @param allowDisabled - If true, will not fail if button is disabled (useful for boundary tests)
 */
export async function clickControllerButton(
  page: Page,
  buttonText: 'First Move' | 'Previous' | 'Next',
  waitForUpdate: boolean = true,
  allowDisabled: boolean = false
): Promise<void> {
  // Check if page is still open
  if (page.isClosed()) {
    throw new Error('Page has been closed');
  }

  // Find button by text
  const button = page.getByRole('button', { name: buttonText, exact: false });
  
  // Check if button is disabled
  let isDisabled = false;
  try {
    isDisabled = await button.isDisabled();
  } catch (e) {
    // If we can't check, assume it's not disabled and try to click
    isDisabled = false;
  }
  
  if (isDisabled && !allowDisabled) {
    // Wait for button to be enabled, but don't fail if page closes
    try {
      await expect(button).toBeEnabled({ timeout: 5000 });
    } catch (e: any) {
      if (e.message?.includes('closed') || page.isClosed()) {
        throw new Error('Page closed while waiting for button to be enabled');
      }
      throw e;
    }
  } else if (isDisabled && allowDisabled) {
    // Button is disabled and that's expected - return early
    return;
  }
  
  // Click button
  try {
    await button.click();
  } catch (e: any) {
    if (page.isClosed() || e.message?.includes('closed')) {
      throw new Error('Page closed while clicking button');
    }
    throw e;
  }
  
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
  if (page.isClosed()) {
    return 'disconnected';
  }

  try {
    const statusElement = await page.$('text=/Connected|Disconnected/').catch(() => null);
    if (!statusElement) {
      return 'disconnected';
    }
    
    const text = await statusElement.textContent().catch(() => '');
    return text?.includes('Connected') ? 'connected' : 'disconnected';
  } catch (e) {
    // If page is closed or element not found, return disconnected
    return 'disconnected';
  }
}

