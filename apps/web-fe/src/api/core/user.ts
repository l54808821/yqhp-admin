import type { UserInfo } from '@vben/types';

import { requestClient } from '#/api/request';

/**
 * 获取用户信息
 */
export async function getUserInfoApi() {
  const result = await requestClient.get<any>('/auth/user-info');
  // 映射后端返回的字段到前端需要的格式
  const userInfo: UserInfo = {
    userId: String(result.id),
    username: result.username,
    realName: result.nickname || result.username,
    avatar: result.avatar || '',
    desc: result.remark || '',
    homePath: '',
    token: '',
    // roles 需要是字符串数组，使用角色 code 作为标识
    roles: result.roles?.map((r: any) => r.code) || [],
  };
  return userInfo;
}
