// Dynamic database connection
let sql: any = null;

async function getSql() {
  if (sql) return sql;
  
  try {
    if (process.env.DATABASE_URL) {
      const { neon } = await import('@neondatabase/serverless');
      sql = neon(process.env.DATABASE_URL);
      return sql;
    } else {
      console.warn('DATABASE_URL not configured - using fallback mode');
      sql = () => Promise.resolve([]);
      return sql;
    }
  } catch (error) {
    console.error('Database initialization error:', error);
    sql = () => Promise.resolve([]);
    return sql;
  }
}

export { getSql };

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
    const sql = await getSql();
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
    const sql = await getSql();
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
    const sql = await getSql();
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
    const sql = await getSql();
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
    const sql = await getSql();
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
      return null;
    }
    const sql = await getSql();
    const result = await sql`
      INSERT INTO jobs (title, company, location, description, requirements, salary_range, status)
      VALUES (${jobData.title}, ${jobData.company}, ${jobData.location}, ${jobData.description}, ${jobData.requirements}, ${jobData.salary_range}, ${jobData.status || 'active'})
      RETURNING *
    `;
    return result[0];
  } catch (error) {
    console.error('Database error in createJob:', error);
    return null;
  }
}

export async function updateJob(id: string, jobData: any) {
  try {
    if (!process.env.DATABASE_URL) {
      return null;
    }
    const sql = await getSql();
    const result = await sql`
      UPDATE jobs 
      SET title = ${jobData.title}, company = ${jobData.company}, location = ${jobData.location}, 
          description = ${jobData.description}, requirements = ${jobData.requirements}, 
          salary_range = ${jobData.salary_range}, status = ${jobData.status}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `;
    return result[0];
  } catch (error) {
    console.error('Database error in updateJob:', error);
    return null;
  }
}

export async function deleteJob(id: string) {
  try {
    if (!process.env.DATABASE_URL) {
      return false;
    }
    const sql = await getSql();
    await sql`DELETE FROM jobs WHERE id = ${id}`;
    return true;
  } catch (error) {
    console.error('Database error in deleteJob:', error);
    return false;
  }
}

export async function createCandidate(candidateData: any) {
  try {
    if (!process.env.DATABASE_URL) {
      return null;
    }
    const sql = await getSql();
    const result = await sql`
      INSERT INTO candidates (name, email, phone, resume_url, skills, experience_years, current_position)
      VALUES (${candidateData.name}, ${candidateData.email}, ${candidateData.phone}, ${candidateData.resume_url}, ${candidateData.skills}, ${candidateData.experience_years}, ${candidateData.current_position})
      RETURNING *
    `;
    return result[0];
  } catch (error) {
    console.error('Database error in createCandidate:', error);
    return null;
  }
}

export async function updateCandidate(id: string, candidateData: any) {
  try {
    if (!process.env.DATABASE_URL) {
      return null;
    }
    const sql = await getSql();
    const result = await sql`
      UPDATE candidates 
      SET name = ${candidateData.name}, email = ${candidateData.email}, phone = ${candidateData.phone}, 
          resume_url = ${candidateData.resume_url}, skills = ${candidateData.skills}, 
          experience_years = ${candidateData.experience_years}, current_position = ${candidateData.current_position}, 
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `;
    return result[0];
  } catch (error) {
    console.error('Database error in updateCandidate:', error);
    return null;
  }
}

export async function deleteCandidate(id: string) {
  try {
    if (!process.env.DATABASE_URL) {
      return false;
    }
    const sql = await getSql();
    await sql`DELETE FROM candidates WHERE id = ${id}`;
    return true;
  } catch (error) {
    console.error('Database error in deleteCandidate:', error);
    return false;
  }
}

export async function createApplication(applicationData: any) {
  try {
    if (!process.env.DATABASE_URL) {
      return null;
    }
    const sql = await getSql();
    const result = await sql`
      INSERT INTO applications (job_id, candidate_id, status, ai_analysis, ai_provider, usage)
      VALUES (${applicationData.job_id}, ${applicationData.candidate_id}, ${applicationData.status || 'pending'}, ${JSON.stringify(applicationData.ai_analysis)}, ${applicationData.ai_provider}, ${JSON.stringify(applicationData.usage)})
      RETURNING *
    `;
    return result[0];
  } catch (error) {
    console.error('Database error in createApplication:', error);
    return null;
  }
}

export async function updateApplication(id: string, applicationData: any) {
  try {
    if (!process.env.DATABASE_URL) {
      return null;
    }
    const sql = await getSql();
    const result = await sql`
      UPDATE applications 
      SET status = ${applicationData.status}, ai_analysis = ${JSON.stringify(applicationData.ai_analysis)}, 
          ai_provider = ${applicationData.ai_provider}, usage = ${JSON.stringify(applicationData.usage)}, 
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `;
    return result[0];
  } catch (error) {
    console.error('Database error in updateApplication:', error);
    return null;
  }
}

export async function deleteApplication(id: string) {
  try {
    if (!process.env.DATABASE_URL) {
      return false;
    }
    const sql = await getSql();
    await sql`DELETE FROM applications WHERE id = ${id}`;
    return true;
  } catch (error) {
    console.error('Database error in deleteApplication:', error);
    return false;
  }
}

export async function getSystemSettings() {
  try {
    if (!process.env.DATABASE_URL) {
      return DEFAULT_SETTINGS;
    }
    const sql = await getSql();
    const result = await sql`SELECT * FROM system_settings ORDER BY key`;
    return result.length > 0 ? result : DEFAULT_SETTINGS;
  } catch (error) {
    console.error('Database error in getSystemSettings:', error);
    return DEFAULT_SETTINGS;
  }
}

export async function updateSystemSetting(key: string, value: string) {
  try {
    if (!process.env.DATABASE_URL) {
      return false;
    }
    const sql = await getSql();
    await sql`
      INSERT INTO system_settings (key, value, updated_at) 
      VALUES (${key}, ${value}, CURRENT_TIMESTAMP)
      ON CONFLICT (key) DO UPDATE SET 
        value = EXCLUDED.value, 
        updated_at = CURRENT_TIMESTAMP
    `;
    return true;
  } catch (error) {
    console.error('Database error in updateSystemSetting:', error);
    return false;
  }
}

export async function getSystemSetting(key: string): Promise<string | null> {
  try {
    if (!process.env.DATABASE_URL) {
      const setting = DEFAULT_SETTINGS.find(s => s.key === key);
      return setting ? setting.value : null;
    }
    const sql = await getSql();
    const result = await sql`SELECT value FROM system_settings WHERE key = ${key}`;
    return result[0]?.value || null;
  } catch (error) {
    console.error('Database error in getSystemSetting:', error);
    return null;
  }
}

export async function getDashboardMetrics() {
  try {
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
    const sql = await getSql();
    
    const [jobsCount, candidatesCount, applicationsCount] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM jobs`,
      sql`SELECT COUNT(*) as count FROM candidates`,
      sql`SELECT COUNT(*) as count FROM applications`
    ]);

    const recentApplications = await sql`
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
      topPerformingJobs: [], // Placeholder
      growthMetrics: { jobs: 0, candidates: 0, applications: 0 } // Placeholder
    };
  } catch (error) {
    console.error('Database error in getDashboardMetrics:', error);
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