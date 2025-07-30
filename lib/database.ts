import { neon } from '@neondatabase/serverless';

// Initialize database connection with fallback
let sql: any;

try {
  if (process.env.DATABASE_URL) {
    sql = neon(process.env.DATABASE_URL);
  } else {
    console.warn('DATABASE_URL not configured - using fallback mode');
    // Create a mock sql function for development
    sql = () => Promise.resolve([]);
  }
} catch (error) {
  console.error('Database initialization error:', error);
  sql = () => Promise.resolve([]);
}

export { sql };

// Default system settings for fallback
const DEFAULT_SETTINGS = [
  { key: 'ai_provider', value: 'openai' },
  { key: 'openai_api_key', value: '' },
  { key: 'openai_model', value: 'gpt-4o' },
  { key: 'xai_api_key', value: '' },
  { key: 'xai_model', value: 'grok-3-mini' },
  { key: 'max_tokens', value: '1500' },
  { key: 'temperature', value: '0.7' },
  { key: 'system_prompt', value: 'You are an expert recruitment assistant.' },
  { key: 'resume_analysis_prompt', value: 'Analyze this resume and provide insights.' }
];

export async function getAllJobs() {
  try {
    if (!process.env.DATABASE_URL) {
      return []; // Return empty array if no database
    }
    const result = await sql`SELECT * FROM jobs ORDER BY created_at DESC`;
    return result;
  } catch (error) {
    console.error('Database error in getAllJobs:', error);
    return [];
  }
}

export async function getJobById(id: string) {
  try {
    if (!process.env.DATABASE_URL) {
      return null;
    }
    const result = await sql`SELECT * FROM jobs WHERE id = ${id}`;
    return result[0] || null;
  } catch (error) {
    console.error('Database error in getJobById:', error);
    return null;
  }
}

export async function getAllCandidates() {
  try {
    if (!process.env.DATABASE_URL) {
      return [];
    }
    const result = await sql`SELECT * FROM candidates ORDER BY created_at DESC`;
    return result;
  } catch (error) {
    console.error('Database error in getAllCandidates:', error);
    return [];
  }
}

export async function getCandidateById(id: string) {
  try {
    if (!process.env.DATABASE_URL) {
      return null;
    }
    const result = await sql`SELECT * FROM candidates WHERE id = ${id}`;
    return result[0] || null;
  } catch (error) {
    console.error('Database error in getCandidateById:', error);
    return null;
  }
}

export async function getAllApplications() {
  try {
    if (!process.env.DATABASE_URL) {
      return [];
    }
    const result = await sql`SELECT * FROM applications ORDER BY created_at DESC`;
    return result;
  } catch (error) {
    console.error('Database error in getAllApplications:', error);
    return [];
  }
}

export async function createJob(jobData: any) {
  try {
    if (!process.env.DATABASE_URL) {
      // Return mock job for development
      return {
        id: `job_${Date.now()}`,
        ...jobData,
        created_at: new Date().toISOString()
      };
    }
    
    const result = await sql`
      INSERT INTO jobs (title, department, location, description, requirements, skills, experience_level, salary_min, salary_max, is_remote, status, scoring_weights)
      VALUES (${jobData.title}, ${jobData.department}, ${jobData.location}, ${jobData.description}, 
              ${JSON.stringify(jobData.requirements || [])}, ${JSON.stringify(jobData.skills || [])}, 
              ${jobData.experience_level}, ${jobData.salary_min}, ${jobData.salary_max}, 
              ${jobData.is_remote || false}, ${jobData.status || 'active'}, 
              ${JSON.stringify(jobData.scoring_weights || {})})
      RETURNING *
    `;
    return result[0];
  } catch (error) {
    console.error('Database error in createJob:', error);
    throw error;
  }
}

export async function createCandidate(candidateData: any) {
  try {
    if (!process.env.DATABASE_URL) {
      // Return mock candidate for development
      return {
        id: `candidate_${Date.now()}`,
        ...candidateData,
        created_at: new Date().toISOString()
      };
    }

    const result = await sql`
      INSERT INTO candidates (first_name, last_name, email, phone, location, current_position, current_company, years_of_experience, skills, resume_text, resume_blob_url, ai_score, ai_analysis, status)
      VALUES (${candidateData.firstName}, ${candidateData.lastName}, ${candidateData.email}, 
              ${candidateData.phone}, ${candidateData.location}, ${candidateData.currentPosition}, 
              ${candidateData.currentCompany}, ${candidateData.yearsOfExperience}, 
              ${JSON.stringify(candidateData.skills || [])}, ${candidateData.resumeText}, 
              ${candidateData.resumeBlobUrl}, ${candidateData.aiScore || 0}, 
              ${candidateData.aiAnalysis || ''}, ${candidateData.status || 'active'})
      RETURNING *
    `;
    return result[0];
  } catch (error) {
    console.error('Database error in createCandidate:', error);
    throw error;
  }
}

