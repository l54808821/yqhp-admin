import { requestClient } from '#/api/request';

export namespace OAuthApi {
  export interface Provider {
    id: number;
    name: string;
    code: string;
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
    createdAt: string;
    updatedAt: string;
  }

  export interface ListParams {
    page?: number;
    pageSize?: number;
    name?: string;
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
 * 获取公开的OAuth提供商列表
 */
export function getPublicOAuthProvidersApi() {
  return requestClient.get<OAuthApi.Provider[]>('/auth/oauth/providers');
}

/**
 * 获取OAuth授权URL
 */
export function getOAuthUrlApi(provider: string, state?: string) {
  return requestClient.get<{ url: string }>(`/auth/oauth/${provider}/url`, {
    params: { state },
  });
}

/**
 * 获取用户绑定的第三方账号
 */
export function getUserBindingsApi() {
  return requestClient.get<OAuthApi.OAuthUser[]>('/auth/bindings');
}

/**
 * 解绑第三方账号
 */
export function unbindOAuthApi(provider: string) {
  return requestClient.delete(`/auth/unbind/${provider}`);
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
 * OAuth回调登录
 */
export function oauthCallbackApi(provider: string, code: string) {
  return requestClient.get<OAuthLoginResult>(
    `/auth/oauth/${provider}/callback`,
    {
      params: { code },
    },
  );
}
