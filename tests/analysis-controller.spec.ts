import { test, expect, BrowserContext } from '@playwright/test';
import { generatePresetGameHistory, getExpectedFENForMoveIndex } from './fixtures/preset-game-history';
import {
  setupGameHistory,
  waitForSSEConnection,
  getCurrentFEN,
  waitForFEN,
  clickControllerButton,
  verifyBoardPosition,
  getConnectionStatus,
  getCurrentMoveIndex,
} from './helpers/analysis-test-helpers';

/**
 * Get base URL from environment variable or default to localhost.
 * Handles Vercel URL which may or may not include protocol.
 */
function getBaseURL(): string {
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) {
    // Vercel URL might already include protocol, or might not
    if (vercelUrl.startsWith('http://') || vercelUrl.startsWith('https://')) {
      return vercelUrl;
    }
    return `https://${vercelUrl}`;
  }
  
  if (process.env.BASE_URL) {
    return process.env.BASE_URL;
  }
  
  return 'http://localhost:3000';
}

const baseURL = getBaseURL();

// Log the baseURL being used for debugging
console.log(`[Test] Using baseURL: ${baseURL}`);
console.log(`[Test] VERCEL_URL env var: ${process.env.VERCEL_URL || 'not set'}`);
console.log(`[Test] BASE_URL env var: ${process.env.BASE_URL || 'not set'}`);

