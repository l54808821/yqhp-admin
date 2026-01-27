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

// ==================== 域名配置相关类型 ====================

export interface DomainHeader {
  key: string;
  value: string;
}

/**
 * 域名配置项（存储在环境的 domains 字段中）
 */
export interface DomainItem {
  code: string;
  name: string;
  base_url: string;
  headers?: DomainHeader[];
  description?: string;
  sort?: number;
  status: number;
}

export interface GetDomainsResponse {
  version: number;
  domains: DomainItem[];
}

export interface UpdateDomainsRequest {
  version: number;
  domains: DomainItem[];
}

export interface UpdateDomainsResponse {
  version: number;
  domains: DomainItem[];
}

// ==================== 变量配置相关类型 ====================

/**
 * 变量配置项（存储在环境的 vars 字段中）
 */
export interface VarItem {
  key: string;
  name: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  is_sensitive: boolean;
  description?: string;
}

export interface GetVarsResponse {
  version: number;
  vars: VarItem[];
}

export interface UpdateVarsRequest {
  version: number;
  vars: VarItem[];
}

export interface UpdateVarsResponse {
  version: number;
  vars: VarItem[];
}

export interface VarExportItem {
  name: string;
  key: string;
  value: string;
  type: string;
  is_sensitive: boolean;
  description: string;
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

// ==================== 域名配置 API ====================

/**
 * 获取环境的域名配置
 * @param envId 环境ID
 */
export async function getDomainsApi(envId: number) {
  return requestClient.get<GetDomainsResponse>(`/envs/${envId}/domains`);
}

/**
 * 更新环境的域名配置（带乐观锁）
 * @param envId 环境ID
 * @param params 更新参数（包含版本号和域名列表）
 */
export async function updateDomainsApi(
  envId: number,
  params: UpdateDomainsRequest,
) {
  return requestClient.put<UpdateDomainsResponse>(
    `/envs/${envId}/domains`,
    params,
  );
}

// ==================== 变量配置 API ====================

/**
 * 获取环境的变量配置
 * @param envId 环境ID
 */
export async function getVarsApi(envId: number) {
  return requestClient.get<GetVarsResponse>(`/envs/${envId}/vars`);
}

/**
 * 更新环境的变量配置（带乐观锁）
 * @param envId 环境ID
 * @param params 更新参数（包含版本号和变量列表）
 */
export async function updateVarsApi(envId: number, params: UpdateVarsRequest) {
  return requestClient.put<UpdateVarsResponse>(`/envs/${envId}/vars`, params);
}

/**
 * 导出变量
 * @param envId 环境ID
 */
export async function exportVarsApi(envId: number) {
  return requestClient.get<VarExportItem[]>(`/envs/${envId}/vars/export`);
}

/**
 * 导入变量
 * @param envId 环境ID
 * @param items 变量列表
 */
export async function importVarsApi(envId: number, items: VarExportItem[]) {
  return requestClient.post(`/envs/${envId}/vars/import`, { items });
}
