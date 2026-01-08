import { requestClient } from '#/api/request';

export namespace UserApi {
  export interface User {
    id: number;
    username: string;
    nickname: string;
    avatar: string;
  }

  export interface ListParams {
    page?: number;
    pageSize?: number;
  }

  export interface ListResult {
    list: User[];
    total: number;
    page: number;
    pageSize: number;
  }
}

/**
 * 获取用户列表（用于用户缓存）
 */
export function getUserListApi(data: UserApi.ListParams) {
  return requestClient.post<UserApi.ListResult>('/system/users/list', data);
}
