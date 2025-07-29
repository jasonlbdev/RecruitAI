import { VercelRequest, VercelResponse } from '@vercel/node';
import { getMemoryDB } from './init-db';

// Simple file handling for Vercel (in production, you'd use proper file storage)
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { fileName, fileContent, jobId } = req.body;

    if (!fileName || !fileContent) {
      return res.status(400).json({
        success: false,
        error: 'File name and content are required'
      });
    }

    const db = getMemoryDB();

    // Get OpenAI API key
    const apiKeySetting = db.system_settings.find((s: any) => s.key === 'openai_api_key');
    if (!apiKeySetting || !apiKeySetting.value) {
      return res.status(500).json({
        success: false,
        error: 'OpenAI API key not configured. Please configure in Settings.'
      });
    }

    // Get job details if jobId provided
    let jobDetails: any = null;
    if (jobId) {
      jobDetails = db.jobs.find((j: any) => j.id === jobId);
    }

    // Prepare AI analysis prompt
    const resumeAnalysisPromptSetting = db.system_settings.find((s: any) => s.key === 'resume_analysis_prompt');
    let analysisPrompt = resumeAnalysisPromptSetting?.value || 'Analyze this resume and extract candidate information.';
    
    if (jobDetails) {
      analysisPrompt = analysisPrompt
        .replace('{resume_text}', fileContent)
        .replace('{job_requirements}', jobDetails.requirements?.join(', ') || 'Not specified')
        .replace('{job_description}', jobDetails.description || 'Not specified');
    }

    // Enhanced prompt for data extraction
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
  "skills": {
    "programmingLanguages": ["JavaScript", "Python", "etc"],
    "frameworks": ["React", "Node.js", "etc"],
    "tools": ["AWS", "Docker", "etc"],
    "databases": ["PostgreSQL", "MongoDB", "etc"],
    "softSkills": ["Leadership", "Communication", "etc"],
    "certifications": ["AWS Certified", "PMP", "etc"],
    "allSkills": ["comprehensive list of all skills found"]
  },
  "summary": "professional summary",
  "education": {
    "degree": "highest degree",
    "institution": "university/school name", 
    "graduationYear": "year if found",
    "gpa": "if mentioned"
  },
  "workExperience": [
    {
      "company": "company name",
      "position": "job title", 
      "duration": "time period",
      "achievements": ["key achievement 1", "key achievement 2"]
    }
  ],
  "overallScore": "score 0-100 for job match",
  "keyStrengths": ["strength1", "strength2"],
  "concerns": ["concern1", "concern2"],
  "recommendation": "STRONG_MATCH, GOOD_MATCH, POTENTIAL_MATCH, or POOR_MATCH",
  "experienceScore": "0-100 score for experience match",
  "skillsScore": "0-100 score for skills match", 
  "locationScore": "0-100 score for location preference",
  "educationScore": "0-100 score for education background",
  "salaryScore": "0-100 score for salary expectations",
  "biasDetection": {
    "potentialBias": ["any potential bias indicators"],
    "diversityNotes": "notes on diversity considerations"
  },
  "aiAnalysisSummary": "comprehensive 2-3 sentence summary of candidate fit"
}

Resume Content:
${fileContent}`;

    // Call OpenAI API
    const modelSetting = db.system_settings.find((s: any) => s.key === 'model');
    const systemPromptSetting = db.system_settings.find((s: any) => s.key === 'system_prompt');

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKeySetting.value}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelSetting?.value || 'gpt-4',
        messages: [
          {
            role: 'system',
            content: systemPromptSetting?.value || 'You are an expert recruitment assistant. Extract candidate information accurately.'
          },
          {
            role: 'user',
            content: extractionPrompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.3, // Lower temperature for more consistent extraction
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      throw new Error(`OpenAI API error: ${openaiResponse.status} - ${errorText}`);
    }

    const openaiData = await openaiResponse.json();
    const aiResponse = openaiData.choices[0]?.message?.content;

    if (!aiResponse) {
      throw new Error('No response from AI');
    }

    // Try to parse JSON from AI response
    let extractedData: any = {};
    try {
      // Look for JSON in the response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in AI response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', aiResponse);
      // Fallback to basic extraction
      extractedData = {
        firstName: '',
        lastName: '',
        email: '',
        summary: aiResponse,
        overallScore: 50,
        recommendation: 'REQUIRES_REVIEW'
      };
    }

    // Create candidate from extracted data
    const candidateId = `candidate-${Date.now()}`;
    const newCandidate = {
      id: candidateId,
      firstName: extractedData.firstName || '',
      lastName: extractedData.lastName || '',
      email: extractedData.email || '',
      phone: extractedData.phone || '',
      location: extractedData.location || '',
      currentPosition: extractedData.currentPosition || '',
      currentCompany: extractedData.currentCompany || '',
      yearsOfExperience: parseInt(extractedData.yearsOfExperience) || 0,
      summary: extractedData.summary || '',
      skills: extractedData.skills?.allSkills || 
              (Array.isArray(extractedData.skills) ? extractedData.skills : []),
      skillsDetailed: extractedData.skills || {},
      education: extractedData.education || {},
      workExperience: extractedData.workExperience || [],
      source: 'resume_upload',
      status: 'active',
      isRemoteOk: false,
      isBlacklisted: false,
      resumeFilePath: `/uploads/${fileName}`,
      resumeText: fileContent,
      aiScore: extractedData.overallScore || 0,
      aiAnalysis: aiResponse,
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

    // Add to in-memory database
    db.candidates.push(newCandidate);

    // If jobId provided, also create an application
    let applicationId: string | null = null;
    if (jobId) {
      applicationId = `app-${Date.now()}`;
      const newApplication = {
        id: applicationId,
        candidateId: candidateId,
        candidateName: `${newCandidate.firstName} ${newCandidate.lastName}`,
        jobId: jobId,
        position: jobDetails?.title || 'Unknown Position',
        email: newCandidate.email,
        phone: newCandidate.phone,
        location: newCandidate.location,
        appliedDate: new Date().toISOString().split('T')[0],
        status: 'new',
        aiScore: newCandidate.aiScore,
        stage: 'Application Submitted',
        experience: `${newCandidate.yearsOfExperience} years`,
        source: 'resume_upload',
        resumeUrl: newCandidate.resumeFilePath,
        notes: `AI Recommendation: ${newCandidate.aiRecommendation}`,
        createdAt: new Date().toISOString()
      };
      
      db.applications.push(newApplication);
    }

    res.json({
      success: true,
      data: {
        candidate: newCandidate,
        applicationId: applicationId,
        aiAnalysis: {
          extractedData,
          fullAnalysis: aiResponse,
          processingTime: Date.now(),
          tokensUsed: openaiData.usage?.total_tokens || 0
        }
      }
    });

  } catch (error) {
    console.error('Resume upload error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process resume'
    });
  }
} 