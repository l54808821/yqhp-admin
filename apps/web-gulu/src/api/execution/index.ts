import { requestClient } from '#/api/request';
import type { PageResult } from '#/api/types';

export interface Execution {
  id: number;
  project_id: number;
  workflow_id: number;
  workflow_name?: string;
  env_id: number;
  env_name?: string;
  executor_id?: number;
  executor_name?: string;
  execution_id: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'stopped' | 'paused';
  total_steps?: number;
  completed_steps?: number;
  started_at?: string;
  finished_at?: string;
  duration?: number;
  result?: string;
  logs?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: number;
}

export interface CreateExecutionParams {
  workflow_id: number;
  env_id: number;
  executor_id: number;
}

export interface ExecutionListParams {
  page?: number;
  pageSize?: number;
  project_id?: number;
  workflow_id?: number;
  env_id?: number;
  status?: string;
}

export interface ExecutionLog {
  timestamp: string;
  level: string;
  message: string;
  step_id?: string;
}

/**
 * 创建执行
 */
export async function createExecutionApi(params: CreateExecutionParams) {
  return requestClient.post<Execution>('/executions', params);
}

/**
 * 获取执行记录列表
 */
export async function getExecutionListApi(params?: ExecutionListParams) {
  return requestClient.get<PageResult<Execution>>('/executions', { params });
}

/**
 * 获取执行详情
 */
export async function getExecutionApi(id: number) {
  return requestClient.get<Execution>(`/executions/${id}`);
}

/**
 * 获取执行日志
 */
export async function getExecutionLogsApi(id: number) {
  return requestClient.get<ExecutionLog[]>(`/executions/${id}/logs`);
}

/**
 * 停止执行
 */
export async function stopExecutionApi(id: number) {
  return requestClient.post(`/executions/${id}/stop`);
}

/**
 * 删除执行记录
 */
export async function deleteExecutionApi(id: number) {
  return requestClient.delete(`/executions/${id}`);
}

/**
 * 暂停执行
 */
export async function pauseExecutionApi(id: number) {
  return requestClient.post(`/executions/${id}/pause`);
}

/**
 * 恢复执行
 */
export async function resumeExecutionApi(id: number) {
  return requestClient.post(`/executions/${id}/resume`);
}
