<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useDebounceFn } from '@vueuse/core';

import { createIconifyIcon } from '@vben/icons';
import {
  Button,
  Dropdown,
  Input,
  Menu,
  Tabs,
  Tooltip,
  message,
} from 'ant-design-vue';

import type { HttpStepNode, ParamItem, KeywordConfig } from '../../types';
import { createHttpConfig, HTTP_METHOD_COLORS } from '../../types';
import { debugStepApi } from '#/api/debug';

// 子组件
import ParamTable from '../../components/ParamTable.vue';
import BodyPanel from './BodyPanel.vue';
import AuthPanel from './AuthPanel.vue';
import SettingsPanel from './SettingsPanel.vue';
import PreProcessorPanel from './PreProcessorPanel.vue';
import PostProcessorPanel from './PostProcessorPanel.vue';
import ResponsePanel from './ResponsePanel.vue';

// 图标
const SendIcon = createIconifyIcon('lucide:send');
const LinkIcon = createIconifyIcon('lucide:link');
const ChevronDownIcon = createIconifyIcon('lucide:chevron-down');
// const DownloadIcon = createIconifyIcon('lucide:download');

interface Props {
  node: HttpStepNode;
  envId?: number;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update', node: HttpStepNode): void;
}>();

// 本地数据
const localNode = ref<HttpStepNode | null>(null);
const activeTab = ref('params');
const isDebugging = ref(false);
const debugResponse = ref<any>(null);

// HTTP 方法选项
const methodOptions = [
  { label: 'GET', value: 'GET', color: HTTP_METHOD_COLORS.GET },
  { label: 'POST', value: 'POST', color: HTTP_METHOD_COLORS.POST },
  { label: 'PUT', value: 'PUT', color: HTTP_METHOD_COLORS.PUT },
  { label: 'DELETE', value: 'DELETE', color: HTTP_METHOD_COLORS.DELETE },
  { label: 'PATCH', value: 'PATCH', color: HTTP_METHOD_COLORS.PATCH },
];

// 确保值是数组类型
function ensureArray(value: any): ParamItem[] {
  if (Array.isArray(value)) {
    return value;
  }
  // 如果是对象（旧格式），转换为数组
  if (value && typeof value === 'object') {
    return Object.entries(value).map(([key, val], index) => ({
      id: `param_${Date.now()}_${index}`,
      enabled: true,
      key,
      value: String(val),
      type: 'text' as const,
      description: '',
    }));
  }
  return [];
}

// 同步外部数据
watch(
  () => props.node,
  (newNode) => {
    if (newNode) {
      localNode.value = JSON.parse(JSON.stringify(newNode));
      // 确保 config 存在
      if (!localNode.value!.config) {
        localNode.value!.config = createHttpConfig();
      }
      // 确保各个数组存在且是正确的数组类型
      localNode.value!.config.params = ensureArray(localNode.value!.config.params);
      localNode.value!.config.headers = ensureArray(localNode.value!.config.headers);
      localNode.value!.config.cookies = ensureArray(localNode.value!.config.cookies);
      if (!localNode.value!.preProcessors) {
        localNode.value!.preProcessors = [];
      }
      if (!localNode.value!.postProcessors) {
        localNode.value!.postProcessors = [];
      }
    }
  },
  { immediate: true, deep: true }
);

// 当前方法颜色
const currentMethodColor = computed(() => {
  const method = localNode.value?.config?.method || 'GET';
  return HTTP_METHOD_COLORS[method] || HTTP_METHOD_COLORS.GET;
});

// 防抖更新
const debouncedEmit = useDebounceFn(() => {
  if (localNode.value) {
    emit('update', JSON.parse(JSON.stringify(localNode.value)));
  }
}, 300);

// 触发更新
function emitUpdate() {
  debouncedEmit();
}

// 更新方法
function updateMethod(method: string) {
  if (localNode.value?.config) {
    localNode.value.config.method = method as any;
    emitUpdate();
  }
}

// 更新 URL
function updateUrl(url: string) {
  if (localNode.value?.config) {
    localNode.value.config.url = url;
    emitUpdate();
  }
}

// 更新域名代码
// function updateDomainCode(code: string) {
//   if (localNode.value?.config) {
//     localNode.value.config.domainCode = code;
//     emitUpdate();
//   }
// }

// 更新参数
function updateParams(params: ParamItem[]) {
  if (localNode.value?.config) {
    localNode.value.config.params = params;
    emitUpdate();
  }
}

// 更新请求头
function updateHeaders(headers: ParamItem[]) {
  if (localNode.value?.config) {
    localNode.value.config.headers = headers;
    emitUpdate();
  }
}

