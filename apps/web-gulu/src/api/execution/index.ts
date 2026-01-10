import { requestClient } from '#/api/request';
import type { PageResult } from '#/api/types';

// 执行模式
export type ExecutionMode = 'debug' | 'execute';

// 执行状态
export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'stopped' | 'timeout';

export interface Execution {
  id: number;
  created_at?: string;
  updated_at?: string;
  project_id: number;
  workflow_id: number;
  env_id: number;
  executor_id?: number;
  execution_id: string;
  mode?: ExecutionMode;
  status: ExecutionStatus;
  start_time?: string;
  end_time?: string;
  duration?: number;
  total_steps?: number;
  success_steps?: number;
  failed_steps?: number;
  result?: string;
  logs?: string;
  created_by?: number;
}

export interface CreateExecutionParams {
  workflow_id: number;
  env_id: number;
  executor_id?: number;
  mode?: ExecutionMode;
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
