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

    const db = await getMemoryDB();
    
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

    // Create job-specific analysis prompt
    let analysisPrompt = resumeAnalysisPromptSetting?.value || 'Analyze this resume and provide insights.';
    
    if (jobDetails) {
      // Get job-specific scoring weights
      const weights = jobDetails.scoringWeights || {
        experience: 30, skills: 30, location: 15, education: 15, salary: 10
      };

      // Create weighted emphasis instructions
      const weightedInstructions = `
**SCORING PRIORITIES FOR THIS ROLE:**
- Experience/Career Level: ${weights.experience}% weight - ${weights.experience > 30 ? 'HIGH PRIORITY' : weights.experience > 20 ? 'MEDIUM PRIORITY' : 'LOW PRIORITY'}
- Technical Skills Match: ${weights.skills}% weight - ${weights.skills > 30 ? 'HIGH PRIORITY' : weights.skills > 20 ? 'MEDIUM PRIORITY' : 'LOW PRIORITY'}  
- Location/Remote Preference: ${weights.location}% weight - ${weights.location > 20 ? 'HIGH PRIORITY' : weights.location > 10 ? 'MEDIUM PRIORITY' : 'LOW PRIORITY'}
- Education Background: ${weights.education}% weight - ${weights.education > 20 ? 'HIGH PRIORITY' : weights.education > 10 ? 'MEDIUM PRIORITY' : 'LOW PRIORITY'}
- Salary Expectations: ${weights.salary}% weight - ${weights.salary > 15 ? 'HIGH PRIORITY' : weights.salary > 10 ? 'MEDIUM PRIORITY' : 'LOW PRIORITY'}

**FOCUS YOUR ANALYSIS ON THE HIGH PRIORITY AREAS ABOVE**`;

      // Replace template variables with job-specific data
      analysisPrompt = analysisPrompt
        .replace('{resume_text}', resumeText)
        .replace('{job_requirements}', jobDetails.requirements?.join(', ') || 'Not specified')
        .replace('{job_description}', jobDetails.description || 'Not specified');

      // Add job-specific context and weighted scoring instructions
      analysisPrompt = `${analysisPrompt}

**JOB-SPECIFIC CONTEXT:**
- Position: ${jobDetails.title}
- Department: ${jobDetails.department}
- Experience Level Required: ${jobDetails.experienceLevel}
- Location: ${jobDetails.location} ${jobDetails.isRemote ? '(Remote OK)' : '(On-site required)'}
- Salary Range: $${jobDetails.salaryMin || 'Not specified'} - $${jobDetails.salaryMax || 'Not specified'}

${weightedInstructions}

**RESUME TO ANALYZE:**
${resumeText}`;

    } else {
      analysisPrompt = `Analyze the following resume and provide comprehensive insights:\n\n${resumeText}`;
    }

    // Make Grok xAI API call instead of OpenAI
    try {
      // Get Grok API key instead of OpenAI key
      const grokApiKeySetting = db.system_settings.find((s: any) => s.key === 'grok_api_key');
      if (!grokApiKeySetting || !grokApiKeySetting.value) {
        throw new Error('Grok API key not configured');
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

      if (!grokResponse.ok) {
        throw new Error(`Grok API error: ${grokResponse.status}`);
      }

      const grokData = await grokResponse.json();
      const analysis = grokData.choices[0]?.message?.content;

      if (!analysis) {
        throw new Error('No analysis received from Grok');
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
          jobId,
          candidateId,
          timestamp: new Date().toISOString()
        }
      });

    } catch (apiError) {
      console.error('Grok API error:', apiError);
      return res.status(500).json({
        success: false,
        error: 'Failed to analyze resume with AI'
      });
    }

  } catch (error) {
    console.error('AI analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
} 