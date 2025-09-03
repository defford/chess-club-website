# Google Sheets Integration Setup

This guide will help you connect your chess club website to Google Sheets for managing registrations, events, and rankings data. The system uses bi-directional synchronization between your website and Google Sheets.

## Prerequisites

1. A Google Workspace account (daniel@cnlscc.com organization)
2. Access to Google Cloud Console
3. Your website project

## Overview

The system integrates with three separate Google Sheets:
- **Registrations**: Form submissions from website → Google Sheets
- **Events**: Bi-directional sync (add/edit events on website or in sheets)
- **Rankings**: Bi-directional sync (player data and ladder standings)

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Make sure you're logged in with your daniel@cnlscc.com account
3. Create a new project or select an existing one
4. Note your Project ID

## Step 2: Enable Google Sheets API

1. In Google Cloud Console, go to **APIs & Services** > **Library**
2. Search for "Google Sheets API"
3. Click on it and press **Enable**

## Step 3: Create a Service Account

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **Service Account**
3. Fill in:
   - **Service account name**: `chess-club-sheets`
   - **Description**: `Service account for chess club registration form`
4. Click **Create and Continue**
5. Skip the role assignment (click **Continue**)
6. Click **Done**

## Step 4: Create Service Account Key

1. Click on the service account you just created
2. Go to the **Keys** tab
3. Click **Add Key** > **Create new key**
4. Select **JSON** format
5. Click **Create** - this will download a JSON file

## Step 5: Create Your Google Sheets

You need to create three separate Google Sheets under your daniel@cnlscc.com account:

### 5.1 Registrations Sheet
1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet
3. Name it "Chess Club Registrations"
4. Copy the Spreadsheet ID from the URL:
   ```
   https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
   ```
5. Keep this ID for later (GOOGLE_SHEETS_REGISTRATIONS_ID)

### 5.2 Events Sheet
1. Create another new spreadsheet
2. Name it "Chess Club Events"
3. Copy the Spreadsheet ID for later (GOOGLE_SHEETS_EVENTS_ID)

### 5.3 Rankings Sheet
1. Create another new spreadsheet
2. Name it "Chess Club Rankings"
3. Copy the Spreadsheet ID for later (GOOGLE_SHEETS_RANKINGS_ID)

### Share All Sheets
For each of the three spreadsheets:
1. Click **Share** button
2. Add the service account email (found in your JSON file as `client_email`)
3. Give it **Editor** permissions

## Step 6: Set Environment Variables

1. Create a `.env.local` file in your project root
2. Copy the contents from `env.example`
3. Fill in the values from your service account JSON file:

```env
# Google Sheets Integration
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_PRIVATE_KEY_ID=your-private-key-id
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour-private-key\n-----END PRIVATE KEY-----\n"
GOOGLE_CLIENT_EMAIL=your-service-account-email@your-project.iam.gserviceaccount.com
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/your-service-account-email%40your-project.iam.gserviceaccount.com

# Google Sheets IDs (from the spreadsheet URLs)
GOOGLE_SHEETS_REGISTRATIONS_ID=your-registrations-sheet-id
GOOGLE_SHEETS_EVENTS_ID=your-events-sheet-id
GOOGLE_SHEETS_RANKINGS_ID=your-rankings-sheet-id

# Legacy support (if only one sheet ID is provided, it will be used for registrations)
GOOGLE_SHEETS_ID=your-registrations-sheet-id

# Email Service (Resend)
RESEND_API_KEY=your-resend-api-key
```

## Step 7: Set Up Email Confirmations (Optional)

The system can automatically send confirmation emails to parents when they register. To enable this:

