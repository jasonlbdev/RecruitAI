import { VercelRequest, VercelResponse } from '@vercel/node';

interface ExportQuery {
  type: 'candidates' | 'applications' | 'jobs';
  format: 'csv' | 'json';
  filters?: any;
}

// Simple CSV generation function
function generateCSV(data: any[], headers: string[]): string {
  const csvHeaders = headers.join(',');
  const csvRows = data.map(row => 
    headers.map(header => {
      const value = row[header] || '';
      // Escape commas and quotes in CSV
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',')
  );
  
  return [csvHeaders, ...csvRows].join('\n');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      const { type, format } = req.query;
      const exportType = type as string;
      const exportFormat = format as string;

      if (!type || !['candidates', 'applications', 'jobs'].includes(exportType)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid export type. Must be: candidates, applications, jobs'
        });
      }

      if (!format || !['csv', 'json'].includes(exportFormat)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid format. Must be: csv, json'
        });
      }

      if (!process.env.DATABASE_URL) {
        return res.status(500).json({
          success: false,
          error: 'Database not configured'
        });
      }

      const { neon } = await import('@neondatabase/serverless');
      const sql = neon(process.env.DATABASE_URL);

      let data: any[] = [];
      let headers: string[] = [];

      if (exportType === 'candidates') {
        data = await sql`
          SELECT 
            id, first_name, last_name, email, phone, location, 
            years_of_experience, current_position, current_company,
            desired_salary_min, desired_salary_max, skills,
            ai_score, source, created_at
          FROM candidates 
          ORDER BY created_at DESC
        `.catch(() => []);

        headers = [
          'ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Location',
          'Years of Experience', 'Current Position', 'Current Company',
          'Desired Salary Min', 'Desired Salary Max', 'Skills',
          'AI Score', 'Source', 'Created At'
        ];
      } else if (exportType === 'applications') {
        data = await sql`
          SELECT 
            a.id, a.application_date, a.status, a.cover_letter_text,
            c.first_name, c.last_name, c.email,
            j.title as job_title, j.company as job_company,
            a.created_at
          FROM applications a
          LEFT JOIN candidates c ON a.candidate_id = c.id
          LEFT JOIN jobs j ON a.job_id = j.id
          ORDER BY a.created_at DESC
        `.catch(() => []);

        headers = [
          'ID', 'Application Date', 'Status', 'Cover Letter',
          'Candidate First Name', 'Candidate Last Name', 'Candidate Email',
          'Job Title', 'Job Company', 'Created At'
        ];
      } else if (exportType === 'jobs') {
        data = await sql`
          SELECT 
            id, title, company, location, description,
            requirements, salary_min, salary_max,
            job_type, is_remote, status, created_at
          FROM jobs 
          ORDER BY created_at DESC
        `.catch(() => []);

        headers = [
          'ID', 'Title', 'Company', 'Location', 'Description',
          'Requirements', 'Salary Min', 'Salary Max',
          'Job Type', 'Is Remote', 'Status', 'Created At'
        ];
      }

      if (exportFormat === 'csv') {
        const csv = generateCSV(data, headers);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${exportType}-${new Date().toISOString().split('T')[0]}.csv"`);
        return res.status(200).send(csv);
      } else {
        return res.status(200).json({
          success: true,
          data: {
            type: exportType,
            format: exportFormat,
            count: data.length,
            headers,
            records: data
          }
        });
      }

    } catch (error) {
      console.error('Export API error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  });
} 