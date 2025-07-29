import { VercelRequest, VercelResponse } from '@vercel/node';
import { getMemoryDB } from './init-db';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      const db = getMemoryDB();
      let auditLogs = db.audit_log || [];
      
      // Filter by entity type
      if (req.query.entityType) {
        auditLogs = auditLogs.filter((log: any) => log.entityType === req.query.entityType);
      }
      
      // Filter by entity ID
      if (req.query.entityId) {
        auditLogs = auditLogs.filter((log: any) => log.entityId === req.query.entityId);
      }
      
      // Sort by timestamp (newest first)
      auditLogs.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      return res.status(200).json({
        success: true,
        data: auditLogs
      });
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch audit logs'
      });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
} 