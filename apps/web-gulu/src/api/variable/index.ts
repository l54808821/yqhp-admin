import { requestClient } from '#/api/request';
import type { PageResult } from '#/api/types';

export interface Variable {
  id: number;
  project_id: number;
  env_id: number;
  name: string;
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  is_sensitive?: boolean;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateVariableParams {
  project_id: number;
  env_id: number;
  name: string;
  key: string;
  value: string;
  type?: string;
  is_sensitive?: boolean;
  description?: string;
}

export interface UpdateVariableParams {
  name?: string;
  value?: string;
  type?: string;
  is_sensitive?: boolean;
  description?: string;
}

export interface VariableListParams {
  page?: number;
  pageSize?: number;
  project_id?: number;
  env_id?: number;
  name?: string;
  key?: string;
}

export interface VariableExportItem {
  name: string;
  key: string;
  value: string;
  type: string;
  is_sensitive: boolean;
  description: string;
}

/**
 * 创建变量
 */
export async function createVariableApi(params: CreateVariableParams) {
  return requestClient.post<Variable>('/vars', params);
}

/**
 * 获取变量列表
 */
export async function getVariableListApi(params?: VariableListParams) {
  return requestClient.get<PageResult<Variable>>('/vars', { params });
}

/**
 * 根据环境ID获取变量列表
 */
export async function getVariablesByEnvApi(envId: number) {
  return requestClient.get<Variable[]>(`/vars/env/${envId}`);
}

/**
 * 获取变量详情
 */
export async function getVariableApi(id: number) {
  return requestClient.get<Variable>(`/vars/${id}`);
}

/**
 * 更新变量
 */
export async function updateVariableApi(id: number, params: UpdateVariableParams) {
  return requestClient.put(`/vars/${id}`, params);
}

/**
 * 删除变量
 */
export async function deleteVariableApi(id: number) {
  return requestClient.delete(`/vars/${id}`);
}

/**
 * 导出变量
 */
export async function exportVariablesApi(envId: number) {
  return requestClient.get<VariableExportItem[]>('/vars/export', {
    params: { env_id: envId },
  });
}

/**
 * 导入变量
 */
export async function importVariablesApi(
  projectId: number,
  envId: number,
  items: VariableExportItem[],
) {
  return requestClient.post('/vars/import', {
    project_id: projectId,
    env_id: envId,
    items,
  });
}
