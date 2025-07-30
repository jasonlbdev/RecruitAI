import { VercelRequest, VercelResponse } from '@vercel/node';
import { put } from '@vercel/blob';

// AI Provider abstraction
type AIProvider = 'openai' | 'xai';

interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

interface AIResponse {
  text: string;
  usage?: any;
}

async function generateAIText(config: AIConfig, prompt: string): Promise<AIResponse> {
  try {
    if (config.provider === 'openai') {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: 'system', content: 'You are an expert recruitment assistant.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: config.maxTokens,
          temperature: config.temperature
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      return {
        text: data.choices[0]?.message?.content || '',
        usage: data.usage
      };
    } else if (config.provider === 'xai') {
      const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: 'system', content: 'You are an expert recruitment assistant.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: config.maxTokens,
          temperature: config.temperature
        })
      });

      if (!response.ok) {
        throw new Error(`xAI API error: ${response.status}`);
      }

      const data = await response.json();
      return {
        text: data.choices[0]?.message?.content || '',
        usage: data.usage
      };
    }

    throw new Error('Unsupported AI provider');
  } catch (error) {
    console.error('AI generation error:', error);
    throw error;
  }
}

async function getAIConfig(): Promise<AIConfig> {
  try {
    if (!process.env.DATABASE_URL) {
      return {
        provider: 'openai',
        apiKey: process.env.OPENAI_API_KEY || '',
        model: 'gpt-4o',
        maxTokens: 1500,
        temperature: 0.7
      };
    }
    
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL);
    
    const settings = await sql`
      SELECT key, value FROM system_settings 
      WHERE key IN ('ai_provider', 'openai_api_key', 'openai_model', 'xai_api_key', 'xai_model', 'max_tokens', 'temperature')
    `.catch(() => []);

    const config: any = {
      provider: 'openai',
      apiKey: '',
      model: 'gpt-4o',
      maxTokens: 1500,
      temperature: 0.7
    };

    settings.forEach((setting: any) => {
      if (setting.key === 'ai_provider') config.provider = setting.value;
      if (setting.key === 'openai_api_key') config.openaiApiKey = setting.value;
      if (setting.key === 'openai_model') config.openaiModel = setting.value;
      if (setting.key === 'xai_api_key') config.xaiApiKey = setting.value;
      if (setting.key === 'xai_model') config.xaiModel = setting.value;
      if (setting.key === 'max_tokens') config.maxTokens = parseInt(setting.value);
      if (setting.key === 'temperature') config.temperature = parseFloat(setting.value);
    });

    return {
      provider: config.provider,
      apiKey: config.provider === 'openai' ? config.openaiApiKey : config.xaiApiKey,
      model: config.provider === 'openai' ? config.openaiModel : config.xaiModel,
      maxTokens: config.maxTokens,
      temperature: config.temperature
    };
  } catch (error) {
    console.error('getAIConfig error:', error);
    return {
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY || '',
      model: 'gpt-4o',
      maxTokens: 1500,
      temperature: 0.7
    };
  }
}

async function getResumeAnalysisPrompt(): Promise<string> {
  try {
    if (!process.env.DATABASE_URL) {
      return 'Analyze this resume and extract key information including name, email, phone, skills, experience, and qualifications. Return the analysis in JSON format.';
    }
    
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL);
    
    const result = await sql`
      SELECT value FROM system_settings WHERE key = 'resume_analysis_prompt'
    `.catch(() => []);
    
    return result[0]?.value || 'Analyze this resume and extract key information including name, email, phone, skills, experience, and qualifications. Return the analysis in JSON format.';
  } catch (error) {
    console.error('getResumeAnalysisPrompt error:', error);
    return 'Analyze this resume and extract key information including name, email, phone, skills, experience, and qualifications. Return the analysis in JSON format.';
  }
}

async function createCandidate(candidateData: any) {
  try {
    if (!process.env.DATABASE_URL) {
      return null;
    }
    
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL);
    
    const result = await sql`
      INSERT INTO candidates (name, email, phone, resume_url, skills, experience_years, current_position)
      VALUES (${candidateData.name}, ${candidateData.email}, ${candidateData.phone}, ${candidateData.resume_url}, ${candidateData.skills}, ${candidateData.experience_years}, ${candidateData.current_position})
      RETURNING *
    `.catch(() => []);
    
    return result[0] || null;
  } catch (error) {
    console.error('createCandidate error:', error);
    return null;
  }
}

