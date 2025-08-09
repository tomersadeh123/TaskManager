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
    const { to, messageContent, subjectPrefix } = data;
    const template = this.createEmailTemplate(messageContent, subjectPrefix);
    return this.sendEmail(to, template);
  }
}

export const emailService = new EmailService();

// Job-specific email function for scraper notifications
interface JobData {
  title: string;
  company: string;
  location: string;
  postingDate: string;
  postingDays: number;
  source: 'LinkedIn' | 'Drushim.il';
  url: string;
  description: string;
  searchKeyword: string;
  scrapedAt: Date;
}

export async function emailJobReport(userEmail: string, userName: string, jobs: JobData[]): Promise<boolean> {
  try {
    const jobCount = jobs.length;
    const linkedinJobs = jobs.filter(job => job.source === 'LinkedIn').length;
    const drushimJobs = jobs.filter(job => job.source === 'Drushim.il').length;
    
    // Create job list HTML
    const jobListHtml = jobs.slice(0, 10).map(job => `
      <div style="border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px;">
        <h3 style="margin: 0; color: #333; font-size: 18px;">${job.title}</h3>
        <p style="margin: 5px 0; color: #666;"><strong>Company:</strong> ${job.company}</p>
        <p style="margin: 5px 0; color: #666;"><strong>Location:</strong> ${job.location}</p>
        <p style="margin: 5px 0; color: #666;"><strong>Source:</strong> ${job.source}</p>
        <p style="margin: 5px 0; color: #666;"><strong>Posted:</strong> ${job.postingDate} (${job.postingDays} days ago)</p>
        <a href="${job.url}" target="_blank" style="color: #007bff; text-decoration: none;">View Job →</a>
      </div>
    `).join('');

    const moreJobsHtml = jobCount > 10 ? `
      <p style="text-align: center; margin: 20px 0; color: #666;">
        ...and ${jobCount - 10} more jobs available in your dashboard
      </p>
    ` : '';

    const htmlTemplate = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #2c5aa0; text-align: center; margin-bottom: 30px;">
              🎯 New Job Opportunities Found!
            </h1>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              Hi ${userName},
            </p>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              Great news! We found <strong>${jobCount} new job opportunities</strong> for you:
            </p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0; color: #2c5aa0;">📊 Summary:</h3>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li><strong>Total Jobs:</strong> ${jobCount}</li>
                <li><strong>LinkedIn:</strong> ${linkedinJobs}</li>
                <li><strong>Drushim.il:</strong> ${drushimJobs}</li>
              </ul>
            </div>
            
            <h3 style="color: #2c5aa0; margin: 30px 0 15px 0;">🔥 Latest Job Opportunities:</h3>
            
            ${jobListHtml}
            
            ${moreJobsHtml}
            
            <div style="text-align: center; margin: 40px 0;">
              <a href="${process.env.APP_URL || 'http://localhost:3000'}/dashboard" 
                 style="background-color: #2c5aa0; color: white; padding: 15px 30px; 
                        border-radius: 5px; text-decoration: none; font-weight: bold; 
                        display: inline-block;">
                View All Jobs in Dashboard
              </a>
            </div>
            
            <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 40px; 
                        text-align: center; color: #666; font-size: 14px;">
              <p>This is an automated notification from your Job Hunter app.</p>
              <p>Happy job hunting! 🚀</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const textContent = `
Hi ${userName},

Great news! We found ${jobCount} new job opportunities for you:

Summary:
- Total Jobs: ${jobCount}
- LinkedIn: ${linkedinJobs}
- Drushim.il: ${drushimJobs}

Latest Jobs:
${jobs.slice(0, 5).map(job => `
• ${job.title} at ${job.company} (${job.location})
  Source: ${job.source} | Posted: ${job.postingDate}
  ${job.url}
`).join('\n')}

${jobCount > 5 ? `...and ${jobCount - 5} more jobs available in your dashboard` : ''}

View all jobs: ${process.env.APP_URL || 'http://localhost:3000'}/dashboard

Happy job hunting!
    `;

    const emailResult = await transporter.sendMail({
      from: 'Job Hunter <no-reply@jobhunter.app>',
      to: userEmail,
      subject: `🎯 ${jobCount} New Job Opportunities Found!`,
      html: htmlTemplate,
      text: textContent,
    });

    console.log(`📧 Job report email sent to ${userEmail}:`, emailResult.messageId);
    return true;

  } catch (error) {
    console.error('Error sending job report email:', error);
    return false;
  }
}
