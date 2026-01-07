import type { UserInfo } from '@vben/types';

import { requestClient } from '#/api/request';

/**
 * 获取用户信息 (从 Gulu 后端获取)
 */
export async function getUserInfoApi() {
  const result = await requestClient.get<any>('/user/info');
  // 映射后端返回的字段到前端需要的格式
  const userInfo: UserInfo = {
    userId: String(result.id),
    username: result.username,
    realName: result.nickname || result.username,
    avatar: result.avatar || '',
    desc: result.remark || '',
    homePath: '',
    token: '',
    // roles 需要是字符串数组
    roles: [],
  };
  return userInfo;
}

/**
 * 获取用户菜单 (从 Gulu 后端获取)
 */
export async function getUserMenusApi() {
  return requestClient.get<any[]>('/user/menus');
}
