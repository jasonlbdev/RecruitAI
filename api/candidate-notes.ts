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
      return res.status(200).json({
        success: true,
        data: {
          notes: [],
          pagination: {
            total: 0,
            limit: 50,
            offset: 0,
            hasMore: false
          }
        }
      });
    }
    
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL);
    
    if (req.method === 'GET') {
      // Simple query to get all notes
      const notesResult = await sql`
        SELECT * FROM candidate_notes 
        ORDER BY created_at DESC 
        LIMIT 50
      `.catch(() => []);
      
      const countResult = await sql`
        SELECT COUNT(*) as total FROM candidate_notes
      `.catch(() => [{ total: 0 }]);
      
      return res.status(200).json({
        success: true,
        data: {
          notes: notesResult,
          pagination: {
            total: parseInt(countResult[0]?.total || '0'),
            limit: 50,
            offset: 0,
            hasMore: false
          }
        }
      });

    } else if (req.method === 'POST') {
      const { candidate_id, note, note_type } = req.body;

      if (!candidate_id || !note) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: candidate_id, note'
        });
      }

      const result = await sql`
        INSERT INTO candidate_notes (candidate_id, note, note_type)
        VALUES (${candidate_id}, ${note}, ${note_type || 'general'})
        RETURNING *
      `.catch(() => []);

      if (result.length > 0) {
        return res.status(201).json({
          success: true,
          data: result[0]
        });
      } else {
        return res.status(500).json({
          success: false,
          error: 'Failed to create note'
        });
      }
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });

  } catch (error) {
    console.error('Candidate notes simple API error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
} 