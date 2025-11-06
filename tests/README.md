# Analysis Controller Tests

Browser-based Playwright tests for verifying the analysis controller communicates correctly with the analysis board across browsers.

## Setup

### Install Dependencies

```bash
npm install
npx playwright install
```

## Running Tests

### Local Testing

Test against your local development server:

```bash
npm run test:analysis
```

This will:
- Start your local dev server automatically
- Run tests against `http://localhost:3000`

### Testing Against Vercel Deployment

**Important**: Vercel environment variables are only available in Vercel's CI/CD environment, NOT when running tests locally. To test against your deployed Vercel URL locally, use one of these methods:

#### Option 1: Use .env.local File (Recommended for Local Testing)

Create or update `.env.local` in your project root:

```bash
TEST_URL=https://your-app.vercel.app
```

Or without protocol (will default to https):
```bash
TEST_URL=your-app.vercel.app
```

Then run:
```bash
npm run test:analysis:vercel
```

The Playwright config will automatically load `.env.local` and use the `TEST_URL` value.

#### Option 2: Pass URL via Command Line

Set the environment variable when running the command:

```bash
TEST_URL=https://your-app.vercel.app npm run test:analysis:vercel
```

Or without protocol (will default to https):
```bash
TEST_URL=your-app.vercel.app npm run test:analysis:vercel
```

#### Option 3: Export in Your Shell

Export the variable in your terminal session:

```bash
export TEST_URL=https://your-app.vercel.app
npm run test:analysis:vercel
```

#### Option 4: Use BASE_URL Environment Variable

```bash
BASE_URL=https://your-app.vercel.app npm run test:analysis:vercel
```

Or add to `.env.local`:
```bash
BASE_URL=https://your-app.vercel.app
```

### Testing in Vercel CI/CD

If you want to run tests automatically in Vercel's CI/CD environment:

1. Add `TEST_URL` to your Vercel project environment variables
2. The tests will automatically use it when running in Vercel's build environment
3. Note: This requires setting up tests to run as part of your Vercel build process

## Environment Variable Priority

The tests check for environment variables in this order:
1. `TEST_URL` (recommended for custom Vercel env vars)
2. `VERCEL_URL` (Vercel system variable - may not be available during test runs)
3. `BASE_URL` (generic fallback)
4. Defaults to `http://localhost:3000`

## Troubleshooting

### Environment Variable Not Found

If you see `VERCEL_URL env var: not set` in the logs:

1. **Check Vercel Dashboard**: Ensure the environment variable is set in your Vercel project settings
2. **Check Variable Name**: Use `TEST_URL` instead of `VERCEL_URL` (system variables may not be available during tests)
3. **Check Environment Scope**: Make sure the variable is set for the environment you're testing in (Production, Preview, Development)
4. **Verify in Logs**: The test output will show all environment variables starting with "VER" to help debug

### 404 Errors on API Endpoints

If you get 404 errors when setting up game history:
- Ensure your Vercel deployment is live and accessible
- Check that the `/api/analysis/state` route exists in your deployment
- Verify the deployment URL is correct (check the logs for the baseURL being used)

### Tests Running Against Wrong URL

Check the console output at the start of test execution:
```
[Playwright Config] Using baseURL: <url>
[Test] Using baseURL: <url>
```

If these show `localhost:3000` when you expect a Vercel URL, the environment variable isn't being read. Use one of the options above to set it correctly.

