import { VercelRequest, VercelResponse } from '@vercel/node';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  variables: string[];
}

interface EmailRequest {
  templateId: string;
  to: string;
  variables: Record<string, string>;
  attachments?: any[];
}

// Email templates
const emailTemplates: EmailTemplate[] = [
  {
    id: 'application-received',
    name: 'Application Received',
    subject: 'Application Received - {company_name}',
    body: `
Dear {candidate_name},

Thank you for your interest in the {job_title} position at {company_name}. We have received your application and are currently reviewing it.

Your application details:
- Position: {job_title}
- Application Date: {application_date}
- Reference ID: {application_id}

We will review your application and get back to you within 5-7 business days. If you have any questions, please don't hesitate to reach out.

Best regards,
{company_name} Recruitment Team
    `,
    variables: ['candidate_name', 'company_name', 'job_title', 'application_date', 'application_id']
  },
  {
    id: 'interview-invitation',
    name: 'Interview Invitation',
    subject: 'Interview Invitation - {company_name}',
    body: `
Dear {candidate_name},

We are pleased to invite you for an interview for the {job_title} position at {company_name}.

Interview Details:
- Date: {interview_date}
- Time: {interview_time}
- Location: {interview_location}
- Interviewer: {interviewer_name}
- Duration: {interview_duration}

Please confirm your attendance by replying to this email. If you need to reschedule, please let us know at least 24 hours in advance.

Best regards,
{company_name} Recruitment Team
    `,
    variables: ['candidate_name', 'company_name', 'job_title', 'interview_date', 'interview_time', 'interview_location', 'interviewer_name', 'interview_duration']
  },
  {
    id: 'rejection-letter',
    name: 'Rejection Letter',
    subject: 'Application Update - {company_name}',
    body: `
Dear {candidate_name},

Thank you for your interest in the {job_title} position at {company_name} and for taking the time to apply.

After careful consideration, we regret to inform you that we have decided to move forward with other candidates whose qualifications more closely match our current needs.

We appreciate your interest in {company_name} and encourage you to apply for future opportunities that match your skills and experience.

Best regards,
{company_name} Recruitment Team
    `,
    variables: ['candidate_name', 'company_name', 'job_title']
  },
  {
    id: 'offer-letter',
    name: 'Offer Letter',
    subject: 'Job Offer - {company_name}',
    body: `
Dear {candidate_name},

We are delighted to offer you the position of {job_title} at {company_name}.

Offer Details:
- Position: {job_title}
- Start Date: {start_date}
- Salary: {salary}
- Benefits: {benefits}
- Location: {work_location}

Please review the attached offer letter and respond within 5 business days. If you have any questions, please don't hesitate to contact us.

We look forward to having you join our team!

Best regards,
{company_name} HR Team
    `,
    variables: ['candidate_name', 'company_name', 'job_title', 'start_date', 'salary', 'benefits', 'work_location']
  }
];

// Simple email sending function (in production, integrate with SendGrid, Mailgun, etc.)
async function sendEmail(to: string, subject: string, body: string): Promise<boolean> {
  try {
    // For now, just log the email (in production, use actual email service)
    console.log('Email would be sent:', {
      to,
      subject,
      body,
      timestamp: new Date().toISOString()
    });

    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 100));

    return true;
  } catch (error) {
    console.error('Email sending error:', error);
    return false;
  }
}

// Process template variables
function processTemplate(template: EmailTemplate, variables: Record<string, string>): { subject: string; body: string } {
  let subject = template.subject;
  let body = template.body;

  template.variables.forEach(variable => {
    const value = variables[variable] || `[${variable}]`;
    const regex = new RegExp(`{${variable}}`, 'g');
    subject = subject.replace(regex, value);
    body = body.replace(regex, value);
  });

  return { subject, body };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      // Get email templates
      return res.status(200).json({
        success: true,
        data: emailTemplates
      });

    } else if (req.method === 'POST') {
      const { templateId, to, variables, attachments } = req.body as EmailRequest;

      if (!templateId || !to || !variables) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: templateId, to, variables'
        });
      }

      // Find template
      const template = emailTemplates.find(t => t.id === templateId);
      if (!template) {
        return res.status(400).json({
          success: false,
          error: 'Template not found'
        });
      }

      // Process template
      const { subject, body } = processTemplate(template, variables);

      // Send email
      const success = await sendEmail(to, subject, body);

      if (success) {
        // Log email activity
        if (process.env.DATABASE_URL) {
          try {
            const { neon } = await import('@neondatabase/serverless');
            const sql = neon(process.env.DATABASE_URL);
            
            await sql`
              INSERT INTO email_logs (template_id, recipient, subject, variables, sent_at)
              VALUES (${templateId}, ${to}, ${subject}, ${JSON.stringify(variables)}, NOW())
            `.catch(() => {
              console.warn('Failed to log email to database');
            });
          } catch (error) {
            console.warn('Database logging failed:', error);
          }
        }

        return res.status(200).json({
          success: true,
          message: 'Email sent successfully',
          data: { templateId, to, subject }
        });
      } else {
        return res.status(500).json({
          success: false,
          error: 'Failed to send email'
        });
      }
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });

  } catch (error) {
    console.error('Email API error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
} 