import { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Remove auth check - allow all requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    const metrics = {
      totalJobs: 3,
      activeJobs: 3,
      totalApplications: 5,
      totalCandidates: 3,
      newApplicationsToday: 2,
      statusBreakdown: {
        new: 1,
        reviewing: 1,
        interview: 1,
        offer: 1,
        hired: 1,
        rejected: 0
      },
      recentApplications: [
        {
          id: 'app-001',
          candidateName: 'Sarah Chen',
          position: 'Senior AI Engineer',
          appliedDate: '2024-01-15',
          status: 'interview',
          aiScore: 92
        },
        {
          id: 'app-002',
          candidateName: 'Michael Rodriguez',
          position: 'Product Manager',
          appliedDate: '2024-01-20',
          status: 'offer',
          aiScore: 87
        },
        {
          id: 'app-003',
          candidateName: 'Emily Wong',
          position: 'UX Designer',
          appliedDate: '2024-01-25',
          status: 'reviewing',
          aiScore: 79
        }
      ],
      topPerformingJobs: [
        {
          id: 'job-001',
          title: 'Senior AI Engineer',
          applicants: 12,
          qualified: 8,
          conversionRate: 67
        },
        {
          id: 'job-002',
          title: 'Product Manager',
          applicants: 8,
          qualified: 5,
          conversionRate: 63
        },
        {
          id: 'job-003',
          title: 'UX Designer',
          applicants: 15,
          qualified: 9,
          conversionRate: 60
        }
      ],
      conversionRate: 20,
      averageTimeToHire: 14,
      candidateQualityScore: 85
    };

    return res.status(200).json({
      success: true,
      data: metrics
    });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
} 