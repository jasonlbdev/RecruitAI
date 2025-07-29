import { VercelRequest, VercelResponse } from '@vercel/node';

const mockCandidates = [
  {
    id: 'candidate-001',
    name: 'Sarah Chen',
    email: 'sarah.chen@email.com',
    phone: '+1-555-0123',
    location: 'San Francisco, CA',
    skills: ['Python', 'Machine Learning', 'React'],
    experienceLevel: 'senior',
    aiScore: 92,
    status: 'active',
    createdAt: '2024-01-10T08:00:00Z'
  },
  {
    id: 'candidate-002',
    name: 'Michael Rodriguez',
    email: 'michael.r@email.com',
    phone: '+1-555-0124',
    location: 'Austin, TX',
    skills: ['Product Management', 'Agile', 'Analytics'],
    experienceLevel: 'mid',
    aiScore: 87,
    status: 'active',
    createdAt: '2024-01-12T10:30:00Z'
  },
  {
    id: 'candidate-003',
    name: 'Emily Wong',
    email: 'emily.wong@email.com',
    phone: '+1-555-0125',
    location: 'New York, NY',
    skills: ['UX Design', 'Figma', 'User Research'],
    experienceLevel: 'junior',
    aiScore: 79,
    status: 'active',
    createdAt: '2024-01-14T14:20:00Z'
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
    return res.status(200).json({
      success: true,
      data: {
        data: mockCandidates,
        total: mockCandidates.length
      }
    });
  }

  if (req.method === 'POST') {
    const newCandidate = {
      id: `candidate-${Date.now()}`,
      ...req.body,
      status: 'active',
      aiScore: Math.floor(Math.random() * 40) + 60, // Random score 60-100
      createdAt: new Date().toISOString()
    };
    
    return res.status(201).json({
      success: true,
      data: newCandidate
    });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
} 