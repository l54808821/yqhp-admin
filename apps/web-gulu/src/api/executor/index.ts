import { requestClient } from '#/api/request';
import type { PageResult } from '#/api/types';

export interface Executor {
  id: number;
  slave_id: string;
  name: string;
  type: 'performance' | 'normal' | 'debug';
  description?: string;
  labels?: Record<string, string>;
  max_vus?: number;
  priority?: number;
  status: number;
  // 运行时状态
  address?: string;
  capabilities?: string[];
  state?: string;
  load?: number;
  active_tasks?: number;
  current_vus?: number;
  last_seen?: string;
  is_online?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateExecutorParams {
  slave_id: string;
  name: string;
  type: string;
  description?: string;
  labels?: Record<string, string>;
  max_vus?: number;
  priority?: number;
  status?: number;
}

export interface UpdateExecutorParams {
  name?: string;
  type?: string;
  description?: string;
  labels?: Record<string, string>;
  max_vus?: number;
  priority?: number;
  status?: number;
}

export interface ExecutorListParams {
  page?: number;
  pageSize?: number;
  name?: string;
  type?: string;
  status?: number;
}

/**
 * 创建执行机
 */
export async function createExecutorApi(params: CreateExecutorParams) {
  return requestClient.post<Executor>('/executors', params);
}

/**
 * 获取执行机列表
 */
export async function getExecutorListApi(params?: ExecutorListParams) {
  return requestClient.get<PageResult<Executor>>('/executors', { params });
}

/**
 * 获取执行机详情
 */
export async function getExecutorApi(id: number) {
  return requestClient.get<Executor>(`/executors/${id}`);
}

/**
 * 更新执行机
 */
export async function updateExecutorApi(id: number, params: UpdateExecutorParams) {
  return requestClient.put(`/executors/${id}`, params);
}

/**
 * 删除执行机
 */
export async function deleteExecutorApi(id: number) {
  return requestClient.delete(`/executors/${id}`);
}

/**
 * 更新执行机状态
 */
export async function updateExecutorStatusApi(id: number, status: number) {
  return requestClient.put(`/executors/${id}/status`, { status });
}

/**
 * 同步执行机列表
 */
export async function syncExecutorsApi() {
  return requestClient.post<{ synced_count: number; message: string }>(
    '/executors/sync',
  );
}

/**
 * 根据标签筛选执行机
 */
export async function getExecutorsByLabelsApi(labels: Record<string, string>) {
  return requestClient.get<Executor[]>('/executors/by-labels', { params: labels });
}

/**
 * 根据项目ID获取执行机列表
 */
export async function getExecutorsByProjectApi(projectId: number) {
  return requestClient.get<Executor[]>(`/executors/project/${projectId}`);
}
