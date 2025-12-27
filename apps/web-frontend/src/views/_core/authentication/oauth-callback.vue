<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { preferences } from '@vben/preferences';
import { useAccessStore } from '@vben/stores';

import { Spin } from 'ant-design-vue';

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
    class="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900"
  >
    <div class="text-center">
      <template v-if="loading">
        <Spin size="large" />
        <p class="mt-4 text-gray-600 dark:text-gray-400">
          正在登录中，请稍候...
        </p>
      </template>
      <template v-else-if="error">
        <div class="rounded-lg bg-white p-8 shadow-lg dark:bg-gray-800">
          <div class="mb-4 text-5xl">😕</div>
          <h2
            class="mb-2 text-xl font-semibold text-gray-800 dark:text-gray-200"
          >
            登录失败
          </h2>
          <p class="mb-6 text-gray-600 dark:text-gray-400">{{ error }}</p>
          <button
            class="rounded-lg bg-blue-500 px-6 py-2 text-white transition-colors hover:bg-blue-600"
            @click="handleRetry"
          >
            返回登录
          </button>
        </div>
      </template>
    </div>
  </div>
</template>
