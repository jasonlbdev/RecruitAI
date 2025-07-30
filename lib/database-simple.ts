// Simple database module - no complex imports
let sql: any = null;

// Simple database connection function
async function connectDB() {
  if (sql) return sql;
  
  try {
    if (!process.env.DATABASE_URL) {
      console.warn('No DATABASE_URL - using fallback');
      sql = () => Promise.resolve([]);
      return sql;
    }
    
    // Dynamic import only when needed
    const { neon } = await import('@neondatabase/serverless');
    sql = neon(process.env.DATABASE_URL);
    return sql;
  } catch (error) {
    console.error('DB connection failed:', error);
    sql = () => Promise.resolve([]);
    return sql;
  }
}

// Default settings for fallback
const DEFAULT_SETTINGS = [
  { key: 'ai_provider', value: 'openai' },
  { key: 'openai_api_key', value: '' },
  { key: 'openai_model', value: 'gpt-4o' },
  { key: 'xai_api_key', value: '' },
  { key: 'xai_model', value: 'grok-3-mini' },
  { key: 'max_tokens', value: '1500' },
  { key: 'temperature', value: '0.7' },
  { key: 'system_prompt', value: 'You are an expert recruitment assistant.' },
  { key: 'resume_analysis_prompt', value: 'Analyze this resume and extract key information including name, email, phone, skills, experience, and qualifications. Return the analysis in JSON format.' }
];

// Simple database functions
export async function getAllJobs() {
  try {
    const db = await connectDB();
    if (!process.env.DATABASE_URL) return [];
    
    const result = await db`SELECT * FROM jobs ORDER BY created_at DESC`;
    return result || [];
  } catch (error) {
    console.error('getAllJobs error:', error);
    return [];
  }
}

export async function getAllCandidates() {
  try {
    const db = await connectDB();
    if (!process.env.DATABASE_URL) return [];
    
    const result = await db`SELECT * FROM candidates ORDER BY created_at DESC`;
    return result || [];
  } catch (error) {
    console.error('getAllCandidates error:', error);
    return [];
  }
}

export async function getAllApplications() {
  try {
    const db = await connectDB();
    if (!process.env.DATABASE_URL) return [];
    
    const result = await db`SELECT * FROM applications ORDER BY created_at DESC`;
    return result || [];
  } catch (error) {
    console.error('getAllApplications error:', error);
    return [];
  }
}

export async function getSystemSettings() {
  try {
    const db = await connectDB();
    if (!process.env.DATABASE_URL) return DEFAULT_SETTINGS;
    
    const result = await db`SELECT * FROM system_settings ORDER BY key`;
    return result.length > 0 ? result : DEFAULT_SETTINGS;
  } catch (error) {
    console.error('getSystemSettings error:', error);
    return DEFAULT_SETTINGS;
  }
}

export async function updateSystemSetting(key: string, value: string) {
  try {
    const db = await connectDB();
    if (!process.env.DATABASE_URL) return false;
    
    await db`
      INSERT INTO system_settings (key, value, updated_at) 
      VALUES (${key}, ${value}, CURRENT_TIMESTAMP)
      ON CONFLICT (key) DO UPDATE SET 
        value = EXCLUDED.value, 
        updated_at = CURRENT_TIMESTAMP
    `;
    return true;
  } catch (error) {
    console.error('updateSystemSetting error:', error);
    return false;
  }
}

export async function getSystemSetting(key: string): Promise<string | null> {
  try {
    const db = await connectDB();
    if (!process.env.DATABASE_URL) {
      const setting = DEFAULT_SETTINGS.find(s => s.key === key);
      return setting ? setting.value : null;
    }
    
    const result = await db`SELECT value FROM system_settings WHERE key = ${key}`;
    return result[0]?.value || null;
  } catch (error) {
    console.error('getSystemSetting error:', error);
    return null;
  }
}

