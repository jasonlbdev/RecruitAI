import { VercelRequest, VercelResponse } from '@vercel/node';

const mockApplications = [
  {
    id: 'app-001',
    candidateName: 'Sarah Chen',
    position: 'Senior AI Engineer',
    email: 'sarah.chen@email.com',
    location: 'San Francisco, CA',
    appliedDate: '2024-01-15',
    status: 'interview',
    aiScore: 92,
    stage: 'Technical Interview',
    experience: '5+ years AI/ML',
    source: 'linkedin',
    createdAt: '2024-01-15T09:00:00Z'
  },
  {
    id: 'app-002',
    candidateName: 'Michael Rodriguez',
    position: 'Product Manager',
    email: 'michael.r@email.com',
    location: 'Austin, TX',
    appliedDate: '2024-01-20',
    status: 'offer',
    aiScore: 87,
    stage: 'Offer Extended',
    experience: '4 years PM experience',
    source: 'referral',
    createdAt: '2024-01-20T11:15:00Z'
  },
  {
    id: 'app-003',
    candidateName: 'Emily Wong',
    position: 'UX Designer',
    email: 'emily.wong@email.com',
    location: 'New York, NY',
    appliedDate: '2024-01-25',
    status: 'reviewing',
    aiScore: 79,
    stage: 'Portfolio Review',
    experience: '2 years UX design',
    source: 'website',
    createdAt: '2024-01-25T15:45:00Z'
  },
  {
    id: 'app-004',
    candidateName: 'David Kim',
    position: 'Senior AI Engineer',
    email: 'david.kim@email.com',
    location: 'Seattle, WA',
    appliedDate: '2024-01-28',
    status: 'new',
    aiScore: 88,
    stage: 'Application Submitted',
    experience: '6 years software engineering',
    source: 'internal',
    createdAt: '2024-01-28T13:30:00Z'
  },
  {
    id: 'app-005',
    candidateName: 'Lisa Zhang',
    position: 'Product Manager',
    email: 'lisa.zhang@email.com',
    location: 'Boston, MA',
    appliedDate: '2024-01-29',
    status: 'hired',
    aiScore: 91,
    stage: 'Hired',
    experience: '3 years PM experience',
    source: 'referral',
    createdAt: '2024-01-29T08:00:00Z'
  }
];

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Remove auth check - allow all requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    const { status } = req.query;
    let filteredApplications = mockApplications;
    
    if (status && status !== 'all') {
      filteredApplications = mockApplications.filter(app => app.status === status);
    }
    
    return res.status(200).json({
      success: true,
      data: {
        data: filteredApplications,
        total: filteredApplications.length
      }
    });
  }

  if (req.method === 'POST') {
    const newApplication = {
      id: `app-${Date.now()}`,
      ...req.body,
      status: 'new',
      stage: 'Application Submitted',
      aiScore: Math.floor(Math.random() * 40) + 60,
      createdAt: new Date().toISOString()
    };
    
    return res.status(201).json({
      success: true,
      data: newApplication
    });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
} 