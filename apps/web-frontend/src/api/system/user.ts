import { requestClient } from '#/api/request';

export namespace UserApi {
  export interface User {
    id: number;
    username: string;
    nickname: string;
    avatar: string;
    email: string;
    phone: string;
    gender: number;
    status: number;
    deptId: number;
    lastLoginAt: string;
    lastLoginIp: string;
    remark: string;
    createdAt: string;
    updatedAt: string;
    roles: Role[];
  }

  export interface Role {
    id: number;
    name: string;
    code: string;
    status: number;
  }

  export interface ListParams {
    page?: number;
    pageSize?: number;
    username?: string;
    nickname?: string;
    phone?: string;
    status?: number;
    deptId?: number;
  }

  export interface ListResult {
    list: User[];
    total: number;
    page: number;
    pageSize: number;
  }

  export interface CreateParams {
    username: string;
    password: string;
    nickname?: string;
    email?: string;
    phone?: string;
    gender?: number;
    deptId?: number;
    roleIds?: number[];
    remark?: string;
  }

  export interface UpdateParams {
    id: number;
    nickname?: string;
    avatar?: string;
    email?: string;
    phone?: string;
    gender?: number;
    deptId?: number;
    status?: number;
    roleIds?: number[];
    remark?: string;
  }
}

/**
 * 获取用户列表
 */
export function getUserListApi(data: UserApi.ListParams) {
  return requestClient.post<UserApi.ListResult>('/system/users/list', data);
}

/**
 * 获取用户详情
 */
export function getUserApi(id: number) {
  return requestClient.get<UserApi.User>(`/system/users/${id}`);
}

/**
 * 创建用户
 */
export function createUserApi(data: UserApi.CreateParams) {
  return requestClient.post<UserApi.User>('/system/users', data);
}

/**
 * 更新用户
 */
export function updateUserApi(data: UserApi.UpdateParams) {
  return requestClient.put('/system/users', data);
}

/**
 * 删除用户
 */
export function deleteUserApi(id: number) {
  return requestClient.delete(`/system/users/${id}`);
}

/**
 * 重置密码
 */
export function resetPasswordApi(id: number, password?: string) {
  return requestClient.post(`/system/users/${id}/reset-password`, { password });
}

/**
 * 批量获取用户基本信息（用于用户展示组件）
 */
export function batchGetUsersApi(ids: number[]) {
  return requestClient.post<
    Array<{
      avatar: string;
      id: number;
      nickname: string;
      username: string;
    }>
  >('/system/users/batch', { ids });
}
