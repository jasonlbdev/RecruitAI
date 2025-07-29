import { VercelRequest, VercelResponse } from '@vercel/node';
import { getMemoryDB } from './init-db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const { resumeText, jobId, candidateId } = req.body;

    if (!resumeText) {
      return res.status(400).json({
        success: false,
        error: 'Resume text is required'
      });
    }

    const db = getMemoryDB();
    
    // Get OpenAI API key from settings
    const apiKeySetting = db.system_settings.find((s: any) => s.key === 'openai_api_key');
    if (!apiKeySetting || !apiKeySetting.value) {
      return res.status(500).json({
        success: false,
        error: 'OpenAI API key not configured'
      });
    }

    // Get job details if jobId provided
    let jobDetails: any = null;
    if (jobId) {
      jobDetails = db.jobs.find((j: any) => j.id === jobId);
    }

    // Get AI configuration
    const maxTokensSetting = db.system_settings.find((s: any) => s.key === 'max_tokens');
    const temperatureSetting = db.system_settings.find((s: any) => s.key === 'temperature');
    const modelSetting = db.system_settings.find((s: any) => s.key === 'model');
    const systemPromptSetting = db.system_settings.find((s: any) => s.key === 'system_prompt');
    const resumeAnalysisPromptSetting = db.system_settings.find((s: any) => s.key === 'resume_analysis_prompt');

    // Prepare the analysis prompt
    let analysisPrompt = resumeAnalysisPromptSetting?.value || 'Analyze this resume and provide insights.';
    
    if (jobDetails) {
      analysisPrompt = analysisPrompt
        .replace('{resume_text}', resumeText)
        .replace('{job_requirements}', jobDetails.requirements?.join(', ') || 'Not specified')
        .replace('{job_description}', jobDetails.description || 'Not specified');
    } else {
      analysisPrompt = `Analyze the following resume and provide comprehensive insights:\n\n${resumeText}`;
    }

    // Make OpenAI API call
    try {
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
              content: systemPromptSetting?.value || 'You are an expert recruitment assistant.'
            },
            {
              role: 'user',
              content: analysisPrompt
            }
          ],
          max_tokens: parseInt(maxTokensSetting?.value || '1500'),
          temperature: parseFloat(temperatureSetting?.value || '0.7'),
        }),
      });

      if (!openaiResponse.ok) {
        throw new Error(`OpenAI API error: ${openaiResponse.status}`);
      }

      const openaiData = await openaiResponse.json();
      const analysis = openaiData.choices[0]?.message?.content;

      if (!analysis) {
        throw new Error('No analysis received from OpenAI');
      }

      // Save analysis result if candidateId provided
      if (candidateId) {
        const candidate = db.candidates.find((c: any) => c.id === candidateId);
        if (candidate) {
          candidate.aiAnalysis = analysis;
          candidate.lastAnalyzed = new Date().toISOString();
          candidate.updatedAt = new Date().toISOString();
        }
      }

      res.json({
        success: true,
        data: {
          analysis,
          jobDetails: jobDetails ? {
            id: jobDetails.id,
            title: jobDetails.title,
            department: jobDetails.department
          } : null,
          timestamp: new Date().toISOString(),
          tokensUsed: openaiData.usage?.total_tokens || 0
        }
      });

    } catch (openaiError) {
      console.error('OpenAI API error:', openaiError);
      res.status(500).json({
        success: false,
        error: `AI analysis failed: ${openaiError instanceof Error ? openaiError.message : 'Unknown error'}`
      });
    }

  } catch (error) {
    console.error('AI analyze error:', error);
    res.status(500).json({
      success: false,
      error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
} 