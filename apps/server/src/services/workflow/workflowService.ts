/**
 * Workflow Service
 * CRUD operations for workflows
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export type CreateWorkflowDTO = {
  name: string;
  description?: string;
  triggerType: 'RECORD_CREATED' | 'RECORD_UPDATED' | 'MANUAL';
  tableId?: string;
  nodes: any;
  edges: any;
  createdBy: string;
};

export async function createWorkflow(data: CreateWorkflowDTO) {
  return prisma.workflow.create({
    data: {
      name: data.name,
      description: data.description,
      triggerType: data.triggerType,
      tableId: data.tableId,
      nodes: data.nodes,
      edges: data.edges,
      createdBy: data.createdBy,
      isActive: false, // Default to inactive
    },
  });
}

export async function updateWorkflow(
  id: string,
  data: Partial<CreateWorkflowDTO> & { isActive?: boolean }
) {
  return prisma.workflow.update({
    where: { id },
    data,
  });
}

export async function getWorkflows() {
  return prisma.workflow.findMany({
    orderBy: { updatedAt: 'desc' },
    include: { table: { select: { name: true, displayName: true } } },
  });
}

export async function getWorkflowById(id: string) {
  return prisma.workflow.findUnique({
    where: { id },
    include: { table: true },
  });
}

export async function deleteWorkflow(id: string) {
  return prisma.workflow.delete({
    where: { id },
  });
}

export async function getActiveWorkflows(triggerType: string, tableId?: string) {
  return prisma.workflow.findMany({
    where: {
      isActive: true,
      triggerType,
      ...(tableId ? { tableId } : {}),
    },
  });
}

export async function logExecution(
  workflowId: string,
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED',
  logs: any
) {
  return prisma.workflowExecution.create({
    data: {
      workflowId,
      status,
      logs,
    },
  });
}
