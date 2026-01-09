import { requestClient } from '#/api/request';
import type { PageResult } from '#/api/types';

export interface DomainHeader {
  key: string;
  value: string;
}

export interface Domain {
  id: number;
  project_id: number;
  env_id: number;
  name: string;
  code: string;
  base_url: string;
  headers?: DomainHeader[];
  description?: string;
  sort?: number;
  status: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreateDomainParams {
  project_id: number;
  env_id: number;
  name: string;
  code: string;
  base_url: string;
  headers?: DomainHeader[];
  description?: string;
  sort?: number;
  status?: number;
}

export interface UpdateDomainParams {
  name?: string;
  base_url?: string;
  headers?: DomainHeader[];
  description?: string;
  sort?: number;
  status?: number;
}

export interface DomainListParams {
  page?: number;
  pageSize?: number;
  project_id?: number;
  env_id?: number;
  name?: string;
  code?: string;
  status?: number;
}

/**
 * 创建域名
 */
export async function createDomainApi(params: CreateDomainParams) {
  return requestClient.post<Domain>('/domains', params);
}

/**
 * 获取域名列表
 */
export async function getDomainListApi(params?: DomainListParams) {
  return requestClient.get<PageResult<Domain>>('/domains', { params });
}

/**
 * 根据环境ID获取域名列表
 */
export async function getDomainsByEnvApi(envId: number) {
  return requestClient.get<Domain[]>(`/domains/env/${envId}`);
}

/**
 * 获取域名详情
 */
export async function getDomainApi(id: number) {
  return requestClient.get<Domain>(`/domains/${id}`);
}

/**
 * 更新域名
 */
export async function updateDomainApi(id: number, params: UpdateDomainParams) {
  return requestClient.put(`/domains/${id}`, params);
}

/**
 * 删除域名
 */
export async function deleteDomainApi(id: number) {
  return requestClient.delete(`/domains/${id}`);
}
