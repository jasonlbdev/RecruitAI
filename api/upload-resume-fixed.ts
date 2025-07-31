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
      if (setting.key === 'openai_api_key') config.apiKey = setting.value;
      if (setting.key === 'openai_model') config.model = setting.value;
      if (setting.key === 'xai_api_key') config.xaiApiKey = setting.value;
      if (setting.key === 'xai_model') config.xaiModel = setting.value;
      if (setting.key === 'max_tokens') config.maxTokens = parseInt(setting.value);
      if (setting.key === 'temperature') config.temperature = parseFloat(setting.value);
    });

    return {
      provider: config.provider,
      apiKey: config.provider === 'openai' ? config.apiKey : config.xaiApiKey,
      model: config.provider === 'openai' ? config.model : config.xaiModel,
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

async function getResumeAnalysisPrompt(jobId?: string): Promise<{ prompt: string; weights?: any }> {
  try {
    if (!process.env.DATABASE_URL) {
      return {
        prompt: 'Analyze this resume and extract key information. You must respond with ONLY valid JSON in this exact format: {"name": "Full Name", "email": "email@example.com", "phone": "phone number", "skills": "comma separated skills", "experience_years": number, "current_position": "job title"}. Do not include any other text or formatting.'
      };
    }
    
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL);
    
    let basePrompt = '';
    const result = await sql`
      SELECT value FROM system_settings WHERE key = 'resume_analysis_prompt'
    `.catch(() => []);
    
    basePrompt = result[0]?.value || 'Analyze this resume and extract key information. You must respond with ONLY valid JSON in this exact format: {"name": "Full Name", "email": "email@example.com", "phone": "phone number", "skills": "comma separated skills", "experience_years": number, "current_position": "job title"}. Do not include any other text or formatting.';
    
    let weights: any = null;
    
    // If jobId is provided, get job-specific requirements and weights
    if (jobId) {
      const jobResult = await sql`
        SELECT title, description, requirements, scoring_weights FROM jobs WHERE id = ${jobId}
      `.catch(() => []);
      
      if (jobResult[0]) {
        const job = jobResult[0];
        weights = job.scoring_weights;
        basePrompt += `\n\nJob Context:\nTitle: ${job.title}\nDescription: ${job.description}\nRequirements: ${JSON.stringify(job.requirements)}\n\nPlease also assess how well the candidate matches this specific job and provide a match score (0-100) based on the following criteria:\n- Experience match (weight: ${weights?.experience || 30}%)\n- Skills match (weight: ${weights?.skills || 30}%)\n- Location match (weight: ${weights?.location || 15}%)\n- Education match (weight: ${weights?.education || 15}%)\n- Salary expectations match (weight: ${weights?.salary || 10}%)\n\nProvide individual scores for each criterion and an overall weighted score.`;
      }
    }
    
    return { prompt: basePrompt, weights };
  } catch (error) {
    console.error('getResumeAnalysisPrompt error:', error);
    return {
      prompt: 'Analyze this resume and extract key information. You must respond with ONLY valid JSON in this exact format: {"name": "Full Name", "email": "email@example.com", "phone": "phone number", "skills": "comma separated skills", "experience_years": number, "current_position": "job title"}. Do not include any other text or formatting.'
    };
  }
}

