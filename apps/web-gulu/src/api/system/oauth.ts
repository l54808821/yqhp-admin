import { authRequestClient, requestClient } from '#/api/request';

export namespace OAuthApi {
  export interface Provider {
    id: number;
    name: string;
    code: string;
    appId: number | null; // 应用ID，null表示全局配置
    appName?: string; // 应用名称（关联查询）
    clientId: string;
    redirectUri: string;
    authUrl: string;
    tokenUrl: string;
    userInfoUrl: string;
    scope: string;
    status: number;
    sort: number;
    icon: string;
    remark: string;
    createdBy: number;
    updatedBy: number;
    createdAt: string;
    updatedAt: string;
  }

  export interface ListParams {
    page?: number;
    pageSize?: number;
    name?: string;
    appId?: number | null; // 应用ID筛选
    status?: number;
  }

  export interface ListResult {
    list: Provider[];
    total: number;
    page: number;
    pageSize: number;
  }

  export interface CreateParams {
    name: string;
    code: string;
    appId?: number | null; // 应用ID，null表示全局配置
    clientId?: string;
    clientSecret?: string;
    redirectUri?: string;
    authUrl?: string;
    tokenUrl?: string;
    userInfoUrl?: string;
    scope?: string;
    status?: number;
    sort?: number;
    icon?: string;
    remark?: string;
  }

  export interface UpdateParams {
    id: number;
    name?: string;
    appId?: number | null;
    clientId?: string;
    clientSecret?: string;
    redirectUri?: string;
    authUrl?: string;
    tokenUrl?: string;
    userInfoUrl?: string;
    scope?: string;
    status?: number;
    sort?: number;
    icon?: string;
    remark?: string;
  }

  export interface OAuthUser {
    id: number;
    userId: number;
    providerCode: string;
    openId: string;
    unionId: string;
    nickname: string;
    avatar: string;
    expiresAt: number;
    createdAt: string;
    updatedAt: string;
  }

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

  export interface UserAppListParams {
    page?: number;
    pageSize?: number;
    userId?: number;
    appId?: number;
    source?: string;
    status?: number;
  }

  export interface UserAppListResult {
    list: UserApp[];
    total: number;
    page: number;
    pageSize: number;
  }
}

/**
 * 获取OAuth提供商列表
 */
export function getOAuthProviderListApi(data?: OAuthApi.ListParams) {
  return requestClient.post<OAuthApi.ListResult>(
    '/system/oauth-providers/list',
    data || {},
  );
}

/**
 * 获取OAuth提供商详情
 */
export function getOAuthProviderApi(code: string) {
  return requestClient.get<OAuthApi.Provider>(
    `/system/oauth-providers/${code}`,
  );
}

/**
 * 创建OAuth提供商
 */
export function createOAuthProviderApi(data: OAuthApi.CreateParams) {
  return requestClient.post<OAuthApi.Provider>('/system/oauth-providers', data);
}

/**
 * 更新OAuth提供商
 */
export function updateOAuthProviderApi(data: OAuthApi.UpdateParams) {
  return requestClient.put('/system/oauth-providers', data);
}

/**
 * 删除OAuth提供商
 */
export function deleteOAuthProviderApi(id: number) {
  return requestClient.delete(`/system/oauth-providers/${id}`);
}

/**
 * 获取公开的OAuth提供商列表 (从 Admin 服务获取)
 */
export function getPublicOAuthProvidersApi() {
  return authRequestClient.get<OAuthApi.Provider[]>('/oauth/providers');
}

/**
 * 获取OAuth授权URL (从 Admin 服务获取)
 */
export function getOAuthUrlApi(provider: string, state?: string) {
  return authRequestClient.get<{ url: string }>(`/oauth/${provider}/url`, {
    params: { state },
  });
}

/**
 * 获取用户绑定的第三方账号 (从 Admin 服务获取)
 */
export function getUserBindingsApi() {
  return authRequestClient.get<OAuthApi.OAuthUser[]>('/bindings');
}

/**
 * 解绑第三方账号 (发送到 Admin 服务)
 */
export function unbindOAuthApi(provider: string) {
  return authRequestClient.delete(`/unbind/${provider}`);
}

/**
 * OAuth登录响应
 */
export interface OAuthLoginResult {
  token: string;
  userInfo: {
    avatar: string;
    id: number;
    nickname: string;
    roles: Array<{ code: string; id: number; name: string }>;
    username: string;
  };
  isNew: boolean;
}

/**
 * OAuth回调登录 (发送到 Admin 服务)
 * 注意：OAuth回调需要后端请求第三方服务器，可能较慢，设置较长超时时间
 */
export function oauthCallbackApi(provider: string, code: string) {
  return authRequestClient.get<OAuthLoginResult>(
    `/oauth/${provider}/callback`,
    {
      params: { code },
      timeout: 30_000, // 30秒超时，OAuth回调需要请求第三方服务器
    },
  );
}
