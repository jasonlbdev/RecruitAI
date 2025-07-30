import type { VercelRequest, VercelResponse } from '@vercel/node';

// In-memory storage (replace with real database in production)
let memoryDB = {
  candidates: [] as any[],
  applications: [] as any[],
  system_settings: [
    { key: 'grok_api_key', value: '', updatedAt: new Date().toISOString() },
    { key: 'max_tokens', value: '1500', updatedAt: new Date().toISOString() },
    { key: 'temperature', value: '0.7', updatedAt: new Date().toISOString() },
    { key: 'model', value: 'grok-beta', updatedAt: new Date().toISOString() }
  ],
  prompts: [
    { 
      key: 'resume_analysis_prompt', 
      value: 'Analyze this resume for the given job requirements. Provide a detailed assessment including: 1) Overall match score (0-100), 2) Key strengths, 3) Potential concerns, 4) Recommendation (STRONG_MATCH, GOOD_MATCH, POTENTIAL_MATCH, or POOR_MATCH). Focus on the job requirements and use the provided scoring weights to prioritize different attributes.',
      updatedAt: new Date().toISOString() 
    }
  ]
};

function getMemoryDB() {
  return memoryDB;
}

// Rate limiting - simple in-memory approach (use Redis in production)
const requestTimes: number[] = [];
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_MINUTE = 100; // Grok rate limit

function checkRateLimit(): boolean {
  const now = Date.now();
  // Remove old requests outside the window
  while (requestTimes.length > 0 && requestTimes[0] < now - RATE_LIMIT_WINDOW) {
    requestTimes.shift();
  }
  
  if (requestTimes.length >= MAX_REQUESTS_PER_MINUTE) {
    return false; // Rate limit exceeded
  }
  
  requestTimes.push(now);
  return true;
}

