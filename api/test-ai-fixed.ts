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

async function testAIProvider(config: AIConfig): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    if (!config.apiKey) {
      return {
        success: false,
        error: `No API key configured for ${config.provider}`
      };
    }

    const testPrompt = 'Hello, this is a test message. Please respond with "AI connection successful" if you can read this.';

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
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: testPrompt }
          ],
          max_tokens: 50,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        return {
          success: false,
          error: `OpenAI API error: ${response.status} - ${response.statusText}`
        };
      }

      const data = await response.json();
      return {
        success: true,
        data: {
          provider: 'openai',
          model: config.model,
          response: data.choices[0]?.message?.content || 'No response',
          usage: data.usage
        }
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
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: testPrompt }
          ],
          max_tokens: 50,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        return {
          success: false,
          error: `xAI API error: ${response.status} - ${response.statusText}`
        };
      }

      const data = await response.json();
      return {
        success: true,
        data: {
          provider: 'xai',
          model: config.model,
          response: data.choices[0]?.message?.content || 'No response',
          usage: data.usage
        }
      };
    }

    return {
      success: false,
      error: 'Unsupported AI provider'
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
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
      const aiConfig = await getAIConfig();
      const testResult = await testAIProvider(aiConfig);

      return res.status(testResult.success ? 200 : 400).json({
        success: testResult.success,
        error: testResult.error,
        data: testResult.data
      });

    } catch (error) {
      console.error('Test AI API error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to test AI connection'
      });
    }
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  });
} 