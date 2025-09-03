# Email Confirmation Setup Guide

This guide will help you set up automated confirmation emails that are sent to parents when they complete a registration.

## Overview

When a parent submits a registration form, the system will:
1. ✅ Save the registration to Google Sheets
2. 📧 Send a beautiful confirmation email to the parent
3. 🎉 Show success message to the user

## Email Service Setup (Resend)

### Why Resend?
- **Free tier**: 100 emails/day, 3,000/month
- **Reliable delivery**: 99%+ delivery rates
- **Easy setup**: No complex configuration
- **Professional**: Great for transactional emails

### Step 1: Create Resend Account

1. Go to [resend.com](https://resend.com)
2. Click "Get Started for Free"
3. Sign up with your email
4. Verify your email address

### Step 2: Get API Key

1. In your Resend dashboard, click "API Keys"
2. Click "Create API Key"
3. Name it "Chess Club Registration"
4. Select "Full access" (or "Sending access" if you prefer)
5. Copy the API key (starts with `re_`)

### Step 3: Add to Environment Variables

Add this line to your `.env.local` file:
```env
RESEND_API_KEY=re_your_actual_api_key_here
```

**Important**: Never commit your API key to version control!

## Email Configuration

### Default Settings

The system is pre-configured with:
- **From Address**: `Central NL Chess Club <registration@centralnlchess.ca>`
- **Subject**: `Registration Confirmation - [Child Name]`
- **Template**: Professional HTML email with club branding

### Customizing the "From" Address

For development/testing, you can use any verified email. For production:

1. **Option A: Use your domain**
   - In Resend dashboard, go to "Domains"
   - Click "Add Domain"
   - Enter your domain (e.g., `centralnlchess.ca`)
   - Follow the DNS setup instructions
   - Update the email address in `/src/lib/email.ts`

2. **Option B: Use a subdomain**
   - Set up `mail.centralnlchess.ca` as a subdomain
   - Use `registration@mail.centralnlchess.ca`

3. **Option C: Use Resend's domain (temporary)**
   - Change to `registration@resend.dev` for testing
   - Not recommended for production

### Updating the From Address

Edit `/src/lib/email.ts` and change this line:
```typescript
from: 'Central NL Chess Club <registration@centralnlchess.ca>',
```

To your verified email address:
```typescript
from: 'Central NL Chess Club <registration@yourdomain.com>',
```

## Email Template Features

The confirmation email includes:

### 📋 **Registration Summary**
- Child's name, age, grade
- Chess experience level
- Parent contact info
- Emergency contact

### 📅 **Next Steps Information**
- What to expect next
- Timeline for schedule information
- Payment details coming soon
- Equipment provided

### 🏥 **Medical Information Handling**
- Special callout if medical info was provided
- Assurance that staff will be informed

### 📞 **Contact Information**
- Club email and website
- Clear call-to-action for questions

### 🎨 **Professional Design**
- Responsive HTML email
- Chess club branding
- Mobile-friendly layout
- Clear visual hierarchy

## Testing the Email System

### 1. Development Testing

```bash
# Start your development server
npm run dev

# Submit a test registration with your email address
# Check your inbox for the confirmation email
```

### 2. Test Email Template

You can test the email template by creating a simple test file:

```typescript
// test-email.ts
import { emailService } from './src/lib/email';

const testData = {
  parentName: "John Doe",
  parentEmail: "your-email@example.com",
  childName: "Jane Doe",
  childAge: "10",
  childGrade: "5",
  // ... other required fields
};

emailService.sendRegistrationConfirmation(testData);
```

### 3. Production Testing

1. Deploy your app with the Resend API key
2. Submit a real registration
3. Verify email delivery and formatting

## Troubleshooting

### "Failed to send confirmation email"

**Check these common issues:**

1. **API Key Missing/Invalid**
   ```bash
   # Verify your API key is set
   echo $RESEND_API_KEY
   ```

2. **From Address Not Verified**
   - Check Resend dashboard for domain verification status
   - Use a verified email address temporarily

3. **Network Issues**
   - Check server logs for detailed error messages
   - Verify internet connectivity

4. **Rate Limits**
   - Free tier: 100 emails/day
   - Check usage in Resend dashboard

### Email Not Received

1. **Check Spam Folder**
   - Transactional emails sometimes go to spam initially
   - Mark as "Not Spam" to improve delivery

2. **Check Email Address**
   - Verify the parent entered correct email
   - Check for typos in registration data

3. **Domain Reputation**
   - New domains may have lower delivery rates initially
   - Consider using a subdomain

### Email Formatting Issues

1. **Mobile Display**
   - Template is responsive but test on various devices
   - Consider simplifying if needed

2. **HTML Rendering**
   - Some email clients block certain styles
   - Template uses inline styles for compatibility

## Production Deployment

### Environment Variables

Make sure to add to your hosting platform:
```env
RESEND_API_KEY=re_your_production_api_key
```

### Domain Setup

For professional emails:
1. Set up SPF, DKIM, DMARC records
2. Verify domain in Resend
3. Update from address in code
4. Test thoroughly

### Monitoring

- Monitor email delivery rates in Resend dashboard
- Set up alerts for failed emails
- Keep track of bounce rates

## Email Analytics

Resend provides analytics on:
- 📊 Delivery rates
- 📈 Open rates
- 🔗 Click rates
- ❌ Bounce rates

Check these regularly to ensure good email health.

## Cost Planning

### Resend Pricing (as of 2024)
- **Free**: 100 emails/day, 3,000/month
- **Pro**: $20/month for 50,000 emails
- **Business**: $99/month for 100,000 emails

For most chess clubs, the free tier should be sufficient.

## Security Best Practices

1. **API Key Security**
   - Never commit API keys to code
   - Use environment variables
   - Rotate keys periodically

2. **Email Content**
   - Don't include sensitive data
   - Keep personal info minimal
   - Follow privacy regulations

3. **Domain Security**
   - Set up proper DNS records
   - Monitor domain reputation
   - Use HTTPS for all links

That's it! Your registration system now includes professional email confirmations. 🎉
