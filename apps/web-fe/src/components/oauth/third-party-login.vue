<script setup lang="ts">
import type { OAuthApi } from '#/api/system/oauth';

import { onMounted, ref } from 'vue';

import {
  SvgDingDingIcon,
  SvgGithubIcon,
  SvgQQChatIcon,
  SvgWeChatIcon,
} from '@vben/icons';

import { message, Spin, Tooltip } from 'ant-design-vue';

import { getOAuthUrlApi, getPublicOAuthProvidersApi } from '#/api/system/oauth';

defineOptions({ name: 'ThirdPartyLogin' });

const providers = ref<OAuthApi.Provider[]>([]);
const loading = ref(false);
const loginLoading = ref<null | string>(null);

// 图标映射
const iconMap: Record<string, any> = {
  github: SvgGithubIcon,
  wechat: SvgWeChatIcon,
  qq: SvgQQChatIcon,
  dingtalk: SvgDingDingIcon,
};

// 颜色映射
const colorMap: Record<string, string> = {
  github: '#24292e',
  wechat: '#07c160',
  qq: '#12b7f5',
  feishu: '#3370ff',
  dingtalk: '#0089ff',
};

onMounted(async () => {
  loading.value = true;
  try {
    providers.value = await getPublicOAuthProvidersApi();
  } catch (error) {
    console.error('获取OAuth提供商失败', error);
  } finally {
    loading.value = false;
  }
});

async function handleOAuthLogin(provider: OAuthApi.Provider) {
  if (loginLoading.value) return;

  loginLoading.value = provider.code;
  try {
    // 获取授权URL，state 传入当前路径用于回调后跳转
    const state = encodeURIComponent(
      window.location.pathname === '/auth/login'
        ? '/'
        : window.location.pathname,
    );
    const result = await getOAuthUrlApi(provider.code, state);

    // 跳转到授权页面
    window.location.href = result.url;
  } catch (error: any) {
    message.error(error?.message || '获取授权链接失败');
    loginLoading.value = null;
  }
}

function getIcon(code: string) {
  return iconMap[code.toLowerCase()];
}

function getColor(code: string) {
  return colorMap[code.toLowerCase()] || '#666';
}
</script>

<template>
  <div v-if="providers.length > 0 || loading" class="w-full">
    <div class="mt-4 flex items-center justify-between">
      <span
        class="w-[35%] border-b border-gray-200 dark:border-gray-600"
      ></span>
      <span class="text-center text-xs uppercase text-gray-500">
        第三方登录
      </span>
      <span
        class="w-[35%] border-b border-gray-200 dark:border-gray-600"
      ></span>
    </div>

    <div class="mt-4 flex flex-wrap justify-center gap-3">
      <Spin v-if="loading" />
      <template v-else>
        <Tooltip
          v-for="provider in providers"
          :key="provider.id"
          :title="provider.name"
        >
          <button
            class="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 transition-all hover:scale-110 hover:shadow-md dark:border-gray-600"
            :style="{
              backgroundColor:
                loginLoading === provider.code
                  ? getColor(provider.code)
                  : 'transparent',
              color:
                loginLoading === provider.code
                  ? '#fff'
                  : getColor(provider.code),
            }"
            :disabled="!!loginLoading"
            @click="handleOAuthLogin(provider)"
          >
            <Spin v-if="loginLoading === provider.code" size="small" />
            <component
              :is="getIcon(provider.code)"
              v-else-if="getIcon(provider.code)"
              class="text-xl"
            />
            <span v-else class="text-sm font-bold">
              {{ provider.name.charAt(0).toUpperCase() }}
            </span>
          </button>
        </Tooltip>
      </template>
    </div>
  </div>
</template>
