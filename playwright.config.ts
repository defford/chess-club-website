import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local and .env files
// This allows local testing with Vercel URLs without needing to export them in shell
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

/**
 * Get base URL from environment variable or default to localhost.
 * Handles Vercel URL which may or may not include protocol.
 * Checks multiple possible environment variable names:
 * - TEST_URL (custom Vercel env var or local .env.local)
 * - VERCEL_URL (Vercel system var, but may not be available in test context)
 * - BASE_URL (generic)
 */
function getBaseURL(): string {
  // Check TEST_URL first (recommended for custom Vercel env vars)
  const testUrl = process.env.TEST_URL;
  if (testUrl) {
    if (testUrl.startsWith('http://') || testUrl.startsWith('https://')) {
      return testUrl;
    }
    return `https://${testUrl}`;
  }

  // Check VERCEL_URL (system variable, may not be available during tests)
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) {
    if (vercelUrl.startsWith('http://') || vercelUrl.startsWith('https://')) {
      return vercelUrl;
    }
    return `https://${vercelUrl}`;
  }
  
  // Check BASE_URL (generic fallback)
  if (process.env.BASE_URL) {
    return process.env.BASE_URL;
  }
  
  return 'http://localhost:3000';
}

const baseURL = getBaseURL();

// Log the baseURL being used for debugging
console.log(`[Playwright Config] Using baseURL: ${baseURL}`);
console.log(`[Playwright Config] TEST_URL env var: ${process.env.TEST_URL || 'not set'}`);
console.log(`[Playwright Config] VERCEL_URL env var: ${process.env.VERCEL_URL || 'not set'}`);
console.log(`[Playwright Config] BASE_URL env var: ${process.env.BASE_URL || 'not set'}`);
console.log(`[Playwright Config] All env vars starting with VER: ${Object.keys(process.env).filter(k => k.startsWith('VER')).join(', ') || 'none'}`);

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Increase timeout for Vercel testing */
  timeout: 60000, // 60 seconds per test
  expect: {
    timeout: 10000, // 10 seconds for assertions
  },
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL,
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    /* Screenshot on failure */
    screenshot: 'only-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: process.env.VERCEL_URL ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});

