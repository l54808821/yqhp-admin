import { requestClient } from '#/api/request';
import type { PageResult } from '#/api/types';

export interface DatabaseConfig {
  id: number;
  project_id: number;
  env_id: number;
  name: string;
  code: string;
  type: 'mysql' | 'redis' | 'mongodb';
  host: string;
  port: number;
  database?: string;
  username?: string;
  password?: string;
  options?: string;
  description?: string;
  status: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreateDatabaseConfigParams {
  project_id: number;
  env_id: number;
  name: string;
  code: string;
  type: string;
  host: string;
  port: number;
  database?: string;
  username?: string;
  password?: string;
  options?: string;
  description?: string;
  status?: number;
}

export interface UpdateDatabaseConfigParams {
  name?: string;
  type?: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  options?: string;
  description?: string;
  status?: number;
}

/**
 * 创建数据库配置
 */
export async function createDatabaseConfigApi(params: CreateDatabaseConfigParams) {
  return requestClient.post<DatabaseConfig>('/database-configs', params);
}

/**
 * 获取数据库配置列表
 */
export async function getDatabaseConfigListApi(params?: any) {
  return requestClient.get<PageResult<DatabaseConfig>>('/database-configs', { params });
}

/**
 * 根据环境ID获取数据库配置列表
 */
export async function getDatabaseConfigsByEnvApi(envId: number) {
  return requestClient.get<DatabaseConfig[]>(`/database-configs/env/${envId}`);
}

/**
 * 获取数据库配置详情
 */
export async function getDatabaseConfigApi(id: number) {
  return requestClient.get<DatabaseConfig>(`/database-configs/${id}`);
}

/**
 * 更新数据库配置
 */
export async function updateDatabaseConfigApi(id: number, params: UpdateDatabaseConfigParams) {
  return requestClient.put(`/database-configs/${id}`, params);
}

/**
 * 删除数据库配置
 */
export async function deleteDatabaseConfigApi(id: number) {
  return requestClient.delete(`/database-configs/${id}`);
}
