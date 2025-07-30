import { VercelRequest, VercelResponse } from '@vercel/node';

// Database initialization function
async function initializeDatabase() {
  try {
    if (!process.env.DATABASE_URL) {
      return { success: false, error: 'No DATABASE_URL configured' };
    }
    
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL);
    
    // Create tables
    await sql`
      CREATE TABLE IF NOT EXISTS jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        company VARCHAR(255) NOT NULL,
        location VARCHAR(255),
        description TEXT,
        requirements TEXT,
        salary_range VARCHAR(100),
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS candidates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(50),
        resume_url TEXT,
        skills TEXT,
        experience_years INTEGER,
        current_position VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS applications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
        candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'pending',
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ai_analysis JSONB,
        ai_provider VARCHAR(50),
        usage JSONB
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS system_settings (
        key VARCHAR(255) PRIMARY KEY,
        value TEXT NOT NULL,
        description TEXT,
        is_public BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Insert default system settings
    await sql`
      INSERT INTO system_settings (key, value, description, is_public) VALUES
        ('ai_provider', 'openai', 'Selected AI provider (openai or xai)', true),
        ('openai_api_key', '', 'OpenAI API key for GPT models', false),
        ('openai_model', 'gpt-4o', 'OpenAI model to use', true),
        ('xai_api_key', '', 'xAI API key for Grok models', false),
        ('xai_model', 'grok-3-mini', 'xAI model to use', true),
        ('max_tokens', '1500', 'Maximum tokens for AI responses', true),
        ('temperature', '0.7', 'AI response temperature', true),
        ('system_prompt', 'You are an expert recruitment assistant.', 'System prompt for AI', true),
        ('resume_analysis_prompt', 'Analyze this resume and extract key information including name, email, phone, skills, experience, and qualifications. Return the analysis in JSON format.', 'Prompt for resume analysis', true)
      ON CONFLICT (key) DO NOTHING
    `;

    return { success: true, message: 'Database schema created successfully' };
  } catch (error) {
    console.error('Database initialization error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Get database status
async function getDatabaseStatus() {
  try {
    if (!process.env.DATABASE_URL) {
      return {
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
      };
    }
    
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL);
    
    // Test connection
    const result = await sql`SELECT 1 as test`;
    
    // Get data from tables
    const [jobs, candidates, applications, systemSettings] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM jobs`.catch(() => [{ count: 0 }]),
      sql`SELECT COUNT(*) as count FROM candidates`.catch(() => [{ count: 0 }]),
      sql`SELECT COUNT(*) as count FROM applications`.catch(() => [{ count: 0 }]),
      sql`SELECT * FROM system_settings ORDER BY key`.catch(() => [])
    ]);

    return {
      success: true,
      message: 'Database connected successfully',
      data: {
        test: result[0]?.test,
        jobs: jobs[0]?.count || 0,
        candidates: candidates[0]?.count || 0,
        applications: applications[0]?.count || 0,
        system_settings: systemSettings
      }
    };
  } catch (error) {
    console.error('Database status error:', error);
    return {
      success: false,
      error: 'Database connection failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
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

  if (req.method === 'GET') {
    const status = await getDatabaseStatus();
    return res.status(status.success ? 200 : 500).json(status);
  }

  if (req.method === 'POST') {
    if (req.body?.action === 'reset') {
      const result = await initializeDatabase();
      return res.status(result.success ? 200 : 500).json(result);
    }
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  });
} 