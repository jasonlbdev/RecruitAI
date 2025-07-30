import { VercelRequest, VercelResponse } from '@vercel/node';

// Inline database functions - no external imports
async function getAllApplications() {
  try {
    if (!process.env.DATABASE_URL) {
      return [];
    }
    
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL);
    
    return await sql`
      SELECT a.*, j.title as job_title, c.name as candidate_name 
      FROM applications a 
      JOIN jobs j ON a.job_id = j.id 
      JOIN candidates c ON a.candidate_id = c.id 
      ORDER BY a.applied_at DESC
    `.catch(() => []);
  } catch (error) {
    console.error('getAllApplications error:', error);
    return [];
  }
}

async function createApplication(applicationData: any) {
  try {
    if (!process.env.DATABASE_URL) {
      return null;
    }
    
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL);
    
    const result = await sql`
      INSERT INTO applications (job_id, candidate_id, status, ai_analysis, ai_provider, usage)
      VALUES (${applicationData.job_id}, ${applicationData.candidate_id}, ${applicationData.status || 'pending'}, ${JSON.stringify(applicationData.ai_analysis)}, ${applicationData.ai_provider}, ${JSON.stringify(applicationData.usage)})
      RETURNING *
    `.catch(() => []);
    
    return result[0] || null;
  } catch (error) {
    console.error('createApplication error:', error);
    return null;
  }
}

async function updateApplication(id: string, applicationData: any) {
  try {
    if (!process.env.DATABASE_URL) {
      return null;
    }
    
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL);
    
    const result = await sql`
      UPDATE applications 
      SET status = ${applicationData.status}, 
          ai_analysis = ${JSON.stringify(applicationData.ai_analysis)}, 
          ai_provider = ${applicationData.ai_provider}, 
          usage = ${JSON.stringify(applicationData.usage)},
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `.catch(() => []);
    
    return result[0] || null;
  } catch (error) {
    console.error('updateApplication error:', error);
    return null;
  }
}

async function deleteApplication(id: string) {
  try {
    if (!process.env.DATABASE_URL) {
      return false;
    }
    
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL);
    
    await sql`
      DELETE FROM applications WHERE id = ${id}
    `.catch(() => {});
    
    return true;
  } catch (error) {
    console.error('deleteApplication error:', error);
    return false;
  }
}

async function getApplicationById(id: string) {
  try {
    if (!process.env.DATABASE_URL) {
      return null;
    }
    
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL);
    
    const result = await sql`
      SELECT a.*, j.title as job_title, c.name as candidate_name 
      FROM applications a 
      JOIN jobs j ON a.job_id = j.id 
      JOIN candidates c ON a.candidate_id = c.id 
      WHERE a.id = ${id}
    `.catch(() => []);
    
    return result[0] || null;
  } catch (error) {
    console.error('getApplicationById error:', error);
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
    if (req.method === 'GET') {
      const { id } = req.query;
      
      if (id) {
        const application = await getApplicationById(id as string);
        if (application) {
          return res.status(200).json({
            success: true,
            application
          });
        } else {
          return res.status(404).json({
            success: false,
            error: 'Application not found'
          });
        }
      } else {
        const applications = await getAllApplications();
        return res.status(200).json({
          success: true,
          applications
        });
      }
    }

    if (req.method === 'POST') {
      const application = await createApplication(req.body);
      if (application) {
        return res.status(201).json({
          success: true,
          application
        });
      } else {
        return res.status(500).json({
          success: false,
          error: 'Failed to create application'
        });
      }
    }

    if (req.method === 'PUT') {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Application ID required'
        });
      }

      const application = await updateApplication(id as string, req.body);
      if (application) {
        return res.status(200).json({
          success: true,
          application
        });
      } else {
        return res.status(404).json({
          success: false,
          error: 'Application not found or update failed'
        });
      }
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Application ID required'
        });
      }

      const success = await deleteApplication(id as string);
      if (success) {
        return res.status(200).json({
          success: true,
          message: 'Application deleted successfully'
        });
      } else {
        return res.status(404).json({
          success: false,
          error: 'Application not found or delete failed'
        });
      }
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  } catch (error) {
    console.error('Applications API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
} 