// Helper function to process individual resume with Grok AI
async function processResumeWithAI(resumeText: string, fileName: string, jobData: any, grokApiKey: string) {
  const analysisPrompt = `
Analyze this resume for the position: ${jobData.title}

**JOB REQUIREMENTS:**
${jobData.requirements?.join(', ') || 'General requirements'}

**JOB DESCRIPTION:**
${jobData.description}

**SCORING PRIORITIES:**
- Experience: ${jobData.scoringWeights.experience}% weight
- Skills: ${jobData.scoringWeights.skills}% weight  
- Location: ${jobData.scoringWeights.location}% weight
- Education: ${jobData.scoringWeights.education}% weight
- Salary: ${jobData.scoringWeights.salary}% weight

Please extract the following information and return it as a JSON object:

{
  "firstName": "extracted first name",
  "lastName": "extracted last name",
  "email": "extracted email",
  "phone": "extracted phone", 
  "location": "extracted location",
  "currentPosition": "current job title",
  "currentCompany": "current company",
  "yearsOfExperience": "estimated years as number",
  "skills": {
    "allSkills": ["comprehensive list of all skills found"]
  },
  "summary": "professional summary",
  "overallScore": "score 0-100 for job match based on weighted priorities",
  "keyStrengths": ["strength1", "strength2"],
  "concerns": ["concern1", "concern2"],
  "recommendation": "STRONG_MATCH, GOOD_MATCH, POTENTIAL_MATCH, or POOR_MATCH",
  "aiAnalysisSummary": "comprehensive 2-3 sentence summary of candidate fit for this specific role"
}

Resume Content:
${resumeText}`;

  const grokResponse = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${grokApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'grok-beta',
      messages: [
        {
          role: 'system',
          content: 'You are an expert recruitment assistant. Extract candidate information accurately and return valid JSON.'
        },
        {
          role: 'user',
          content: analysisPrompt
        }
      ],
      max_tokens: 2000,
      temperature: 0.3,
    }),
  });

  if (!grokResponse.ok) {
    throw new Error(`Grok API error: ${grokResponse.status}`);
  }

  const grokData = await grokResponse.json();
  const aiResponse = grokData.choices[0]?.message?.content;

  if (!aiResponse) {
    throw new Error('No response from Grok AI');
  }

  // Try to parse JSON from Grok response
  let extractedData: any = {};
  try {
    // Look for JSON in the response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      extractedData = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('No JSON found in Grok AI response');
    }
  } catch (parseError) {
    console.error('Failed to parse Grok AI response as JSON:', parseError);
    throw new Error('Failed to parse Grok AI analysis');
  }

  return extractedData;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { resumes, jobId } = req.body;

    if (!resumes || !Array.isArray(resumes)) {
      return res.status(400).json({ error: 'Resumes array is required' });
    }

    if (!jobId) {
      return res.status(400).json({ error: 'Job ID is required' });
    }

    const db = await getMemoryDB();

         // Get Grok API key
     const grokApiKeySetting = db.system_settings.find((s: any) => s.key === 'grok_api_key');
     const grokApiKey = grokApiKeySetting?.value;

    if (!grokApiKey) {
      return res.status(400).json({ error: 'Grok API key not configured' });
    }

    // Get actual job details from database
    const job = (db as any).jobs?.find((j: any) => j.id === jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const jobData = {
      id: jobId,
      title: job.title,
      department: job.department,
      location: job.location,
      experienceLevel: job.experienceLevel,
      requirements: job.requirements || [],
      description: job.description,
      isRemote: job.isRemote,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      // Use actual job-specific AI scoring weights
      scoringWeights: job.scoringWeights || {
        experience: 30,
        skills: 30,
        location: 15,
        education: 15,
        salary: 10
      }
    };

    const results: Array<{
      fileName: string;
      success: boolean;
      candidate?: any;
      application?: any;
      analysis?: any;
      error?: string;
    }> = [];
    
    // Process resumes with delays to respect rate limits
    for (let i = 0; i < resumes.length; i++) {
      const resume = resumes[i];
      
      try {
        const extractedData = await processResumeWithAI(
          resume.fileContent,
          resume.fileName,
          jobData,
          grokApiKey
        );

        // Create candidate
        const candidateId = `candidate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newCandidate = {
          id: candidateId,
          firstName: extractedData.firstName || '',
          lastName: extractedData.lastName || '',
          email: extractedData.email || '',
          phone: extractedData.phone || '',
          location: extractedData.location || '',
          currentPosition: extractedData.currentPosition || '',
          currentCompany: extractedData.currentCompany || '',
          yearsOfExperience: extractedData.yearsOfExperience || 0,
          skills: extractedData.skills?.allSkills || 
                  (Array.isArray(extractedData.skills) ? extractedData.skills : []),
          skillsDetailed: extractedData.skills || {},
          summary: extractedData.summary || '',
          education: extractedData.education || {},
          workExperience: extractedData.workExperience || [],
          source: 'bulk_upload',
          desiredSalaryMin: null,
          desiredSalaryMax: null,
          isRemoteOk: true,
          status: 'active',
          resumeFilePath: null,
          linkedinUrl: null,
          aiScore: extractedData.overallScore || 0,
          aiAnalysisSummary: extractedData.aiAnalysisSummary || '',
          aiRecommendation: extractedData.recommendation || 'REQUIRES_REVIEW',
          aiScores: {
            overall: extractedData.overallScore || 0,
            experience: extractedData.experienceScore || 0,
            skills: extractedData.skillsScore || 0,
            location: extractedData.locationScore || 0,
            education: extractedData.educationScore || 0,
            salary: extractedData.salaryScore || 0
          },
          keyStrengths: extractedData.keyStrengths || [],
          concerns: extractedData.concerns || [],
          biasDetection: extractedData.biasDetection || {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // Add candidate to database
        db.candidates.push(newCandidate);

        // Create application
        const applicationId = `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newApplication = {
          id: applicationId,
          candidateId: candidateId,
          candidateName: `${newCandidate.firstName} ${newCandidate.lastName}`,
          jobId: jobId,
          position: jobData.title,
          email: newCandidate.email,
          phone: newCandidate.phone,
          location: newCandidate.location,
          appliedDate: new Date().toISOString(),
          status: 'new',
          aiScore: extractedData.overallScore || 0,
          stage: 'application',
          resumeUrl: null,
          coverLetterUrl: null,
          experience: newCandidate.yearsOfExperience?.toString() || '0',
          salaryExpectation: 'Not specified',
          source: 'bulk_upload',
          notes: `AI Analysis: ${extractedData.recommendation || 'Not specified'}`
        };

        db.applications.push(newApplication);

        results.push({
          fileName: resume.fileName,
          success: true,
          candidate: newCandidate,
          application: newApplication,
          analysis: {
            overallScore: extractedData.overallScore,
            recommendation: extractedData.recommendation,
            keyStrengths: extractedData.keyStrengths,
            concerns: extractedData.concerns,
            experienceScore: extractedData.experienceScore,
            skillsScore: extractedData.skillsScore,
            locationScore: extractedData.locationScore,
            educationScore: extractedData.educationScore,
            salaryScore: extractedData.salaryScore
          }
        });

      } catch (error) {
        console.error(`Failed to process resume ${resume.fileName}:`, error);
        results.push({
          fileName: resume.fileName,
          success: false,
          error: error instanceof Error ? error.message : 'Processing failed'
        });
      }

      // Add delay between requests to respect rate limits (except for last item)
      if (i < resumes.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1200)); // 1.2 second delay
      }
    }

    return res.status(200).json({
      success: true,
      message: `Processed ${results.length} resumes`,
      data: {
        totalProcessed: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results: results
      }
    });

  } catch (error) {
    console.error('Bulk upload error:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
} 