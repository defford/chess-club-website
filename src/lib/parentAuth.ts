import jwt from 'jsonwebtoken';
import { emailService } from './email';
import { googleSheetsService } from './googleSheets';

const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-here';
const MAGIC_LINK_EXPIRY = 15 * 60 * 1000; // 15 minutes in milliseconds

export interface ParentAccount {
  id: string;
  email: string;
  createdDate: string;
  lastLogin: string;
  isActive: boolean;
  isSelfRegistered?: boolean;
  registrationType?: 'parent' | 'self';
}

export interface MagicLinkToken {
  email: string;
  type: 'login' | 'approval_request' | 'approval_response';
  playerId?: string;
  requesterId?: string;
  action?: 'approve' | 'deny';
  emailExistsInRegistrations?: boolean;
  isSelfRegistered?: boolean;
  exp: number;
}

export interface ParentSession {
  parentId: string;
  email: string;
  loginTime: number;
  isSelfRegistered?: boolean;
  registrationType?: 'parent' | 'self';
  isAdmin?: boolean;
}

class ParentAuthService {
  private readonly AUTH_KEY = 'chess-club-parent-auth';

  // Generate magic link token
  generateMagicToken(
    email: string, 
    type: 'login' | 'approval_request' | 'approval_response',
    options?: {
      playerId?: string;
      requesterId?: string;
      action?: 'approve' | 'deny';
      emailExistsInRegistrations?: boolean;
      isSelfRegistered?: boolean;
    }
  ): string {
    const payload: MagicLinkToken = {
      email,
      type,
      exp: Math.floor((Date.now() + MAGIC_LINK_EXPIRY) / 1000),
      ...options
    };

    return jwt.sign(payload, JWT_SECRET);
  }

  // Verify magic link token
  verifyMagicToken(token: string): MagicLinkToken | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as MagicLinkToken;
      
      // Check if token is expired
      if (decoded.exp * 1000 < Date.now()) {
        return null;
      }
      
