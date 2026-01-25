import { requestClient } from '#/api/request';
import type { PageResult } from '#/api/types';

export interface Env {
  id: number;
  project_id: number;
  name: string;
  description?: string;
  sort?: number;
  status: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreateEnvParams {
  project_id: number;
  name: string;
  description?: string;
  sort?: number;
  status?: number;
}

export interface UpdateEnvParams {
  name?: string;
  description?: string;
  sort?: number;
  status?: number;
}

export interface EnvListParams {
  page?: number;
  pageSize?: number;
  project_id?: number;
  name?: string;
  status?: number;
}

export interface CopyEnvParams {
  name: string;
}

export interface UpdateEnvSortParams {
  id: number;
  target_id: number;
  position: 'before' | 'after';
}

/**
 * 创建环境
 */
export async function createEnvApi(params: CreateEnvParams) {
  return requestClient.post<Env>('/envs', params);
}

/**
 * 获取环境列表
 */
export async function getEnvListApi(params?: EnvListParams) {
  return requestClient.get<PageResult<Env>>('/envs', { params });
}

/**
 * 根据项目ID获取环境列表
 */
export async function getEnvsByProjectApi(projectId: number) {
  return requestClient.get<Env[]>(`/envs/project/${projectId}`);
}

/**
 * 获取环境详情
 */
export async function getEnvApi(id: number) {
  return requestClient.get<Env>(`/envs/${id}`);
}

/**
 * 更新环境
 */
export async function updateEnvApi(id: number, params: UpdateEnvParams) {
  return requestClient.put(`/envs/${id}`, params);
}

/**
 * 删除环境
 */
export async function deleteEnvApi(id: number) {
  return requestClient.delete(`/envs/${id}`);
}

/**
 * 复制环境
 */
export async function copyEnvApi(id: number, params: CopyEnvParams) {
  return requestClient.post<Env>(`/envs/${id}/copy`, params);
}

/**
 * 更新环境排序
 */
export async function updateEnvSortApi(params: UpdateEnvSortParams) {
  return requestClient.put('/envs/sort', params);
}
