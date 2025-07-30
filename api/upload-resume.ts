import { VercelRequest, VercelResponse } from '@vercel/node';
import { put } from '@vercel/blob';
import { xai } from '@ai-sdk/xai';
import { generateText } from 'ai';
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

    // Get job details if jobId provided
    let jobDetails: any = null;
    if (jobId) {
      jobDetails = db.jobs?.find((j: any) => j.id === jobId);
    }

    // Get AI configuration and generate analysis
    const { generateAIText, getAIConfig } = await import('../lib/ai-providers');
    const aiConfig = await getAIConfig(db);

    // Get prompts from system settings
    const systemPromptSetting = db.system_settings.find((s: any) => s.key === 'system_prompt');
    const resumeAnalysisPromptSetting = db.system_settings.find((s: any) => s.key === 'resume_analysis_prompt');

    // Build context-aware prompt
    let finalPrompt = resumeAnalysisPromptSetting?.value || 'Analyze this resume and extract key information.';
    
    if (jobDetails) {
      finalPrompt = `${systemPromptSetting?.value || 'You are an expert recruitment assistant.'}\n\n
JOB CONTEXT:
- Title: ${jobDetails.title}
- Department: ${jobDetails.department || 'Not specified'}
- Requirements: ${JSON.stringify(jobDetails.requirements || [])}
- Skills: ${JSON.stringify(jobDetails.skills || [])}
- Experience Level: ${jobDetails.experience_level || 'Not specified'}
- Scoring Weights: ${JSON.stringify(jobDetails.scoring_weights || {})}

${finalPrompt}

Resume Content: ${fileContent}`;
    } else {
      finalPrompt = `${systemPromptSetting?.value || 'You are an expert recruitment assistant.'}\n\n${finalPrompt}\n\nResume Content: ${fileContent}`;
    }

    // Use the new AI provider system
    let extractedData: any = {};
    try {
      const result = await generateAIText(finalPrompt, aiConfig);
      extractedData = parseAnalysisResponse(result.text || '');
      extractedData.aiProvider = aiConfig.provider;
      extractedData.usage = result.usage;
    } catch (aiError) {
      console.error('AI analysis error:', aiError);
      extractedData = {
        firstName: '',
        lastName: '',
        email: '',
        summary: 'AI analysis failed',
        overallScore: 50,
        recommendation: 'REQUIRES_REVIEW',
        aiProvider: aiConfig.provider
      };
    }

    // Helper function to parse AI response
    function parseAnalysisResponse(response: string): any {
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError);
      }
      
      return {
        firstName: '',
        lastName: '',
        email: '',
        summary: response.substring(0, 500),
        overallScore: 70,
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
      aiAnalysis: extractedData.summary || 'Analysis completed',
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
          fullAnalysis: extractedData.summary || 'Analysis completed',
          jobSpecificWeights: jobDetails?.scoring_weights || {},
          processingTime: Date.now(),
          tokensUsed: extractedData.usage?.totalTokens || 0
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