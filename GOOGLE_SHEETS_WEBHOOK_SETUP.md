# Google Sheets Webhook Setup Guide

This guide will help you set up real-time synchronization between Google Sheets and your Chess Club Website using webhooks.

## Overview

When data changes in your Google Sheets, a webhook will notify your Vercel app to invalidate the cache, ensuring users always see fresh data while maintaining sub-100ms response times.

## Prerequisites

1. Your Chess Club Website deployed to Vercel
2. Access to edit your Google Sheets
3. Webhook secret generated (see below)

## Step 1: Generate Webhook Secret

Generate a secure webhook secret:

```bash
# On macOS/Linux:
openssl rand -base64 32

# Or use Node.js:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Step 2: Add Environment Variables to Vercel

Add these to your Vercel project settings:

```env
WEBHOOK_SECRET=your_generated_webhook_secret_here
```

## Step 3: Set Up Google Apps Script

1. **Open your Google Sheets** (`1UXg4FVsE33IBmk6SkwfvZSV1XlDJ_5csihhye90IVac`)

2. **Click Extensions → Apps Script**

3. **Delete any existing code** and paste the entire contents of `/scripts/google-apps-script.js`

4. **Update the configuration** at the top of the script:
   ```javascript
   const CONFIG = {
     WEBHOOK_URL: 'https://your-chess-club.vercel.app/api/webhook/sheets-update',
     WEBHOOK_SECRET: 'your_webhook_secret_here',
     // ... rest of config
   };
   ```

5. **Save the project** (Ctrl+S or Cmd+S)

6. **Run the setup function**:
   - In the Apps Script editor, select `setupTrigger` from the function dropdown
   - Click "Run"
   - Grant permissions when prompted

## Step 4: Test the Webhook

1. In Apps Script, run the `testWebhook` function
2. Check the execution log for success message
3. Make a small change in your Google Sheets
4. Verify the cache is invalidated by checking your app logs

## Monitored Sheets

The webhook monitors these sheets for changes:
- `events` - Invalidates events cache
- `rankings` - Invalidates rankings cache  
- `parents` - Invalidates members cache
- `students` - Invalidates members cache
- `player_ownership` - Invalidates parent data cache
- `event registrations` - Invalidates event registration cache

## How It Works

1. **Change Detection**: Google Apps Script detects when data changes
2. **Debouncing**: Multiple rapid changes are batched (2 second delay)
3. **Webhook Call**: Script sends POST request to your Vercel app
4. **Cache Invalidation**: Your app clears relevant caches
5. **Fresh Data**: Next request fetches from Google Sheets

## Troubleshooting

### Webhook Not Firing
- Check Apps Script execution logs
- Verify the trigger is set up (Resources → Current project's triggers)
- Test with `testWebhook()` function

### Authentication Errors
- Ensure WEBHOOK_SECRET matches in both places
- Check authorization header format

### Cache Not Clearing
- Check Vercel logs for webhook receipt
- Verify KV environment variables are set
- Test cache invalidation manually

## Manual Operations

### Force Refresh All Caches
Run this in Apps Script to manually refresh all caches:
```javascript
forceRefreshAllCaches()
```

### Check Webhook Status
Run this to verify webhook endpoint is accessible:
```javascript
getWebhookStatus()
```

## Security Notes

- Keep your WEBHOOK_SECRET secure
- The webhook endpoint requires authentication
- Google Apps Script runs with your Google account permissions
- Consider IP allowlisting if needed (though Apps Script IPs vary)

## Performance Impact

- Webhook calls are asynchronous
- Cache invalidation is immediate
- No impact on Google Sheets performance
- Debouncing prevents excessive webhook calls

## Next Steps

After setting up the webhook, you should have:
- ✅ Real-time cache invalidation
- ✅ Sub-100ms API responses (from cache)
- ✅ Fresh data within seconds of changes
- ✅ Automatic synchronization

Continue to set up the Vercel Cron job for cache pre-warming to ensure optimal performance even for cold starts.
