import { VercelRequest, VercelResponse } from '@vercel/node';

interface Interview {
  id: string;
  applicationId: string;
  candidateId: string;
  jobId: string;
  interviewerId: string;
  scheduledDate: string;
  duration: number; // minutes
  location: string;
  type: 'phone' | 'video' | 'onsite';
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  notes?: string;
  feedback?: string;
  rating?: number;
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
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({
        success: false,
        error: 'Database not configured'
      });
    }

    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL);

    if (req.method === 'GET') {
      const { applicationId, candidateId, jobId } = req.query;

      let query = sql`SELECT * FROM interviews WHERE 1=1`;
      const params: any[] = [];

      if (applicationId) {
        query = sql`${query} AND application_id = ${applicationId as string}`;
      }
      if (candidateId) {
        query = sql`${query} AND candidate_id = ${candidateId as string}`;
      }
      if (jobId) {
        query = sql`${query} AND job_id = ${jobId as string}`;
      }

      query = sql`${query} ORDER BY scheduled_date DESC`;

      const interviews = await query.catch(() => []);

      return res.status(200).json({
        success: true,
        data: interviews
      });

    } else if (req.method === 'POST') {
      const { applicationId, candidateId, jobId, interviewerId, scheduledDate, duration, location, type, notes } = req.body;

      if (!applicationId || !candidateId || !jobId || !interviewerId || !scheduledDate || !duration || !location || !type) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields'
        });
      }

      const result = await sql`
        INSERT INTO interviews (
          application_id, candidate_id, job_id, interviewer_id, 
          scheduled_date, duration, location, type, status, notes
        )
        VALUES (
          ${applicationId}, ${candidateId}, ${jobId}, ${interviewerId},
          ${scheduledDate}, ${duration}, ${location}, ${type}, 'scheduled', ${notes || ''}
        )
        RETURNING *
      `.catch(() => []);

      if (result.length > 0) {
        // Update application status to 'interviewed'
        await sql`
          UPDATE applications 
          SET status = 'interviewed', updated_at = NOW()
          WHERE id = ${applicationId}
        `.catch(() => {});

        // Send email notification
        try {
          await fetch('/api/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              templateId: 'interview-invitation',
              to: 'candidate@example.com', // Would get from candidate data
              variables: {
                candidate_name: 'Candidate Name',
                company_name: 'Company Name',
                job_title: 'Job Title',
                interview_date: new Date(scheduledDate).toLocaleDateString(),
                interview_time: new Date(scheduledDate).toLocaleTimeString(),
                interview_location: location,
                interviewer_name: 'Interviewer Name',
                interview_duration: `${duration} minutes`
              }
            })
          });
        } catch (error) {
          console.warn('Failed to send interview email:', error);
        }

        return res.status(200).json({
          success: true,
          data: result[0]
        });
      } else {
        return res.status(500).json({
          success: false,
          error: 'Failed to create interview'
        });
      }

    } else if (req.method === 'PUT') {
      const { id, status, feedback, rating, notes } = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Interview ID is required'
        });
      }

      const result = await sql`
        UPDATE interviews 
        SET 
          status = ${status || 'scheduled'},
          feedback = ${feedback || ''},
          rating = ${rating || null},
          notes = ${notes || ''},
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `.catch(() => []);

      if (result.length > 0) {
        return res.status(200).json({
          success: true,
          data: result[0]
        });
      } else {
        return res.status(404).json({
          success: false,
          error: 'Interview not found'
        });
      }
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });

  } catch (error) {
    console.error('Interview scheduling error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
} 