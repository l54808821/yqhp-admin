import { requestClient } from '#/api/request';

export namespace UserApi {
  // 用户来源平台枚举
  export enum Platform {
    SYSTEM = 'system', // 系统新建
    GITHUB = 'github',
    WECHAT = 'wechat', // 微信
    FEISHU = 'feishu', // 飞书
    DINGTALK = 'dingtalk', // 钉钉
    QQ = 'qq',
    GITEE = 'gitee',
  }

  // 平台选项配置
  export const PlatformOptions = [
    { label: '系统新建', value: Platform.SYSTEM },
    { label: 'GitHub', value: Platform.GITHUB },
    { label: '微信', value: Platform.WECHAT },
    { label: '飞书', value: Platform.FEISHU },
    { label: '钉钉', value: Platform.DINGTALK },
    { label: 'QQ', value: Platform.QQ },
    { label: 'Gitee', value: Platform.GITEE },
  ];

  // 根据平台值获取标签
  export function getPlatformLabel(platform: Platform | string): string {
    const option = PlatformOptions.find((opt) => opt.value === platform);
    return option?.label || platform;
  }

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
    platform: Platform; // 用户来源平台
    platformUid: string; // 平台唯一标识（长码）
    platformShortId: string; // 平台唯一标识（短码）
    lastLoginAt: string;
    lastLoginIp: string;
    remark: string;
    createdAt: string;
    updatedAt: string;
    roles: Role[];
  }

  export interface Role {
    id: number;
    appId: number;
    name: string;
    code: string;
    status: number;
  }

  // 应用角色配置
  export interface AppRoleConfig {
    appId: number;
    roleIds: number[];
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
    platform?: Platform; // 用户来源平台
    platformUid?: string; // 平台唯一标识（长码）
    platformShortId?: string; // 平台唯一标识（短码）
    appRoles?: AppRoleConfig[];
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
    platform?: Platform; // 用户来源平台
    platformUid?: string; // 平台唯一标识（长码）
    platformShortId?: string; // 平台唯一标识（短码）
    appRoles?: AppRoleConfig[];
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
