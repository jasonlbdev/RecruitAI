import { VercelRequest, VercelResponse } from '@vercel/node';
import { 
  getAllJobs, 
  getAllCandidates, 
  getAllApplications, 
  getSystemSettings,
  getDashboardMetrics 
} from '../lib/database';

// Database schema creation
async function createDatabaseSchema() {
  try {
    // Import Neon dynamically
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL!);
    
    // Create jobs table
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

    // Create candidates table
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

    // Create applications table
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

    // Create system_settings table
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

    return true;
  } catch (error) {
    console.error('Schema creation error:', error);
    return false;
  }
}

// REMOVED: All 640 lines of mock data 
// NOW: Database-backed functions only

export async function getMemoryDB() {
  try {
    const [jobs, candidates, applications, systemSettings] = await Promise.all([
      getAllJobs(),
      getAllCandidates(), 
      getAllApplications(),
      getSystemSettings()
    ]);

    // Convert system settings array to object format for backward compatibility
    const settings = systemSettings.reduce((acc: any, setting: any) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {});

    return {
      jobs: jobs || [],
      candidates: candidates || [],
      applications: applications || [],
      system_settings: systemSettings || [],
      // Legacy format for existing code
      settings
    };
  } catch (error) {
    console.error('Database connection error:', error);
    // Fallback to empty structure if database is not available
    return {
      jobs: [],
      candidates: [],
      applications: [],
      system_settings: [],
      settings: {}
    };
  }
}

// Database initialization endpoint
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
      const data = await getMemoryDB();
      const metrics = await getDashboardMetrics();
      
      return res.status(200).json({
        success: true,
        message: 'Database connected successfully',
        data: {
          ...data,
          metrics
        }
      });
    } catch (error) {
      console.error('Database initialization error:', error);
      return res.status(500).json({
        success: false,
        error: 'Database connection failed',
        message: 'Please ensure DATABASE_URL environment variable is set correctly'
      });
    }
  }

  if (req.method === 'POST') {
    // Database reset/initialization
    if (req.body?.action === 'reset') {
      try {
        const schemaCreated = await createDatabaseSchema();
        if (schemaCreated) {
          return res.status(200).json({
            success: true,
            message: 'Database schema created successfully'
          });
        } else {
          return res.status(500).json({
            success: false,
            error: 'Failed to create database schema'
          });
        }
      } catch (error) {
        console.error('Database reset error:', error);
        return res.status(500).json({
          success: false,
          error: 'Database reset failed'
        });
      }
    }
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  });
}

// Legacy export for backward compatibility
export function resetMemoryDB() {
  return getMemoryDB();
} 