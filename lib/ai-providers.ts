import { generateText } from 'ai';

export type AIProvider = 'openai' | 'xai';

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

export interface AIResponse {
  text: string;
  usage?: {
    totalTokens: number;
    promptTokens: number;
    completionTokens: number;
  };
}

/**
 * Universal AI text generation that works with both OpenAI and xAI
 */
export async function generateAIText(
  prompt: string,
  config: AIConfig
): Promise<AIResponse> {
  try {
    let result;
    
    if (config.provider === 'openai') {
      // Use OpenAI with manual API call
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: config.model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: config.maxTokens,
          temperature: config.temperature,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      return {
        text: data.choices[0]?.message?.content || '',
        usage: data.usage ? {
          totalTokens: data.usage.total_tokens,
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
        } : undefined,
      };
      
    } else if (config.provider === 'xai') {
      // Use xAI with manual API call
      const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: config.model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: config.maxTokens,
          temperature: config.temperature,
        }),
      });

      if (!response.ok) {
        throw new Error(`xAI API error: ${response.status}`);
      }

      const data = await response.json();
      return {
        text: data.choices[0]?.message?.content || '',
        usage: data.usage ? {
          totalTokens: data.usage.total_tokens,
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
        } : undefined,
      };
    } else {
      throw new Error(`Unsupported AI provider: ${config.provider}`);
    }
  } catch (error: any) {
    console.error(`AI Provider Error (${config.provider}):`, error);
    throw new Error(`Failed to generate text with ${config.provider}: ${error.message}`);
  }
}

/**
 * Get AI configuration from database settings
 */
export async function getAIConfig(db: any): Promise<AIConfig> {
  // Get current AI provider preference
  const providerSetting = db.system_settings.find((s: any) => s.key === 'ai_provider');
  const provider = (providerSetting?.value || 'openai') as AIProvider;
  
  // Get provider-specific settings
  const apiKeySetting = db.system_settings.find((s: any) => 
    s.key === (provider === 'openai' ? 'openai_api_key' : 'xai_api_key')
  );
  const modelSetting = db.system_settings.find((s: any) => 
    s.key === (provider === 'openai' ? 'openai_model' : 'xai_model')
  );
  const maxTokensSetting = db.system_settings.find((s: any) => s.key === 'max_tokens');
  const temperatureSetting = db.system_settings.find((s: any) => s.key === 'temperature');

  if (!apiKeySetting?.value) {
    throw new Error(`${provider.toUpperCase()} API key not configured`);
  }

  return {
    provider,
    apiKey: apiKeySetting.value,
    model: modelSetting?.value || (provider === 'openai' ? 'gpt-4o' : 'grok-3-mini'),
    maxTokens: parseInt(maxTokensSetting?.value || '1500'),
    temperature: parseFloat(temperatureSetting?.value || '0.7'),
  };
}

/**
 * Available models for each provider
 */
export const AVAILABLE_MODELS = {
  openai: [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4-turbo',
    'gpt-4',
    'gpt-3.5-turbo'
  ],
  xai: [
    'grok-3-mini',
    'grok-3-mini-fast',
    'grok-3',
    'grok-3-fast',
    'grok-2-1212',
    'grok-2-vision-1212',
    'grok-beta'
  ]
};

/**
 * Test AI provider connectivity
 */
export async function testAIProvider(config: AIConfig): Promise<boolean> {
  try {
    const testResult = await generateAIText(
      'Hello, this is a test message. Please respond with "Test successful".',
      { ...config, maxTokens: 20 }
    );
    
    return testResult.text.toLowerCase().includes('test successful') || 
           testResult.text.length > 0;
  } catch (error) {
    console.error(`AI Provider Test Failed (${config.provider}):`, error);
    return false;
  }
} 