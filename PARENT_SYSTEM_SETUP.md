# Parent Authentication System Setup Guide

This guide covers the setup and migration for the new parent authentication system with magic links.

## Overview

The parent authentication system allows parents to:
- Create accounts using magic link authentication (email-based, SMS ready)
- Claim players registered in the chess club
- View player rankings, performance, and tournament history
- Register for events through their parent dashboard
- Approve/deny other parents claiming their players

## Prerequisites

1. **JWT Secret**: Add to your environment variables
2. **Existing Google Sheets setup**: The system extends your current registration sheets
3. **Email service**: Uses existing Resend setup for magic links

## Environment Variables

Add this to your `.env.local` file:

```env
# JWT Secret for magic link tokens (generate a secure random string)
JWT_SECRET=your-secure-jwt-secret-here

# Base URL for magic links (important for production)
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

## Migration Steps

### Step 1: Run the Migration
The migration creates new Google Sheets and generates player IDs for existing registrations.

**Option A: Via API endpoint (Recommended)**
```bash
curl -X POST http://localhost:3000/api/parent/migrate \
  -H "Content-Type: application/json" \
  -d '{"password": "migrate-players-123"}'
```

**Option B: Via your application**
Navigate to your development environment and make a POST request to `/api/parent/migrate` with the password.

### Step 2: Verify Migration
After running the migration, check your Google Sheets:
1. New sheet: `parent_accounts` (for parent account data)
2. New sheet: `player_ownership` (for linking players to parents)
3. Existing registrations should have generated player IDs

### Step 3: Test the System
1. Go to `/parent/login` 
2. Enter an email address that was used to register a player
3. Check email for magic link
4. Complete the login flow
5. Try claiming the player in the parent dashboard

## System Architecture

### Authentication Flow
1. **Magic Link Request**: User enters email at `/parent/login`
2. **Token Generation**: System generates JWT token (15-min expiry)
3. **Email Sent**: Magic link sent via Resend email service
4. **Verification**: User clicks link, token verified at `/parent/verify`
5. **Session Creation**: Parent session stored (never expires per your requirement)

### Player Claiming Flow
1. **Initial Claim**: Parent claims player using registration email + name
2. **Ownership Check**: System checks if player already has an owner
3. **Approval Process**: If owned, sends approval request to current parent
4. **Magic Link Approval**: Current parent receives email with approve/deny links
5. **Ownership Transfer**: If approved, ownership transfers to new parent

### Data Storage
- **Parent Accounts**: `parent_accounts` sheet (ID, email, dates, status)
- **Player Ownership**: `player_ownership` sheet (player ID, parent ID, approval status)
- **Existing Data**: Unchanged - system links via player IDs

## Features

### For Parents
- **Dashboard**: View all claimed players with rankings
- **Player Details**: Individual player pages with performance stats
- **Event Registration**: Register players for tournaments
- **Progress Tracking**: View wins, losses, points, rankings

### For Administrators
- **No Admin Overhead**: Parents manage their own claims
- **Existing Admin Tools**: All current admin functions unchanged
- **Approval System**: Parents handle player claim approvals

### For Registration
- **Optional Account Creation**: Checkbox during registration/event signup
- **Automatic Linking**: New accounts automatically linked to registered players
- **Backward Compatible**: System works with existing registrations

## Magic Link Security

- **Token Expiry**: 15 minutes for security
- **JWT Signed**: Tokens cryptographically signed with JWT_SECRET
- **Single Use**: Tokens used for specific actions (login, approval)
- **Email Delivery**: Uses existing Resend infrastructure

## SMS Integration (Future)

The system includes a Twilio SMS integration layer:
- **Ready for Twilio**: SMS methods stubbed and ready
- **Fallback to Email**: Currently falls back to email
- **Easy Integration**: Add Twilio credentials and uncomment SMS code

To enable SMS:
1. Add Twilio environment variables:
   ```env
   TWILIO_ACCOUNT_SID=your_account_sid
   TWILIO_AUTH_TOKEN=your_auth_token  
   TWILIO_PHONE_NUMBER=your_twilio_number
   ```
2. Uncomment SMS code in `/src/lib/parentAuth.ts`
3. Install Twilio SDK: `npm install twilio`

## Troubleshooting

### Migration Issues
- **Sheet Creation Error**: Check Google Sheets permissions
- **Player ID Generation**: Verify existing registrations have required fields
- **Migration Password**: Default is `migrate-players-123` (change in production)

### Authentication Issues
- **Magic Links Not Received**: Check spam folder, verify Resend setup
- **Token Expired**: Links expire in 15 minutes, request new one
- **Session Lost**: Parent sessions never expire, check localStorage

### Player Claiming Issues
- **Player Not Found**: Verify exact email/name from registration
- **Permission Denied**: Player might be owned by another parent
- **Approval Not Received**: Check original parent's email

## Production Deployment

1. **Security**: Change migration password in `/api/parent/migrate/route.ts`
2. **JWT Secret**: Use strong, random JWT secret
3. **Base URL**: Set correct `NEXT_PUBLIC_BASE_URL`
4. **SMS Setup**: Configure Twilio for SMS magic links (optional)
5. **Run Migration**: Execute migration in production environment

## Support

The system is designed to be self-service for parents with minimal admin intervention. Parents can:
- Create their own accounts
- Claim their own players  
- Resolve ownership disputes through approval system
- Access their own data without admin help

For technical issues, check:
1. Environment variables are set correctly
2. Google Sheets permissions are working
3. Email service (Resend) is functioning
4. JWT secret is properly configured

The parent authentication system maintains full backward compatibility with your existing registration and admin systems while adding powerful new capabilities for parent engagement.