async function createCandidate(candidateData: any) {
  try {
    if (!process.env.DATABASE_URL) {
      console.error('No DATABASE_URL configured');
      return null;
    }
    
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL);
    
    console.log('Creating candidate with data:', candidateData);
    
    const result = await sql`
      INSERT INTO candidates (name, email, phone, resume_url, skills, experience_years, current_position)
      VALUES (${candidateData.name}, ${candidateData.email}, ${candidateData.phone}, ${candidateData.resume_url}, ${JSON.stringify(candidateData.skills)}, ${candidateData.experience_years}, ${candidateData.current_position})
      RETURNING *
    `.catch((error) => {
      console.error('SQL error:', error);
      return [];
    });
    
    console.log('Candidate creation result:', result);
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
      const formData = req.body;
      const resumeFile = formData.resume;
      const jobId = formData.jobId;

      if (!resumeFile || !resumeFile.data) {
        return res.status(400).json({
          success: false,
          error: 'Resume file is required'
        });
      }

      // Upload file to Vercel Blob
      let resumeUrl = '';
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        try {
          const blob = await put(`resumes/${Date.now()}-${resumeFile.name}`, resumeFile, {
            access: 'public',
          });
          resumeUrl = blob.url;
        } catch (error) {
          console.error('Blob upload error:', error);
          // Continue without blob storage
        }
      }

      // Extract text from resume (with PDF parsing support)
      let resumeText = 'Resume content extracted';
      
      if (resumeFile.name && resumeFile.name.toLowerCase().endsWith('.pdf')) {
        // Parse PDF using the parse-resume API
        try {
          const parseResponse = await fetch(`${req.headers.host ? `https://${req.headers.host}` : 'http://localhost:3000'}/api/parse-resume`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              file: {
                name: resumeFile.name,
                data: resumeFile.data,
                type: resumeFile.type
              }
            })
          });
          
          if (parseResponse.ok) {
            const parseResult = await parseResponse.json();
            resumeText = parseResult.data.text;
          } else {
            console.warn('PDF parsing failed, using fallback');
            resumeText = 'PDF content could not be parsed';
          }
        } catch (parseError) {
          console.error('PDF parsing error:', parseError);
          resumeText = 'PDF content could not be parsed';
        }
      } else {
        // Handle text files or other formats
        try {
          resumeText = Buffer.from(resumeFile.data, 'base64').toString('utf-8');
        } catch (error) {
          console.error('Text extraction error:', error);
          resumeText = 'Resume content could not be extracted';
        }
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
      const { prompt: analysisPrompt, weights } = await getResumeAnalysisPrompt(jobId);

      // Generate AI analysis
      const aiResponse = await generateAIText(aiConfig, `${analysisPrompt}\n\nResume:\n${resumeText}`);

      // Parse AI response
      let extractedData;
      try {
        // Try to parse as JSON first
        extractedData = JSON.parse(aiResponse.text);
      } catch (parseError) {
        console.log('AI response parsing failed, attempting text extraction:', aiResponse.text);
        
        // If JSON parsing fails, try to extract information from text
        const text = aiResponse.text.toLowerCase();
        
        // Simple text extraction as fallback
        const nameMatch = text.match(/name[:\s]+([^\n,]+)/i);
        const emailMatch = text.match(/email[:\s]+([^\s\n]+@[^\s\n]+)/i);
        const phoneMatch = text.match(/phone[:\s]+([0-9\-\+\(\)\s]+)/i);
        const skillsMatch = text.match(/skills?[:\s]+([^\n]+)/i);
        const experienceMatch = text.match(/experience[:\s]+(\d+)/i);
        const positionMatch = text.match(/position[:\s]+([^\n,]+)/i) || text.match(/title[:\s]+([^\n,]+)/i);
        
        extractedData = {
          name: nameMatch ? nameMatch[1].trim() : 'Unknown',
          email: emailMatch ? emailMatch[1].trim() : 'unknown@example.com',
          phone: phoneMatch ? phoneMatch[1].trim() : '',
          skills: skillsMatch ? skillsMatch[1].trim() : 'Extracted from resume',
          experience_years: experienceMatch ? parseInt(experienceMatch[1]) : 0,
          current_position: positionMatch ? positionMatch[1].trim() : 'Unknown'
        };
      }

      // Create candidate
      const candidateData = {
        name: extractedData.name || 'Unknown',
        email: extractedData.email || 'unknown@example.com',
        phone: extractedData.phone || '',
        resume_url: resumeUrl,
        skills: extractedData.skills || 'Extracted from resume',
        experience_years: extractedData.experience_years || 0,
        current_position: extractedData.current_position || 'Unknown'
      };

      const newCandidate = await createCandidate(candidateData);

      if (!newCandidate) {
        return res.status(500).json({
          success: false,
          error: 'Failed to create candidate'
        });
      }

      // Create application if jobId is provided
      let newApplication: any = null;
      if (jobId) {
        const applicationData = {
          job_id: jobId,
          candidate_id: newCandidate.id,
          status: 'pending',
          ai_analysis: extractedData,
          ai_provider: aiConfig.provider,
          usage: aiResponse.usage
        };

        newApplication = await createApplication(applicationData);
      }

      return res.status(200).json({
        success: true,
        data: {
          candidate: newCandidate,
          application: newApplication,
          aiAnalysis: extractedData,
          aiProvider: aiConfig.provider,
          usage: aiResponse.usage
        }
      });

    } catch (error) {
      console.error('Upload resume API error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process resume'
      });
    }
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  });
} 