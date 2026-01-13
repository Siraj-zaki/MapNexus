/**
 * Workflow Engine
 * Executes the flow logic
 */

import { PrismaClient } from '@prisma/client';
import { getActiveWorkflows } from './workflowService.js';

const prisma = new PrismaClient();

type FlowContext = {
  triggerData: any; // Record that triggered the flow
  tableId?: string; // Table ID
  userId?: string; // User who triggered it
  variables: Record<string, any>; // Runtime variables
};

export async function triggerWorkflows(
  triggerType: 'RECORD_CREATED' | 'RECORD_UPDATED',
  tableId: string,
  data: any,
  userId?: string
) {
  const workflows = await getActiveWorkflows(triggerType, tableId);

  if (workflows.length === 0) return;

  console.log(
    `[WorkflowEngine] Found ${workflows.length} workflows for ${triggerType} on table ${tableId}`
  );

  for (const workflow of workflows) {
    executeWorkflow(workflow.id, {
      triggerData: data,
      tableId,
      userId,
      variables: {
        ...data, // Flattened for backward compat or simple access
        trigger: data, // Explicit 'trigger' namespace
      },
    }).catch((err) => console.error(`Failed to execute workflow ${workflow.id}`, err));
  }
}

async function executeWorkflow(workflowId: string, context: FlowContext) {
  // 1. Fetch full workflow
  const workflow = await prisma.workflow.findUnique({ where: { id: workflowId } });
  if (!workflow) return;

  const executionLog: any[] = [];
  let status: 'COMPLETED' | 'FAILED' = 'COMPLETED';

  executionLog.push({ timestamp: new Date(), message: 'Workflow started', context });

  try {
    const nodes = workflow.nodes as any[];
    const edges = workflow.edges as any[];

    // 2. Find Start Node (Trigger or First Node)
    // We look for nodes that act as "Trigger" or have no incoming edges
    let startNode = nodes.find((n: any) => n.type === 'trigger');
    if (!startNode) {
      // Fallback: Find node with no incoming edges
      const targetIds = new Set(edges.map((e: any) => e.target));
      startNode = nodes.find((n: any) => !targetIds.has(n.id));
    }

    if (!startNode) {
      throw new Error('No start node found for workflow');
    }

    // 3. Queue for traversal
    const queue = [startNode];
    const visited = new Set();
    // Prevent infinite loops but simpler than full cycle detection

    while (queue.length > 0) {
      const currentNode = queue.shift();
      if (!currentNode) continue;

      // Allow visiting same node multiple times if from different paths?
      // For now, strict DAG assumption helps prevent loops.
      if (visited.has(currentNode.id)) continue;
      visited.add(currentNode.id);

      executionLog.push({
        timestamp: new Date(),
        message: `Executing node ${currentNode.type} (${currentNode.id})`,
      });

      // Execute Node Logic
      let result: any = null;
      try {
        result = await processNode(currentNode, context, executionLog);
      } catch (err: any) {
        status = 'FAILED';
        executionLog.push({
          timestamp: new Date(),
          message: `Error at node ${currentNode.id}`,
          error: err.message,
        });
        break;
      }

      // Determine next nodes
      // If result is boolean (Condition), we check sourceHandle
      const outgoingEdges = edges.filter((e: any) => e.source === currentNode.id);

      if (currentNode.type === 'condition') {
        // Condition Node: result is true/false (matched)
        const targetHandle = result ? 'true' : 'false';
        const validEdges = outgoingEdges.filter((e: any) => e.sourceHandle === targetHandle);

        for (const edge of validEdges) {
          const targetNode = nodes.find((n: any) => n.id === edge.target);
          if (targetNode) queue.push(targetNode);
        }
      } else {
        // Standard Node: Follow all edges
        for (const edge of outgoingEdges) {
          const targetNode = nodes.find((n: any) => n.id === edge.target);
          if (targetNode) queue.push(targetNode);
        }
      }
    }
  } catch (error: any) {
    status = 'FAILED';
    executionLog.push({ timestamp: new Date(), message: 'Workflow failed', error: error.message });
  } finally {
    const completedAt = new Date();
    executionLog.push({ timestamp: completedAt, message: `Workflow ${status}` });

    await prisma.workflowExecution.create({
      data: {
        workflowId,
        status,
        logs: executionLog,
        completedAt,
      },
    });
  }
}

// Helper: Substitute Variables
function resolveTemplate(text: string, variables: any): string {
  if (!text || typeof text !== 'string') return text;
  return text.replace(/{{([\w.]+)}}/g, (match, key) => {
    // Handle trigger.field or just field
    const parts = key.split('.');
    let val = variables;
    for (const part of parts) {
      val = val ? val[part] : undefined;
    }
    return val !== undefined ? val : match;
  });
}

// Helper: Resolve Object Values
function resolveObject(obj: any, variables: any): any {
  if (typeof obj === 'string') return resolveTemplate(obj, variables);
  if (Array.isArray(obj)) return obj.map((v) => resolveObject(v, variables));
  if (typeof obj === 'object' && obj !== null) {
    const result: any = {};
    for (const k in obj) {
      result[k] = resolveObject(obj[k], variables);
    }
    return result;
  }
  return obj;
}

