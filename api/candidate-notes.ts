import { VercelRequest, VercelResponse } from '@vercel/node';
import { logAuditEvent } from './audit-logs';

// Types for candidate notes
interface CandidateNote {
  id?: number;
  candidate_id: string;
  note: string;
  note_type?: 'general' | 'interview' | 'feedback' | 'follow_up' | 'technical';
  created_by?: string;
  created_by_email?: string;
  created_at?: string;
  updated_at?: string;
}

interface NoteQuery {
  candidate_id?: string;
  note_type?: string;
  limit?: number;
  offset?: number;
}

// Database functions
async function createCandidateNote(note: CandidateNote): Promise<CandidateNote | null> {
  try {
    if (!process.env.DATABASE_URL) {
      console.warn('No database URL configured for candidate notes');
      return null;
    }
    
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL);
    
    const result = await sql`
      INSERT INTO candidate_notes (candidate_id, note, note_type, created_by, created_by_email)
      VALUES (${note.candidate_id}, ${note.note}, ${note.note_type || 'general'}, ${note.created_by || null}, ${note.created_by_email || null})
      RETURNING *
    `.catch((error) => {
      console.error('Failed to create candidate note:', error);
      return [];
    });
    
    return result[0] as CandidateNote || null;
  } catch (error) {
    console.error('createCandidateNote error:', error);
    return null;
  }
}

async function getCandidateNotes(query: NoteQuery): Promise<{ notes: CandidateNote[]; total: number }> {
  try {
    if (!process.env.DATABASE_URL) {
      return { notes: [], total: 0 };
    }
    
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL);
    
    // Build dynamic query
    const conditions: string[] = [];
    const values: any[] = [];
    
    if (query.candidate_id) {
      conditions.push(`candidate_id = $${values.length + 1}`);
      values.push(query.candidate_id);
    }
    
    if (query.note_type) {
      conditions.push(`note_type = $${values.length + 1}`);
      values.push(query.note_type);
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = query.limit || 50;
    const offset = query.offset || 0;
    
    // Get total count
    const countResult = await sql`
      SELECT COUNT(*) as total FROM candidate_notes ${sql.unsafe(whereClause)}
    `.catch(() => [{ total: 0 }]);
    
    // Get notes with pagination
    const notesResult = await sql`
      SELECT * FROM candidate_notes 
      ${sql.unsafe(whereClause)}
      ORDER BY created_at DESC 
      LIMIT ${limit} OFFSET ${offset}
    `.catch(() => []);
    
    return {
      notes: notesResult as CandidateNote[],
      total: parseInt(countResult[0]?.total || '0')
    };
  } catch (error) {
    console.error('getCandidateNotes error:', error);
    return { notes: [], total: 0 };
  }
}

async function updateCandidateNote(noteId: number, updates: Partial<CandidateNote>): Promise<CandidateNote | null> {
  try {
    if (!process.env.DATABASE_URL) {
      return null;
    }
    
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL);
    
    const result = await sql`
      UPDATE candidate_notes 
      SET note = ${updates.note}, note_type = ${updates.note_type || 'general'}, updated_at = NOW()
      WHERE id = ${noteId}
      RETURNING *
    `.catch(() => []);
    
    return result[0] as CandidateNote || null;
  } catch (error) {
    console.error('updateCandidateNote error:', error);
    return null;
  }
}

async function deleteCandidateNote(noteId: number): Promise<CandidateNote | null> {
  try {
    if (!process.env.DATABASE_URL) {
      return null;
    }
    
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL);
    
    const result = await sql`
      DELETE FROM candidate_notes 
      WHERE id = ${noteId}
      RETURNING *
    `.catch(() => []);
    
    return result[0] as CandidateNote || null;
  } catch (error) {
    console.error('deleteCandidateNote error:', error);
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
      // Get candidate notes with filtering and pagination
      const query: NoteQuery = {
        candidate_id: req.query.candidate_id as string,
        note_type: req.query.note_type as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0
      };

      const result = await getCandidateNotes(query);

      return res.status(200).json({
        success: true,
        data: {
          notes: result.notes,
          pagination: {
            total: result.total,
            limit: query.limit || 50,
            offset: query.offset || 0,
            hasMore: (query.offset || 0) + (query.limit || 50) < result.total
          }
        }
      });

    } else if (req.method === 'POST') {
      // Create new candidate note
      const { candidate_id, note, note_type, created_by, created_by_email } = req.body;

      // Validation
      if (!candidate_id || !note) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: candidate_id, note'
        });
      }

      if (note_type && !['general', 'interview', 'feedback', 'follow_up', 'technical'].includes(note_type)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid note_type. Must be one of: general, interview, feedback, follow_up, technical'
        });
      }

      const candidateNote = await createCandidateNote({
        candidate_id,
        note,
        note_type: note_type || 'general',
        created_by,
        created_by_email
      });

      if (!candidateNote) {
        return res.status(500).json({
          success: false,
          error: 'Failed to create candidate note'
        });
      }

      // Log audit event
      await logAuditEvent('candidate', candidate_id, 'update', created_by, created_by_email, {
        action: 'add_note',
        note: candidateNote
      });

      return res.status(201).json({
        success: true,
        data: candidateNote
      });

    } else if (req.method === 'PUT') {
      // Update candidate note
      const { id } = req.query;
      const { note, note_type } = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Note ID is required'
        });
      }

      if (!note) {
        return res.status(400).json({
          success: false,
          error: 'Note content is required'
        });
      }

      const updatedNote = await updateCandidateNote(parseInt(id as string), {
        note,
        note_type: note_type || 'general'
      });

      if (!updatedNote) {
        return res.status(404).json({
          success: false,
          error: 'Note not found'
        });
      }

      // Log audit event
      await logAuditEvent('candidate', updatedNote.candidate_id, 'update', undefined, undefined, {
        action: 'update_note',
        note: updatedNote
      });

      return res.status(200).json({
        success: true,
        data: updatedNote
      });

    } else if (req.method === 'DELETE') {
      // Delete candidate note
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Note ID is required'
        });
      }

      const deletedNote = await deleteCandidateNote(parseInt(id as string));

      if (!deletedNote) {
        return res.status(404).json({
          success: false,
          error: 'Note not found'
        });
      }

      // Log audit event
      await logAuditEvent('candidate', deletedNote.candidate_id, 'update', undefined, undefined, {
        action: 'delete_note',
        note: deletedNote
      });

      return res.status(200).json({
        success: true,
        message: 'Note deleted successfully'
      });

    } else {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed'
      });
    }

  } catch (error) {
    console.error('Candidate notes API error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
} 