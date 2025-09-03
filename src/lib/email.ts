import { Resend } from 'resend';

interface RegistrationData {
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  childName: string;
  childAge: string;
  childGrade: string;
  experience: string;
  emergencyContact: string;
  emergencyPhone: string;
  medicalInfo: string;
  consent: boolean;
  photoConsent: boolean;
  newsletter: boolean;
}

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
        subject: `Registration Confirmation - ${data.childName}`,
        html: emailHtml,
      });
    } catch (error) {
      console.error('Error sending confirmation email:', error);
      throw new Error('Failed to send confirmation email');
    }
  }

  private generateConfirmationEmail(data: RegistrationData): string {
    const experienceText = data.experience ? 
      this.getExperienceText(data.experience) : 'Not specified';

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
              Thank you for registering <strong>${data.childName}</strong> for the Central NL Scholastic Chess Club! 
              We're excited to welcome them to our chess community.
            </p>

            <!-- Registration Details -->
            <div style="background: #f8f9fa; padding: 20px; border-radius: 6px; margin: 25px 0;">
              <h3 style="margin: 0 0 15px; color: #1a365d; font-size: 18px;">Registration Details</h3>
              
              <div style="display: grid; gap: 10px;">
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                  <span style="font-weight: 600;">Player Name:</span>
                  <span>${data.childName}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                  <span style="font-weight: 600;">Age:</span>
                  <span>${data.childAge} years old</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                  <span style="font-weight: 600;">Grade:</span>
                  <span>${data.childGrade}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                  <span style="font-weight: 600;">Chess Experience:</span>
                  <span>${experienceText}</span>
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
                <li style="margin-bottom: 8px;">You'll receive schedule information within 24-48 hours</li>
                <li style="margin-bottom: 8px;">Sessions typically run weekly during the school year</li>
                <li style="margin-bottom: 8px;">All chess equipment is provided - no need to bring anything</li>
                <li style="margin-bottom: 8px;">Payment details will be sent separately</li>
              </ul>
            </div>

            <!-- Club Info -->
            <div style="margin: 25px 0;">
              <h3 style="color: #1a365d; margin-bottom: 15px;">Club Information</h3>
              <p style="margin-bottom: 10px;">
                <strong>Membership:</strong> $50/semester or $80/year<br>
                <strong>Family Discount:</strong> 2nd child 25% off<br>
                <strong>Contact:</strong> info@centralnlchess.ca
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
                📧 <a href="mailto:info@centralnlchess.ca" style="color: #2d5a87; text-decoration: none;">info@centralnlchess.ca</a><br>
                🌐 <a href="https://centralnlchess.ca" style="color: #2d5a87; text-decoration: none;">centralnlchess.ca</a>
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

  private getExperienceText(experience: string): string {
    const experienceMap: Record<string, string> = {
      'none': 'Complete Beginner',
      'basic': 'Knows Basic Rules',
      'casual': 'Casual Player',
      'tournament': 'Tournament Experience'
    };
    return experienceMap[experience] || experience;
  }
}

export const emailService = new EmailService();
