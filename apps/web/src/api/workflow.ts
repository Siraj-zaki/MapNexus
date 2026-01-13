import apiClient from '@/lib/api';

const API_URL = '/workflows';

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  triggerType: 'RECORD_CREATED' | 'RECORD_UPDATED' | 'MANUAL';
  tableId?: string;
  isActive: boolean;
  nodes: any;
  edges: any;
  createdAt: string;
  updatedAt: string;
}

export async function getWorkflows(): Promise<Workflow[]> {
  const response = await apiClient.get(API_URL);
  return response.data;
}

export async function getWorkflowById(id: string): Promise<Workflow> {
  const response = await apiClient.get(`${API_URL}/${id}`);
  return response.data;
}

export async function createWorkflow(data: Partial<Workflow>): Promise<Workflow> {
  const response = await apiClient.post(API_URL, data);
  return response.data;
}

export async function updateWorkflow(id: string, data: Partial<Workflow>): Promise<Workflow> {
  const response = await apiClient.put(`${API_URL}/${id}`, data);
  return response.data;
}

export async function deleteWorkflow(id: string): Promise<void> {
  await apiClient.delete(`${API_URL}/${id}`);
}
