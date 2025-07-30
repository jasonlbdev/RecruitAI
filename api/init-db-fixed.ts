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

    // Create candidate_notes table
    await sql`
      CREATE TABLE IF NOT EXISTS candidate_notes (
        id SERIAL PRIMARY KEY,
        candidate_id VARCHAR(255) NOT NULL,
        note TEXT NOT NULL,
        note_type VARCHAR(50) DEFAULT 'general',
        created_by VARCHAR(255),
        created_by_email VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    // Create workflow_rules table
    await sql`
      CREATE TABLE IF NOT EXISTS workflow_rules (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        conditions JSONB NOT NULL,
        actions JSONB NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    // Create tasks table
    await sql`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        assigned_to VARCHAR(255),
        entity_type VARCHAR(50),
        entity_id VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pending',
        priority VARCHAR(20) DEFAULT 'medium',
        due_date TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    // Create email_logs table
    await sql`
      CREATE TABLE IF NOT EXISTS email_logs (
        id SERIAL PRIMARY KEY,
        template_id VARCHAR(255) NOT NULL,
        recipient VARCHAR(255) NOT NULL,
        subject TEXT NOT NULL,
        variables JSONB,
        sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    // Create candidate_scores table
    await sql`
      CREATE TABLE IF NOT EXISTS candidate_scores (
        id SERIAL PRIMARY KEY,
        candidate_id VARCHAR(255) NOT NULL,
        job_id VARCHAR(255) NOT NULL,
        overall_score INTEGER NOT NULL,
        experience_score INTEGER NOT NULL,
        skills_score INTEGER NOT NULL,
        education_score INTEGER NOT NULL,
        location_score INTEGER NOT NULL,
        salary_score INTEGER NOT NULL,
        ai_analysis_score INTEGER NOT NULL,
        breakdown JSONB NOT NULL,
        recommendations TEXT[],
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    // Create audit_logs table
    await sql`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        entity_type VARCHAR(50) NOT NULL,
        entity_id VARCHAR(255) NOT NULL,
        action VARCHAR(50) NOT NULL,
        user_id VARCHAR(255),
        user_email VARCHAR(255),
        changes JSONB,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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