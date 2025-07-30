import { VercelRequest, VercelResponse } from '@vercel/node';

interface SearchResult {
  type: 'candidate' | 'job' | 'application';
  id: string;
  title: string;
  description: string;
  score: number;
  metadata: Record<string, any>;
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

    if (req.method === 'GET') {
      const { q, type, limit = '10' } = req.query;
      const searchQuery = q as string;
      const searchType = type as string;
      const searchLimit = parseInt(limit as string);

      if (!searchQuery || searchQuery.trim().length === 0) {
        return res.status(200).json({
          success: true,
          data: []
        });
      }

      const results: SearchResult[] = [];

      // Search candidates
      if (!searchType || searchType === 'candidate') {
        const candidateResults = await sql`
          SELECT 
            id,
            first_name,
            last_name,
            email,
            skills,
            location,
            years_of_experience,
            ai_score
          FROM candidates 
          WHERE 
            LOWER(first_name) LIKE LOWER(${'%' + searchQuery + '%'}) OR
            LOWER(last_name) LIKE LOWER(${'%' + searchQuery + '%'}) OR
            LOWER(email) LIKE LOWER(${'%' + searchQuery + '%'}) OR
            LOWER(location) LIKE LOWER(${'%' + searchQuery + '%'}) OR
            skills::text LIKE LOWER(${'%' + searchQuery + '%'})
          ORDER BY ai_score DESC NULLS LAST
          LIMIT ${searchLimit}
        `.catch(() => []);

        results.push(...candidateResults.map((candidate: any) => ({
          type: 'candidate' as const,
          id: candidate.id,
          title: `${candidate.first_name} ${candidate.last_name}`,
          description: `${candidate.email} • ${candidate.location} • ${candidate.years_of_experience} years`,
          score: candidate.ai_score || 0,
          metadata: {
            email: candidate.email,
            location: candidate.location,
            experience: candidate.years_of_experience,
            skills: candidate.skills
          }
        })));
      }

      // Search jobs
      if (!searchType || searchType === 'job') {
        const jobResults = await sql`
          SELECT 
            id,
            title,
            company,
            location,
            requirements,
            salary_min,
            salary_max,
            job_type
          FROM jobs 
          WHERE 
            LOWER(title) LIKE LOWER(${'%' + searchQuery + '%'}) OR
            LOWER(company) LIKE LOWER(${'%' + searchQuery + '%'}) OR
            LOWER(location) LIKE LOWER(${'%' + searchQuery + '%'}) OR
            LOWER(requirements) LIKE LOWER(${'%' + searchQuery + '%'})
          ORDER BY created_at DESC
          LIMIT ${searchLimit}
        `.catch(() => []);

        results.push(...jobResults.map((job: any) => ({
          type: 'job' as const,
          id: job.id,
          title: job.title,
          description: `${job.company} • ${job.location} • ${job.job_type}`,
          score: 0,
          metadata: {
            company: job.company,
            location: job.location,
            salary: `${job.salary_min} - ${job.salary_max}`,
            requirements: job.requirements
          }
        })));
      }

      // Search applications
      if (!searchType || searchType === 'application') {
        const applicationResults = await sql`
          SELECT 
            a.id,
            a.status,
            a.created_at,
            c.first_name,
            c.last_name,
            c.email,
            j.title as job_title,
            j.company
          FROM applications a
          JOIN candidates c ON a.candidate_id = c.id
          JOIN jobs j ON a.job_id = j.id
          WHERE 
            LOWER(c.first_name) LIKE LOWER(${'%' + searchQuery + '%'}) OR
            LOWER(c.last_name) LIKE LOWER(${'%' + searchQuery + '%'}) OR
            LOWER(c.email) LIKE LOWER(${'%' + searchQuery + '%'}) OR
            LOWER(j.title) LIKE LOWER(${'%' + searchQuery + '%'}) OR
            LOWER(j.company) LIKE LOWER(${'%' + searchQuery + '%'}) OR
            LOWER(a.status) LIKE LOWER(${'%' + searchQuery + '%'})
          ORDER BY a.created_at DESC
          LIMIT ${searchLimit}
        `.catch(() => []);

        results.push(...applicationResults.map((app: any) => ({
          type: 'application' as const,
          id: app.id,
          title: `${app.first_name} ${app.last_name} - ${app.job_title}`,
          description: `${app.company} • ${app.status} • ${new Date(app.created_at).toLocaleDateString()}`,
          score: 0,
          metadata: {
            candidate: `${app.first_name} ${app.last_name}`,
            job: app.job_title,
            company: app.company,
            status: app.status,
            date: app.created_at
          }
        })));
      }

      // Sort results by relevance (simple scoring)
      const sortedResults = results.sort((a, b) => {
        // Prioritize by type if specified
        if (searchType && a.type !== searchType && b.type === searchType) return 1;
        if (searchType && a.type === searchType && b.type !== searchType) return -1;
        
        // Then by score
        return b.score - a.score;
      });

      return res.status(200).json({
        success: true,
        data: sortedResults.slice(0, searchLimit)
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });

  } catch (error) {
    console.error('Search API error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
} 