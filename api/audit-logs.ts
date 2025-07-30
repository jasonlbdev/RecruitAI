import { VercelRequest, VercelResponse } from '@vercel/node';

// Types for audit logging
interface AuditLogEntry {
  id?: number;
  entity_type: 'job' | 'candidate' | 'application' | 'system';
  entity_id: string;
  action: 'create' | 'update' | 'delete' | 'view' | 'export';
  user_id?: string;
  user_email?: string;
  changes?: any;
  metadata?: any;
  created_at?: string;
}

interface AuditLogQuery {
  entity_type?: string;
  entity_id?: string;
  action?: string;
  user_id?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

// Database functions
async function createAuditLog(entry: AuditLogEntry): Promise<AuditLogEntry | null> {
  try {
    if (!process.env.DATABASE_URL) {
      console.warn('No database URL configured for audit logging');
      return null;
    }
    
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL);
    
    const result = await sql`
      INSERT INTO audit_logs (entity_type, entity_id, action, user_id, user_email, changes, metadata)
      VALUES (${entry.entity_type}, ${entry.entity_id}, ${entry.action}, ${entry.user_id || null}, ${entry.user_email || null}, ${entry.changes ? JSON.stringify(entry.changes) : null}, ${entry.metadata ? JSON.stringify(entry.metadata) : null})
      RETURNING *
    `.catch((error) => {
      console.error('Failed to create audit log:', error);
      return [];
    });
    
    return result[0] as AuditLogEntry || null;
  } catch (error) {
    console.error('createAuditLog error:', error);
    return null;
  }
}

async function getAuditLogs(query: AuditLogQuery): Promise<{ logs: AuditLogEntry[]; total: number }> {
  try {
    if (!process.env.DATABASE_URL) {
      return { logs: [], total: 0 };
    }
    
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL);
    
    // Simple query without dynamic conditions for now
    const limit = query.limit || 50;
    const offset = query.offset || 0;
    
    // Get total count
    const countResult = await sql`
      SELECT COUNT(*) as total FROM audit_logs
    `.catch(() => [{ total: 0 }]);
    
    // Get logs with pagination
    const logsResult = await sql`
      SELECT * FROM audit_logs 
      ORDER BY created_at DESC 
      LIMIT ${limit} OFFSET ${offset}
    `.catch(() => []);
    
    return {
      logs: logsResult.map((log: any) => ({
        ...log,
        changes: log.changes ? JSON.parse(log.changes) : null,
        metadata: log.metadata ? JSON.parse(log.metadata) : null
      })) as AuditLogEntry[],
      total: parseInt(countResult[0]?.total || '0')
    };
  } catch (error) {
    console.error('getAuditLogs error:', error);
    return { logs: [], total: 0 };
  }
}

// Utility function to create audit log entry
export async function logAuditEvent(
  entity_type: AuditLogEntry['entity_type'],
  entity_id: string,
  action: AuditLogEntry['action'],
  user_id?: string,
  user_email?: string,
  changes?: any,
  metadata?: any
): Promise<void> {
  try {
    await createAuditLog({
      entity_type,
      entity_id,
      action,
      user_id,
      user_email,
      changes,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
        user_agent: metadata?.user_agent || 'unknown'
      }
    });
  } catch (error) {
    console.error('Failed to log audit event:', error);
    // Don't throw - audit logging should not break main functionality
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

  try {
    if (req.method === 'GET') {
      // Get audit logs with filtering and pagination
      const query: AuditLogQuery = {
        entity_type: req.query.entity_type as string,
        entity_id: req.query.entity_id as string,
        action: req.query.action as string,
        user_id: req.query.user_id as string,
        start_date: req.query.start_date as string,
        end_date: req.query.end_date as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0
      };

      const result = await getAuditLogs(query);

      return res.status(200).json({
        success: true,
        data: {
          logs: result.logs,
          pagination: {
            total: result.total,
            limit: query.limit || 50,
            offset: query.offset || 0,
            hasMore: (query.offset || 0) + (query.limit || 50) < result.total
          }
        }
      });

    } else if (req.method === 'POST') {
      // Create new audit log entry
      const { entity_type, entity_id, action, user_id, user_email, changes, metadata } = req.body;

      // Validation
      if (!entity_type || !entity_id || !action) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: entity_type, entity_id, action'
        });
      }

      if (!['job', 'candidate', 'application', 'system'].includes(entity_type)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid entity_type. Must be one of: job, candidate, application, system'
        });
      }

      if (!['create', 'update', 'delete', 'view', 'export'].includes(action)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid action. Must be one of: create, update, delete, view, export'
        });
      }

      const auditLog = await createAuditLog({
        entity_type,
        entity_id,
        action,
        user_id,
        user_email,
        changes,
        metadata: {
          ...metadata,
          ip_address: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
          user_agent: req.headers['user-agent']
        }
      });

      if (!auditLog) {
        return res.status(500).json({
          success: false,
          error: 'Failed to create audit log entry'
        });
      }

      return res.status(201).json({
        success: true,
        data: auditLog
      });

    } else {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed'
      });
    }

  } catch (error) {
    console.error('Audit logs API error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
} 