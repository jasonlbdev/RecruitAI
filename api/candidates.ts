import { VercelRequest, VercelResponse } from '@vercel/node';
import { getAllCandidates, getCandidateById, createCandidate } from '../lib/database';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return handleGetCandidates(req, res);
  }

  if (req.method === 'POST') {
    return handleCreateCandidate(req, res);
  }

  // Handle individual candidate operations (GET, PUT, DELETE by ID)
  const urlParts = req.url?.split('/') || [];
  const candidateId = urlParts[urlParts.length - 1];

  if (req.method === 'PUT' && candidateId) {
    return handleUpdateCandidate(req, res, candidateId);
  }

  if (req.method === 'DELETE' && candidateId) {
    return handleDeleteCandidate(req, res, candidateId);
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  });
}

async function handleGetCandidates(req: VercelRequest, res: VercelResponse) {
  try {
    const candidates = await getAllCandidates();
    
    // Apply client-side filters (simplified - proper filtering would be in SQL)
    let filteredCandidates = [...candidates];
    
    if (req.query.search) {
      const searchTerm = (req.query.search as string).toLowerCase();
      filteredCandidates = filteredCandidates.filter((candidate: any) =>
        `${candidate.first_name} ${candidate.last_name}`.toLowerCase().includes(searchTerm) ||
        candidate.email?.toLowerCase().includes(searchTerm) ||
        candidate.current_position?.toLowerCase().includes(searchTerm) ||
        candidate.current_company?.toLowerCase().includes(searchTerm) ||
        candidate.location?.toLowerCase().includes(searchTerm)
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
      error: 'Failed to fetch candidates. Please ensure database is connected.'
    });
  }
}

async function handleCreateCandidate(req: VercelRequest, res: VercelResponse) {
  try {
    const candidateData = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      phone: req.body.phone,
      location: req.body.location,
      currentPosition: req.body.currentPosition,
      currentCompany: req.body.currentCompany,
      yearsOfExperience: req.body.yearsOfExperience || 0,
      skills: req.body.skills || [],
      skillsDetailed: req.body.skillsDetailed || {},
      summary: req.body.summary,
      education: req.body.education || {},
      workExperience: req.body.workExperience || [],
      resumeBlobUrl: req.body.resumeBlobUrl,
      resumeText: req.body.resumeText,
      source: req.body.source || 'manual',
      aiScore: req.body.aiScore || 0,
      aiAnalysis: req.body.aiAnalysis,
      aiAnalysisSummary: req.body.aiAnalysisSummary,
      aiRecommendation: req.body.aiRecommendation,
      aiScores: req.body.aiScores || {},
      keyStrengths: req.body.keyStrengths || [],
      concerns: req.body.concerns || [],
      biasDetection: req.body.biasDetection || {},
      status: req.body.status || 'active'
    };

    const newCandidate = await createCandidate(candidateData);
    
    return res.status(201).json({
      success: true,
      data: newCandidate
    });
  } catch (error) {
    console.error('Error creating candidate:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create candidate. Please check your data and try again.'
    });
  }
}

async function handleUpdateCandidate(req: VercelRequest, res: VercelResponse, candidateId: string) {
  try {
    // For now, return a message about updating candidates
    return res.status(200).json({
      success: true,
      message: 'Candidate update functionality will be implemented with database migrations'
    });
  } catch (error) {
    console.error('Error updating candidate:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update candidate'
    });
  }
}

async function handleDeleteCandidate(req: VercelRequest, res: VercelResponse, candidateId: string) {
  try {
    // For now, return a message about deleting candidates
    return res.status(200).json({
      success: true,
      message: 'Candidate deletion functionality will be implemented with database migrations'
    });
  } catch (error) {
    console.error('Error deleting candidate:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete candidate'
    });
  }
} 