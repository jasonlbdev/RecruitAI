import { VercelRequest, VercelResponse } from '@vercel/node';

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

const AVAILABLE_MODELS = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  xai: ['grok-3-mini', 'grok-3', 'grok-beta']
};

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
      const { resumeText, jobId } = req.body;

      if (!resumeText) {
        return res.status(400).json({
          success: false,
          error: 'Resume text is required'
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

      // Generate AI analysis
      const aiResponse = await generateAIText(aiConfig, `${analysisPrompt}\n\nResume:\n${resumeText}`);

      // Parse AI response
      let extractedData;
      try {
        // Try to parse as JSON first
        extractedData = JSON.parse(aiResponse.text);
      } catch (parseError) {
        // If JSON parsing fails, create a structured response
        extractedData = {
          summary: aiResponse.text,
          name: 'Extracted from AI response',
          email: 'Extracted from AI response',
          phone: 'Extracted from AI response',
          skills: 'Extracted from AI response',
          experience: 'Extracted from AI response'
        };
      }

      return res.status(200).json({
        success: true,
        analysis: {
          ...extractedData,
          aiProvider: aiConfig.provider,
          model: aiConfig.model,
          usage: aiResponse.usage
        }
      });

    } catch (error) {
      console.error('AI Analysis API error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'AI analysis failed'
      });
    }
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  });
} 