export async function createJob(jobData: any) {
  try {
    const db = await connectDB();
    if (!process.env.DATABASE_URL) return null;
    
    const result = await db`
      INSERT INTO jobs (title, company, location, description, requirements, salary_range, status)
      VALUES (${jobData.title}, ${jobData.company}, ${jobData.location}, ${jobData.description}, ${jobData.requirements}, ${jobData.salary_range}, ${jobData.status || 'active'})
      RETURNING *
    `;
    return result[0];
  } catch (error) {
    console.error('createJob error:', error);
    return null;
  }
}

export async function createCandidate(candidateData: any) {
  try {
    const db = await connectDB();
    if (!process.env.DATABASE_URL) return null;
    
    const result = await db`
      INSERT INTO candidates (name, email, phone, resume_url, skills, experience_years, current_position)
      VALUES (${candidateData.name}, ${candidateData.email}, ${candidateData.phone}, ${candidateData.resume_url}, ${candidateData.skills}, ${candidateData.experience_years}, ${candidateData.current_position})
      RETURNING *
    `;
    return result[0];
  } catch (error) {
    console.error('createCandidate error:', error);
    return null;
  }
}

export async function createApplication(applicationData: any) {
  try {
    const db = await connectDB();
    if (!process.env.DATABASE_URL) return null;
    
    const result = await db`
      INSERT INTO applications (job_id, candidate_id, status, ai_analysis, ai_provider, usage)
      VALUES (${applicationData.job_id}, ${applicationData.candidate_id}, ${applicationData.status || 'pending'}, ${JSON.stringify(applicationData.ai_analysis)}, ${applicationData.ai_provider}, ${JSON.stringify(applicationData.usage)})
      RETURNING *
    `;
    return result[0];
  } catch (error) {
    console.error('createApplication error:', error);
    return null;
  }
}

export async function getDashboardMetrics() {
  try {
    const db = await connectDB();
    if (!process.env.DATABASE_URL) {
      return {
        totalJobs: 0,
        totalCandidates: 0,
        totalApplications: 0,
        recentApplications: [],
        topPerformingJobs: [],
        growthMetrics: { jobs: 0, candidates: 0, applications: 0 }
      };
    }
    
    const [jobsCount, candidatesCount, applicationsCount] = await Promise.all([
      db`SELECT COUNT(*) as count FROM jobs`,
      db`SELECT COUNT(*) as count FROM candidates`,
      db`SELECT COUNT(*) as count FROM applications`
    ]);

    const recentApplications = await db`
      SELECT a.*, j.title as job_title, c.name as candidate_name 
      FROM applications a 
      JOIN jobs j ON a.job_id = j.id 
      JOIN candidates c ON a.candidate_id = c.id 
      ORDER BY a.applied_at DESC 
      LIMIT 5
    `;

    return {
      totalJobs: jobsCount[0]?.count || 0,
      totalCandidates: candidatesCount[0]?.count || 0,
      totalApplications: applicationsCount[0]?.count || 0,
      recentApplications: recentApplications || [],
      topPerformingJobs: [],
      growthMetrics: { jobs: 0, candidates: 0, applications: 0 }
    };
  } catch (error) {
    console.error('getDashboardMetrics error:', error);
    return {
      totalJobs: 0,
      totalCandidates: 0,
      totalApplications: 0,
      recentApplications: [],
      topPerformingJobs: [],
      growthMetrics: { jobs: 0, candidates: 0, applications: 0 }
    };
  }
}

// Database initialization function
export async function initializeDatabase() {
  try {
    const db = await connectDB();
    if (!process.env.DATABASE_URL) return false;
    
    // Create tables
    await db`
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

    await db`
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

    await db`
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

    await db`
      CREATE TABLE IF NOT EXISTS system_settings (
        key VARCHAR(255) PRIMARY KEY,
        value TEXT NOT NULL,
        description TEXT,
        is_public BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Insert default settings
    await db`
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
    console.error('Database initialization error:', error);
    return false;
  }
} 