import { requestClient } from '#/api/request';
import type { PageResult } from '#/api/types';

// ==================== 环境相关类型 ====================

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

// ==================== 配置定义相关类型 ====================

export type ConfigType = 'domain' | 'variable' | 'database' | 'mq';

/**
 * 配置定义（项目级别）
 */
export interface ConfigDefinition {
  id: number;
  project_id: number;
  type: ConfigType;
  code: string;
  key: string;
  name: string;
  description?: string;
  extra?: Record<string, any>;
  sort?: number;
  status: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreateConfigDefinitionParams {
  type: ConfigType;
  key: string;
  name: string;
  description?: string;
  extra?: Record<string, any>;
  sort?: number;
  status?: number;
}

export interface UpdateConfigDefinitionParams {
  key?: string;
  name?: string;
  description?: string;
  extra?: Record<string, any>;
  sort?: number;
  status?: number;
}

// ==================== 配置值相关类型 ====================

/**
 * 配置项（包含定义和值）
 */
export interface ConfigItem {
  code: string;
  key: string;
  name: string;
  description?: string;
  type: ConfigType;
  extra?: Record<string, any>;
  sort?: number;
  status: number;
  value?: Record<string, any>;
}

export interface UpdateConfigValueParams {
  value: Record<string, any>;
}

export interface BatchUpdateConfigValuesParams {
  items: Array<{
    code: string;
    value: Record<string, any>;
  }>;
}

// ==================== 域名配置值类型 ====================

export interface DomainValue {
  base_url: string;
  headers?: Array<{ key: string; value: string }>;
}

// ==================== 变量配置值类型 ====================

export interface VariableValue {
  value: string;
}

// ==================== 数据库配置值类型 ====================

export interface DatabaseValue {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  options?: string;
}

// ==================== MQ配置值类型 ====================

export interface MQValue {
  host: string;
  port: number;
  username: string;
  password: string;
  vhost?: string;
  options?: string;
}

// ==================== 环境 API ====================

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

// ==================== 配置定义 API ====================

/**
 * 获取项目的配置定义列表
 * @param projectId 项目ID
 * @param type 配置类型（可选）
 */
export async function getConfigDefinitionsApi(
  projectId: number,
  type?: ConfigType,
) {
  const params = type ? { type } : undefined;
  return requestClient.get<ConfigDefinition[]>(
    `/projects/${projectId}/config-definitions`,
    { params },
  );
}

/**
 * 创建配置定义
 * @param projectId 项目ID
 * @param params 创建参数
 */
export async function createConfigDefinitionApi(
  projectId: number,
  params: CreateConfigDefinitionParams,
) {
  return requestClient.post<ConfigDefinition>(
    `/projects/${projectId}/config-definitions`,
    params,
  );
}

/**
 * 更新配置定义
 * @param projectId 项目ID
 * @param code 配置code
 * @param params 更新参数
 */
export async function updateConfigDefinitionApi(
  projectId: number,
  code: string,
  params: UpdateConfigDefinitionParams,
) {
  return requestClient.put<ConfigDefinition>(
    `/projects/${projectId}/config-definitions/${code}`,
    params,
  );
}

/**
 * 删除配置定义
 * @param projectId 项目ID
 * @param code 配置code
 */
export async function deleteConfigDefinitionApi(
  projectId: number,
  code: string,
) {
  return requestClient.delete(`/projects/${projectId}/config-definitions/${code}`);
}

// ==================== 配置值 API ====================

/**
 * 获取环境的配置列表
 * @param envId 环境ID
 * @param type 配置类型（可选）
 */
export async function getConfigsApi(envId: number, type?: ConfigType) {
  const params = type ? { type } : undefined;
  return requestClient.get<ConfigItem[]>(`/envs/${envId}/configs`, { params });
}

/**
 * 更新单个配置的值
 * @param envId 环境ID
 * @param code 配置code
 * @param params 更新参数
 */
export async function updateConfigValueApi(
  envId: number,
  code: string,
  params: UpdateConfigValueParams,
) {
  return requestClient.put(`/envs/${envId}/configs/${code}`, params);
}

/**
 * 批量更新配置值
 * @param envId 环境ID
 * @param params 批量更新参数
 */
export async function batchUpdateConfigValuesApi(
  envId: number,
  params: BatchUpdateConfigValuesParams,
) {
  return requestClient.put(`/envs/${envId}/configs`, params);
}
