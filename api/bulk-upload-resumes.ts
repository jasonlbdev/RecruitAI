import type { VercelRequest, VercelResponse } from '@vercel/node';

// In-memory storage (replace with real database in production)
let memoryDB = {
  candidates: [] as any[],
  applications: [] as any[],
  system_settings: [
    { key: 'openai_api_key', value: '', updatedAt: new Date().toISOString() },
    { key: 'max_tokens', value: '1000', updatedAt: new Date().toISOString() },
    { key: 'temperature', value: '0.3', updatedAt: new Date().toISOString() },
    { key: 'model', value: 'gpt-4', updatedAt: new Date().toISOString() }
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
const MAX_REQUESTS_PER_MINUTE = 50; // OpenAI rate limit

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

async function processResumeWithAI(fileContent: string, fileName: string, jobData: any, apiKey: string) {
  if (!checkRateLimit()) {
    throw new Error('Rate limit exceeded. Please wait before processing more resumes.');
  }

  const db = getMemoryDB();
  
  // Get resume analysis prompt
  const resumePromptSetting = db.prompts.find(p => p.key === 'resume_analysis_prompt');
  const basePrompt = resumePromptSetting?.value || 'Analyze this resume and extract candidate information.';
  
  // Create job-specific context
  const jobContext = `

**JOB CONTEXT:**
Position: ${jobData.title}
Department: ${jobData.department}
Location: ${jobData.location}
Experience Level: ${jobData.experienceLevel}
Requirements: ${Array.isArray(jobData.requirements) ? jobData.requirements.join(', ') : 'Not specified'}
Description: ${jobData.description}

**SCORING WEIGHTS (prioritize accordingly):**
${jobData.scoringWeights ? `
- Experience: ${jobData.scoringWeights.experience}%
- Skills: ${jobData.scoringWeights.skills}%
- Location: ${jobData.scoringWeights.location}%
- Education: ${jobData.scoringWeights.education}%
- Salary: ${jobData.scoringWeights.salary}%
` : 'Equal weighting for all factors'}

Analyze this resume specifically for this position and use the scoring weights above.`;

  // Create the full analysis prompt
  const analysisPrompt = basePrompt + jobContext;

  // Enhanced extraction prompt
  const extractionPrompt = `${analysisPrompt}

IMPORTANT: Please extract the following information and return it as a JSON object:

{
  "firstName": "extracted first name",
  "lastName": "extracted last name", 
  "email": "extracted email",
  "phone": "extracted phone",
  "location": "extracted location",
  "currentPosition": "current job title",
  "currentCompany": "current company",
  "yearsOfExperience": "estimated years as number",
  "skills": ["skill1", "skill2", "skill3"],
  "summary": "professional summary",
  "education": "highest education",
  "overallScore": "score 0-100 for job match based on scoring weights",
  "keyStrengths": ["strength1", "strength2"],
  "concerns": ["concern1", "concern2"],
  "recommendation": "STRONG_MATCH, GOOD_MATCH, POTENTIAL_MATCH, or POOR_MATCH",
  "experienceScore": "0-100 score for experience match",
  "skillsScore": "0-100 score for skills match", 
  "locationScore": "0-100 score for location preference",
  "educationScore": "0-100 score for education background",
  "salaryScore": "0-100 score for salary expectations"
}

Resume Content:
${fileContent}`;

  // Call OpenAI API
  const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert HR recruitment assistant. Analyze resumes and extract information as JSON.'
        },
        {
          role: 'user', 
          content: extractionPrompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1500
    })
  });

  if (!openAIResponse.ok) {
    const errorData = await openAIResponse.json();
    throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
  }

  const aiResult = await openAIResponse.json();
  const aiContent = aiResult.choices[0]?.message?.content;

  if (!aiContent) {
    throw new Error('No response from AI');
  }

  // Parse AI response
  let extractedData;
  try {
    // Try to extract JSON from the response
    const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      extractedData = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('No JSON found in AI response');
    }
  } catch (parseError) {
    console.error('Failed to parse AI response as JSON:', parseError);
    throw new Error('Failed to parse AI analysis');
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

    const db = getMemoryDB();

    // Get OpenAI API key
    const apiKeySetting = db.system_settings.find(s => s.key === 'openai_api_key');
    const apiKey = apiKeySetting?.value;

    if (!apiKey) {
      return res.status(400).json({ error: 'OpenAI API key not configured' });
    }

    // Get job details (mock job data for now)
    const jobData = {
      id: jobId,
      title: 'Software Engineer',
      department: 'Engineering', 
      location: 'San Francisco, CA',
      experienceLevel: 'mid',
      requirements: ['JavaScript', 'React', 'Node.js'],
      description: 'Build scalable web applications',
      scoringWeights: {
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
          apiKey
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
          skills: extractedData.skills || [],
          summary: extractedData.summary || '',
          education: extractedData.education || '',
          source: 'bulk_upload',
          desiredSalaryMin: null,
          desiredSalaryMax: null,
          isRemoteOk: true,
          status: 'active',
          resumeFilePath: null,
          linkedinUrl: null,
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