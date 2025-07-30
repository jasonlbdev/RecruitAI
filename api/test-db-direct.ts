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
    // Import Neon directly
    const { neon } = await import('@neondatabase/serverless');
    
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({
        success: false,
        error: 'DATABASE_URL not configured',
        timestamp: new Date().toISOString()
      });
    }

    // Create connection
    const sql = neon(process.env.DATABASE_URL);
    
    // Test connection
    const result = await sql`SELECT 1 as test`;
    
    return res.status(200).json({
      success: true,
      message: 'Direct Neon connection successful!',
      data: {
        test: result[0]?.test,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Direct database test error:', error);
    return res.status(500).json({
      success: false,
      error: 'Direct database connection failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
} 