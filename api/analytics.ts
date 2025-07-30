import { VercelRequest, VercelResponse } from '@vercel/node';

interface AnalyticsData {
  totalJobs: number;
  totalCandidates: number;
  totalApplications: number;
  conversionRates: {
    applicationToInterview: number;
    interviewToOffer: number;
    offerToHire: number;
    overallConversion: number;
  };
  funnelData: {
    stage: string;
    count: number;
    conversionRate: number;
  }[];
  timeSeriesData: {
    date: string;
    applications: number;
    interviews: number;
    offers: number;
    hires: number;
  }[];
  topSources: {
    source: string;
    count: number;
    conversionRate: number;
  }[];
  averageTimeToHire: number;
  costPerHire: number;
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
      const { period = '30' } = req.query;
      const days = parseInt(period as string);

      // Get basic counts
      const [jobsCount] = await sql`SELECT COUNT(*) as count FROM jobs`.catch(() => [{ count: 0 }]);
      const [candidatesCount] = await sql`SELECT COUNT(*) as count FROM candidates`.catch(() => [{ count: 0 }]);
      const [applicationsCount] = await sql`SELECT COUNT(*) as count FROM applications`.catch(() => [{ count: 0 }]);

      // Get applications by status
      const applicationsByStatus = await sql`
        SELECT status, COUNT(*) as count 
        FROM applications 
        GROUP BY status
      `.catch(() => []);

      // Calculate conversion rates
      const totalApplications = parseInt(applicationsCount.count || '0');
      const interviewed = applicationsByStatus.find((a: any) => a.status === 'interviewed')?.count || 0;
      const offered = applicationsByStatus.find((a: any) => a.status === 'offered')?.count || 0;
      const hired = applicationsByStatus.find((a: any) => a.status === 'hired')?.count || 0;

      const conversionRates = {
        applicationToInterview: totalApplications > 0 ? (interviewed / totalApplications) * 100 : 0,
        interviewToOffer: interviewed > 0 ? (offered / interviewed) * 100 : 0,
        offerToHire: offered > 0 ? (hired / offered) * 100 : 0,
        overallConversion: totalApplications > 0 ? (hired / totalApplications) * 100 : 0
      };

      // Generate funnel data
      const funnelData = [
        { stage: 'Applications', count: totalApplications, conversionRate: 100 },
        { stage: 'Interviews', count: interviewed, conversionRate: conversionRates.applicationToInterview },
        { stage: 'Offers', count: offered, conversionRate: conversionRates.interviewToOffer },
        { stage: 'Hires', count: hired, conversionRate: conversionRates.offerToHire }
      ];

      // Get time series data for the last N days
      const timeSeriesData = await sql`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as applications,
          COUNT(CASE WHEN status = 'interviewed' THEN 1 END) as interviews,
          COUNT(CASE WHEN status = 'offered' THEN 1 END) as offers,
          COUNT(CASE WHEN status = 'hired' THEN 1 END) as hires
        FROM applications 
        WHERE created_at >= NOW() - INTERVAL '${days} days'
        GROUP BY DATE(created_at)
        ORDER BY date
      `.catch(() => []);

      // Get top candidate sources
      const topSources = await sql`
        SELECT 
          source,
          COUNT(*) as count,
          COUNT(CASE WHEN id IN (SELECT candidate_id FROM applications WHERE status = 'hired') THEN 1 END) as hires
        FROM candidates 
        GROUP BY source
        ORDER BY count DESC
        LIMIT 5
      `.catch(() => []);

      const sourcesWithConversion = topSources.map((source: any) => ({
        source: source.source || 'Unknown',
        count: parseInt(source.count),
        conversionRate: source.count > 0 ? (parseInt(source.hires || 0) / parseInt(source.count)) * 100 : 0
      }));

      // Calculate average time to hire (simplified)
      const timeToHireData = await sql`
        SELECT 
          AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/86400) as avg_days
        FROM applications 
        WHERE status = 'hired' AND updated_at IS NOT NULL
      `.catch(() => [{ avg_days: 0 }]);

      const averageTimeToHire = parseFloat(timeToHireData[0]?.avg_days || '0');

      // Estimate cost per hire (simplified calculation)
      const costPerHire = 5000; // Placeholder - in real app, calculate based on actual costs

      const analyticsData: AnalyticsData = {
        totalJobs: parseInt(jobsCount.count || '0'),
        totalCandidates: parseInt(candidatesCount.count || '0'),
        totalApplications: totalApplications,
        conversionRates,
        funnelData,
        timeSeriesData: timeSeriesData.map((row: any) => ({
          date: row.date,
          applications: parseInt(row.applications || '0'),
          interviews: parseInt(row.interviews || '0'),
          offers: parseInt(row.offers || '0'),
          hires: parseInt(row.hires || '0')
        })),
        topSources: sourcesWithConversion,
        averageTimeToHire,
        costPerHire
      };

      return res.status(200).json({
        success: true,
        data: analyticsData
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });

  } catch (error) {
    console.error('Analytics API error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
} 