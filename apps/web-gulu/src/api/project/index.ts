import { requestClient } from '#/api/request';
import type { PageResult } from '#/api/types';

export interface Project {
  id: number;
  team_id: number;
  name: string;
  description?: string;
  icon?: string;
  sort?: number;
  status: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreateProjectParams {
  team_id: number;
  name: string;
  description?: string;
  icon?: string;
  sort?: number;
  status?: number;
}

export interface UpdateProjectParams {
  name?: string;
  description?: string;
  icon?: string;
  sort?: number;
  status?: number;
}

export interface ProjectListParams {
  page?: number;
  pageSize?: number;
  teamId?: number;
  name?: string;
  status?: number;
}

/**
 * 创建项目
 */
export async function createProjectApi(params: CreateProjectParams) {
  return requestClient.post<Project>('/projects', params);
}

/**
 * 获取项目列表
 */
export async function getProjectListApi(params?: ProjectListParams) {
  return requestClient.get<PageResult<Project>>('/projects', { params });
}

/**
 * 获取所有启用的项目（用于下拉选择）
 */
export async function getAllProjectsApi() {
  return requestClient.get<Project[]>('/projects/all');
}

/**
 * 获取项目详情
 */
export async function getProjectApi(id: number) {
  return requestClient.get<Project>(`/projects/${id}`);
}

/**
 * 更新项目
 */
export async function updateProjectApi(id: number, params: UpdateProjectParams) {
  return requestClient.put(`/projects/${id}`, params);
}

/**
 * 删除项目
 */
export async function deleteProjectApi(id: number) {
  return requestClient.delete(`/projects/${id}`);
}

/**
 * 更新项目状态
 */
export async function updateProjectStatusApi(id: number, status: number) {
  return requestClient.put(`/projects/${id}/status`, { status });
}
