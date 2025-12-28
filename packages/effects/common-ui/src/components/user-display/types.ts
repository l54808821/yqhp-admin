import type { Ref } from 'vue';

export interface UserInfo {
  id: number;
  username: string;
  nickname: string;
  avatar: string;
}

export interface UserDisplayProps {
  /**
   * 用户ID，支持单个或多个
   */
  userId?: null | number | number[];
  /**
   * 是否显示头像
   * @default false
   */
  showAvatar?: boolean;
  /**
   * 头像大小
   * @default 'small'
   */
  avatarSize?: 'default' | 'large' | 'small' | number;
  /**
   * 是否可点击
   * @default false
   */
  clickable?: boolean;
  /**
   * 多用户时的分隔符
   * @default ', '
   */
  separator?: string;
  /**
   * 多用户时最多显示数量，超出显示 +N
   * @default 3
   */
  maxCount?: number;
  /**
   * 空值时显示的文本
   * @default '-'
   */
  emptyText?: string;
}

// 全局用户缓存类型
export interface UserCacheState {
  userCacheMap: Ref<Map<number, UserInfo>>;
  cacheLoaded: Ref<boolean>;
  getUserById: (id: number) => UserInfo | undefined;
}

// 全局注册的用户缓存
let globalUserCache: UserCacheState | undefined;

export function registerUserCache(cache: UserCacheState) {
  globalUserCache = cache;
}

export function getRegisteredUserCache(): UserCacheState | undefined {
  return globalUserCache;
}
