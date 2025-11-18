# Google Sheets Service Account Setup Guide

## Important: Supabase Does NOT Need Google Sheets Access

**Supabase never touches your Google Sheets.** The migration script runs on your computer and:
- Reads FROM Google Sheets (using Google service account)
- Writes TO Supabase (using Supabase API keys)

They are completely separate systems.

## Fix: Share Google Sheets with Service Account

The error you're seeing (`invalid_grant, reauth related error`) typically means your **Google service account email is not shared with your Google Sheets document**.

### Steps to Fix:

1. **Find Your Service Account Email**
   - Check your `.env.local` file for `GOOGLE_CLIENT_EMAIL`
   - It will look like: `something@project-name.iam.gserviceaccount.com`

2. **Share Your Google Sheets with the Service Account**
   - Open your Google Sheets document
   - Click the "Share" button (top right)
   - Add the service account email address
   - Give it **"Editor"** permissions (or at least "Viewer" for read-only)
   - Click "Send"

3. **Verify It's Working**
   - The service account email should appear in the "Shared with" list
   - Try running the migration again: `npm run migrate:to-supabase`

### Example:

If your `GOOGLE_CLIENT_EMAIL` is:
```
chess-club-service@my-project.iam.gserviceaccount.com
```

Then you need to:
1. Open your Google Sheets
2. Click "Share"
3. Add: `chess-club-service@my-project.iam.gserviceaccount.com`
4. Set permission to "Editor"
5. Click "Send"

## Why This Happens

Google Sheets requires explicit sharing permissions. Even if your service account has API access, it still needs to be added as a collaborator on the specific spreadsheet document.

## Testing

After sharing, test the connection:
```bash
npm run migrate:to-supabase
```

You should see it start reading from Google Sheets successfully!