// 更新 Cookies
function updateCookies(cookies: ParamItem[]) {
  if (localNode.value?.config) {
    localNode.value.config.cookies = cookies;
    emitUpdate();
  }
}

// 更新请求体
function updateBody(body: any) {
  if (localNode.value?.config) {
    localNode.value.config.body = body;
    emitUpdate();
  }
}

// 更新认证
function updateAuth(auth: any) {
  if (localNode.value?.config) {
    localNode.value.config.auth = auth;
    emitUpdate();
  }
}

// 更新设置
function updateSettings(settings: any) {
  if (localNode.value?.config) {
    localNode.value.config.settings = settings;
    emitUpdate();
  }
}

// 更新前置处理器
function updatePreProcessors(processors: KeywordConfig[]) {
  if (localNode.value) {
    localNode.value.preProcessors = processors;
    emitUpdate();
  }
}

// 更新后置处理器
function updatePostProcessors(processors: KeywordConfig[]) {
  if (localNode.value) {
    localNode.value.postProcessors = processors;
    emitUpdate();
  }
}

// 发送请求（单步调试）
async function handleSend() {
  if (!localNode.value || isDebugging.value) return;

  isDebugging.value = true;
  debugResponse.value = null;

  try {
    // 调用单步调试 API
    const response = await debugStepApi({
      nodeConfig: {
        id: localNode.value.id,
        type: 'http',
        name: localNode.value.name || 'HTTP 请求',
        config: localNode.value.config as any,
        preProcessors: localNode.value.preProcessors?.map((p: KeywordConfig) => ({
          id: p.id,
          type: p.type,
          enabled: p.enabled,
          name: p.name,
          config: p.config,
        })),
        postProcessors: localNode.value.postProcessors?.map((p: KeywordConfig) => ({
          id: p.id,
          type: p.type,
          enabled: p.enabled,
          name: p.name,
          config: p.config,
        })),
      },
      envId: props.envId,
    });

    if (response.success && response.response) {
      debugResponse.value = {
        statusCode: response.response.statusCode,
        statusText: response.response.statusText,
        duration: response.response.duration,
        size: response.response.size,
        headers: response.response.headers,
        cookies: response.response.cookies || {},
        body: response.response.body,
        bodyType: response.response.bodyType,
        assertions: response.assertionResults,
        console: response.consoleLogs,
        actualRequest: response.actualRequest,
      };
    } else {
      debugResponse.value = {
        statusCode: 0,
        statusText: 'Error',
        duration: 0,
        size: 0,
        headers: {},
        cookies: {},
        body: response.error || '请求失败',
        bodyType: 'text',
      };
      message.error(response.error || '请求失败');
    }
  } catch (error: any) {
    debugResponse.value = {
      statusCode: 0,
      statusText: 'Error',
      duration: 0,
      size: 0,
      headers: {},
      cookies: {},
      body: error.message || '请求失败',
      bodyType: 'text',
    };
    message.error(error.message || '请求失败');
  } finally {
    isDebugging.value = false;
  }
}

// 计算各 Tab 的数量标记
const paramsCount = computed(() => {
  const params = localNode.value?.config?.params;
  return Array.isArray(params) ? params.filter(p => p.enabled && p.key).length : 0;
});
const headersCount = computed(() => {
  const headers = localNode.value?.config?.headers;
  return Array.isArray(headers) ? headers.filter(p => p.enabled && p.key).length : 0;
});
const cookiesCount = computed(() => {
  const cookies = localNode.value?.config?.cookies;
  return Array.isArray(cookies) ? cookies.filter(p => p.enabled && p.key).length : 0;
});
const preProcessorsCount = computed(() => {
  const processors = localNode.value?.preProcessors;
  return Array.isArray(processors) ? processors.filter((p: KeywordConfig) => p.enabled).length : 0;
});
const postProcessorsCount = computed(() => {
  const processors = localNode.value?.postProcessors;
  return Array.isArray(processors) ? processors.filter((p: KeywordConfig) => p.enabled).length : 0;
});
</script>

