import { baseRequestClient, requestClient } from '#/api/request';

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
 * 登录
 */
export async function loginApi(data: AuthApi.LoginParams) {
  // 后端返回 token 字段，需要映射为 accessToken
  const result = await requestClient.post<AuthApi.LoginResult>(
    '/auth/login',
    data,
  );
  return {
    ...result,
    accessToken: result.token,
  };
}

/**
 * 刷新accessToken
 */
export async function refreshTokenApi() {
  return baseRequestClient.post<AuthApi.RefreshTokenResult>('/auth/refresh', {
    withCredentials: true,
  });
}

/**
 * 退出登录
 */
export async function logoutApi() {
  return requestClient.post('/auth/logout');
}

/**
 * 用户注册
 */
export async function registerApi(data: AuthApi.RegisterParams) {
  const result = await requestClient.post<AuthApi.LoginResult>(
    '/auth/register',
    data,
  );
  return {
    ...result,
    accessToken: result.token,
  };
}

/**
 * 获取用户权限码
 */
export async function getAccessCodesApi() {
  // 从用户菜单中获取权限码
  try {
    const menus = await requestClient.get<any[]>('/menus');
    const codes: string[] = [];
    const extractCodes = (items: any[]) => {
      for (const item of items) {
        if (item.code) {
          codes.push(item.code);
        }
        if (item.children) {
          extractCodes(item.children);
        }
      }
    };
    extractCodes(menus);
    return codes;
  } catch {
    return [];
  }
}
