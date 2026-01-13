import { Edge, Node } from 'reactflow';

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  triggerType: 'MANUAL' | 'RECORD_CREATED' | 'RECORD_UPDATED';
  nodes: Node[];
  edges: Edge[];
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'tpl-audit-log',
    name: 'Simple Audit Trail',
    description:
      'Automatically log triggered events to an Audit Logs table when a record is updated.',
    triggerType: 'RECORD_UPDATED',
    nodes: [
      {
        id: 'trigger',
        type: 'trigger',
        position: { x: 250, y: 0 },
        data: { label: 'Record Updated' },
      },
      {
        id: 'act-log',
        type: 'action',
        position: { x: 250, y: 200 },
        data: {
          label: 'Create Audit Entry',
          actionType: 'CREATE',
          tableName: 'audit_logs',
          fields: [
            { key: 'event', value: 'Record Updated' },
            { key: 'details', value: 'Record {{trigger.id}} was updated.' },
          ],
        },
      },
    ],
    edges: [{ id: 'e1', source: 'trigger', target: 'act-log' }],
  },
  {
    id: 'tpl-onboarding',
    name: 'User Onboarding',
    description:
      'When a new User is created, automatically create a User Profile and log a welcome message.',
    triggerType: 'RECORD_CREATED',
    nodes: [
      {
        id: 'trigger',
        type: 'trigger',
        position: { x: 250, y: 0 },
        data: { label: 'User Created' },
      },
      {
        id: 'act-profile',
        type: 'action',
        position: { x: 150, y: 200 },
        data: {
          label: 'Create Profile',
          actionType: 'CREATE',
          tableName: 'user_profiles',
          fields: [{ key: 'user_id', value: '{{trigger.id}}' }],
        },
      },
      {
        id: 'act-log',
        type: 'action_log',
        position: { x: 350, y: 200 },
        data: { label: 'Log Welcome', message: 'Welcome email sent to {{trigger.email}}' },
      },
    ],
    edges: [
      { id: 'e1', source: 'trigger', target: 'act-profile' },
      { id: 'e2', source: 'trigger', target: 'act-log' },
    ],
  },
  {
    id: 'tpl-status-alert',
    name: 'Status Change Alert',
    description: 'Check if a record status changes to "Critical" and log an urgent alert.',
    triggerType: 'RECORD_UPDATED',
    nodes: [
      {
        id: 'trigger',
        type: 'trigger',
        position: { x: 250, y: 0 },
        data: { label: 'Record Updated' },
      },
      {
        id: 'cond-critical',
        type: 'condition',
        position: { x: 250, y: 150 },
        data: {
          label: 'Is Critical?',
          conditions: [{ field: 'status', operator: 'equals', value: 'Critical' }],
        },
      },
      {
        id: 'act-alert',
        type: 'action_log',
        position: { x: 250, y: 300 },
        data: { label: 'Log Alert', message: 'CRITICAL ALERT: Record {{trigger.id}} is critical!' },
      },
    ],
    edges: [
      { id: 'e1', source: 'trigger', target: 'cond-critical' },
      { id: 'e2', source: 'cond-critical', sourceHandle: 'true', target: 'act-alert' },
    ],
  },
  {
    id: 'tpl-auto-categorize',
    name: 'Auto-Categorization',
    description: 'If a new record has no category, automatically assign it to "Uncategorized".',
    triggerType: 'RECORD_CREATED',
    nodes: [
      {
        id: 'trigger',
        type: 'trigger',
        position: { x: 250, y: 0 },
        data: { label: 'Record Created' },
      },
      {
        id: 'cond-missing',
        type: 'condition',
        position: { x: 250, y: 150 },
        data: {
          label: 'Category Missing?',
          conditions: [{ field: 'category', operator: 'equals', value: '' }],
        },
      },
      {
        id: 'act-update',
        type: 'action',
        position: { x: 250, y: 300 },
        data: {
          label: 'Set Uncategorized',
          actionType: 'UPDATE',
          queryField: 'id',
          queryValue: '{{trigger.id}}',
          fields: [{ key: 'category', value: 'Uncategorized' }],
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'trigger', target: 'cond-missing' },
      { id: 'e2', source: 'cond-missing', sourceHandle: 'true', target: 'act-update' },
    ],
  },
  {
    id: 'tpl-geofence',
    name: 'Geofence Entry Logic',
    description: 'Check if a GPS coordinate is within a predefined "Warehouses" polygon table.',
    triggerType: 'RECORD_UPDATED',
    nodes: [
      { id: 'trigger', type: 'trigger', position: { x: 250, y: 0 }, data: { label: 'GPS Update' } },
      {
        id: 'cond-geo',
        type: 'condition',
        position: { x: 250, y: 150 },
        data: {
          label: 'Inside Warehouse?',
          conditions: [{ field: 'location', operator: 'geo_within', value: 'warehouses' }],
        },
      },
      {
        id: 'act-log',
        type: 'action_log',
        position: { x: 250, y: 300 },
        data: { label: 'Log Entry', message: 'Vehicle {{trigger.vehicle_id}} entered warehouse.' },
      },
    ],
    edges: [
      { id: 'e1', source: 'trigger', target: 'cond-geo' },
      { id: 'e2', source: 'cond-geo', sourceHandle: 'true', target: 'act-log' },
    ],
  },
  {
    id: 'tpl-data-replication',
    name: 'Data Replication',
    description: 'When a record is created in the main table, create a copy in a Backup table.',
    triggerType: 'RECORD_CREATED',
    nodes: [
      {
        id: 'trigger',
        type: 'trigger',
        position: { x: 250, y: 0 },
        data: { label: 'Main Record Created' },
      },
      {
        id: 'act-backup',
        type: 'action',
        position: { x: 250, y: 200 },
        data: {
          label: 'Create Backup',
          actionType: 'CREATE',
          tableName: 'backup_table',
          fields: [
            { key: 'original_id', value: '{{trigger.id}}' },
            { key: 'data_snapshot', value: '{{trigger}}' },
          ],
        },
      },
    ],
    edges: [{ id: 'e1', source: 'trigger', target: 'act-backup' }],
  },
  {
    id: 'tpl-high-value',
    name: 'High Value Approval',
    description:
      'If an amount exceeds 1000, mark status as "Pending Approval" instead of "Approved".',
    triggerType: 'RECORD_CREATED',
    nodes: [
      {
        id: 'trigger',
        type: 'trigger',
        position: { x: 250, y: 0 },
        data: { label: 'Order Created' },
      },
      {
        id: 'cond-amount',
        type: 'condition',
        position: { x: 250, y: 150 },
        data: {
          label: 'Amount > 1000?',
          conditions: [{ field: 'amount', operator: 'gt', value: '1000' }],
        },
      },
      {
        id: 'act-pending',
        type: 'action',
        position: { x: 100, y: 300 },
        data: {
          label: 'Set Pending',
          actionType: 'UPDATE',
          queryField: 'id',
          queryValue: '{{trigger.id}}',
          fields: [{ key: 'status', value: 'Pending Approval' }],
        },
      },
      {
        id: 'act-approve',
        type: 'action',
        position: { x: 400, y: 300 },
        data: {
          label: 'Auto Approve',
          actionType: 'UPDATE',
          queryField: 'id',
          queryValue: '{{trigger.id}}',
          fields: [{ key: 'status', value: 'Approved' }],
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'trigger', target: 'cond-amount' },
      { id: 'e2', source: 'cond-amount', sourceHandle: 'true', target: 'act-pending' },
      { id: 'e3', source: 'cond-amount', sourceHandle: 'false', target: 'act-approve' },
    ],
  },
  {
    id: 'tpl-escalation',
    name: 'Ticket Escalation',
    description: 'If a ticket priority is set to "High", automatically assign it to the "Manager".',
    triggerType: 'RECORD_UPDATED',
    nodes: [
      {
        id: 'trigger',
        type: 'trigger',
        position: { x: 250, y: 0 },
        data: { label: 'Ticket Updated' },
      },
      {
        id: 'cond-high',
        type: 'condition',
        position: { x: 250, y: 150 },
        data: {
          label: 'Is High Priority?',
          conditions: [{ field: 'priority', operator: 'equals', value: 'High' }],
        },
      },
      {
        id: 'act-assign',
        type: 'action',
        position: { x: 250, y: 300 },
        data: {
          label: 'Assign to Manager',
          actionType: 'UPDATE',
          queryField: 'id',
          queryValue: '{{trigger.id}}',
          fields: [{ key: 'assignee', value: 'Manager' }],
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'trigger', target: 'cond-high' },
      { id: 'e2', source: 'cond-high', sourceHandle: 'true', target: 'act-assign' },
    ],
  },
  {
    id: 'tpl-validation',
    name: 'Strict Validation',
    description: 'If a mandatory email field is missing or invalid, delete the record immediately.',
    triggerType: 'RECORD_CREATED',
    nodes: [
      {
        id: 'trigger',
        type: 'trigger',
        position: { x: 250, y: 0 },
        data: { label: 'User Created' },
      },
      {
        id: 'cond-email',
        type: 'condition',
        position: { x: 250, y: 150 },
        data: {
          label: 'Has Email?',
          conditions: [{ field: 'email', operator: 'not_equals', value: '' }],
        },
      },
      {
        id: 'act-delete',
        type: 'action',
        position: { x: 400, y: 300 },
        data: {
          label: 'Delete Invalid',
          actionType: 'DELETE',
          queryField: 'id',
          queryValue: '{{trigger.id}}',
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'trigger', target: 'cond-email' },
      { id: 'e2', source: 'cond-email', sourceHandle: 'false', target: 'act-delete' },
    ],
  },
  {
    id: 'tpl-webhook',
    name: 'Webhook Simulation',
    description: 'Simulate a webhook by logging the entire record payload for external processing.',
    triggerType: 'RECORD_CREATED',
    nodes: [
      {
        id: 'trigger',
        type: 'trigger',
        position: { x: 250, y: 0 },
        data: { label: 'Event Triggered' },
      },
      {
        id: 'act-webhook',
        type: 'action_log',
        position: { x: 250, y: 200 },
        data: {
          label: 'Send Webhook',
          message: 'POST /webhook PAYLOAD: {{trigger}}',
        },
      },
    ],
    edges: [{ id: 'e1', source: 'trigger', target: 'act-webhook' }],
  },
];