      return decoded;
    } catch (error) {
      console.error('Token verification failed:', error);
      return null;
    }
  }

  // Send magic link via email (with SMS integration layer)
  async sendMagicLink(
    email: string, 
    type: 'login' | 'approval_request' | 'approval_response',
    options?: {
      playerId?: string;
      playerName?: string;
      requesterId?: string;
      requesterEmail?: string;
      action?: 'approve' | 'deny';
      smsNumber?: string; // Phone number for SMS
      preferSms?: boolean; // Whether to prefer SMS over email
      emailExistsInRegistrations?: boolean;
      isSelfRegistered?: boolean; // Whether this is for a self-registered student
    }
  ): Promise<void> {
    const token = this.generateMagicToken(email, type, options);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://cnlscc.com';
    
    let magicUrl: string;
    let subject: string;
    let htmlContent: string;
    let smsContent: string;

    switch (type) {
      case 'login':
        magicUrl = `${baseUrl}/parent/verify?token=${token}`;
        if (options?.isSelfRegistered) {
          subject = 'Chess Club Player Login';
          htmlContent = this.generatePlayerLoginEmailHtml(magicUrl);
          smsContent = `Chess Club player login link: ${magicUrl} (expires in 15 minutes)`;
        } else {
          subject = 'Chess Club Parent Login';
          htmlContent = this.generateLoginEmailHtml(magicUrl);
          smsContent = `Chess Club login link: ${magicUrl} (expires in 15 minutes)`;
        }
        break;
        
      case 'approval_request':
        magicUrl = `${baseUrl}/parent/verify?token=${token}`;
        subject = `Player Claim Request - ${options?.playerName || 'Your Player'}`;
        htmlContent = this.generateApprovalRequestEmailHtml(
          options?.requesterEmail || '',
          options?.playerName || '',
          magicUrl
        );
        smsContent = `Someone wants to claim ${options?.playerName} on Chess Club. Approve/deny: ${magicUrl}`;
        break;
        
      case 'approval_response':
        magicUrl = `${baseUrl}/parent/claim-result?token=${token}`;
        subject = `Player Claim ${options?.action === 'approve' ? 'Approved' : 'Denied'}`;
        htmlContent = this.generateApprovalResponseEmailHtml(
          options?.playerName || '',
          options?.action === 'approve'
        );
        smsContent = `Your request to claim ${options?.playerName} was ${options?.action === 'approve' ? 'approved' : 'denied'}.`;
        break;
        
      default:
        throw new Error('Invalid magic link type');
    }

    // Send via preferred method
    if (options?.preferSms && options?.smsNumber) {
      await this.sendSms(options.smsNumber, smsContent);
    } else {
      await emailService.sendMagicLinkEmail(email, subject, htmlContent);
    }
  }

  // SMS integration layer (ready for Twilio)
  private async sendSms(phoneNumber: string, message: string): Promise<void> {
    // TODO: Implement Twilio SMS sending
    // For now, we'll log and fallback to email notification
    console.log(`SMS would be sent to ${phoneNumber}: ${message}`);
    
    // In production, this would use Twilio:
    /*
    const twilio = require('twilio');
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    
    await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber
    });
    */
    
    throw new Error('SMS not yet implemented - falling back to email');
  }

  // Create or get parent account
  async createOrGetParentAccount(email: string): Promise<ParentAccount> {
    const existingAccount = await googleSheetsService.getParentAccount(email);
    
    if (existingAccount) {
      return existingAccount;
    }

    // Create new parent account
    const parentId = `par_${Date.now()}`;
    const now = new Date().toISOString();
    
    const newAccount: ParentAccount = {
      id: parentId,
      email,
      createdDate: now,
      lastLogin: now,
      isActive: true
    };

    await googleSheetsService.addParentAccount(newAccount);
    
    // Auto-link any existing student registrations to this new parent account
    try {
      await googleSheetsService.autoLinkExistingStudentsToParent(parentId, email);
    } catch (error) {
      console.error('Failed to auto-link existing students to parent:', error);
      // Don't fail the account creation if auto-linking fails
    }
    
    return newAccount;
  }

  // Login parent and create session
  async loginParent(email: string, isSelfRegistered: boolean = false): Promise<ParentSession> {
    const account = await this.createOrGetParentAccount(email);
    
    // Update last login
    await googleSheetsService.updateParentAccount(account.id, {
      lastLogin: new Date().toISOString()
    });

    const session: ParentSession = {
      parentId: account.id,
      email: account.email,
      loginTime: Date.now(),
      isSelfRegistered: account.isSelfRegistered || isSelfRegistered,
      registrationType: account.registrationType || (account.isSelfRegistered ? 'self' : 'parent'),
      isAdmin: account.isAdmin || false
    };

    // Store session (never expires as requested)
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.AUTH_KEY, JSON.stringify(session));
    }

    return session;
  }

  // Check if parent is authenticated
  isParentAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    
    try {
      const stored = localStorage.getItem(this.AUTH_KEY);
      if (!stored) return false;
      
      const session: ParentSession = JSON.parse(stored);
      return !!session.parentId;
    } catch {
      return false;
    }
  }

  // Get current parent session
  getCurrentParentSession(): ParentSession | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const stored = localStorage.getItem(this.AUTH_KEY);
      if (!stored) return null;
      
      return JSON.parse(stored) as ParentSession;
    } catch {
      return null;
    }
  }

  // Logout parent
  logoutParent(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.AUTH_KEY);
    }
  }

  // Email template generators
  private generateLoginEmailHtml(magicUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Chess Club Parent Login</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1a365d 0%, #2d5a87 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 28px; font-weight: bold;">🏁 Parent Login</h1>
            <p style="margin: 10px 0 0; font-size: 16px; opacity: 0.9;">Central NL Scholastic Chess Club</p>
          </div>
          
          <div style="background: #ffffff; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <p style="font-size: 18px; margin-bottom: 20px;">Click the button below to access your parent dashboard:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${magicUrl}" style="background: #1a365d; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Access Parent Dashboard
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px; margin-top: 25px;">
              This link will expire in 15 minutes for security. If you didn't request this login, please ignore this email.
            </p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 6px; margin: 25px 0;">
              <p style="margin: 0; font-size: 14px;">
                <strong>In your parent dashboard, you can:</strong><br>
                • View your players' chess rankings and progress<br>
                • Register for upcoming tournaments and events<br>
                • Track tournament performance and history<br>
                • Update contact information
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generatePlayerLoginEmailHtml(magicUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Chess Club Player Login</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1a365d 0%, #2d5a87 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 28px; font-weight: bold;">♟️ Player Login</h1>
            <p style="margin: 10px 0 0; font-size: 16px; opacity: 0.9;">Central NL Scholastic Chess Club</p>
          </div>
          
          <div style="background: #ffffff; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <p style="font-size: 18px; margin-bottom: 20px;">Click the button below to access your player dashboard:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${magicUrl}" style="background: #1a365d; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Access Player Dashboard
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px; margin-top: 25px;">
              This link will expire in 15 minutes for security. If you didn't request this login, please ignore this email.
            </p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 6px; margin: 25px 0;">
              <p style="margin: 0; font-size: 14px;">
                <strong>In your player dashboard, you can:</strong><br>
                • View your chess rankings and progress<br>
                • Register for upcoming tournaments and events<br>
                • Track your tournament performance and history<br>
                • Update your contact information
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateApprovalRequestEmailHtml(requesterEmail: string, playerName: string, approvalUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Player Claim Request</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 28px; font-weight: bold;">⚠️ Player Claim Request</h1>
            <p style="margin: 10px 0 0; font-size: 16px; opacity: 0.9;">Action Required</p>
          </div>
          
          <div style="background: #ffffff; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <p style="font-size: 18px; margin-bottom: 20px;">
              Someone has requested to claim <strong>${playerName}</strong> in their parent account.
            </p>
            
            <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Requester Email:</strong> ${requesterEmail}</p>
              <p style="margin: 10px 0 0;"><strong>Player Name:</strong> ${playerName}</p>
            </div>
            
            <p>Please review this request and choose an action:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${approvalUrl}&action=approve" style="background: #059669; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin: 0 10px;">
                ✓ Approve Request
              </a>
              <a href="${approvalUrl}&action=deny" style="background: #dc2626; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin: 0 10px;">
                ✗ Deny Request
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              If you approve this request, ${requesterEmail} will be able to view ${playerName}'s rankings, register them for events, and manage their chess club activities.
            </p>
            
            <p style="color: #666; font-size: 14px; margin-top: 25px;">
              This link will expire in 15 minutes. If you didn't expect this request, please deny it or contact the chess club administrators.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateApprovalResponseEmailHtml(playerName: string, approved: boolean): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Claim Request ${approved ? 'Approved' : 'Denied'}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, ${approved ? '#059669' : '#dc2626'} 0%, ${approved ? '#10b981' : '#ef4444'} 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 28px; font-weight: bold;">
              ${approved ? '✓' : '✗'} Request ${approved ? 'Approved' : 'Denied'}
            </h1>
            <p style="margin: 10px 0 0; font-size: 16px; opacity: 0.9;">Central NL Chess Club</p>
          </div>
          
          <div style="background: #ffffff; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <p style="font-size: 18px; margin-bottom: 20px;">
              Your request to claim <strong>${playerName}</strong> has been <strong>${approved ? 'approved' : 'denied'}</strong>.
            </p>
            
            ${approved ? `
              <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0;">
                <p style="margin: 0;">You can now access ${playerName}'s information in your parent dashboard!</p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://cnlscc.com'}/parent/dashboard" style="background: #1a365d; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  Go to Parent Dashboard
                </a>
              </div>
            ` : `
              <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 20px 0;">
                <p style="margin: 0;">The current parent of ${playerName} has denied your request. If you believe this is an error, please contact the chess club administrators.</p>
              </div>
            `}
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

export const parentAuthService = new ParentAuthService();
