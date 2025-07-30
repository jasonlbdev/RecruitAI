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
    // Import Neon directly in the handler
    const { neon } = await import('@neondatabase/serverless');
    
    if (!process.env.DATABASE_URL) {
      return res.status(200).json({
        success: true,
        message: 'No DATABASE_URL configured - using fallback',
        data: {
          jobs: [],
          candidates: [],
          applications: [],
          system_settings: [
            { key: 'ai_provider', value: 'openai' },
            { key: 'openai_model', value: 'gpt-4o' },
            { key: 'xai_model', value: 'grok-3-mini' }
          ]
        }
      });
    }

    // Create connection
    const sql = neon(process.env.DATABASE_URL);
    
    // Test connection
    const result = await sql`SELECT 1 as test`;
    
    // Try to get system settings
    let systemSettings: any[] = [];
    try {
      systemSettings = await sql`SELECT * FROM system_settings ORDER BY key`;
    } catch (error) {
      console.log('System settings table not found, using defaults');
      systemSettings = [
        { key: 'ai_provider', value: 'openai' },
        { key: 'openai_model', value: 'gpt-4o' },
        { key: 'xai_model', value: 'grok-3-mini' }
      ];
    }

    return res.status(200).json({
      success: true,
      message: 'Inline database connection successful!',
      data: {
        test: result[0]?.test,
        system_settings: systemSettings,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Inline database test error:', error);
    return res.status(500).json({
      success: false,
      error: 'Inline database connection failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
} 