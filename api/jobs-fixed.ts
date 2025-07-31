import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({
        success: false,
        error: 'Database not configured'
      });
    }

    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL);

    if (req.method === 'GET') {
      const jobs = await sql`SELECT * FROM jobs ORDER BY created_at DESC`.catch(() => []);
      
      return res.status(200).json({
        success: true,
        jobs: jobs || []
      });

    } else if (req.method === 'POST') {
      const { 
        title, 
        department, 
        location, 
        jobType, 
        employmentType, 
        salaryMin, 
        salaryMax, 
        description, 
        requirements, 
        niceToHave, 
        deadline, 
        isRemote, 
        experienceLevel, 
        scoringWeights, 
        status 
      } = req.body;

      if (!title || !department || !location) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields'
        });
      }

      const result = await sql`
        INSERT INTO jobs (
          title, department, location, type, salary_min, salary_max, 
          description, requirements, benefits, deadline, is_remote, 
          experience_level, scoring_weights, status
        )
        VALUES (
          ${title}, ${department}, ${location}, ${jobType || 'full-time'}, 
          ${salaryMin || null}, ${salaryMax || null}, ${description || ''}, 
          ${JSON.stringify(requirements || [])}, ${JSON.stringify(niceToHave || [])}, 
          ${deadline || null}, ${isRemote || false}, ${experienceLevel || 'mid'}, 
          ${JSON.stringify(scoringWeights || {experience: 30, skills: 30, location: 15, education: 15, salary: 10})}, 
          ${status || 'active'}
        )
        RETURNING *
      `.catch(() => []);

      if (result.length > 0) {
        return res.status(200).json({
          success: true,
          job: result[0]
        });
      } else {
        return res.status(500).json({
          success: false,
          error: 'Failed to create job'
        });
      }

    } else if (req.method === 'PUT') {
      const { 
        id, 
        title, 
        department, 
        location, 
        jobType, 
        employmentType, 
        salaryMin, 
        salaryMax, 
        description, 
        requirements, 
        niceToHave, 
        deadline, 
        isRemote, 
        experienceLevel, 
        scoringWeights, 
        status 
      } = req.body;

      if (!id || !title || !department || !location) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields'
        });
      }

      const result = await sql`
        UPDATE jobs 
        SET 
          title = ${title}, 
          department = ${department}, 
          location = ${location}, 
          type = ${jobType || 'full-time'},
          salary_min = ${salaryMin || null}, 
          salary_max = ${salaryMax || null},
          description = ${description || ''}, 
          requirements = ${JSON.stringify(requirements || [])}, 
          benefits = ${JSON.stringify(niceToHave || [])},
          deadline = ${deadline || null},
          is_remote = ${isRemote || false},
          experience_level = ${experienceLevel || 'mid'},
          scoring_weights = ${JSON.stringify(scoringWeights || {experience: 30, skills: 30, location: 15, education: 15, salary: 10})},
          status = ${status || 'active'}, 
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `.catch(() => []);

      if (result.length > 0) {
        return res.status(200).json({
          success: true,
          job: result[0]
        });
      } else {
        return res.status(404).json({
          success: false,
          error: 'Job not found'
        });
      }

    } else if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Job ID is required'
        });
      }

      await sql`DELETE FROM jobs WHERE id = ${id as string}`.catch(() => {});

      return res.status(200).json({
        success: true,
        message: 'Job deleted successfully'
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });

  } catch (error) {
    console.error('Jobs API error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
} 