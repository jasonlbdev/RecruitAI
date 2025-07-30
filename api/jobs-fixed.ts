import { VercelRequest, VercelResponse } from '@vercel/node';
import { logAuditEvent } from './audit-logs';

// Inline database functions - no external imports
async function getAllJobs() {
  try {
    if (!process.env.DATABASE_URL) return [];
    
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL);
    
    const result = await sql`SELECT * FROM jobs ORDER BY created_at DESC`;
    return result || [];
  } catch (error) {
    console.error('getAllJobs error:', error);
    return [];
  }
}

async function createJob(jobData: any) {
  try {
    if (!process.env.DATABASE_URL) return null;
    
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL);
    
    const result = await sql`
      INSERT INTO jobs (title, company, location, description, requirements, salary_range, status)
      VALUES (${jobData.title}, ${jobData.company}, ${jobData.location}, ${jobData.description}, ${jobData.requirements}, ${jobData.salary_range}, ${jobData.status || 'active'})
      RETURNING *
    `;
    return result[0];
  } catch (error) {
    console.error('createJob error:', error);
    return null;
  }
}

async function updateJob(id: string, jobData: any) {
  try {
    if (!process.env.DATABASE_URL) return null;
    
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL);
    
    const result = await sql`
      UPDATE jobs 
      SET title = ${jobData.title}, company = ${jobData.company}, location = ${jobData.location}, 
          description = ${jobData.description}, requirements = ${jobData.requirements}, 
          salary_range = ${jobData.salary_range}, status = ${jobData.status}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `;
    return result[0];
  } catch (error) {
    console.error('updateJob error:', error);
    return null;
  }
}

async function deleteJob(id: string) {
  try {
    if (!process.env.DATABASE_URL) return false;
    
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL);
    
    await sql`DELETE FROM jobs WHERE id = ${id}`;
    return true;
  } catch (error) {
    console.error('deleteJob error:', error);
    return false;
  }
}

async function getJobById(id: string) {
  try {
    if (!process.env.DATABASE_URL) return null;
    
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL);
    
    const result = await sql`SELECT * FROM jobs WHERE id = ${id}`;
    return result[0] || null;
  } catch (error) {
    console.error('getJobById error:', error);
    return null;
  }
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
    const { id } = req.query;

    // GET /api/jobs - Get all jobs
    if (req.method === 'GET' && !id) {
      const jobs = await getAllJobs();
      return res.status(200).json({
        success: true,
        jobs
      });
    }

    // GET /api/jobs?id=123 - Get specific job
    if (req.method === 'GET' && id) {
      const job = await getJobById(id as string);
      if (!job) {
        return res.status(404).json({
          success: false,
          error: 'Job not found'
        });
      }
      return res.status(200).json({
        success: true,
        job
      });
    }

    // POST /api/jobs - Create new job
    if (req.method === 'POST') {
      const jobData = req.body;
      const newJob = await createJob(jobData);

      if (newJob) {
        // Log audit event
        await logAuditEvent('job', newJob.id, 'create', undefined, undefined, { job: newJob });
        
        return res.status(201).json({
          success: true,
          data: newJob
        });
      } else {
        return res.status(500).json({
          success: false,
          error: 'Failed to create job'
        });
      }
    }

    // PUT /api/jobs?id=123 - Update job
    if (req.method === 'PUT' && id) {
      const jobData = req.body;
      const jobId = id as string;
      const existingJob = await getJobById(jobId);

      if (!existingJob) {
        return res.status(404).json({
          success: false,
          error: 'Job not found'
        });
      }

      const updatedJob = await updateJob(jobId, jobData);

      if (updatedJob) {
        // Log audit event
        await logAuditEvent('job', jobId, 'update', undefined, undefined, { 
          before: existingJob, 
          after: updatedJob 
        });
        
        return res.status(200).json({
          success: true,
          data: updatedJob
        });
      } else {
        return res.status(404).json({
          success: false,
          error: 'Job not found'
        });
      }
    }

    // DELETE /api/jobs?id=123 - Delete job
    if (req.method === 'DELETE' && id) {
      const deletedJob = await deleteJob(id as string);

      if (deletedJob) {
        // Log audit event
        await logAuditEvent('job', id as string, 'delete', undefined, undefined, { job: deletedJob });
        
        return res.status(200).json({
          success: true,
          message: 'Job deleted successfully'
        });
      } else {
        return res.status(404).json({
          success: false,
          error: 'Job not found'
        });
      }
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  } catch (error) {
    console.error('Jobs API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
} 