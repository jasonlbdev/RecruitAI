import { VercelRequest, VercelResponse } from '@vercel/node';

// In-memory storage for candidates
let memoryDB = {
  candidates: [
    {
      id: 'candidate-001',
      firstName: 'Sarah',
      lastName: 'Chen',
      email: 'sarah.chen@email.com',
      phone: '+1-555-0123',
      location: 'San Francisco, CA',
      resumeUrl: 'https://example.com/resume-sarah.pdf',
      linkedinUrl: 'https://linkedin.com/in/sarahchen',
      githubUrl: 'https://github.com/sarahchen',
      skills: ['Python', 'Machine Learning', 'TensorFlow', 'React', 'TypeScript'],
      experience: [
        {
          company: 'TechCorp',
          position: 'AI Engineer',
          duration: '2021-2024',
          description: 'Developed ML models for recommendation systems'
        }
      ],
      education: [
        {
          institution: 'Stanford University',
          degree: 'MS Computer Science',
          year: '2021'
        }
      ],
      summary: 'Experienced AI engineer with 3+ years building machine learning systems.',
      source: 'linkedin',
      experienceLevel: 'senior',
      salaryExpectation: '$160,000 - $180,000',
      availability: 'available',
      notes: 'Strong technical background, good cultural fit',
      aiScore: 92,
      status: 'active',
      jobId: 'job-001',
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z'
    },
    {
      id: 'candidate-002',
      firstName: 'Michael',
      lastName: 'Johnson',
      email: 'michael.johnson@email.com',
      phone: '+1-555-0456',
      location: 'New York, NY',
      resumeUrl: 'https://example.com/resume-michael.pdf',
      linkedinUrl: 'https://linkedin.com/in/michaeljohnson',
      githubUrl: 'https://github.com/mjohnson',
      skills: ['Product Management', 'Agile', 'Analytics', 'User Research'],
      experience: [
        {
          company: 'ProductCo',
          position: 'Product Manager',
          duration: '2020-2024',
          description: 'Led product strategy for B2B SaaS platform'
        }
      ],
      education: [
        {
          institution: 'MIT',
          degree: 'MBA',
          year: '2020'
        }
      ],
      summary: 'Product manager with 4+ years experience in B2B SaaS.',
      source: 'referral',
      experienceLevel: 'mid',
      salaryExpectation: '$130,000 - $150,000',
      availability: 'available',
      notes: 'Great product sense, needs technical background',
      aiScore: 78,
      status: 'active',
      jobId: 'job-002',
      createdAt: '2024-01-20T14:30:00Z',
      updatedAt: '2024-01-20T14:30:00Z'
    }
  ],
  audit_log: [] as any[],
  applications: [] as any[]
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
      const candidates = db.candidates || [];
      
      // Apply filters
      let filteredCandidates = candidates;
      
      if (req.query.search) {
        const searchTerm = (req.query.search as string).toLowerCase();
        filteredCandidates = filteredCandidates.filter((candidate: any) =>
          `${candidate.firstName} ${candidate.lastName}`.toLowerCase().includes(searchTerm) ||
          candidate.email.toLowerCase().includes(searchTerm) ||
          candidate.currentPosition?.toLowerCase().includes(searchTerm) ||
          candidate.currentCompany?.toLowerCase().includes(searchTerm) ||
          candidate.location?.toLowerCase().includes(searchTerm) ||
          candidate.skills?.some((skill: string) => skill.toLowerCase().includes(searchTerm))
        );
      }
      
      if (req.query.source && req.query.source !== 'all') {
        filteredCandidates = filteredCandidates.filter((candidate: any) => candidate.source === req.query.source);
      }
      
      if (req.query.location && req.query.location !== 'all') {
        filteredCandidates = filteredCandidates.filter((candidate: any) => 
          candidate.location?.includes(req.query.location as string)
        );
      }

      return res.status(200).json({
        success: true,
        data: {
          data: filteredCandidates,
          total: filteredCandidates.length
        }
      });
    } catch (error) {
      console.error('Error fetching candidates:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch candidates'
      });
    }
  }

  if (req.method === 'POST') {
    try {
      const db = getMemoryDB();
      const newCandidate = {
        id: `candidate-${Date.now()}`,
        ...req.body,
        status: req.body.status || 'active',
        isBlacklisted: false,
        aiScore: req.body.aiScore || Math.floor(Math.random() * 40) + 60, // Random score 60-100
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Add to memory database
      db.candidates.push(newCandidate);

      // Create audit log entry
      const auditEntry = {
        id: `audit-${Date.now()}`,
        entityType: 'candidate',
        entityId: newCandidate.id,
        action: 'created',
        changes: newCandidate,
        oldValues: null,
        timestamp: new Date().toISOString(),
        userId: 'admin-user-id' // In production, get from auth
      };

      // Initialize audit log if not exists
      if (!db.audit_log) {
        db.audit_log = [];
      }
      db.audit_log.push(auditEntry);
      
      return res.status(201).json({
        success: true,
        data: newCandidate
      });
    } catch (error) {
      console.error('Error creating candidate:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create candidate'
      });
    }
  }

  // Extract candidate ID from URL path for PUT and DELETE
  const urlParts = req.url?.split('/') || [];
  const candidateId = urlParts[urlParts.length - 1];

  if (req.method === 'PUT') {
    try {
      const db = getMemoryDB();
      const candidateIndex = db.candidates.findIndex((candidate: any) => candidate.id === candidateId);
      
      if (candidateIndex === -1) {
        return res.status(404).json({
          success: false,
          error: 'Candidate not found'
        });
      }
      
      // Create audit log entry
      const auditEntry = {
        id: `audit-${Date.now()}`,
        entityType: 'candidate',
        entityId: candidateId,
        action: 'updated',
        changes: req.body,
        oldValues: db.candidates[candidateIndex],
        timestamp: new Date().toISOString(),
        userId: 'admin-user-id' // In production, get from auth
      };

      // Initialize audit log if not exists
      if (!db.audit_log) {
        db.audit_log = [];
      }
      db.audit_log.push(auditEntry);

      // Update candidate
      const updatedCandidate = {
        ...db.candidates[candidateIndex],
        ...req.body,
        updatedAt: new Date().toISOString()
      };
      
      db.candidates[candidateIndex] = updatedCandidate;
      
      return res.status(200).json({
        success: true,
        data: updatedCandidate,
        message: 'Candidate updated successfully'
      });
    } catch (error) {
      console.error('Error updating candidate:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update candidate'
      });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const db = getMemoryDB();
      const candidateIndex = db.candidates.findIndex((candidate: any) => candidate.id === candidateId);
      
      if (candidateIndex === -1) {
        return res.status(404).json({
          success: false,
          error: 'Candidate not found'
        });
      }
      
      const deletedCandidate = db.candidates[candidateIndex];

      // Create audit log entry
      const auditEntry = {
        id: `audit-${Date.now()}`,
        entityType: 'candidate',
        entityId: candidateId,
        action: 'deleted',
        changes: null,
        oldValues: deletedCandidate,
        timestamp: new Date().toISOString(),
        userId: 'admin-user-id' // In production, get from auth
      };

      // Initialize audit log if not exists
      if (!db.audit_log) {
        db.audit_log = [];
      }
      db.audit_log.push(auditEntry);
      
      // Remove candidate from database
      db.candidates.splice(candidateIndex, 1);
      
      // Also remove related applications (optional - could keep for audit trail)
      db.applications = db.applications.filter((app: any) => app.candidateId !== candidateId);
      
      return res.status(200).json({
        success: true,
        data: deletedCandidate,
        message: 'Candidate deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting candidate:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete candidate'
      });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
} 