1. **Sign up for Resend** (free tier includes 100 emails/day):
   - Go to [resend.com](https://resend.com)
   - Create a free account
   - Verify your email address

2. **Get your API key**:
   - Go to API Keys in your Resend dashboard
   - Click "Create API Key"
   - Copy the key (starts with `re_`)

3. **Add to environment variables**:
   ```env
   RESEND_API_KEY=re_your_actual_api_key_here
   ```

4. **Set up your domain** (for production):
   - In Resend dashboard, go to Domains
   - Add your domain (e.g., `centralnlchess.ca`)
   - Follow DNS verification steps
   - Update the "from" address in `/src/lib/email.ts`

**Note**: Without email setup, registrations will still work perfectly - they just won't send confirmation emails.

## Step 8: Initialize the Sheets

After setting up your environment variables, you need to initialize the sheet headers:

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Initialize the sheet headers by calling:
   ```
   POST http://localhost:3000/api/initialize-sheets
   ```
   
   Or use curl:
   ```bash
   curl -X POST http://localhost:3000/api/initialize-sheets
   ```

   This will set up the proper column headers in all three sheets.

## Step 9: Test the Integration

### Test Registration
1. Navigate to the registration page (`/register`)
2. Fill out and submit the form
3. Check your registrations Google Sheet - you should see a new row!

### Test Events
1. Navigate to the events page (`/events`)
2. Events will be loaded from your Events Google Sheet
3. You can add events via API or directly in the sheet

### Test Rankings
1. Navigate to the rankings page (`/rankings`)
2. Rankings will be loaded from your Rankings Google Sheet
3. You can add players via API or directly in the sheet

## Spreadsheet Structures

The integration will automatically create columns in your sheets:

### Registrations Sheet
| Column | Description |
|--------|-------------|
| A | Timestamp |
| B | Parent Name |
| C | Parent Email |
| D | Parent Phone |
| E | Child Name |
| F | Child Age |
| G | Child Grade |
| H | Chess Experience |
| I | Emergency Contact |
| J | Emergency Phone |
| K | Medical Info |
| L | Participation Consent |
| M | Photo Consent |
| N | Newsletter Subscription |

### Events Sheet
| Column | Description |
|--------|-------------|
| A | ID |
| B | Name |
| C | Date |
| D | Time |
| E | Location |
| F | Participants |
| G | Max Participants |
| H | Description |
| I | Category |
| J | Age Groups |
| K | Status |
| L | Last Updated |

### Rankings Sheet
| Column | Description |
|--------|-------------|
| A | ID |
| B | Name |
| C | Grade |
| D | Wins |
| E | Losses |
| F | Points |
| G | Rank |
| H | Last Active |
| I | Email |

## API Endpoints

The system provides REST API endpoints for managing data:

### Events
- `GET /api/events` - Get all events
- `POST /api/events` - Create new event
- `PUT /api/events/[id]` - Update existing event

### Rankings
- `GET /api/rankings` - Get all players
- `POST /api/rankings` - Add new player
- `PUT /api/rankings/[id]` - Update player data

### Initialization
- `POST /api/initialize-sheets` - Initialize all sheet headers

## Troubleshooting

### "Failed to save registration to Google Sheets"
- Check that your environment variables are set correctly
- Verify the service account has access to all three spreadsheets
- Make sure the Google Sheets API is enabled
- Ensure you've initialized the sheets with proper headers

### "Failed to retrieve events/rankings"
- Check that the Events/Rankings sheet IDs are correct
- Verify the service account has Editor access to those sheets
- Make sure the sheets have been initialized with headers

### "Missing required field" errors
- Ensure all required form fields are filled out
- Check that the consent checkbox is checked

### Authentication errors
- Verify your service account JSON file values
- Make sure the private key is properly formatted with `\n` line breaks
- Check that the service account email has access to all spreadsheets

### Sheet structure issues
- Run the initialize-sheets API endpoint to set up proper headers
- Manually check that sheet names match ("Events", "Players", "Form Responses 1")
- Ensure no extra spaces or special characters in sheet names

## Security Notes

- Never commit your `.env.local` file to version control
- The service account only has access to spreadsheets you explicitly share with it
- Consider using a dedicated Google account for this service account
- Regularly rotate your service account keys if needed

## Production Deployment

When deploying to production (Vercel, Netlify, etc.):

1. Add all environment variables to your hosting platform's environment settings
2. Make sure to properly escape the private key value
3. Include all three sheet IDs (registrations, events, rankings)
4. Test the integration in your production environment
5. Run the initialize-sheets endpoint in production

## Features

### Bi-directional Sync
- Events: Add events on website or edit directly in Google Sheets - changes sync both ways
- Rankings: Update player stats on website or in sheets - rankings auto-calculate
- Registrations: One-way sync from website to sheets (for data integrity)

### Real-time Updates
- Events page loads live data from Google Sheets
- Rankings page displays current ladder standings
- Changes in sheets reflect immediately on website refresh

That's it! Your chess club website is now fully integrated with Google Sheets for comprehensive data management.