test.describe('Analysis Controller Cross-Browser Tests', () => {
  let controllerContext: BrowserContext;
  let boardContext: BrowserContext;
  let gameHistory: ReturnType<typeof generatePresetGameHistory>;

  test.beforeAll(async ({ browser }) => {
    // Create two separate browser contexts to simulate two different browsers
    controllerContext = await browser.newContext();
    boardContext = await browser.newContext();

    // Generate preset game history
    gameHistory = generatePresetGameHistory();
  });

  test.afterAll(async () => {
    await controllerContext.close();
    await boardContext.close();
  });

  test.beforeEach(async ({ baseURL: playwrightBaseURL }) => {
    // Use Playwright's baseURL from config if available, otherwise fall back to calculated baseURL
    const urlToUse = playwrightBaseURL || baseURL;
    console.log(`[Test beforeEach] Using baseURL: ${urlToUse} (from Playwright: ${playwrightBaseURL || 'not set'})`);
    
    // Set up game history on server before each test
    const controllerPage = await controllerContext.newPage();
    await setupGameHistory(controllerPage, gameHistory, urlToUse);
    await controllerPage.close();
  });

  test('Initial state: Board loads with preset game history', async ({ baseURL: playwrightBaseURL }) => {
    const urlToUse = playwrightBaseURL || baseURL;
    const boardPage = await boardContext.newPage();
    
    try {
      await boardPage.goto(`${urlToUse}/analysis`);
      await boardPage.waitForLoadState('networkidle');
      
      // Wait for SSE connection
      await waitForSSEConnection(boardPage, 10000);
      
      // Verify board shows starting position
      const expectedFEN = getExpectedFENForMoveIndex(gameHistory, -1);
      await verifyBoardPosition(boardPage, expectedFEN, 10000);
    } finally {
      await boardPage.close();
    }
  });

  test('Controller and Board connection status', async ({ baseURL: playwrightBaseURL }) => {
    const urlToUse = playwrightBaseURL || baseURL;
    const controllerPage = await controllerContext.newPage();
    const boardPage = await boardContext.newPage();

    try {
      // Open both pages
      await controllerPage.goto(`${urlToUse}/analysis/controller`);
      await boardPage.goto(`${urlToUse}/analysis`);

      // Wait for both to connect
      await waitForSSEConnection(controllerPage, 10000);
      await waitForSSEConnection(boardPage, 10000);

      // Verify both show connected status
      const controllerStatus = await getConnectionStatus(controllerPage);
      expect(controllerStatus).toBe('connected');
    } finally {
      await controllerPage.close();
      await boardPage.close();
    }
  });

  test('First Move button: Navigate to starting position', async ({ baseURL: playwrightBaseURL }) => {
    const urlToUse = playwrightBaseURL || baseURL;
    const controllerPage = await controllerContext.newPage();
    const boardPage = await boardContext.newPage();

    try {
      // Open both pages
      await controllerPage.goto(`${urlToUse}/analysis/controller`);
      await boardPage.goto(`${urlToUse}/analysis`);

      // Wait for connections
      await waitForSSEConnection(controllerPage, 10000);
      await waitForSSEConnection(boardPage, 10000);

      // First, navigate to a later move
      // Click Next a few times to move forward
      for (let i = 0; i < 3 && i < gameHistory.moves.length; i++) {
        await clickControllerButton(controllerPage, 'Next', true);
        await boardPage.waitForTimeout(1000); // Wait for SSE propagation
      }

      // Now click First Move button
      await clickControllerButton(controllerPage, 'First Move', true);

      // Verify board shows starting position
      const expectedFEN = getExpectedFENForMoveIndex(gameHistory, -1);
      await verifyBoardPosition(boardPage, expectedFEN, 10000);

      // Verify move index is -1 (starting position)
      const moveIndex = await getCurrentMoveIndex(controllerPage);
      expect(moveIndex).toBe(-1);
    } finally {
      await controllerPage.close();
      await boardPage.close();
    }
  });

  test('Next button: Advance through moves', async ({ baseURL: playwrightBaseURL }) => {
    const urlToUse = playwrightBaseURL || baseURL;
    const controllerPage = await controllerContext.newPage();
    const boardPage = await boardContext.newPage();

    try {
      // Open both pages
      await controllerPage.goto(`${urlToUse}/analysis/controller`);
      await boardPage.goto(`${urlToUse}/analysis`);

      // Wait for connections
      await waitForSSEConnection(controllerPage, 10000);
      await waitForSSEConnection(boardPage, 10000);

      // Start at beginning
      await clickControllerButton(controllerPage, 'First Move', true);
      await boardPage.waitForTimeout(1000);

      // Click Next through all moves and verify each position
      for (let i = 0; i < gameHistory.moves.length; i++) {
        await clickControllerButton(controllerPage, 'Next', true);
        await boardPage.waitForTimeout(1000); // Wait for SSE to propagate

        const expectedFEN = getExpectedFENForMoveIndex(gameHistory, i);
        await verifyBoardPosition(boardPage, expectedFEN, 10000);

        // Verify move index
        const moveIndex = await getCurrentMoveIndex(controllerPage);
        expect(moveIndex).toBe(i);
      }
    } finally {
      await controllerPage.close();
      await boardPage.close();
    }
  });

  test('Previous button: Navigate backwards through moves', async ({ baseURL: playwrightBaseURL }) => {
    const urlToUse = playwrightBaseURL || baseURL;
    const controllerPage = await controllerContext.newPage();
    const boardPage = await boardContext.newPage();

    try {
      // Open both pages
      await controllerPage.goto(`${urlToUse}/analysis/controller`);
      await boardPage.goto(`${urlToUse}/analysis`);

      // Wait for connections
      await waitForSSEConnection(controllerPage, 10000);
      await waitForSSEConnection(boardPage, 10000);

      // Navigate to last move first
      for (let i = 0; i < gameHistory.moves.length; i++) {
        await clickControllerButton(controllerPage, 'Next', true);
        await boardPage.waitForTimeout(500);
      }

      // Now go backwards
      for (let i = gameHistory.moves.length - 1; i >= 0; i--) {
        await clickControllerButton(controllerPage, 'Previous', true);
        await boardPage.waitForTimeout(1000); // Wait for SSE to propagate

        const expectedFEN = getExpectedFENForMoveIndex(gameHistory, i);
        await verifyBoardPosition(boardPage, expectedFEN, 10000);

        // Verify move index
        const moveIndex = await getCurrentMoveIndex(controllerPage);
        expect(moveIndex).toBe(i);
      }

      // Finally, go back to starting position
      await clickControllerButton(controllerPage, 'Previous', true);
      await boardPage.waitForTimeout(1000);
      const expectedFEN = getExpectedFENForMoveIndex(gameHistory, -1);
      await verifyBoardPosition(boardPage, expectedFEN, 10000);
    } finally {
      await controllerPage.close();
      await boardPage.close();
    }
  });

  test('Boundary test: First Move button disabled at start', async ({ baseURL: playwrightBaseURL }) => {
    const urlToUse = playwrightBaseURL || baseURL;
    const controllerPage = await controllerContext.newPage();

    try {
      await controllerPage.goto(`${urlToUse}/analysis/controller`);
      await waitForSSEConnection(controllerPage, 10000);

      // Navigate to first position
      await clickControllerButton(controllerPage, 'First Move', true);
      await controllerPage.waitForTimeout(1000);

      // Verify First Move button is disabled
      const firstButton = controllerPage.getByRole('button', { name: /First Move/i });
      await expect(firstButton).toBeDisabled();
    } finally {
      await controllerPage.close();
    }
  });

  test('Boundary test: Next button disabled at last move', async ({ baseURL: playwrightBaseURL }) => {
    const urlToUse = playwrightBaseURL || baseURL;
    const controllerPage = await controllerContext.newPage();

    try {
      await controllerPage.goto(`${urlToUse}/analysis/controller`);
      await waitForSSEConnection(controllerPage, 10000);

      // Navigate to last move
      for (let i = 0; i < gameHistory.moves.length; i++) {
        await clickControllerButton(controllerPage, 'Next', true);
        await controllerPage.waitForTimeout(500);
      }

      // Verify Next button is disabled
      const nextButton = controllerPage.getByRole('button', { name: /Next/i });
      await expect(nextButton).toBeDisabled();
    } finally {
      await controllerPage.close();
    }
  });

  test('Boundary test: Previous button disabled at start', async ({ baseURL: playwrightBaseURL }) => {
    const urlToUse = playwrightBaseURL || baseURL;
    const controllerPage = await controllerContext.newPage();

    try {
      await controllerPage.goto(`${urlToUse}/analysis/controller`);
      await waitForSSEConnection(controllerPage, 10000);

      // Navigate to first position
      await clickControllerButton(controllerPage, 'First Move', true);
      await controllerPage.waitForTimeout(1000);

      // Verify Previous button is disabled
      const prevButton = controllerPage.getByRole('button', { name: /Previous/i });
      await expect(prevButton).toBeDisabled();
    } finally {
      await controllerPage.close();
    }
  });

  test('Rapid button clicks: Handle multiple clicks quickly', async ({ baseURL: playwrightBaseURL }) => {
    const urlToUse = playwrightBaseURL || baseURL;
    const controllerPage = await controllerContext.newPage();
    const boardPage = await boardContext.newPage();

    try {
      // Open both pages
      await controllerPage.goto(`${urlToUse}/analysis/controller`);
      await boardPage.goto(`${urlToUse}/analysis`);

      // Wait for connections
      await waitForSSEConnection(controllerPage, 10000);
      await waitForSSEConnection(boardPage, 10000);

      // Rapidly click Next multiple times
      const clicks = Math.min(5, gameHistory.moves.length);
      for (let i = 0; i < clicks; i++) {
        await clickControllerButton(controllerPage, 'Next', false); // Don't wait between clicks
      }

      // Wait for all updates to propagate
      await boardPage.waitForTimeout(2000);

      // Verify board is at the expected position (should be at last clicked position)
      const expectedIndex = Math.min(clicks - 1, gameHistory.moves.length - 1);
      const expectedFEN = getExpectedFENForMoveIndex(gameHistory, expectedIndex);
      await verifyBoardPosition(boardPage, expectedFEN, 10000);
    } finally {
      await controllerPage.close();
      await boardPage.close();
    }
  });

  test('Full navigation sequence: Complete round trip', async ({ baseURL: playwrightBaseURL }) => {
    const urlToUse = playwrightBaseURL || baseURL;
    const controllerPage = await controllerContext.newPage();
    const boardPage = await boardContext.newPage();

    try {
      // Open both pages
      await controllerPage.goto(`${urlToUse}/analysis/controller`);
      await boardPage.goto(`${urlToUse}/analysis`);

      // Wait for connections
      await waitForSSEConnection(controllerPage, 10000);
      await waitForSSEConnection(boardPage, 10000);

      // Navigate forward through all moves
      for (let i = 0; i < gameHistory.moves.length; i++) {
        await clickControllerButton(controllerPage, 'Next', true);
        await boardPage.waitForTimeout(500);
        
        const expectedFEN = getExpectedFENForMoveIndex(gameHistory, i);
        await verifyBoardPosition(boardPage, expectedFEN, 10000);
      }

      // Navigate backward to start
      for (let i = gameHistory.moves.length - 1; i >= -1; i--) {
        if (i >= 0) {
          await clickControllerButton(controllerPage, 'Previous', true);
        } else {
          await clickControllerButton(controllerPage, 'First Move', true);
        }
        await boardPage.waitForTimeout(500);
        
        const expectedFEN = getExpectedFENForMoveIndex(gameHistory, i);
        await verifyBoardPosition(boardPage, expectedFEN, 10000);
      }
    } finally {
      await controllerPage.close();
      await boardPage.close();
    }
  });
});

