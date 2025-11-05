import { defineConfig, devices } from '@playwright/test';

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
console.log(`[Playwright Config] Using baseURL: ${baseURL}`);
console.log(`[Playwright Config] VERCEL_URL env var: ${process.env.VERCEL_URL || 'not set'}`);
console.log(`[Playwright Config] BASE_URL env var: ${process.env.BASE_URL || 'not set'}`);

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

