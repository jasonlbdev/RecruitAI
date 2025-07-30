import { neon } from '@neondatabase/serverless';

// Neon Serverless Postgres connection
const sql = neon(process.env.DATABASE_URL!);

export { sql };

// Basic database functions - simplified to avoid template literal issues
export async function getAllJobs() {
  return await sql`SELECT * FROM jobs ORDER BY created_at DESC`;
}

export async function getJobById(id: string) {
  return await sql`SELECT * FROM jobs WHERE id = ${id}`;
}

export async function getAllCandidates() {
  return await sql`SELECT * FROM candidates ORDER BY created_at DESC`;
}

export async function getCandidateById(id: string) {
  return await sql`SELECT * FROM candidates WHERE id = ${id}`;
}

export async function getAllApplications() {
  return await sql`
    SELECT a.*, 
           j.title as position, 
           c.first_name, c.last_name, c.email, c.phone, c.location
    FROM applications a
    LEFT JOIN jobs j ON a.job_id = j.id
    LEFT JOIN candidates c ON a.candidate_id = c.id
    ORDER BY a.created_at DESC
  `;
}

export async function createJob(jobData: any) {
  const [job] = await sql`
    INSERT INTO jobs (
      title, description, department, location, type,
      salary_min, salary_max, experience_level, skills, requirements,
      benefits, status, deadline, scoring_weights, is_remote, posted_by
    ) VALUES (
      ${jobData.title}, ${jobData.description}, ${jobData.department}, 
      ${jobData.location}, ${jobData.type}, ${jobData.salaryMin}, 
      ${jobData.salaryMax}, ${jobData.experienceLevel}, ${JSON.stringify(jobData.skills)},
      ${JSON.stringify(jobData.requirements)}, ${JSON.stringify(jobData.benefits)},
      ${jobData.status}, ${jobData.deadline}, ${JSON.stringify(jobData.scoringWeights)},
      ${jobData.isRemote}, ${jobData.postedBy}
    ) RETURNING *
  `;
  return job;
}

export async function createCandidate(candidateData: any) {
  const [candidate] = await sql`
    INSERT INTO candidates (
      first_name, last_name, email, phone, location,
      current_position, current_company, years_experience, skills,
      skills_detailed, summary, education, work_experience,
      resume_blob_url, resume_text, source, ai_score, ai_analysis,
      ai_analysis_summary, ai_recommendation, ai_scores,
      key_strengths, concerns, bias_detection, status
    ) VALUES (
      ${candidateData.firstName}, ${candidateData.lastName}, ${candidateData.email},
      ${candidateData.phone}, ${candidateData.location}, ${candidateData.currentPosition},
      ${candidateData.currentCompany}, ${candidateData.yearsOfExperience}, 
      ${JSON.stringify(candidateData.skills)}, ${JSON.stringify(candidateData.skillsDetailed)},
      ${candidateData.summary}, ${JSON.stringify(candidateData.education)}, 
      ${JSON.stringify(candidateData.workExperience)}, ${candidateData.resumeBlobUrl},
      ${candidateData.resumeText}, ${candidateData.source}, ${candidateData.aiScore},
      ${candidateData.aiAnalysis}, ${candidateData.aiAnalysisSummary}, 
      ${candidateData.aiRecommendation}, ${JSON.stringify(candidateData.aiScores)},
      ${JSON.stringify(candidateData.keyStrengths)}, ${JSON.stringify(candidateData.concerns)},
      ${JSON.stringify(candidateData.biasDetection)}, ${candidateData.status}
    ) RETURNING *
  `;
  return candidate;
}

export async function createApplication(applicationData: any) {
  const [application] = await sql`
    INSERT INTO applications (
      job_id, candidate_id, status, stage, ai_score, notes,
      applied_date, experience, resume_url
    ) VALUES (
      ${applicationData.jobId}, ${applicationData.candidateId}, ${applicationData.status},
      ${applicationData.stage}, ${applicationData.aiScore}, ${applicationData.notes},
      ${applicationData.appliedDate}, ${applicationData.experience}, ${applicationData.resumeUrl}
    ) RETURNING *
  `;
  return application;
}

export async function getSystemSettings() {
  return await sql`SELECT * FROM system_settings`;
}

export async function getSystemSetting(key: string) {
  const [setting] = await sql`SELECT * FROM system_settings WHERE key = ${key}`;
  return setting;
}

export async function updateSystemSetting(key: string, value: string) {
  const [setting] = await sql`
    INSERT INTO system_settings (key, value, updated_at) 
    VALUES (${key}, ${value}, NOW())
    ON CONFLICT (key) 
    DO UPDATE SET value = ${value}, updated_at = NOW()
    RETURNING *
  `;
  return setting;
}

export async function getDashboardMetrics() {
  const [jobsCount] = await sql`SELECT COUNT(*) as total, COUNT(CASE WHEN status = 'active' THEN 1 END) as active FROM jobs`;
  const [candidatesCount] = await sql`SELECT COUNT(*) as total FROM candidates WHERE is_blacklisted = false`;
  const [applicationsCount] = await sql`SELECT COUNT(*) as total FROM applications`;
  const [todayApplications] = await sql`SELECT COUNT(*) as today FROM applications WHERE applied_date = CURRENT_DATE`;

  return {
    totalJobs: Number(jobsCount?.total) || 0,
    activeJobs: Number(jobsCount?.active) || 0,
    totalCandidates: Number(candidatesCount?.total) || 0,
    totalApplications: Number(applicationsCount?.total) || 0,
    newApplicationsToday: Number(todayApplications?.today) || 0,
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