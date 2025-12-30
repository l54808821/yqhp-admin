import { requestClient } from '#/api/request';

export namespace UserAppApi {
  // 用户-应用关联
  export interface UserApp {
    id: number;
    userId: number;
    appId: number;
    appName?: string;
    appCode?: string;
    source: string; // system, oauth, register, invite
    firstLoginAt: string;
    lastLoginAt: string;
    loginCount: number;
    status: number;
    remark: string;
    createdAt: string;
    updatedAt: string;
  }

  export interface ListParams {
    page?: number;
    pageSize?: number;
    userId?: number;
    appId?: number;
    source?: string;
    status?: number;
  }

  export interface ListResult {
    list: UserApp[];
    total: number;
    page: number;
    pageSize: number;
  }

  // 来源类型
  export const SourceTypes = {
    system: '系统创建',
    oauth: '第三方登录',
    register: '自主注册',
    invite: '邀请注册',
  } as const;

  export function getSourceLabel(source: string): string {
    return SourceTypes[source as keyof typeof SourceTypes] || source;
  }
}

/**
 * 获取用户-应用关联列表
 */
export function getUserAppListApi(data: UserAppApi.ListParams) {
  return requestClient.post<UserAppApi.ListResult>(
    '/system/user-apps/list',
    data,
  );
}

/**
 * 获取用户的应用关联
 */
export function getUserAppsApi(userId: number) {
  return requestClient.get<UserAppApi.UserApp[]>(
    `/system/user-apps/user/${userId}`,
  );
}

/**
 * 获取应用的用户关联
 */
export function getAppUsersApi(appId: number) {
  return requestClient.get<UserAppApi.UserApp[]>(
    `/system/user-apps/app/${appId}`,
  );
}
