import { VercelRequest, VercelResponse } from '@vercel/node';

// In-memory storage for applications
let memoryDB = {
  applications: [
    {
      id: 'app-001',
      jobId: 'job-001',
      candidateId: 'candidate-001',
      status: 'screening',
      stage: 'Initial Review',
      appliedDate: '2024-01-16T10:00:00Z',
      resumeUrl: 'https://example.com/resume-sarah.pdf',
      coverLetterUrl: 'https://example.com/cover-sarah.pdf',
      aiScore: 92,
      aiAnalysis: {
        overallScore: 92,
        skillsScore: 95,
        experienceScore: 90,
        educationScore: 88,
        locationScore: 85,
        summary: 'Excellent candidate with strong technical background and relevant experience.',
        keyStrengths: ['AI/ML expertise', 'Strong Python skills', 'Relevant experience'],
        concerns: ['May be overqualified for the role'],
        recommendations: ['Proceed to technical interview']
      },
      notes: 'Strong technical background, good cultural fit',
      createdAt: '2024-01-16T10:00:00Z',
      updatedAt: '2024-01-16T10:00:00Z'
    },
    {
      id: 'app-002',
      jobId: 'job-002',
      candidateId: 'candidate-002',
      status: 'interview',
      stage: 'First Interview',
      appliedDate: '2024-01-21T14:30:00Z',
      resumeUrl: 'https://example.com/resume-michael.pdf',
      coverLetterUrl: 'https://example.com/cover-michael.pdf',
      aiScore: 78,
      aiAnalysis: {
        overallScore: 78,
        skillsScore: 75,
        experienceScore: 80,
        educationScore: 85,
        locationScore: 70,
        summary: 'Good candidate with solid product management experience.',
        keyStrengths: ['Product management experience', 'B2B SaaS background'],
        concerns: ['Limited technical background'],
        recommendations: ['Schedule product case study']
      },
      notes: 'Great product sense, needs technical background',
      createdAt: '2024-01-21T14:30:00Z',
      updatedAt: '2024-01-21T14:30:00Z'
    }
  ],
  audit_log: [] as any[]
};

function getMemoryDB() {
  return memoryDB;
}

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
      const applications = db.applications || [];
      const { status } = req.query;
      
      let filteredApplications = applications;
      
      if (status && status !== 'all') {
        filteredApplications = applications.filter((app: any) => app.status === status);
      }
      
      return res.status(200).json({
        success: true,
        data: {
          data: filteredApplications,
          total: filteredApplications.length
        }
      });
    } catch (error) {
      console.error('Error fetching applications:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch applications'
      });
    }
  }

  if (req.method === 'POST') {
    try {
      const db = getMemoryDB();
      const newApplication = {
        id: `app-${Date.now()}`,
        ...req.body,
        status: req.body.status || 'new',
        stage: req.body.stage || 'Application Submitted',
        aiScore: req.body.aiScore || Math.floor(Math.random() * 40) + 60,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Add to memory database
      db.applications.push(newApplication);
      
      return res.status(201).json({
        success: true,
        data: newApplication
      });
    } catch (error) {
      console.error('Error creating application:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create application'
      });
    }
  }

  // Extract application ID from URL path for PUT and DELETE
  const urlParts = req.url?.split('/') || [];
  const applicationId = urlParts[urlParts.length - 1];

  if (req.method === 'PUT') {
    try {
      const db = getMemoryDB();
      const applicationIndex = db.applications.findIndex((app: any) => app.id === applicationId);
      
      if (applicationIndex === -1) {
        return res.status(404).json({
          success: false,
          error: 'Application not found'
        });
      }
      
      // Create audit log entry
      const auditEntry = {
        id: `audit-${Date.now()}`,
        entityType: 'application',
        entityId: applicationId,
        action: 'updated',
        changes: req.body,
        oldValues: db.applications[applicationIndex],
        timestamp: new Date().toISOString(),
        userId: 'admin-user-id'
      };

      // Initialize audit log if not exists
      if (!db.audit_log) {
        db.audit_log = [];
      }
      db.audit_log.push(auditEntry);

      // Update application
      const updatedApplication = {
        ...db.applications[applicationIndex],
        ...req.body,
        updatedAt: new Date().toISOString()
      };
      
      db.applications[applicationIndex] = updatedApplication;
      
      return res.status(200).json({
        success: true,
        data: updatedApplication,
        message: 'Application updated successfully'
      });
    } catch (error) {
      console.error('Error updating application:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update application'
      });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const db = getMemoryDB();
      const applicationIndex = db.applications.findIndex((app: any) => app.id === applicationId);
      
      if (applicationIndex === -1) {
        return res.status(404).json({
          success: false,
          error: 'Application not found'
        });
      }
      
      const deletedApplication = db.applications[applicationIndex];

      // Create audit log entry
      const auditEntry = {
        id: `audit-${Date.now()}`,
        entityType: 'application',
        entityId: applicationId,
        action: 'deleted',
        changes: null,
        oldValues: deletedApplication,
        timestamp: new Date().toISOString(),
        userId: 'admin-user-id'
      };

      // Initialize audit log if not exists
      if (!db.audit_log) {
        db.audit_log = [];
      }
      db.audit_log.push(auditEntry);
      
      // Remove application from database
      db.applications.splice(applicationIndex, 1);
      
      return res.status(200).json({
        success: true,
        data: deletedApplication,
        message: 'Application deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting application:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete application'
      });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
} 