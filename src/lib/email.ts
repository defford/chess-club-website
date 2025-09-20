import { Resend } from 'resend';
import type {
  RegistrationData,
  ParentRegistrationData,
  StudentRegistrationData,
  SelfRegistrationData
} from './types';

class EmailService {
  private resend: Resend;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is required');
    }
    this.resend = new Resend(apiKey);
  }

  async sendRegistrationConfirmation(data: RegistrationData): Promise<void> {
    const emailHtml = this.generateConfirmationEmail(data);
    
    try {
      await this.resend.emails.send({
        from: 'Central NL Chess Club <daniel@cnlscc.com>',
        to: [data.parentEmail],
        subject: `Registration Confirmation - ${data.playerName}`,
        html: emailHtml,
      });
    } catch (error) {
      console.error('Error sending confirmation email:', error);
      throw new Error('Failed to send confirmation email');
    }
  }

  async sendParentRegistrationConfirmation(data: ParentRegistrationData): Promise<void> {
    const emailHtml = this.generateParentConfirmationEmail(data);
    
    try {
      await this.resend.emails.send({
        from: 'Central NL Chess Club <daniel@cnlscc.com>',
        to: [data.parentEmail],
        subject: `Parent Account Created - Next: Add Your Students - ${data.parentName}`,
        html: emailHtml,
      });
    } catch (error) {
      console.error('Error sending parent confirmation email:', error);
      throw new Error('Failed to send parent confirmation email');
    }
  }

  async sendStudentRegistrationConfirmation(data: StudentRegistrationData): Promise<void> {
    const emailHtml = this.generateStudentConfirmationEmail(data);
    
    try {
      // Note: We'll need to get the parent email from the parent registration
      // For now, we'll skip sending individual student emails and batch them
      // This method is here for future use
      console.log('Student registration confirmation would be sent here');
    } catch (error) {
      console.error('Error sending student confirmation email:', error);
      throw new Error('Failed to send student confirmation email');
    }
  }

  async sendSelfRegistrationConfirmation(data: SelfRegistrationData): Promise<void> {
    const emailHtml = this.generateSelfConfirmationEmail(data);
    
    try {
      await this.resend.emails.send({
        from: 'Central NL Chess Club <daniel@cnlscc.com>',
        to: [data.playerEmail],
        subject: `Student Registration Complete - ${data.playerName}`,
        html: emailHtml,
      });
    } catch (error) {
      console.error('Error sending self-registration confirmation email:', error);
      throw new Error('Failed to send self-registration confirmation email');
    }
  }

  async sendMagicLinkEmail(email: string, subject: string, htmlContent: string): Promise<void> {
    try {
      await this.resend.emails.send({
        from: 'Central NL Chess Club <daniel@cnlscc.com>',
        to: [email],
        subject,
        html: htmlContent,
      });
    } catch (error) {
      console.error('Error sending magic link email:', error);
      throw new Error('Failed to send magic link email');
    }
  }

  private generateConfirmationEmail(data: RegistrationData): string {

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Registration Confirmation</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #1a365d 0%, #2d5a87 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 28px; font-weight: bold;">
              🏁 Registration Confirmed!
            </h1>
            <p style="margin: 10px 0 0; font-size: 16px; opacity: 0.9;">
              Central NL Scholastic Chess Club
            </p>
          </div>

          <!-- Main Content -->
          <div style="background: #ffffff; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <p style="font-size: 18px; margin-bottom: 20px;">
              Dear ${data.parentName},
            </p>

            <p style="margin-bottom: 20px;">
              Thank you for registering <strong>${data.playerName}</strong> for the Central NL Scholastic Chess Club! 
              We're excited to welcome them to our chess community.
            </p>

            <!-- Registration Details -->
            <div style="background: #f8f9fa; padding: 20px; border-radius: 6px; margin: 25px 0;">
              <h3 style="margin: 0 0 15px; color: #1a365d; font-size: 18px;">Registration Details</h3>
              
              <div style="display: grid; gap: 10px;">
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                  <span style="font-weight: 600;">Player Name:</span>
                  <span>${data.playerName}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                  <span style="font-weight: 600;">Age:</span>
                  <span>${data.playerAge} years old</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                  <span style="font-weight: 600;">Grade:</span>
                  <span>${data.playerGrade}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                  <span style="font-weight: 600;">Parent Contact:</span>
                  <span>${data.parentEmail}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                  <span style="font-weight: 600;">Emergency Contact:</span>
                  <span>${data.emergencyContact}</span>
                </div>
              </div>
            </div>

            <!-- Next Steps -->
            <div style="background: #e6fffa; border-left: 4px solid #38b2ac; padding: 20px; margin: 25px 0;">
              <h3 style="margin: 0 0 15px; color: #234e52;">What's Next?</h3>
              <ul style="margin: 0; padding-left: 20px;">
                <li style="margin-bottom: 8px;">Sessions typically run weekly during the school year</li>
                <li style="margin-bottom: 8px;">All chess equipment is provided - no need to bring anything</li>
              </ul>
            </div>

            <!-- Club Info -->
            <div style="margin: 25px 0;">
              <h3 style="color: #1a365d; margin-bottom: 15px;">Club Information</h3>
              <p style="margin-bottom: 10px;">
                <strong>Contact:</strong> daniel@cnlscc.com
              </p>
            </div>

            ${data.medicalInfo ? `
            <div style="background: #fff5f5; border-left: 4px solid #fc8181; padding: 20px; margin: 25px 0;">
              <h4 style="margin: 0 0 10px; color: #c53030;">Medical Information Noted</h4>
              <p style="margin: 0; font-size: 14px;">
                We have recorded the medical information you provided and will ensure our staff are aware of any special considerations.
              </p>
            </div>
            ` : ''}

            <!-- Contact -->
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #e2e8f0;">
              <p style="margin-bottom: 15px;">
                Questions? We're here to help!
              </p>
              <p style="margin: 0;">
                📧 <a href="mailto:daniel@cnlscc.com" style="color: #2d5a87; text-decoration: none;">daniel@cnlscc.com</a><br>
                🌐 <a href="https://cnlscc.com" style="color: #2d5a87; text-decoration: none;">cnlscc.com</a>
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div style="text-align: center; margin-top: 20px; padding: 20px; font-size: 12px; color: #666;">
            <p style="margin: 0;">
              Central NL Scholastic Chess Club<br>
              Building strategic minds, one move at a time.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateParentConfirmationEmail(data: ParentRegistrationData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Parent Account Created - Next: Add Your Students</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #1a365d 0%, #2d5a87 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 28px; font-weight: bold;">
              👨‍👩‍👧‍👦 Parent Account Created!
            </h1>
            <p style="margin: 10px 0 0; font-size: 16px; opacity: 0.9;">
              Central NL Scholastic Chess Club
            </p>
          </div>

          <!-- Main Content -->
          <div style="background: #ffffff; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <p style="font-size: 18px; margin-bottom: 20px;">
              Dear ${data.parentName},
            </p>

            <p style="margin-bottom: 20px;">
              <strong>Your parent account has been successfully created!</strong> This account allows you to register and manage multiple students in your family.
            </p>

            <!-- Next Steps -->
            <div style="background: #e6fffa; border-left: 4px solid #38b2ac; padding: 20px; margin: 25px 0;">
              <h3 style="margin: 0 0 15px; color: #234e52;">Next Steps - Add Your Students</h3>
              <ol style="margin: 0; padding-left: 20px;">
                <li style="margin-bottom: 8px;"><strong>Return to the registration page</strong> and click "Add Student"</li>
                <li style="margin-bottom: 8px;"><strong>Complete student information</strong> for each child you want to register</li>
                <li style="margin-bottom: 8px;"><strong>Repeat for additional students</strong> if you have multiple children</li>
              </ol>
            </div>

            <!-- Account Type Info -->
            <div style="background: #f8f9fa; padding: 20px; border-radius: 6px; margin: 25px 0;">
              <h3 style="margin: 0 0 15px; color: #1a365d; font-size: 18px;">Your Parent Account</h3>
              <div style="display: grid; gap: 10px;">
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                  <span style="font-weight: 600;">Account Type:</span>
                  <span>Parent Account</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                  <span style="font-weight: 600;">Parent Name:</span>
                  <span>${data.parentName}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                  <span style="font-weight: 600;">Email:</span>
                  <span>${data.parentEmail}</span>
                </div>
              </div>
            </div>

            <!-- Contact -->
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #e2e8f0;">
              <p style="margin-bottom: 15px;">
                Questions? We're here to help!
              </p>
              <p style="margin: 0;">
                📧 <a href="mailto:daniel@cnlscc.com" style="color: #2d5a87; text-decoration: none;">daniel@cnlscc.com</a><br>
                🌐 <a href="https://cnlscc.com" style="color: #2d5a87; text-decoration: none;">cnlscc.com</a>
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div style="text-align: center; margin-top: 20px; padding: 20px; font-size: 12px; color: #666;">
            <p style="margin: 0;">
              Central NL Scholastic Chess Club<br>
              Building strategic minds, one move at a time.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateStudentConfirmationEmail(data: StudentRegistrationData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Student Registration Confirmation</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #1a365d 0%, #2d5a87 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 28px; font-weight: bold;">
              ♟️ Student Added Successfully!
            </h1>
            <p style="margin: 10px 0 0; font-size: 16px; opacity: 0.9;">
              Central NL Scholastic Chess Club
            </p>
          </div>

          <!-- Main Content -->
          <div style="background: #ffffff; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <p style="font-size: 18px; margin-bottom: 20px;">
              Great news! ${data.playerName} has been successfully added to your account.
            </p>

            <!-- Student Details -->
            <div style="background: #f8f9fa; padding: 20px; border-radius: 6px; margin: 25px 0;">
              <h3 style="margin: 0 0 15px; color: #1a365d; font-size: 18px;">Student Details</h3>
              
              <div style="display: grid; gap: 10px;">
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                  <span style="font-weight: 600;">Name:</span>
                  <span>${data.playerName}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                  <span style="font-weight: 600;">Age:</span>
                  <span>${data.playerAge} years old</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                  <span style="font-weight: 600;">Grade:</span>
                  <span>${data.playerGrade}</span>
                </div>
              </div>
            </div>

            <!-- Next Steps -->
            <div style="background: #e6fffa; border-left: 4px solid #38b2ac; padding: 20px; margin: 25px 0;">
              <h3 style="margin: 0 0 15px; color: #234e52;">What's Next?</h3>
              <ul style="margin: 0; padding-left: 20px;">
                <li style="margin-bottom: 8px;">You can add more students using the "Add Student" button</li>
                <li style="margin-bottom: 8px;">All chess equipment is provided - no need to bring anything</li>
              </ul>
            </div>

            <!-- Contact -->
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #e2e8f0;">
              <p style="margin-bottom: 15px;">
                Questions? We're here to help!
              </p>
              <p style="margin: 0;">
                📧 <a href="mailto:daniel@cnlscc.com" style="color: #2d5a87; text-decoration: none;">daniel@cnlscc.com</a><br>
                🌐 <a href="https://cnlscc.com" style="color: #2d5a87; text-decoration: none;">cnlscc.com</a>
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div style="text-align: center; margin-top: 20px; padding: 20px; font-size: 12px; color: #666;">
            <p style="margin: 0;">
              Central NL Scholastic Chess Club<br>
              Building strategic minds, one move at a time.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateSelfConfirmationEmail(data: SelfRegistrationData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Student Registration Complete</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #1a365d 0%, #2d5a87 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 28px; font-weight: bold;">
              ♟️ Student Registration Complete!
            </h1>
            <p style="margin: 10px 0 0; font-size: 16px; opacity: 0.9;">
              Central NL Scholastic Chess Club
            </p>
          </div>

          <!-- Main Content -->
          <div style="background: #ffffff; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <p style="font-size: 18px; margin-bottom: 20px;">
              Dear ${data.playerName},
            </p>

            <p style="margin-bottom: 20px;">
              <strong>Congratulations! Your student registration is complete!</strong> You have successfully registered yourself for the Central NL Scholastic Chess Club. We're excited to welcome you to our chess community.
            </p>

            <!-- Registration Type Notice -->
            <div style="background: #d1ecf1; border-left: 4px solid #17a2b8; padding: 20px; margin: 25px 0;">
              <h3 style="margin: 0 0 15px; color: #0c5460;">✅ Registration Complete</h3>
              <p style="margin: 0; font-size: 14px; color: #0c5460;">
                You have registered yourself as a student (age 13+). Your registration includes a student record, so you're all set to participate in club activities.
              </p>
            </div>

            <!-- Registration Details -->
            <div style="background: #f8f9fa; padding: 20px; border-radius: 6px; margin: 25px 0;">
              <h3 style="margin: 0 0 15px; color: #1a365d; font-size: 18px;">Your Registration Details</h3>
              
              <div style="display: grid; gap: 10px;">
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                  <span style="font-weight: 600;">Registration Type:</span>
                  <span>Student Registration</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                  <span style="font-weight: 600;">Name:</span>
                  <span>${data.playerName}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                  <span style="font-weight: 600;">Age:</span>
                  <span>${data.playerAge} years old</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                  <span style="font-weight: 600;">Grade:</span>
                  <span>${data.playerGrade}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                  <span style="font-weight: 600;">Email:</span>
                  <span>${data.playerEmail}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                  <span style="font-weight: 600;">Phone:</span>
                  <span>${data.playerPhone}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                  <span style="font-weight: 600;">Emergency Contact:</span>
                  <span>${data.emergencyContact}</span>
                </div>
              </div>
            </div>

            <!-- Next Steps -->
            <div style="background: #e6fffa; border-left: 4px solid #38b2ac; padding: 20px; margin: 25px 0;">
              <h3 style="margin: 0 0 15px; color: #234e52;">What's Next?</h3>
              <ul style="margin: 0; padding-left: 20px;">
                <li style="margin-bottom: 8px;"><strong>Sessions typically run weekly</strong> during the school year</li>
                <li style="margin-bottom: 8px;"><strong>All chess equipment is provided</strong> - no need to bring anything</li>
                ${data.createAccount ? '<li style="margin-bottom: 8px;"><strong>Check your email</strong> for your player account login link to access your dashboard</li>' : ''}
              </ul>
            </div>

            <!-- Club Info -->
            <div style="margin: 25px 0;">
              <h3 style="color: #1a365d; margin-bottom: 15px;">Club Information</h3>
              <p style="margin-bottom: 10px;">
                <strong>Contact:</strong> daniel@cnlscc.com
              </p>
            </div>

            ${data.medicalInfo ? `
            <div style="background: #fff5f5; border-left: 4px solid #fc8181; padding: 20px; margin: 25px 0;">
              <h4 style="margin: 0 0 10px; color: #c53030;">Medical Information Noted</h4>
              <p style="margin: 0; font-size: 14px;">
                We have recorded the medical information you provided and will ensure our staff are aware of any special considerations.
              </p>
            </div>
            ` : ''}

            <!-- Contact -->
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #e2e8f0;">
              <p style="margin-bottom: 15px;">
                Questions? We're here to help!
              </p>
              <p style="margin: 0;">
                📧 <a href="mailto:daniel@cnlscc.com" style="color: #2d5a87; text-decoration: none;">daniel@cnlscc.com</a><br>
                🌐 <a href="https://cnlscc.com" style="color: #2d5a87; text-decoration: none;">cnlscc.com</a>
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div style="text-align: center; margin-top: 20px; padding: 20px; font-size: 12px; color: #666;">
            <p style="margin: 0;">
              Central NL Scholastic Chess Club<br>
              Building strategic minds, one move at a time.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

}

export const emailService = new EmailService();