async function processNode(node: any, context: FlowContext, logs: any[]): Promise<any> {
  const { type, data } = node;
  const variables = context.variables;

  // Dynamic import services
  const customDataService = await import('../customTable/customDataService.js');

  switch (type) {
    case 'trigger':
      return true;

    case 'condition':
      // Support both legacy single condition and new multi-condition
      const conditions = data.conditions || [
        { field: data.field, operator: data.operator || 'equals', value: data.value },
      ];
      const logic = data.logic || 'AND';

      const results = await Promise.all(
        conditions.map(async (cond: any) => {
          const field = cond.field;
          const operator = cond.operator || 'equals';
          const targetValue = resolveTemplate(cond.value, variables);

          // Resolve actual value
          let actualValue = variables[field];
          if (field && field.includes('.')) {
            actualValue = resolveTemplate(`{{${field}}}`, variables);
          } else if (variables.trigger && variables.trigger[field] !== undefined) {
            actualValue = variables.trigger[field];
          }

          // Spatial Query Check
          if (operator === 'geo_within') {
            // Target Value is assumed to be a Table Name (e.g. 'warehouses')
            // Actual Value is assumed to be a GeoJSON Point (from trigger)
            const geometry =
              typeof actualValue === 'string' ? JSON.parse(actualValue) : actualValue;

            if (!geometry || !geometry.coordinates) {
              logs.push({ message: `Condition Spatial: Invalid Geometry in ${field}` });
              return false;
            }

            // We query the target table to see if this point is within ANY feature
            // This acts as a "Geofence Check"
            try {
              const matches = await customDataService.spatialQuery(
                targetValue, // Table Name
                'boundary', // Geometry Column Name
                'intersects', // Query Type: Point intersects Polygon
                { geometry: geometry } // Params
              );
              const isWithin = matches.length > 0;
              logs.push({
                message: `Condition Spatial: Point matches ${targetValue}? => ${isWithin} (${matches.length} matches)`,
              });
              return isWithin;
            } catch (e: any) {
              logs.push({ message: `Condition Spatial Error: ${e.message}` });
              return false;
            }
          }

          // Standard Comparison
          let matched = false;
          const numActual = Number(actualValue);
          const numTarget = Number(targetValue);
          const isNum = !isNaN(numActual) && !isNaN(numTarget);

          if (operator === 'equals') matched = actualValue == targetValue;
          else if (operator === 'not_equals') matched = actualValue != targetValue;
          else if (operator === 'contains')
            matched = String(actualValue).includes(String(targetValue));
          else if (operator === 'gt')
            matched = isNum ? numActual > numTarget : actualValue > targetValue;
          else if (operator === 'lt')
            matched = isNum ? numActual < numTarget : actualValue < targetValue;

          logs.push({
            message: `Condition: ${field} (${actualValue}) ${operator} ${targetValue} => ${matched}`,
          });
          return matched;
        })
      );

      // Aggregate Results
      if (logic === 'OR') {
        return results.some((r) => r);
      } else {
        return results.every((r) => r);
      }

    case 'action':
      // Custom Action Node: CREATE, UPDATE, DELETE
      const actionType = data.actionType || 'CREATE';
      const tableName = data.tableName;

      if (!tableName) throw new Error('Action Node missing tableName');

      if (actionType === 'CREATE') {
        const fields = data.fields || []; // [{ key, value }]
        const payload: any = {};
        fields.forEach((f: any) => {
          if (f.key) payload[f.key] = resolveTemplate(f.value, variables);
        });

        logs.push({ message: `Creating record in ${tableName}`, payload });
        await customDataService.insertData(tableName, payload, context.userId || 'SYSTEM');
      } else if (actionType === 'UPDATE' || actionType === 'DELETE') {
        // 1. Build Query to find records
        const qField = data.queryField;
        const qOp = data.queryOperator || 'equals';
        const qValue = resolveTemplate(data.queryValue, variables);

        if (!qField) throw new Error('Update/Delete action requires queryField');

        logs.push({ message: `Querying ${tableName} where ${qField} ${qOp} ${qValue}` });

        const { data: records } = await customDataService.queryData(tableName, {
          filters: {
            [qField]: { op: qOp, value: qValue },
          },
          limit: 100, // Safety limit
        });

        logs.push({ message: `Found ${records.length} records` });

        if (actionType === 'DELETE') {
          for (const rec of records) {
            await customDataService.deleteData(tableName, rec.id, context.userId || 'SYSTEM');
            logs.push({ message: `Deleted record ${rec.id}` });
          }
        } else {
          // UPDATE
          const fields = data.fields || [];
          const updatePayload: any = {};
          fields.forEach((f: any) => {
            if (f.key) updatePayload[f.key] = resolveTemplate(f.value, variables);
          });

          for (const rec of records) {
            await customDataService.updateData(
              tableName,
              rec.id,
              updatePayload,
              context.userId || 'SYSTEM'
            );
            logs.push({ message: `Updated record ${rec.id}`, payload: updatePayload });
          }
        }
      }
      return true;

    case 'action_create_record':
      // Legacy support
      if (data.tableId && data.payload) {
        const payloadStr = resolveTemplate(data.payload, variables);
        const payload = JSON.parse(payloadStr);
        await customDataService.insertData(data.tableId, payload, context.userId || 'SYSTEM');
      }
      return true;

    case 'action_log':
      const msg = resolveTemplate(data.message, variables);
      console.log('WORKFLOW LOG:', msg);
      logs.push({ message: 'Log', log: msg });
      return true;

    default:
      return true;
  }
}
