import { VercelRequest, VercelResponse } from '@vercel/node';

interface OnboardingStep {
  id: string;
  applicationId: string;
  candidateId: string;
  jobId: string;
  stepType: 'offer_letter' | 'background_check' | 'reference_check' | 'document_collection' | 'orientation' | 'first_day';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  dueDate?: string;
  completedDate?: string;
  notes?: string;
  assignedTo?: string;
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

      let query = sql`SELECT * FROM onboarding_steps WHERE 1=1`;

      if (applicationId) {
        query = sql`${query} AND application_id = ${applicationId as string}`;
      }
      if (candidateId) {
        query = sql`${query} AND candidate_id = ${candidateId as string}`;
      }
      if (jobId) {
        query = sql`${query} AND job_id = ${jobId as string}`;
      }

      query = sql`${query} ORDER BY created_at ASC`;

      const steps = await query.catch(() => []);

      return res.status(200).json({
        success: true,
        data: steps
      });

    } else if (req.method === 'POST') {
      const { action, data } = req.body;

      if (action === 'start_onboarding') {
        const { applicationId, candidateId, jobId } = data;

        // Create default onboarding steps
        const defaultSteps = [
          { stepType: 'offer_letter', dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() },
          { stepType: 'background_check', dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() },
          { stepType: 'reference_check', dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString() },
          { stepType: 'document_collection', dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString() },
          { stepType: 'orientation', dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() },
          { stepType: 'first_day', dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() }
        ];

        const createdSteps = [];

        for (const step of defaultSteps) {
          const result = await sql`
            INSERT INTO onboarding_steps (
              application_id, candidate_id, job_id, step_type, 
              status, due_date
            )
            VALUES (
              ${applicationId}, ${candidateId}, ${jobId}, ${step.stepType},
              'pending', ${step.dueDate}
            )
            RETURNING *
          `.catch(() => []);

          if (result.length > 0) {
            createdSteps.push(result[0]);
          }
        }

        // Update application status to 'onboarding'
        await sql`
          UPDATE applications 
          SET status = 'onboarding', updated_at = NOW()
          WHERE id = ${applicationId}
        `.catch(() => {});

        return res.status(200).json({
          success: true,
          data: createdSteps
        });

      } else if (action === 'update_step') {
        const { stepId, status, notes, completedDate } = data;

        const result = await sql`
          UPDATE onboarding_steps 
          SET 
            status = ${status},
            notes = ${notes || ''},
            completed_date = ${completedDate || null},
            updated_at = NOW()
          WHERE id = ${stepId}
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
            error: 'Onboarding step not found'
          });
        }
      }

      return res.status(400).json({
        success: false,
        error: 'Invalid action'
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });

  } catch (error) {
    console.error('Onboarding error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
} 