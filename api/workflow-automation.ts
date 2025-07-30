import { VercelRequest, VercelResponse } from '@vercel/node';

interface WorkflowRule {
  id: string;
  name: string;
  conditions: {
    field: string;
    operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in';
    value: any;
  }[];
  actions: {
    type: 'update_status' | 'send_email' | 'assign_reviewer' | 'create_task';
    params: Record<string, any>;
  }[];
  isActive: boolean;
}

interface AutomationResult {
  ruleId: string;
  ruleName: string;
  entityId: string;
  entityType: string;
  actionsExecuted: string[];
  success: boolean;
  error?: string;
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
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({
        success: false,
        error: 'Database not configured'
      });
    }

    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL);

    if (req.method === 'GET') {
      // Get workflow rules
      const rules = await sql`
        SELECT * FROM workflow_rules 
        WHERE is_active = true 
        ORDER BY created_at DESC
      `.catch(() => []);

      return res.status(200).json({
        success: true,
        data: rules
      });

    } else if (req.method === 'POST') {
      const { action, data } = req.body;

      if (action === 'create_rule') {
        const { name, conditions, actions } = data;
        
        const result = await sql`
          INSERT INTO workflow_rules (name, conditions, actions, is_active)
          VALUES (${name}, ${JSON.stringify(conditions)}, ${JSON.stringify(actions)}, true)
          RETURNING *
        `.catch(() => []);

        return res.status(200).json({
          success: true,
          data: result[0]
        });

      } else if (action === 'trigger_automation') {
        const { entityType, entityId } = data;
        
        // Get active rules
        const rules = await sql`
          SELECT * FROM workflow_rules 
          WHERE is_active = true
        `.catch(() => []);

        const results: AutomationResult[] = [];

        for (const rule of rules) {
          try {
            const ruleData = rule as any;
            const conditions = ruleData.conditions || [];
            const actions = ruleData.actions || [];

            // Check if entity matches conditions
            let matches = true;
            for (const condition of conditions) {
              const entityData = await getEntityData(entityType, entityId, condition.field);
              if (!evaluateCondition(entityData, condition)) {
                matches = false;
                break;
              }
            }

            if (matches) {
              // Execute actions
              const executedActions = [];
              for (const action of actions) {
                const success = await executeAction(action, entityType, entityId);
                if (success) {
                  executedActions.push(action.type);
                }
              }

              results.push({
                ruleId: ruleData.id,
                ruleName: ruleData.name,
                entityId,
                entityType,
                actionsExecuted: executedActions,
                success: executedActions.length > 0
              });
            }
          } catch (error) {
            results.push({
              ruleId: rule.id,
              ruleName: rule.name,
              entityId,
              entityType,
              actionsExecuted: [],
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }

        return res.status(200).json({
          success: true,
          data: results
        });
      }

      return res.status(400).json({
        success: false,
        error: 'Invalid action'
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });

  } catch (error) {
    console.error('Workflow automation error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}

// Helper functions
async function getEntityData(entityType: string, entityId: string, field: string): Promise<any> {
  const { neon } = await import('@neondatabase/serverless');
  const sql = neon(process.env.DATABASE_URL);

  if (entityType === 'candidate') {
    const [candidate] = await sql`
      SELECT * FROM candidates WHERE id = ${entityId}
    `.catch(() => []);
    return candidate?.[field];
  } else if (entityType === 'application') {
    const [application] = await sql`
      SELECT * FROM applications WHERE id = ${entityId}
    `.catch(() => []);
    return application?.[field];
  } else if (entityType === 'job') {
    const [job] = await sql`
      SELECT * FROM jobs WHERE id = ${entityId}
    `.catch(() => []);
    return job?.[field];
  }
  return null;
}

function evaluateCondition(value: any, condition: any): boolean {
  const { operator, conditionValue } = condition;
  
  switch (operator) {
    case 'equals':
      return value === conditionValue;
    case 'contains':
      return String(value).toLowerCase().includes(String(conditionValue).toLowerCase());
    case 'greater_than':
      return Number(value) > Number(conditionValue);
    case 'less_than':
      return Number(value) < Number(conditionValue);
    case 'in':
      return Array.isArray(conditionValue) && conditionValue.includes(value);
    default:
      return false;
  }
}

async function executeAction(action: any, entityType: string, entityId: string): Promise<boolean> {
  const { neon } = await import('@neondatabase/serverless');
  const sql = neon(process.env.DATABASE_URL);

  try {
    switch (action.type) {
      case 'update_status':
        if (entityType === 'application') {
          await sql`
            UPDATE applications 
            SET status = ${action.params.status}, updated_at = NOW()
            WHERE id = ${entityId}
          `;
        }
        break;

      case 'send_email':
        // Trigger email sending
        await fetch('/api/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            templateId: action.params.templateId,
            to: action.params.to,
            variables: action.params.variables
          })
        });
        break;

      case 'assign_reviewer':
        if (entityType === 'application') {
          await sql`
            UPDATE applications 
            SET assigned_to = ${action.params.reviewerId}, updated_at = NOW()
            WHERE id = ${entityId}
          `;
        }
        break;

      case 'create_task':
        await sql`
          INSERT INTO tasks (title, description, assigned_to, entity_type, entity_id, due_date)
          VALUES (${action.params.title}, ${action.params.description}, ${action.params.assignedTo}, ${entityType}, ${entityId}, ${action.params.dueDate})
        `;
        break;
    }
    return true;
  } catch (error) {
    console.error('Action execution error:', error);
    return false;
  }
} 