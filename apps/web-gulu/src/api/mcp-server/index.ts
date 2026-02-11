import { requestClient } from '#/api/request';
import type { PageResult } from '#/api/types';

export interface McpServer {
  id: number;
  name: string;
  description: string;
  transport: 'stdio' | 'sse';
  command: string;
  args: string[];
  url: string;
  env: Record<string, string>;
  timeout: number;
  sort: number;
  status: number;
  created_at?: string;
  updated_at?: string;
}

export interface McpServerListParams {
  page?: number;
  pageSize?: number;
  name?: string;
  transport?: string;
  status?: number;
}

export interface CreateMcpServerParams {
  name: string;
  description?: string;
  transport: 'stdio' | 'sse';
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
  timeout?: number;
  sort?: number;
  status?: number;
}

export interface UpdateMcpServerParams {
  name?: string;
  description?: string;
  transport?: 'stdio' | 'sse';
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
  timeout?: number;
  sort?: number;
  status?: number;
}

export async function getMcpServerListApi(params?: McpServerListParams) {
  return requestClient.get<PageResult<McpServer>>('/mcp-servers', { params });
}

export async function getMcpServerApi(id: number) {
  return requestClient.get<McpServer>(`/mcp-servers/${id}`);
}

export async function createMcpServerApi(params: CreateMcpServerParams) {
  return requestClient.post<McpServer>('/mcp-servers', params);
}

export async function updateMcpServerApi(id: number, params: UpdateMcpServerParams) {
  return requestClient.put(`/mcp-servers/${id}`, params);
}

export async function deleteMcpServerApi(id: number) {
  return requestClient.delete(`/mcp-servers/${id}`);
}

export async function updateMcpServerStatusApi(id: number, status: number) {
  return requestClient.put(`/mcp-servers/${id}/status`, { status });
}
