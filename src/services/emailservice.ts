import nodemailer from "nodemailer";

export interface EmailNotificationData {
  to: string;
  messageContent: string;
  trackingUrl: string;
  subjectPrefix: string;
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USERNAME,
    pass: process.env.SMTP_PASSWORD,
  },
});

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export class EmailService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.APP_URL || "";
  }

  private createEmailTemplate(
    messageContent: string,
    subjectPrefix: string
  ): EmailTemplate {
    const htmlTemplate = `
      <html>
        <body>
          <table>
            <tr>
              <td align="center" style="padding-top: 40px;">
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-top: 60px;">
                <div style="font-family: Roboto,sans-serif; font-size: 16px;">
                  ${messageContent}
                </div>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-top: 40px;">
                <a style="background-color: black; color: white; border-radius: 32px; padding: 12px 40px; font-family: Roboto,sans-serif; font-size: 22px; font-weight: 700; text-decoration: none;">
                  OPEN
                </a>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    const textContent = messageContent.replace(/<[^>]+>/g, '').trim();

    return {
      subject: `Onboarding Notification - ${subjectPrefix}`,
      html: htmlTemplate,
      text: `${textContent}`,
    };
  }

  private async sendEmail(to: string, template: EmailTemplate): Promise<boolean> {
    const email = await transporter.sendMail({
      from: 'No-Reply <no-reply@app.online>',
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
    console.log("Message sent:", email.messageId);
    return true;
  }

  public async sendStatusUpdate(data: EmailNotificationData): Promise<boolean> {
    const { to, messageContent, trackingUrl, subjectPrefix } = data;
    const template = this.createEmailTemplate(messageContent, subjectPrefix);
    return this.sendEmail(to, template);
  }
}

export const emailService = new EmailService();
