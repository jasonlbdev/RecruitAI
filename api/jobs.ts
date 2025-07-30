import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getMemoryDB } from './init-db';

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
      const db = getMemoryDB();
      // Apply filters
      let filteredJobs = [...(db.jobs || [])];
      
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
      const db = getMemoryDB();
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
      
      db.jobs.push(newJob);
      
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