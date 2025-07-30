import { VercelRequest, VercelResponse } from '@vercel/node';
import { getDashboardMetrics } from '../../lib/database';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const metrics = await getDashboardMetrics();
    
    // Enhanced metrics with additional calculated values
    const enhancedMetrics = {
      ...metrics,
      // Calculate conversion rate (simple example)
      conversionRate: metrics.totalApplications > 0 
        ? Math.round((metrics.totalApplications / Math.max(metrics.totalJobs, 1)) * 100) / 100
        : 0,
      
      // Calculate candidate quality score (placeholder)
      candidateQualityScore: metrics.totalCandidates > 0 ? 7.8 : 0,
      
      // Recent applications (last 7 days) - simplified for now
      recentApplications: [],
      
      // Top performing jobs - simplified for now  
      topPerformingJobs: [],
      
      // Growth metrics - simplified
      growthMetrics: {
        jobsGrowth: 0,
        candidatesGrowth: 0,
        applicationsGrowth: 0
      }
    };

    return res.status(200).json({
      success: true,
      data: enhancedMetrics
    });
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard metrics. Please ensure database is connected.',
      data: {
        // Fallback empty metrics
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
        },
        conversionRate: 0,
        candidateQualityScore: 0,
        recentApplications: [],
        topPerformingJobs: [],
        growthMetrics: {
          jobsGrowth: 0,
          candidatesGrowth: 0,
          applicationsGrowth: 0
        }
      }
    });
  }
} 