import { VercelRequest, VercelResponse } from '@vercel/node';

interface ScoringCriteria {
  experienceWeight: number;
  skillsWeight: number;
  educationWeight: number;
  locationWeight: number;
  salaryWeight: number;
  aiAnalysisWeight: number;
}

interface CandidateScore {
  candidateId: string;
  jobId: string;
  overallScore: number;
  experienceScore: number;
  skillsScore: number;
  educationScore: number;
  locationScore: number;
  salaryScore: number;
  aiAnalysisScore: number;
  breakdown: {
    experience: { score: number; details: string };
    skills: { score: number; details: string };
    education: { score: number; details: string };
    location: { score: number; details: string };
    salary: { score: number; details: string };
    aiAnalysis: { score: number; details: string };
  };
  recommendations: string[];
  created_at: string;
}

// Simple scoring functions
function calculateExperienceScore(candidateExp: number, jobMinExp: number, jobMaxExp: number): { score: number; details: string } {
  if (candidateExp >= jobMinExp && candidateExp <= jobMaxExp) {
    return { score: 100, details: `Perfect experience match (${candidateExp} years)` };
  } else if (candidateExp > jobMaxExp) {
    const overQualified = candidateExp - jobMaxExp;
    const score = Math.max(60, 100 - (overQualified * 10));
    return { score, details: `Over-qualified by ${overQualified} years` };
  } else {
    const underQualified = jobMinExp - candidateExp;
    const score = Math.max(20, 100 - (underQualified * 15));
    return { score, details: `Under-qualified by ${underQualified} years` };
  }
}

function calculateSkillsScore(candidateSkills: string[], jobRequirements: string[]): { score: number; details: string } {
  if (!candidateSkills || candidateSkills.length === 0) {
    return { score: 0, details: 'No skills listed' };
  }
  
  if (!jobRequirements || jobRequirements.length === 0) {
    return { score: 50, details: 'No specific requirements listed' };
  }
  
  const matchedSkills = candidateSkills.filter(skill => 
    jobRequirements.some(req => 
      skill.toLowerCase().includes(req.toLowerCase()) || 
      req.toLowerCase().includes(skill.toLowerCase())
    )
  );
  
  const matchPercentage = (matchedSkills.length / jobRequirements.length) * 100;
  const score = Math.min(100, matchPercentage);
  
  return { 
    score, 
    details: `${matchedSkills.length}/${jobRequirements.length} skills matched` 
  };
}

function calculateLocationScore(candidateLocation: string, jobLocation: string, isRemoteOk: boolean): { score: number; details: string } {
  if (!candidateLocation || !jobLocation) {
    return { score: 50, details: 'Location information incomplete' };
  }
  
  if (isRemoteOk) {
    return { score: 100, details: 'Remote work available' };
  }
  
  const candidateCity = candidateLocation.toLowerCase().split(',')[0].trim();
  const jobCity = jobLocation.toLowerCase().split(',')[0].trim();
  
  if (candidateCity === jobCity) {
    return { score: 100, details: 'Perfect location match' };
  }
  
  // Simple location scoring - could be enhanced with distance calculation
  return { score: 30, details: 'Location mismatch' };
}

