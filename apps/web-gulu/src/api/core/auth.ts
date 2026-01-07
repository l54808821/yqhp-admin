import { authRequestClient, baseAuthRequestClient, requestClient } from '#/api/request';

export namespace AuthApi {
  /** 登录接口参数 */
  export interface LoginParams {
    password?: string;
    username?: string;
  }

  /** 注册接口参数 */
  export interface RegisterParams {
    username: string;
    password: string;
    confirmPassword: string;
    nickname?: string;
    email?: string;
    phone?: string;
  }

  /** 登录接口返回值 */
  export interface LoginResult {
    accessToken: string;
    token: string;
    userInfo: UserInfo;
  }

  export interface UserInfo {
    id: number;
    username: string;
    nickname: string;
    avatar: string;
    email: string;
    phone: string;
    gender: number;
    status: number;
    deptId: number;
    roles: Role[];
  }

  export interface Role {
    id: number;
    name: string;
    code: string;
  }

  export interface RefreshTokenResult {
    data: string;
    status: number;
  }
}

/**
 * 登录 (发送到 Admin 服务)
 */
export async function loginApi(data: AuthApi.LoginParams) {
  // 后端返回 token 字段，需要映射为 accessToken
  // authRequestClient baseURL 是 /auth，代理到 Admin 的 /api
  // 所以这里路径是 /login，最终请求 /auth/login -> Admin /api/auth/login
  const result = await authRequestClient.post<AuthApi.LoginResult>(
    '/login',
    data,
  );
  return {
    ...result,
    accessToken: result.token,
  };
}

/**
 * 刷新accessToken (发送到 Admin 服务)
 */
export async function refreshTokenApi() {
  return baseAuthRequestClient.post<AuthApi.RefreshTokenResult>('/refresh', {
    withCredentials: true,
  });
}

/**
 * 退出登录 (发送到 Admin 服务)
 */
export async function logoutApi() {
  return authRequestClient.post('/logout');
}

/**
 * 用户注册 (发送到 Admin 服务)
 */
export async function registerApi(data: AuthApi.RegisterParams) {
  const result = await authRequestClient.post<AuthApi.LoginResult>(
    '/register',
    data,
  );
  return {
    ...result,
    accessToken: result.token,
  };
}

/**
 * 获取用户权限码 (从 Gulu 后端获取)
 */
export async function getAccessCodesApi() {
  try {
    return await requestClient.get<string[]>('/user/codes');
  } catch {
    return [];
  }
}
