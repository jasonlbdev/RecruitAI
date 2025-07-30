import { VercelRequest, VercelResponse } from '@vercel/node';
import { getMemoryDB } from '../init-db';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Remove auth check - allow all requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      const db = getMemoryDB();
      const jobs = db.jobs || [];
      const candidates = db.candidates || [];
      const applications = db.applications || [];

      // Calculate real metrics
      const activeJobs = jobs.filter(job => job.status === 'active').length;
      const today = new Date().toISOString().split('T')[0];
      const newApplicationsToday = applications.filter(app => 
        app.createdAt?.startsWith(today) || app.appliedDate?.startsWith(today)
      ).length;

      // Status breakdown
      const statusBreakdown = applications.reduce((acc, app) => {
        acc[app.status] = (acc[app.status] || 0) + 1;
        return acc;
      }, {});

      // Recent applications with candidate and job details
      const recentApplications = applications
        .sort((a, b) => new Date(b.createdAt || b.appliedDate).getTime() - new Date(a.createdAt || a.appliedDate).getTime())
        .slice(0, 5)
        .map(app => {
          const candidate = candidates.find(c => c.id === app.candidateId);
          const job = jobs.find(j => j.id === app.jobId);
          return {
            id: app.id,
            candidateName: candidate ? `${candidate.firstName} ${candidate.lastName}` : 'Unknown',
            position: job?.title || 'Unknown Position',
            appliedDate: app.appliedDate || app.createdAt,
            status: app.status,
            aiScore: app.aiScore || candidate?.aiScore || 0
          };
        });

      // Top performing jobs
      const topPerformingJobs = jobs
        .map(job => {
          const jobApplications = applications.filter(app => app.jobId === job.id);
          const qualified = jobApplications.filter(app => 
            ['interview', 'offer', 'hired'].includes(app.status)
          ).length;
          const conversionRate = jobApplications.length > 0 ? 
            Math.round((qualified / jobApplications.length) * 100) : 0;
          
          return {
            id: job.id,
            title: job.title,
            applicants: jobApplications.length,
            qualified,
            conversionRate
          };
        })
        .sort((a, b) => b.conversionRate - a.conversionRate)
        .slice(0, 3);

      const metrics = {
        totalJobs: jobs.length,
        activeJobs,
        totalApplications: applications.length,
        totalCandidates: candidates.length,
        newApplicationsToday,
        statusBreakdown,
        recentApplications,
        topPerformingJobs,
        conversionRate: applications.length > 0 ? 
          Math.round((applications.filter(app => app.status === 'hired').length / applications.length) * 100) : 0,
        averageTimeToHire: 14, // This would require date calculations
        candidateQualityScore: candidates.length > 0 ? 
          Math.round(candidates.reduce((sum, c) => sum + (c.aiScore || 0), 0) / candidates.length) : 0
      };

      return res.status(200).json({
        success: true,
        data: metrics
      });
    } catch (error) {
      console.error('Dashboard metrics error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch dashboard metrics'
      });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
} 