function calculateSalaryScore(candidateMin: number, candidateMax: number, jobMin: number, jobMax: number): { score: number; details: string } {
  if (!candidateMin || !candidateMax || !jobMin || !jobMax) {
    return { score: 50, details: 'Salary information incomplete' };
  }
  
  const candidateMid = (candidateMin + candidateMax) / 2;
  const jobMid = (jobMin + jobMax) / 2;
  
  if (candidateMid >= jobMin && candidateMid <= jobMax) {
    return { score: 100, details: 'Salary expectations aligned' };
  } else if (candidateMid < jobMin) {
    return { score: 80, details: 'Candidate may accept lower salary' };
  } else {
    const overBudget = ((candidateMid - jobMax) / jobMax) * 100;
    const score = Math.max(20, 100 - overBudget);
    return { score, details: `Over budget by ${overBudget.toFixed(1)}%` };
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

  try {
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({
        success: false,
        error: 'Database not configured'
      });
    }

    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL);

    if (req.method === 'POST') {
      const { candidateId, jobId, criteria } = req.body;

      if (!candidateId || !jobId) {
        return res.status(400).json({
          success: false,
          error: 'Candidate ID and Job ID are required'
        });
      }

      // Get candidate and job data
      const [candidate] = await sql`
        SELECT * FROM candidates WHERE id = ${candidateId}
      `.catch(() => []);

      const [job] = await sql`
        SELECT * FROM jobs WHERE id = ${jobId}
      `.catch(() => []);

      if (!candidate || !job) {
        return res.status(404).json({
          success: false,
          error: 'Candidate or job not found'
        });
      }

      // Default scoring criteria
      const scoringCriteria: ScoringCriteria = criteria || {
        experienceWeight: 25,
        skillsWeight: 30,
        educationWeight: 15,
        locationWeight: 10,
        salaryWeight: 10,
        aiAnalysisWeight: 10
      };

      // Calculate individual scores
      const experienceScore = calculateExperienceScore(
        candidate.years_of_experience || 0,
        job.min_experience || 0,
        job.max_experience || 10
      );

      const skillsScore = calculateSkillsScore(
        candidate.skills || [],
        job.requirements ? job.requirements.split(',').map(r => r.trim()) : []
      );

      const educationScore = { score: 75, details: 'Education assessment' }; // Simplified
      const locationScore = calculateLocationScore(
        candidate.location || '',
        job.location || '',
        job.is_remote || false
      );

      const salaryScore = calculateSalaryScore(
        candidate.desired_salary_min || 0,
        candidate.desired_salary_max || 0,
        job.salary_min || 0,
        job.salary_max || 0
      );

      const aiAnalysisScore = { 
        score: candidate.ai_score || 50, 
        details: 'AI analysis score' 
      };

      // Calculate weighted overall score
      const overallScore = (
        (experienceScore.score * scoringCriteria.experienceWeight) +
        (skillsScore.score * scoringCriteria.skillsWeight) +
        (educationScore.score * scoringCriteria.educationWeight) +
        (locationScore.score * scoringCriteria.locationWeight) +
        (salaryScore.score * scoringCriteria.salaryWeight) +
        (aiAnalysisScore.score * scoringCriteria.aiAnalysisWeight)
      ) / 100;

      // Generate recommendations
      const recommendations: string[] = [];
      if (experienceScore.score < 70) recommendations.push('Consider experience requirements');
      if (skillsScore.score < 60) recommendations.push('Skills gap identified');
      if (locationScore.score < 50) recommendations.push('Location mismatch');
      if (salaryScore.score < 60) recommendations.push('Salary expectations misaligned');

      const candidateScore: CandidateScore = {
        candidateId,
        jobId,
        overallScore: Math.round(overallScore),
        experienceScore: experienceScore.score,
        skillsScore: skillsScore.score,
        educationScore: educationScore.score,
        locationScore: locationScore.score,
        salaryScore: salaryScore.score,
        aiAnalysisScore: aiAnalysisScore.score,
        breakdown: {
          experience: experienceScore,
          skills: skillsScore,
          education: educationScore,
          location: locationScore,
          salary: salaryScore,
          aiAnalysis: aiAnalysisScore
        },
        recommendations,
        created_at: new Date().toISOString()
      };

      return res.status(200).json({
        success: true,
        data: candidateScore
      });

    } else if (req.method === 'GET') {
      const { candidateId, jobId } = req.query;

      if (candidateId && jobId) {
        // Get specific score
        const [score] = await sql`
          SELECT * FROM candidate_scores 
          WHERE candidate_id = ${candidateId as string} 
          AND job_id = ${jobId as string}
          ORDER BY created_at DESC 
          LIMIT 1
        `.catch(() => []);

        return res.status(200).json({
          success: true,
          data: score || null
        });
      } else {
        // Get all scores
        const scores = await sql`
          SELECT * FROM candidate_scores 
          ORDER BY created_at DESC 
          LIMIT 50
        `.catch(() => []);

        return res.status(200).json({
          success: true,
          data: scores
        });
      }
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });

  } catch (error) {
    console.error('AI scoring error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
} 