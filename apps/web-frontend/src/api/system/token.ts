import { requestClient } from '#/api/request';

export namespace TokenApi {
  export interface Token {
    id: number;
    userId: number;
    token: string;
    device: string;
    platform: string;
    ip: string;
    userAgent: string;
    expireAt: string;
    lastActiveAt: string;
    createdAt: string;
    updatedAt: string;
  }

  export interface LoginLog {
    id: number;
    userId: number;
    username: string;
    ip: string;
    location: string;
    browser: string;
    os: string;
    status: number;
    message: string;
    loginType: string;
    createdAt: string;
  }

  export interface OperationLog {
    id: number;
    userId: number;
    username: string;
    module: string;
    action: string;
    method: string;
    path: string;
    ip: string;
    userAgent: string;
    params: string;
    result: string;
    status: number;
    duration: number;
    errorMsg: string;
    createdAt: string;
  }

  export interface ListTokensParams {
    page?: number;
    pageSize?: number;
    userId?: number;
    username?: string;
  }

  export interface ListTokensResult {
    list: Token[];
    total: number;
    page: number;
    pageSize: number;
  }

  export interface ListLoginLogsParams {
    page?: number;
    pageSize?: number;
    username?: string;
    status?: number;
    startTime?: string;
    endTime?: string;
  }

  export interface ListLoginLogsResult {
    list: LoginLog[];
    total: number;
    page: number;
    pageSize: number;
  }

  export interface ListOperationLogsParams {
    page?: number;
    pageSize?: number;
    username?: string;
    module?: string;
    status?: number;
    startTime?: string;
    endTime?: string;
  }

  export interface ListOperationLogsResult {
    list: OperationLog[];
    total: number;
    page: number;
    pageSize: number;
  }
}

/**
 * 获取令牌列表
 */
export function getTokenListApi(data: TokenApi.ListTokensParams) {
  return requestClient.post<TokenApi.ListTokensResult>('/system/tokens/list', data);
}

/**
 * 踢人下线
 */
export function kickOutApi(id: number) {
  return requestClient.post(`/system/tokens/kickout/${id}`);
}

/**
 * 根据Token踢人下线
 */
export function kickOutByTokenApi(token: string) {
  return requestClient.post('/system/tokens/kickout-by-token', { token });
}

/**
 * 禁用用户
 */
export function disableUserApi(id: number, disableTime: number) {
  return requestClient.post(`/system/tokens/disable/${id}`, { disableTime });
}

/**
 * 解禁用户
 */
export function enableUserApi(id: number) {
  return requestClient.post(`/system/tokens/enable/${id}`);
}

/**
 * 获取登录日志
 */
export function getLoginLogsApi(data: TokenApi.ListLoginLogsParams) {
  return requestClient.post<TokenApi.ListLoginLogsResult>('/system/logs/login', data);
}

/**
 * 获取操作日志
 */
export function getOperationLogsApi(data: TokenApi.ListOperationLogsParams) {
  return requestClient.post<TokenApi.ListOperationLogsResult>('/system/logs/operation', data);
}

/**
 * 清空登录日志
 */
export function clearLoginLogsApi() {
  return requestClient.delete('/system/logs/login');
}

/**
 * 清空操作日志
 */
export function clearOperationLogsApi() {
  return requestClient.delete('/system/logs/operation');
}

