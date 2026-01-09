import { requestClient } from '#/api/request';
import type { PageResult } from '#/api/types';

export interface Team {
  id: number;
  name: string;
  description?: string;
  status: number;
  created_by?: number;
  updated_by?: number;
  created_at?: string;
  updated_at?: string;
}

export interface TeamMember {
  id: number;
  team_id: number;
  user_id: number;
  role: 'owner' | 'admin' | 'member';
  created_at?: string;
}

export interface CreateTeamParams {
  name: string;
  description?: string;
}

export interface UpdateTeamParams {
  name?: string;
  description?: string;
  status?: number;
}

export interface TeamListParams {
  page?: number;
  pageSize?: number;
  name?: string;
  status?: number;
}

export interface AddMemberParams {
  user_id: number;
  role: 'owner' | 'admin' | 'member';
}

export interface UpdateRoleParams {
  role: 'owner' | 'admin' | 'member';
}

/**
 * 创建团队
 */
export async function createTeamApi(params: CreateTeamParams) {
  return requestClient.post<Team>('/teams', params);
}

/**
 * 获取团队列表
 */
export async function getTeamListApi(params?: TeamListParams) {
  return requestClient.get<PageResult<Team>>('/teams', { params });
}

/**
 * 获取当前用户的团队列表
 */
export async function getUserTeamsApi() {
  return requestClient.get<Team[]>('/teams/my');
}

/**
 * 获取团队详情
 */
export async function getTeamApi(id: number) {
  return requestClient.get<Team>(`/teams/${id}`);
}

/**
 * 更新团队
 */
export async function updateTeamApi(id: number, params: UpdateTeamParams) {
  return requestClient.put(`/teams/${id}`, params);
}

/**
 * 删除团队
 */
export async function deleteTeamApi(id: number) {
  return requestClient.delete(`/teams/${id}`);
}

/**
 * 添加团队成员
 */
export async function addTeamMemberApi(teamId: number, params: AddMemberParams) {
  return requestClient.post<TeamMember>(`/teams/${teamId}/members`, params);
}

/**
 * 获取团队成员列表
 */
export async function getTeamMembersApi(teamId: number) {
  return requestClient.get<TeamMember[]>(`/teams/${teamId}/members`);
}

/**
 * 移除团队成员
 */
export async function removeTeamMemberApi(teamId: number, userId: number) {
  return requestClient.delete(`/teams/${teamId}/members/${userId}`);
}

/**
 * 更新成员角色
 */
export async function updateMemberRoleApi(teamId: number, userId: number, params: UpdateRoleParams) {
  return requestClient.put(`/teams/${teamId}/members/${userId}/role`, params);
}

/**
 * 获取团队下的项目列表
 */
export async function getTeamProjectsApi(teamId: number) {
  return requestClient.get<import('#/api/project').Project[]>(`/teams/${teamId}/projects`);
}

/**
 * 在团队下创建项目
 */
export async function createTeamProjectApi(teamId: number, params: { name: string; description?: string }) {
  return requestClient.post<import('#/api/project').Project>(`/teams/${teamId}/projects`, params);
}
