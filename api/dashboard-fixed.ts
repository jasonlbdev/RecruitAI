import { VercelRequest, VercelResponse } from '@vercel/node';

// Inline database functions - no external imports
async function getDashboardMetrics() {
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
    
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL);
    
    const [jobsCount, candidatesCount, applicationsCount] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM jobs`.catch(() => [{ count: 0 }]),
      sql`SELECT COUNT(*) as count FROM candidates`.catch(() => [{ count: 0 }]),
      sql`SELECT COUNT(*) as count FROM applications`.catch(() => [{ count: 0 }])
    ]);

    const recentApplications = await sql`
      SELECT a.*, j.title as job_title, c.name as candidate_name 
      FROM applications a 
      JOIN jobs j ON a.job_id = j.id 
      JOIN candidates c ON a.candidate_id = c.id 
      ORDER BY a.applied_at DESC 
      LIMIT 5
    `.catch(() => []);

    return {
      totalJobs: jobsCount[0]?.count || 0,
      totalCandidates: candidatesCount[0]?.count || 0,
      totalApplications: applicationsCount[0]?.count || 0,
      recentApplications: recentApplications || [],
      topPerformingJobs: [], // Placeholder
      growthMetrics: { jobs: 0, candidates: 0, applications: 0 } // Placeholder
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
      const metrics = await getDashboardMetrics();
      return res.status(200).json({
        success: true,
        metrics
      });
    } catch (error) {
      console.error('Dashboard API error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch dashboard metrics'
      });
    }
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  });
} 