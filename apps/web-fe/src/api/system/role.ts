import { requestClient } from '#/api/request';

export namespace RoleApi {
  export interface Role {
    id: number;
    appId: number;
    name: string;
    code: string;
    sort: number;
    status: number;
    remark: string;
    createdAt: string;
    updatedAt: string;
    resources?: Resource[];
  }

  export interface Resource {
    id: number;
    name: string;
    code: string;
    type: number;
  }

  export interface ListParams {
    page?: number;
    pageSize?: number;
    appId?: number;
    name?: string;
    code?: string;
    status?: number;
  }

  export interface ListResult {
    list: Role[];
    total: number;
    page: number;
    pageSize: number;
  }

  export interface CreateParams {
    appId: number;
    name: string;
    code: string;
    sort?: number;
    status?: number;
    remark?: string;
    resourceIds?: number[];
  }

  export interface UpdateParams {
    id: number;
    name?: string;
    sort?: number;
    status?: number;
    remark?: string;
    resourceIds?: number[];
  }
}

/**
 * 获取角色列表
 */
export function getRoleListApi(data: RoleApi.ListParams) {
  return requestClient.post<RoleApi.ListResult>('/system/roles/list', data);
}

/**
 * 获取所有角色
 */
export function getAllRolesApi() {
  return requestClient.get<RoleApi.Role[]>('/system/roles/all');
}

/**
 * 获取角色详情
 */
export function getRoleApi(id: number) {
  return requestClient.get<RoleApi.Role>(`/system/roles/${id}`);
}

/**
 * 获取角色的资源ID列表
 */
export function getRoleResourceIdsApi(id: number) {
  return requestClient.get<number[]>(`/system/roles/${id}/resources`);
}

/**
 * 创建角色
 */
export function createRoleApi(data: RoleApi.CreateParams) {
  return requestClient.post<RoleApi.Role>('/system/roles', data);
}

/**
 * 更新角色
 */
export function updateRoleApi(data: RoleApi.UpdateParams) {
  return requestClient.put('/system/roles', data);
}

/**
 * 删除角色
 */
export function deleteRoleApi(id: number) {
  return requestClient.delete(`/system/roles/${id}`);
}