async function createApplication(applicationData: any) {
  try {
    if (!process.env.DATABASE_URL) {
      return null;
    }
    
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL);
    
    const result = await sql`
      INSERT INTO applications (job_id, candidate_id, status, ai_analysis, ai_provider, usage)
      VALUES (${applicationData.job_id}, ${applicationData.candidate_id}, ${applicationData.status || 'pending'}, ${JSON.stringify(applicationData.ai_analysis)}, ${applicationData.ai_provider}, ${JSON.stringify(applicationData.usage)})
      RETURNING *
    `.catch(() => []);
    
    return result[0] || null;
  } catch (error) {
    console.error('createApplication error:', error);
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      const { files, jobId } = req.body;

      if (!files || !Array.isArray(files) || files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No files provided for bulk upload'
        });
      }

      if (!jobId) {
        return res.status(400).json({
          success: false,
          error: 'Job ID is required for bulk upload'
        });
      }

      // Get AI configuration
      const aiConfig = await getAIConfig();
      
      if (!aiConfig.apiKey) {
        return res.status(400).json({
          success: false,
          error: `No API key configured for ${aiConfig.provider}`
        });
      }

      // Get resume analysis prompt
      const analysisPrompt = await getResumeAnalysisPrompt();

      const results = [];
      let successCount = 0;
      let errorCount = 0;

      // Process each file
      for (const file of files) {
        try {
          // Upload file to Vercel Blob
          let resumeUrl = '';
          if (process.env.BLOB_READ_WRITE_TOKEN) {
            try {
              const blob = await put(`resumes/${Date.now()}-${file.name}`, file, {
                access: 'public',
              });
              resumeUrl = blob.url;
            } catch (error) {
              console.error('Blob upload error:', error);
              // Continue without blob storage
            }
          }

          // Extract text from resume (simplified - in production you'd use a PDF parser)
          const resumeText = typeof file === 'string' ? file : 'Resume content extracted';

          // Generate AI analysis
          const aiResponse = await generateAIText(aiConfig, `${analysisPrompt}\n\nResume:\n${resumeText}`);

          // Parse AI response
          let extractedData;
          try {
            extractedData = JSON.parse(aiResponse.text);
          } catch (parseError) {
            extractedData = {
              name: 'Extracted from AI response',
              email: 'Extracted from AI response',
              phone: 'Extracted from AI response',
              skills: 'Extracted from AI response',
              experience_years: 0,
              current_position: 'Extracted from AI response'
            };
          }

          // Create candidate
          const candidateData = {
            name: extractedData.name || 'Unknown',
            email: extractedData.email || 'unknown@example.com',
            phone: extractedData.phone || '',
            resume_url: resumeUrl,
            skills: extractedData.skills || '',
            experience_years: extractedData.experience_years || 0,
            current_position: extractedData.current_position || ''
          };

          const newCandidate = await createCandidate(candidateData);

          if (newCandidate) {
            // Create application
            const applicationData = {
              job_id: jobId,
              candidate_id: newCandidate.id,
              status: 'pending',
              ai_analysis: extractedData,
              ai_provider: aiConfig.provider,
              usage: aiResponse.usage
            };

            const newApplication = await createApplication(applicationData);

            results.push({
              file: file.name,
              success: true,
              candidate: newCandidate,
              application: newApplication,
              aiAnalysis: extractedData
            });

            successCount++;
          } else {
            results.push({
              file: file.name,
              success: false,
              error: 'Failed to create candidate'
            });
            errorCount++;
          }

          // Rate limiting for AI API calls
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
          results.push({
            file: file.name,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          errorCount++;
        }
      }

      return res.status(200).json({
        success: true,
        data: {
          totalFiles: files.length,
          successCount,
          errorCount,
          results
        }
      });

    } catch (error) {
      console.error('Bulk upload API error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process bulk upload'
      });
    }
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  });
} 