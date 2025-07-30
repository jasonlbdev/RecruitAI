import { VercelRequest, VercelResponse } from '@vercel/node';
import { getMemoryDB } from './init-db';
import { generateAIText, getAIConfig } from '../lib/ai-providers';

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
    const { resumeText, jobId } = req.body;

    if (!resumeText) {
      return res.status(400).json({
        success: false,
        error: 'Resume text is required'
      });
    }

    const db = await getMemoryDB();
    
    // Get job details if jobId provided
    let jobDetails: any = null;
    if (jobId) {
      jobDetails = db.jobs?.find((job: any) => job.id === jobId) || null;
    }

    // Get AI prompts from system settings
    const resumeAnalysisPromptSetting = db.system_settings.find((s: any) => s.key === 'resume_analysis_prompt');
    const systemPromptSetting = db.system_settings.find((s: any) => s.key === 'system_prompt');
    
    const resumeAnalysisPrompt = resumeAnalysisPromptSetting?.value || 'Analyze this resume and provide insights';
    const systemPrompt = systemPromptSetting?.value || 'You are a helpful AI assistant';

    // Build context-aware prompt
    let analysisPrompt = resumeAnalysisPrompt;
    
    if (jobDetails) {
      const jobContext = `
**JOB CONTEXT:**
- Title: ${jobDetails.title}
- Department: ${jobDetails.department || 'Not specified'}
- Location: ${jobDetails.location || 'Not specified'}
- Requirements: ${JSON.stringify(jobDetails.requirements || [])}
- Skills: ${JSON.stringify(jobDetails.skills || [])}
- Experience Level: ${jobDetails.experience_level || 'Not specified'}
- Scoring Weights: ${JSON.stringify(jobDetails.scoring_weights || {})}
`;
      
      analysisPrompt = `${systemPrompt}\n\n${jobContext}\n\n${resumeAnalysisPrompt}\n\n**RESUME TEXT:**\n${resumeText}`;
    } else {
      analysisPrompt = `${systemPrompt}\n\n${resumeAnalysisPrompt}\n\n**RESUME TEXT:**\n${resumeText}`;
    }

    // Get AI configuration and generate analysis
    const aiConfig = await getAIConfig(db);
    const result = await generateAIText(analysisPrompt, aiConfig);

    // Parse AI response
    let analysisData;
    try {
      // Try to extract JSON from the response
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisData = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback to plain text response
        analysisData = {
          overallScore: 75,
          summary: result.text,
          skills: [],
          experience: 'Not specified',
          recommendation: 'CONSIDER',
          provider: aiConfig.provider
        };
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      analysisData = {
        overallScore: 70,
        summary: result.text.substring(0, 500),
        skills: [],
        experience: 'Analysis completed',
        recommendation: 'CONSIDER',
        provider: aiConfig.provider
      };
    }

    return res.status(200).json({
      success: true,
      data: {
        analysis: analysisData,
        aiProvider: aiConfig.provider,
        usage: result.usage,
        jobContext: jobDetails ? {
          title: jobDetails.title,
          department: jobDetails.department,
          scoringWeights: jobDetails.scoring_weights
        } : null
      }
    });

  } catch (error) {
    console.error('AI analysis error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to analyze resume with AI'
    });
  }
} 