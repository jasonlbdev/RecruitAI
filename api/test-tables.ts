import { VercelRequest, VercelResponse } from '@vercel/node';

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
      if (!process.env.DATABASE_URL) {
        return res.status(200).json({
          success: true,
          message: 'No DATABASE_URL configured',
          tables: []
        });
      }
      
      const { neon } = await import('@neondatabase/serverless');
      const sql = neon(process.env.DATABASE_URL);
      
      // Check if candidate_notes table exists
      const candidateNotesExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'candidate_notes'
        ) as exists
      `.catch(() => [{ exists: false }]);
      
      // Check if audit_logs table exists
      const auditLogsExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'audit_logs'
        ) as exists
      `.catch(() => [{ exists: false }]);
      
      // List all tables
      const allTables = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `.catch(() => []);
      
      return res.status(200).json({
        success: true,
        tables: {
          candidate_notes: candidateNotesExists[0]?.exists || false,
          audit_logs: auditLogsExists[0]?.exists || false,
          all_tables: allTables.map((t: any) => t.table_name)
        }
      });

    } catch (error) {
      console.error('Test tables error:', error);
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