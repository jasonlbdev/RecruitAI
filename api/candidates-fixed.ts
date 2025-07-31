import { VercelRequest, VercelResponse } from '@vercel/node';

// Inline database functions - no external imports
async function getAllCandidates() {
  try {
    if (!process.env.DATABASE_URL) {
      return [];
    }
    
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL);
    
    return await sql`
      SELECT * FROM candidates 
      ORDER BY created_at DESC
    `.catch(() => []);
  } catch (error) {
    console.error('getAllCandidates error:', error);
    return [];
  }
}

async function createCandidate(candidateData: any) {
  try {
    if (!process.env.DATABASE_URL) {
      return null;
    }
    
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL);
    
    const result = await sql`
      INSERT INTO candidates (name, email, phone, resume_url, skills, experience_years, current_position)
      VALUES (${candidateData.name}, ${candidateData.email}, ${candidateData.phone}, ${candidateData.resume_url}, ${candidateData.skills}, ${candidateData.experience_years}, ${candidateData.current_position})
      RETURNING *
    `.catch(() => []);
    
    return result[0] || null;
  } catch (error) {
    console.error('createCandidate error:', error);
    return null;
  }
}

async function updateCandidate(id: string, candidateData: any) {
  try {
    if (!process.env.DATABASE_URL) {
      return null;
    }
    
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL);
    
    const result = await sql`
      UPDATE candidates 
      SET name = ${candidateData.name}, 
          email = ${candidateData.email}, 
          phone = ${candidateData.phone}, 
          resume_url = ${candidateData.resume_url}, 
          skills = ${candidateData.skills}, 
          experience_years = ${candidateData.experience_years}, 
          current_position = ${candidateData.current_position},
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `.catch(() => []);
    
    return result[0] || null;
  } catch (error) {
    console.error('updateCandidate error:', error);
    return null;
  }
}

async function deleteCandidate(id: string) {
  try {
    if (!process.env.DATABASE_URL) {
      return false;
    }
    
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL);
    
    await sql`
      DELETE FROM candidates WHERE id = ${id}
    `.catch(() => {});
    
    return true;
  } catch (error) {
    console.error('deleteCandidate error:', error);
    return false;
  }
}

async function getCandidateById(id: string) {
  try {
    if (!process.env.DATABASE_URL) {
      return null;
    }
    
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL);
    
    const result = await sql`
      SELECT * FROM candidates WHERE id = ${id}
    `.catch(() => []);
    
    return result[0] || null;
  } catch (error) {
    console.error('getCandidateById error:', error);
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
        const candidate = await getCandidateById(id as string);
        if (candidate) {
          return res.status(200).json({
            success: true,
            candidate
          });
        } else {
          return res.status(404).json({
            success: false,
            error: 'Candidate not found'
          });
        }
      } else {
        const candidates = await getAllCandidates();
        return res.status(200).json({
          success: true,
          candidates
        });
      }
    }

    if (req.method === 'POST') {
      const candidate = await createCandidate(req.body);
      if (candidate) {
        return res.status(201).json({
          success: true,
          candidate
        });
      } else {
        return res.status(500).json({
          success: false,
          error: 'Failed to create candidate'
        });
      }
    }

    if (req.method === 'PUT') {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Candidate ID required'
        });
      }

      const candidate = await updateCandidate(id as string, req.body);
      if (candidate) {
        return res.status(200).json({
          success: true,
          candidate
        });
      } else {
        return res.status(404).json({
          success: false,
          error: 'Candidate not found or update failed'
        });
      }
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Candidate ID required'
        });
      }

      const success = await deleteCandidate(id as string);
      if (success) {
        return res.status(200).json({
          success: true,
          message: 'Candidate deleted successfully'
        });
      } else {
        return res.status(404).json({
          success: false,
          error: 'Candidate not found or delete failed'
        });
      }
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  } catch (error) {
    console.error('Candidates API error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
} 