import { VercelRequest, VercelResponse } from '@vercel/node';

// Simple in-memory database for testing
let memoryDB = {
  jobs: [
    {
      id: 'job-001',
      title: 'Senior AI Engineer',
      description: 'Join our team to build the next generation of AI-powered recruitment tools.',
      department: 'Engineering',
      location: 'San Francisco, CA',
      type: 'full-time',
      status: 'active',
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z'
    }
  ]
};

export default function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log(`Jobs NEW API called: ${req.method} ${req.url}`);

  if (req.method === 'GET') {
    try {
      console.log('GET request - returning jobs');
      
      return res.status(200).json({
        success: true,
        data: {
          data: memoryDB.jobs,
          total: memoryDB.jobs.length
        }
      });
    } catch (error) {
      console.error('Error in GET /api/jobs-new:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch jobs'
      });
    }
  }

  if (req.method === 'POST') {
    try {
      console.log('POST request - creating job');
      
      const newJob = {
        id: `job-${Date.now()}`,
        ...req.body,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      memoryDB.jobs.push(newJob);
      
      console.log(`Job created successfully with ID: ${newJob.id}`);
      
      return res.status(201).json({
        success: true,
        data: newJob,
        message: 'Job created successfully'
      });
    } catch (error) {
      console.error('Error in POST /api/jobs-new:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create job'
      });
    }
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  });
} 