<template>
  <div class="http-property-panel" v-if="localNode">
    <!-- 请求头部 -->
    <div class="request-header">
      <!-- 方法选择器 -->
      <Dropdown :trigger="['click']">
        <Button
          class="method-selector"
          :style="{
            backgroundColor: currentMethodColor + '20',
            color: currentMethodColor,
            borderColor: currentMethodColor + '40',
          }"
        >
          {{ localNode.config?.method || 'GET' }}
          <ChevronDownIcon class="size-4 ml-1" />
        </Button>
        <template #overlay>
          <Menu @click="({ key }: any) => updateMethod(key)">
            <Menu.Item
              v-for="opt in methodOptions"
              :key="opt.value"
              :style="{ color: opt.color }"
            >
              {{ opt.label }}
            </Menu.Item>
          </Menu>
        </template>
      </Dropdown>

      <!-- 域名代码 -->
      <Tooltip title="域名代码">
        <Button type="text" class="domain-btn">
          <LinkIcon class="size-4" />
        </Button>
      </Tooltip>

      <!-- URL 输入框 -->
      <Input
        :value="localNode.config?.url"
        placeholder="请输入 URL，支持变量 ${var}"
        class="url-input"
        @change="(e: any) => updateUrl(e.target.value)"
      />

      <!-- 发送按钮 -->
      <Button
        type="primary"
        class="send-btn"
        :loading="isDebugging"
        @click="handleSend"
      >
        <template #icon><SendIcon class="size-4" /></template>
        发送
      </Button>
    </div>

    <!-- Tab 导航 -->
    <Tabs v-model:activeKey="activeTab" class="request-tabs" size="small">
      <Tabs.TabPane key="params">
        <template #tab>
          <span>Params</span>
          <span v-if="paramsCount > 0" class="tab-count">{{ paramsCount }}</span>
        </template>
        <ParamTable
          :items="localNode.config?.params || []"
          :placeholder="{ key: '参数名', value: '参数值' }"
          @update="updateParams"
        />
      </Tabs.TabPane>

      <Tabs.TabPane key="body" tab="Body">
        <BodyPanel
          :body="localNode.config?.body"
          @update="updateBody"
        />
      </Tabs.TabPane>

      <Tabs.TabPane key="headers">
        <template #tab>
          <span>Headers</span>
          <span v-if="headersCount > 0" class="tab-count">{{ headersCount }}</span>
        </template>
        <ParamTable
          :items="localNode.config?.headers || []"
          :placeholder="{ key: 'Header 名称', value: 'Header 值' }"
          @update="updateHeaders"
        />
      </Tabs.TabPane>

      <Tabs.TabPane key="cookies">
        <template #tab>
          <span>Cookies</span>
          <span v-if="cookiesCount > 0" class="tab-count">{{ cookiesCount }}</span>
        </template>
        <ParamTable
          :items="localNode.config?.cookies || []"
          :placeholder="{ key: 'Cookie 名称', value: 'Cookie 值' }"
          @update="updateCookies"
        />
      </Tabs.TabPane>

      <Tabs.TabPane key="auth" tab="Auth">
        <AuthPanel
          :auth="localNode.config?.auth"
          @update="updateAuth"
        />
      </Tabs.TabPane>

      <Tabs.TabPane key="pre">
        <template #tab>
          <span>前置操作</span>
          <span v-if="preProcessorsCount > 0" class="tab-count">{{ preProcessorsCount }}</span>
        </template>
        <PreProcessorPanel
          :processors="localNode.preProcessors || []"
          @update="updatePreProcessors"
        />
      </Tabs.TabPane>

      <Tabs.TabPane key="post">
        <template #tab>
          <span>后置操作</span>
          <span v-if="postProcessorsCount > 0" class="tab-count">{{ postProcessorsCount }}</span>
        </template>
        <PostProcessorPanel
          :processors="localNode.postProcessors || []"
          @update="updatePostProcessors"
        />
      </Tabs.TabPane>

      <Tabs.TabPane key="settings" tab="设置">
        <SettingsPanel
          :settings="localNode.config?.settings"
          @update="updateSettings"
        />
      </Tabs.TabPane>
    </Tabs>

    <!-- 响应区域 -->
    <ResponsePanel
      v-if="debugResponse"
      :response="debugResponse"
      class="response-section"
    />
  </div>
</template>

<style scoped>
.http-property-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px;
  overflow: hidden;
}

.request-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  flex-shrink: 0;
}

.method-selector {
  min-width: 90px;
  font-weight: 600;
  border-radius: 6px;
}

.domain-btn {
  flex-shrink: 0;
}

.url-input {
  flex: 1;
}

.url-input :deep(.ant-input) {
  border-radius: 6px;
}

.send-btn {
  flex-shrink: 0;
  border-radius: 6px;
}

.request-tabs {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.request-tabs :deep(.ant-tabs-content) {
  height: calc(100% - 46px);
  overflow-y: auto;
}

.request-tabs :deep(.ant-tabs-tabpane) {
  padding: 12px 0;
}

.tab-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 6px;
  margin-left: 6px;
  font-size: 11px;
  font-weight: 500;
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 15%);
  border-radius: 9px;
}

.response-section {
  flex-shrink: 0;
  margin-top: 16px;
  border-top: 1px solid hsl(var(--border));
  padding-top: 16px;
}
</style>
