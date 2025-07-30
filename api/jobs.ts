import type { VercelRequest, VercelResponse } from '@vercel/node';

// Simple in-memory database
const jobsDB = {
  jobs: [
    {
      id: 'job-001',
      title: 'Senior AI Engineer',
      description: 'Join our team to build the next generation of AI-powered recruitment tools.',
      department: 'Engineering',
      location: 'San Francisco, CA',
      jobType: 'full-time',
      employmentType: 'permanent',
      salaryMin: 150000,
      salaryMax: 200000,
      experienceLevel: 'senior',
      status: 'active',
      applications: 12,
      qualified: 8,
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z'
    },
    {
      id: 'job-002',
      title: 'Product Manager',
      description: 'Lead product strategy for our AI-powered recruitment platform.',
      department: 'Product',
      location: 'Remote',
      jobType: 'full-time',
      employmentType: 'permanent',
      salaryMin: 120000,
      salaryMax: 160000,
      experienceLevel: 'mid',
      status: 'active',
      applications: 8,
      qualified: 5,
      createdAt: '2024-01-20T14:30:00Z',
      updatedAt: '2024-01-20T14:30:00Z'
    },
    {
      id: 'job-003',
      title: 'UX Designer',
      description: 'Design intuitive user experiences for our recruitment platform.',
      department: 'Design',
      location: 'New York, NY',
      jobType: 'full-time',
      employmentType: 'permanent',
      salaryMin: 90000,
      salaryMax: 130000,
      experienceLevel: 'mid',
      status: 'active',
      applications: 15,
      qualified: 10,
      createdAt: '2024-01-25T09:15:00Z',
      updatedAt: '2024-01-25T09:15:00Z'
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

  if (req.method === 'GET') {
    try {
      // Apply filters
      let filteredJobs = [...jobsDB.jobs];
      
      if (req.query.search) {
        const searchTerm = (req.query.search as string).toLowerCase();
        filteredJobs = filteredJobs.filter(job =>
          job.title.toLowerCase().includes(searchTerm) ||
          job.department.toLowerCase().includes(searchTerm) ||
          job.location.toLowerCase().includes(searchTerm) ||
          job.description.toLowerCase().includes(searchTerm)
        );
      }
      
      if (req.query.status && req.query.status !== 'all') {
        filteredJobs = filteredJobs.filter(job => job.status === req.query.status);
      }
      
      if (req.query.department && req.query.department !== 'all') {
        filteredJobs = filteredJobs.filter(job => job.department === req.query.department);
      }
      
      return res.status(200).json({
        success: true,
        data: {
          data: filteredJobs,
          total: filteredJobs.length
        }
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch jobs'
      });
    }
  }

  if (req.method === 'POST') {
    try {
      const newJob = {
        id: `job-${Date.now()}`,
        title: req.body.title,
        description: req.body.description,
        department: req.body.department,
        location: req.body.location,
        jobType: req.body.jobType || 'full-time',
        employmentType: req.body.employmentType || 'permanent',
        salaryMin: req.body.salaryMin,
        salaryMax: req.body.salaryMax,
        experienceLevel: req.body.experienceLevel || 'mid',
        status: 'active',
        applications: 0,
        qualified: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      jobsDB.jobs.push(newJob);
      
      return res.status(201).json({
        success: true,
        data: newJob,
        message: 'Job created successfully'
      });
    } catch (error) {
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