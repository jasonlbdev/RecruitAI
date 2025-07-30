import { VercelRequest, VercelResponse } from '@vercel/node';
import { put } from '@vercel/blob';
import { getMemoryDB } from './init-db';
import { createCandidate, createApplication } from '../lib/database';

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

    // Step 1: Upload resume to Vercel Blob Storage
    let resumeBlobUrl = '';
    try {
      const blobFilename = `resumes/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      
      const blob = await put(blobFilename, fileContent, {
        access: 'public',
        contentType: fileName.endsWith('.pdf') ? 'application/pdf' : 'text/plain'
      });
      
      resumeBlobUrl = blob.url;
      console.log('Resume uploaded to Vercel Blob:', resumeBlobUrl);
    } catch (blobError) {
      console.error('Vercel Blob upload failed:', blobError);
      return res.status(500).json({
        success: false,
        error: 'Failed to upload resume file to storage'
      });
    }

    const db = await getMemoryDB();

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
    
    // Get job-specific scoring weights (with defaults)
    const weights = jobDetails?.scoringWeights || {
      experience: 30, skills: 30, location: 15, education: 15, salary: 10
    };
    
    if (jobDetails) {
      // Create weighted emphasis for extraction
      const weightedInstructions = `
**EXTRACTION PRIORITIES FOR THIS ${jobDetails.title} ROLE:**
- Experience/Career Level: ${weights.experience}% weight - ${weights.experience > 30 ? 'CRITICAL FOCUS' : weights.experience > 20 ? 'HIGH FOCUS' : 'STANDARD FOCUS'}
- Technical Skills Match: ${weights.skills}% weight - ${weights.skills > 30 ? 'CRITICAL FOCUS' : weights.skills > 20 ? 'HIGH FOCUS' : 'STANDARD FOCUS'}  
- Location/Remote Compatibility: ${weights.location}% weight - ${weights.location > 20 ? 'CRITICAL FOCUS' : weights.location > 10 ? 'HIGH FOCUS' : 'STANDARD FOCUS'}
- Education Requirements: ${weights.education}% weight - ${weights.education > 20 ? 'CRITICAL FOCUS' : weights.education > 10 ? 'HIGH FOCUS' : 'STANDARD FOCUS'}
- Salary Alignment: ${weights.salary}% weight - ${weights.salary > 15 ? 'CRITICAL FOCUS' : weights.salary > 10 ? 'HIGH FOCUS' : 'STANDARD FOCUS'}

**JOB CONTEXT:**
- Position: ${jobDetails.title}
- Department: ${jobDetails.department}
- Required Experience Level: ${jobDetails.experienceLevel}
- Location: ${jobDetails.location} ${jobDetails.isRemote ? '(Remote Work Available)' : '(On-site Required)'}
- Salary Budget: $${jobDetails.salaryMin || 'TBD'} - $${jobDetails.salaryMax || 'TBD'}
- Key Requirements: ${jobDetails.requirements?.join(', ') || 'See job description'}

**GIVE DETAILED ANALYSIS IN CRITICAL/HIGH FOCUS AREAS**`;

      // Replace template variables with job-specific data
      analysisPrompt = analysisPrompt
        .replace('{resume_text}', fileContent)
        .replace('{job_requirements}', jobDetails.requirements?.join(', ') || 'Not specified')
        .replace('{job_description}', jobDetails.description || 'Not specified');

      // Enhance prompt with job-specific context
      analysisPrompt = `${analysisPrompt}

${weightedInstructions}`;
    }

    // Enhanced prompt for structured data extraction with job-specific scoring
    const extractionPrompt = `${analysisPrompt}

IMPORTANT: Please extract the following information and return it as a JSON object.
Pay special attention to the CRITICAL FOCUS and HIGH FOCUS areas mentioned above.

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
  "overallScore": "score 0-100 for job match based on weighted priorities",
  "keyStrengths": ["strength1", "strength2"],
  "concerns": ["concern1", "concern2"],
  "recommendation": "STRONG_MATCH, GOOD_MATCH, POTENTIAL_MATCH, or POOR_MATCH",
  "experienceScore": "0-100 score for experience match (${jobDetails ? weights.experience + '% weight' : 'standard weight'})",
  "skillsScore": "0-100 score for skills match (${jobDetails ? weights.skills + '% weight' : 'standard weight'})", 
  "locationScore": "0-100 score for location preference (${jobDetails ? weights.location + '% weight' : 'standard weight'})",
  "educationScore": "0-100 score for education background (${jobDetails ? weights.education + '% weight' : 'standard weight'})",
  "salaryScore": "0-100 score for salary expectations (${jobDetails ? weights.salary + '% weight' : 'standard weight'})",
  "biasDetection": {
    "potentialBias": ["any potential bias indicators"],
    "diversityNotes": "notes on diversity considerations"
  },
  "aiAnalysisSummary": "comprehensive 2-3 sentence summary of candidate fit for this specific role"
}

Resume Content:
${fileContent}`;

    // Call Grok xAI API instead of OpenAI
    const modelSetting = db.system_settings.find((s: any) => s.key === 'model');
    const systemPromptSetting = db.system_settings.find((s: any) => s.key === 'system_prompt');

    // Get Grok API key instead of OpenAI key
    const grokApiKeySetting = db.system_settings.find((s: any) => s.key === 'grok_api_key');
    if (!grokApiKeySetting || !grokApiKeySetting.value) {
      return res.status(500).json({
        success: false,
        error: 'Grok API key not configured. Please configure in Settings.'
      });
    }

    const grokResponse = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${grokApiKeySetting.value}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelSetting?.value || 'grok-beta',
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

    if (!grokResponse.ok) {
      const errorText = await grokResponse.text();
      throw new Error(`Grok API error: ${grokResponse.status} - ${errorText}`);
    }

    const grokData = await grokResponse.json();
    const aiResponse = grokData.choices[0]?.message?.content;

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
      resumeFilePath: resumeBlobUrl,
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
      jobId: jobId || null, // Link to the job
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
        notes: `AI Recommendation: ${newCandidate.aiRecommendation}. Job-specific analysis completed with weighted scoring.`,
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
          jobSpecificWeights: weights,
          processingTime: Date.now(),
          tokensUsed: grokData.usage?.total_tokens || 0
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