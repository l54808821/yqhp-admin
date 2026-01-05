import { defineStore } from 'pinia';
import { ref } from 'vue';

import { getUserListApi } from '#/api';

export interface CachedUser {
  id: number;
  username: string;
  nickname: string;
  avatar: string;
}

// 响应式用户缓存
const userCacheMap = ref(new Map<number, CachedUser>());
const cacheLoaded = ref(false);

export const useUserCacheStore = defineStore('user-cache', {
  state: () => ({
    loading: false,
  }),

  getters: {
    loaded: () => cacheLoaded.value,
  },

  actions: {
    async loadUsers() {
      if (cacheLoaded.value || this.loading) return;

      this.loading = true;
      try {
        const res = await getUserListApi({ page: 1, pageSize: 9999 });
        const newMap = new Map<number, CachedUser>();
        for (const user of res.list) {
          newMap.set(user.id, {
            id: user.id,
            username: user.username,
            nickname: user.nickname,
            avatar: user.avatar,
          });
        }
        userCacheMap.value = newMap;
        cacheLoaded.value = true;
      } finally {
        this.loading = false;
      }
    },

    clearCache() {
      userCacheMap.value = new Map();
      cacheLoaded.value = false;
    },
  },
});

// 全局获取用户方法（响应式）
export function getUserById(id: number | null | undefined): CachedUser | undefined {
  if (!id) return undefined;
  return userCacheMap.value.get(id);
}

// 导出响应式状态供组件使用
export function useUserCache() {
  return {
    userCacheMap,
    cacheLoaded,
    getUserById,
  };
}
