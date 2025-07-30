import { VercelRequest, VercelResponse } from '@vercel/node';
import { getMemoryDB } from './init-db';
import { testAIProvider, getAIConfig } from '../lib/ai-providers';

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
    const db = await getMemoryDB();
    const aiConfig = await getAIConfig(db);
    
    const isWorking = await testAIProvider(aiConfig);
    
    return res.status(200).json({
      success: true,
      data: {
        provider: aiConfig.provider,
        model: aiConfig.model,
        isWorking,
        message: isWorking 
          ? `${aiConfig.provider.toUpperCase()} connection successful!` 
          : `${aiConfig.provider.toUpperCase()} connection failed. Please check your API key.`
      }
    });

  } catch (error: any) {
    console.error('AI test error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to test AI provider'
    });
  }
} 