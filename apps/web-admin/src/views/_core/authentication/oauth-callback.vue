<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { preferences } from '@vben/preferences';
import { useAccessStore } from '@vben/stores';

import { getAccessCodesApi } from '#/api';
import { oauthCallbackApi } from '#/api/system/oauth';
import { useAuthStore } from '#/store';

defineOptions({ name: 'OAuthCallback' });

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const accessStore = useAccessStore();

const loading = ref(true);
const error = ref('');

onMounted(async () => {
  const provider = route.params.provider as string;
  const code = route.query.code as string;
  const state = route.query.state as string;

  if (!code) {
    error.value = '授权失败：未获取到授权码';
    loading.value = false;
    return;
  }

  try {
    const result = await oauthCallbackApi(provider, code);

    // 保存token
    authStore.setAccessToken(result.token);

    // 获取用户信息
    await authStore.fetchUserInfo();

    // 获取权限码
    const accessCodes = await getAccessCodesApi();
    accessStore.setAccessCodes(accessCodes);

    // 解码 state 参数并跳转
    let redirectPath = '/';
    if (state) {
      try {
        redirectPath = decodeURIComponent(state);
      } catch {
        redirectPath = state;
      }
    }
    // 如果是登录页或空，跳转到默认首页
    if (
      !redirectPath ||
      redirectPath === '/' ||
      redirectPath === '/auth/login'
    ) {
      redirectPath = preferences.app.defaultHomePath;
    }

    router.replace(redirectPath);
  } catch (error_: any) {
    error.value = error_?.message || '登录失败，请重试';
    loading.value = false;
  }
});

function handleRetry() {
  router.replace('/auth/login');
}
</script>

<template>
  <div
    class="flex h-full min-h-[400px] items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900"
  >
    <div class="text-center">
      <!-- Loading 状态 -->
      <template v-if="loading">
        <div
          class="rounded-2xl bg-white/80 px-12 py-10 shadow-2xl backdrop-blur-sm dark:bg-gray-800/80"
        >
          <!-- Loading 动画 -->
          <div class="mb-6 flex items-center justify-center">
            <div
              class="h-12 w-12 animate-spin rounded-full border-3 border-gray-200 border-t-blue-500 dark:border-gray-700 dark:border-t-blue-400"
            ></div>
          </div>
          <!-- 文字 -->
          <h3
            class="mb-2 text-lg font-semibold text-gray-800 dark:text-gray-100"
          >
            正在登录中
          </h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            正在验证您的身份，请稍候...
          </p>
          <!-- 进度点动画 -->
          <div class="mt-4 flex items-center justify-center gap-1">
            <span
              class="h-2 w-2 animate-bounce rounded-full bg-blue-500"
              style="animation-delay: 0ms"
            ></span>
            <span
              class="h-2 w-2 animate-bounce rounded-full bg-blue-500"
              style="animation-delay: 150ms"
            ></span>
            <span
              class="h-2 w-2 animate-bounce rounded-full bg-blue-500"
              style="animation-delay: 300ms"
            ></span>
          </div>
        </div>
      </template>

      <!-- 错误状态 -->
      <template v-else-if="error">
        <div
          class="rounded-2xl bg-white/80 px-12 py-10 shadow-2xl backdrop-blur-sm dark:bg-gray-800/80"
        >
          <div
            class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30"
          >
            <svg
              class="h-8 w-8 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h2
            class="mb-2 text-xl font-semibold text-gray-800 dark:text-gray-200"
          >
            登录失败
          </h2>
          <p class="mb-6 text-sm text-gray-500 dark:text-gray-400">
            {{ error }}
          </p>
          <button
            class="rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 px-8 py-2.5 font-medium text-white shadow-lg transition-all hover:from-blue-600 hover:to-purple-600 hover:shadow-xl"
            @click="handleRetry"
          >
            返回登录
          </button>
        </div>
      </template>
    </div>
  </div>
</template>