export async function createApplication(applicationData: any) {
  try {
    if (!process.env.DATABASE_URL) {
      // Return mock application for development
      return {
        id: `app_${Date.now()}`,
        ...applicationData,
        created_at: new Date().toISOString()
      };
    }

    const result = await sql`
      INSERT INTO applications (candidate_id, job_id, status, applied_date, stage, notes)
      VALUES (${applicationData.candidateId}, ${applicationData.jobId}, 
              ${applicationData.status || 'new'}, ${applicationData.appliedDate || new Date().toISOString().split('T')[0]}, 
              ${applicationData.stage || 'Application Submitted'}, ${applicationData.notes || ''})
      RETURNING *
    `;
    return result[0];
  } catch (error) {
    console.error('Database error in createApplication:', error);
    throw error;
  }
}

export async function getSystemSettings() {
  try {
    if (!process.env.DATABASE_URL) {
      return DEFAULT_SETTINGS;
    }
    const result = await sql`SELECT key, value FROM system_settings WHERE is_public = 1 OR is_public = 0`;
    return result.length > 0 ? result : DEFAULT_SETTINGS;
  } catch (error) {
    console.error('Database error in getSystemSettings:', error);
    return DEFAULT_SETTINGS;
  }
}

export async function updateSystemSetting(key: string, value: string) {
  try {
    if (!process.env.DATABASE_URL) {
      console.log(`Mock update: ${key} = ${value}`);
      return true;
    }
    
    await sql`
      INSERT INTO system_settings (key, value, updated_at) 
      VALUES (${key}, ${value}, NOW()) 
      ON CONFLICT (key) 
      DO UPDATE SET value = ${value}, updated_at = NOW()
    `;
    return true;
  } catch (error) {
    console.error('Database error in updateSystemSetting:', error);
    throw error;
  }
}

export async function getSystemSetting(key: string): Promise<string | null> {
  try {
    if (!process.env.DATABASE_URL) {
      const setting = DEFAULT_SETTINGS.find(s => s.key === key);
      return setting ? setting.value : null;
    }
    
    const result = await sql`SELECT value FROM system_settings WHERE key = ${key}`;
    return result[0]?.value || null;
  } catch (error) {
    console.error('Database error in getSystemSetting:', error);
    const setting = DEFAULT_SETTINGS.find(s => s.key === key);
    return setting ? setting.value : null;
  }
}

export async function getDashboardMetrics() {
  try {
    if (!process.env.DATABASE_URL) {
      return {
        totalJobs: 0,
        activeJobs: 0,
        totalCandidates: 0,
        totalApplications: 0,
        newApplicationsToday: 0,
        statusBreakdown: {
          new: 0,
          reviewing: 0,
          interviewed: 0,
          offered: 0,
          hired: 0,
          rejected: 0
        }
      };
    }

    const [jobs, candidates, applications] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM jobs`,
      sql`SELECT COUNT(*) as count FROM candidates`,
      sql`SELECT COUNT(*) as count FROM applications`
    ]);

    const activeJobs = await sql`SELECT COUNT(*) as count FROM jobs WHERE status = 'active'`;
    
    return {
      totalJobs: parseInt(jobs[0]?.count || '0'),
      activeJobs: parseInt(activeJobs[0]?.count || '0'),
      totalCandidates: parseInt(candidates[0]?.count || '0'),
      totalApplications: parseInt(applications[0]?.count || '0'),
      newApplicationsToday: 0, // Simplified for now
      statusBreakdown: {
        new: 0,
        reviewing: 0,
        interviewed: 0,
        offered: 0,
        hired: 0,
        rejected: 0
      }
    };
  } catch (error) {
    console.error('Database error in getDashboardMetrics:', error);
    return {
      totalJobs: 0,
      activeJobs: 0,
      totalCandidates: 0,
      totalApplications: 0,
      newApplicationsToday: 0,
      statusBreakdown: {
        new: 0,
        reviewing: 0,
        interviewed: 0,
        offered: 0,
        hired: 0,
        rejected: 0
      }
    };
  }
} 