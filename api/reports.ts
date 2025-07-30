import { VercelRequest, VercelResponse } from '@vercel/node';

interface ReportConfig {
  type: 'hiring_funnel' | 'source_analysis' | 'time_to_hire' | 'cost_analysis' | 'custom';
  filters: {
    dateFrom?: string;
    dateTo?: string;
    jobIds?: string[];
    candidateIds?: string[];
    statuses?: string[];
  };
  groupBy?: string;
  metrics: string[];
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
      const { type, filters, groupBy, metrics } = req.body as ReportConfig;

      let reportData: any = {};

      switch (type || 'hiring_funnel') {
        case 'hiring_funnel':
          reportData = await generateHiringFunnelReport(sql, filters);
          break;
        case 'source_analysis':
          reportData = await generateSourceAnalysisReport(sql, filters);
          break;
        case 'time_to_hire':
          reportData = await generateTimeToHireReport(sql, filters);
          break;
        case 'cost_analysis':
          reportData = await generateCostAnalysisReport(sql, filters);
          break;
        case 'custom':
          reportData = await generateCustomReport(sql, filters, groupBy, metrics);
          break;
        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid report type'
          });
      }

      return res.status(200).json({
        success: true,
        data: reportData
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });

  } catch (error) {
    console.error('Reports API error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}

async function generateHiringFunnelReport(sql: any, filters: any) {
  const dateFilter = filters.dateFrom && filters.dateTo 
    ? `WHERE created_at >= '${filters.dateFrom}' AND created_at <= '${filters.dateTo}'`
    : '';

  const result = await sql`
    SELECT 
      'Applications' as stage,
      COUNT(*) as count,
      100 as conversion_rate
    FROM applications
    ${dateFilter}
    
    UNION ALL
    
    SELECT 
      'Interviews' as stage,
      COUNT(*) as count,
      (COUNT(*) * 100.0 / (SELECT COUNT(*) FROM applications ${dateFilter})) as conversion_rate
    FROM applications
    WHERE status IN ('interviewed', 'offered', 'hired')
    ${dateFilter}
    
    UNION ALL
    
    SELECT 
      'Offers' as stage,
      COUNT(*) as count,
      (COUNT(*) * 100.0 / (SELECT COUNT(*) FROM applications ${dateFilter})) as conversion_rate
    FROM applications
    WHERE status IN ('offered', 'hired')
    ${dateFilter}
    
    UNION ALL
    
    SELECT 
      'Hires' as stage,
      COUNT(*) as count,
      (COUNT(*) * 100.0 / (SELECT COUNT(*) FROM applications ${dateFilter})) as conversion_rate
    FROM applications
    WHERE status = 'hired'
    ${dateFilter}
  `.catch(() => []);

  return {
    type: 'hiring_funnel',
    data: result,
    summary: {
      totalApplications: result.find((r: any) => r.stage === 'Applications')?.count || 0,
      totalHires: result.find((r: any) => r.stage === 'Hires')?.count || 0,
      overallConversion: result.find((r: any) => r.stage === 'Hires')?.conversion_rate || 0
    }
  };
}

async function generateSourceAnalysisReport(sql: any, filters: any) {
  const result = await sql`
    SELECT 
      c.source,
      COUNT(*) as total_candidates,
      COUNT(CASE WHEN a.status = 'hired' THEN 1 END) as hires,
      (COUNT(CASE WHEN a.status = 'hired' THEN 1 END) * 100.0 / COUNT(*)) as conversion_rate,
      AVG(c.ai_score) as avg_ai_score
    FROM candidates c
    LEFT JOIN applications a ON c.id = a.candidate_id
    GROUP BY c.source
    ORDER BY total_candidates DESC
  `.catch(() => []);

  return {
    type: 'source_analysis',
    data: result,
    summary: {
      totalSources: result.length,
      topSource: result[0]?.source || 'Unknown',
      bestConversionRate: Math.max(...result.map((r: any) => r.conversion_rate || 0))
    }
  };
}

async function generateTimeToHireReport(sql: any, filters: any) {
  const result = await sql`
    SELECT 
      j.title,
      j.company,
      AVG(EXTRACT(EPOCH FROM (a.updated_at - a.created_at))/86400) as avg_days_to_hire,
      COUNT(*) as total_applications,
      COUNT(CASE WHEN a.status = 'hired' THEN 1 END) as hires
    FROM applications a
    JOIN jobs j ON a.job_id = j.id
    WHERE a.status = 'hired'
    GROUP BY j.id, j.title, j.company
    ORDER BY avg_days_to_hire ASC
  `.catch(() => []);

  return {
    type: 'time_to_hire',
    data: result,
    summary: {
      averageTimeToHire: result.reduce((acc: number, r: any) => acc + (r.avg_days_to_hire || 0), 0) / result.length || 0,
      fastestHire: Math.min(...result.map((r: any) => r.avg_days_to_hire || 0)),
      slowestHire: Math.max(...result.map((r: any) => r.avg_days_to_hire || 0))
    }
  };
}

async function generateCostAnalysisReport(sql: any, filters: any) {
  // Simplified cost analysis - in real app, would include actual costs
  const result = await sql`
    SELECT 
      j.title,
      j.company,
      COUNT(*) as applications,
      COUNT(CASE WHEN a.status = 'hired' THEN 1 END) as hires,
      (COUNT(*) * 50) as estimated_cost, -- $50 per application
      (COUNT(CASE WHEN a.status = 'hired' THEN 1 END) * 5000) as estimated_value -- $5000 per hire
    FROM applications a
    JOIN jobs j ON a.job_id = j.id
    GROUP BY j.id, j.title, j.company
    ORDER BY estimated_cost DESC
  `.catch(() => []);

  return {
    type: 'cost_analysis',
    data: result,
    summary: {
      totalCost: result.reduce((acc: number, r: any) => acc + (r.estimated_cost || 0), 0),
      totalValue: result.reduce((acc: number, r: any) => acc + (r.estimated_value || 0), 0),
      roi: result.reduce((acc: number, r: any) => acc + (r.estimated_value || 0), 0) / 
           result.reduce((acc: number, r: any) => acc + (r.estimated_cost || 0), 1) * 100
    }
  };
}

async function generateCustomReport(sql: any, filters: any, groupBy: string, metrics: string[]) {
  // Custom report based on user-defined parameters
  let query = '';
  
  if (groupBy === 'month') {
    query = `
      SELECT 
        DATE_TRUNC('month', created_at) as period,
        COUNT(*) as count
      FROM applications
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY period
    `;
  } else if (groupBy === 'status') {
    query = `
      SELECT 
        status as period,
        COUNT(*) as count
      FROM applications
      GROUP BY status
      ORDER BY count DESC
    `;
  } else if (groupBy === 'job') {
    query = `
      SELECT 
        j.title as period,
        COUNT(*) as count
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      GROUP BY j.id, j.title
      ORDER BY count DESC
    `;
  }

  const result = await sql.unsafe(query).catch(() => []);

  return {
    type: 'custom',
    data: result,
    summary: {
      totalRecords: result.reduce((acc: number, r: any) => acc + (r.count || 0), 0),
      groupBy,
      metrics
    }
  };
} 