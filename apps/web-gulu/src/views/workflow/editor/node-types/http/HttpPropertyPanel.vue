<script setup lang="ts">
import { computed, ref, toRef, watch } from 'vue';
import { useDebounceFn } from '@vueuse/core';

import { createIconifyIcon } from '@vben/icons';
import {
  Button,
  Dropdown,
  Input,
  Menu,
  Spin,
  Tabs,
  Tooltip,
} from 'ant-design-vue';

import type { HttpStepNode, ParamItem, KeywordConfig } from '../../types';
import { createHttpConfig, HTTP_METHOD_COLORS } from '../../types';
import type { StepExecutionResult } from '#/api/debug';
import { useStepDebug } from '../../../components/execution/composables/useStepDebug';
import { useDebugContext } from '../../../components/execution/composables/useDebugContext';

// 子组件
import ParamTable from '../../components/ParamTable.vue';
import BodyPanel from './BodyPanel.vue';
import AuthPanel from './AuthPanel.vue';
import SettingsPanel from './SettingsPanel.vue';
import ProcessorPanel from './ProcessorPanel.vue';
import ResponsePanel from './ResponsePanel.vue';

// 子组件 - 域名选择器
import DomainSelector from './DomainSelector.vue';

// 图标
const SendIcon = createIconifyIcon('lucide:send');
const ChevronDownIcon = createIconifyIcon('lucide:chevron-down');
const GripHorizontalIcon = createIconifyIcon('lucide:grip-horizontal');

interface Props {
  node: HttpStepNode;
  envId?: number;
  workflowId?: number;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update', node: HttpStepNode): void;
}>();

// 调试上下文
const debugContext = useDebugContext();
const hasDebugCtx = computed(() => !!props.workflowId && debugContext.hasContext(props.workflowId));

// 本地数据
const localNode = ref<HttpStepNode | null>(null);
const activeTab = ref('params');

// 单步调试
const { isDebugging, debugResponse, run: runStep } = useStepDebug<any>({
  workflowId: toRef(props, 'workflowId'),
  envId: toRef(props, 'envId'),
  stream: false,
  transformResult(step: StepExecutionResult) {
    const r = step.result as any;
    if (!r) return null;
    return {
      statusCode: r.statusCode,
      statusText: r.statusText,
      duration: r.duration,
      size: r.size,
      headers: r.headers || {},
      cookies: r.cookies || {},
      body: r.body,
      bodyType: r.bodyType,
      assertions: r.assertions,
      consoleLogs: r.consoleLogs,
      actualRequest: r.actualRequest,
    };
  },
  transformError(error: string) {
    return {
      statusCode: 0,
      statusText: 'Error',
      duration: 0,
      size: 0,
      headers: {},
      cookies: {},
      body: error,
      bodyType: 'text',
    };
  },
});

// 分割面板相关
const containerRef = ref<HTMLElement | null>(null);
const isDragging = ref(false);
const requestPanelHeight = ref(60); // 请求面板高度百分比

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
      if (!localNode.value!.config) {
        localNode.value!.config = createHttpConfig();
      }
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

function emitUpdate() {
  debouncedEmit();
}

// 是否选择了域名
const hasDomain = computed(() => !!localNode.value?.config?.domainCode);

// URL 输入框 placeholder
const urlPlaceholder = computed(() =>
  hasDomain.value
    ? '输入路径，如 /api/users，支持变量 ${var}'
    : '输入请求 URL，支持变量 ${var}',
);

function updateMethod(method: string) {
  if (localNode.value?.config) {
    localNode.value.config.method = method as any;
    emitUpdate();
  }
}

function updateDomainCode(code: string) {
  if (localNode.value?.config) {
    localNode.value.config.domainCode = code;
    emitUpdate();
  }
}

function updateUrl(url: string) {
  if (localNode.value?.config) {
    localNode.value.config.url = url;
    emitUpdate();
  }
}

function updateParams(params: ParamItem[]) {
  if (localNode.value?.config) {
    localNode.value.config.params = params;
    emitUpdate();
  }
}

function updateHeaders(headers: ParamItem[]) {
  if (localNode.value?.config) {
    localNode.value.config.headers = headers;
    emitUpdate();
  }
}

function updateCookies(cookies: ParamItem[]) {
  if (localNode.value?.config) {
    localNode.value.config.cookies = cookies;
    emitUpdate();
  }
}

function updateBody(body: any) {
  if (localNode.value?.config) {
    localNode.value.config.body = body;
    emitUpdate();
  }
}

function updateAuth(auth: any) {
  if (localNode.value?.config) {
    localNode.value.config.auth = auth;
    emitUpdate();
  }
}

function updateSettings(settings: any) {
  if (localNode.value?.config) {
    localNode.value.config.settings = settings;
    emitUpdate();
  }
}

function updatePreProcessors(processors: KeywordConfig[]) {
  if (localNode.value) {
    localNode.value.preProcessors = processors;
    emitUpdate();
  }
}

function updatePostProcessors(processors: KeywordConfig[]) {
  if (localNode.value) {
    localNode.value.postProcessors = processors;
    emitUpdate();
  }
}

function handleSend() {
  if (!localNode.value) return;

  runStep({
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
  });
}

// 拖拽分割条
function startDrag(e: MouseEvent) {
  isDragging.value = true;
  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', stopDrag);
  e.preventDefault();
}

function onDrag(e: MouseEvent) {
  if (!isDragging.value || !containerRef.value) return;

  const rect = containerRef.value.getBoundingClientRect();
  const offsetY = e.clientY - rect.top;
  const percentage = (offsetY / rect.height) * 100;

  // 限制范围 20% - 80%
  requestPanelHeight.value = Math.min(80, Math.max(20, percentage));
}

function stopDrag() {
  isDragging.value = false;
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
}

// Tab 数量
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
  <div class="http-panel" ref="containerRef" v-if="localNode">
    <!-- 请求区域 -->
    <div
      class="request-section"
      :style="{ height: debugResponse ? `${requestPanelHeight}%` : '100%' }"
    >
      <!-- URL 栏 -->
      <div class="url-bar">
        <Dropdown :trigger="['click']">
          <button
            class="method-btn"
            :style="{ '--method-color': currentMethodColor }"
          >
            {{ localNode.config?.method || 'GET' }}
            <ChevronDownIcon class="size-3 ml-1 opacity-60" />
          </button>
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

        <DomainSelector
          :domain-code="localNode.config?.domainCode || ''"
          @update:domain-code="updateDomainCode"
        />

        <Input
          :value="localNode.config?.url"
          :placeholder="urlPlaceholder"
          class="url-input"
          :bordered="false"
          @change="(e: any) => updateUrl(e.target.value)"
        />

        <Tooltip v-if="hasDebugCtx" title="使用调试上下文变量">
          <span class="debug-ctx-dot" />
        </Tooltip>
        <Button
          type="primary"
          class="send-btn"
          :loading="isDebugging"
          @click="handleSend"
        >
          <template #icon><SendIcon class="size-4" /></template>
          发 送
        </Button>
      </div>

      <!-- 请求配置 Tabs -->
      <Tabs v-model:activeKey="activeTab" class="config-tabs" size="small">
        <Tabs.TabPane key="params">
          <template #tab>
            <span>Params</span>
            <span v-if="paramsCount > 0" class="tab-badge">{{ paramsCount }}</span>
          </template>
          <div class="tab-content">
            <ParamTable
              :items="localNode.config?.params || []"
              :placeholder="{ key: '参数名', value: '参数值' }"
              @update="updateParams"
            />
          </div>
        </Tabs.TabPane>

        <Tabs.TabPane key="body">
          <template #tab>
            <span>Body</span>
          </template>
          <div class="tab-content">
            <BodyPanel
              :body="localNode.config?.body"
              @update="updateBody"
            />
          </div>
        </Tabs.TabPane>

        <Tabs.TabPane key="headers">
          <template #tab>
            <span>Headers</span>
            <span v-if="headersCount > 0" class="tab-badge">{{ headersCount }}</span>
          </template>
          <div class="tab-content">
            <ParamTable
              :items="localNode.config?.headers || []"
              :placeholder="{ key: 'Header 名称', value: 'Header 值' }"
              :show-header-suggestions="true"
              @update="updateHeaders"
            />
          </div>
        </Tabs.TabPane>

        <Tabs.TabPane key="cookies">
          <template #tab>
            <span>Cookies</span>
            <span v-if="cookiesCount > 0" class="tab-badge">{{ cookiesCount }}</span>
          </template>
          <div class="tab-content">
            <ParamTable
              :items="localNode.config?.cookies || []"
              :placeholder="{ key: 'Cookie 名称', value: 'Cookie 值' }"
              @update="updateCookies"
            />
          </div>
        </Tabs.TabPane>

        <Tabs.TabPane key="auth" tab="Auth">
          <div class="tab-content">
            <AuthPanel
              :auth="localNode.config?.auth"
              @update="updateAuth"
            />
          </div>
        </Tabs.TabPane>

        <Tabs.TabPane key="pre">
          <template #tab>
            <span>前置操作</span>
            <span v-if="preProcessorsCount > 0" class="tab-badge">{{ preProcessorsCount }}</span>
          </template>
          <div class="tab-content">
            <ProcessorPanel
              mode="pre"
              :processors="localNode.preProcessors || []"
              @update="updatePreProcessors"
            />
          </div>
        </Tabs.TabPane>

        <Tabs.TabPane key="post">
          <template #tab>
            <span>后置操作</span>
            <span v-if="postProcessorsCount > 0" class="tab-badge">{{ postProcessorsCount }}</span>
          </template>
          <div class="tab-content">
            <ProcessorPanel
              mode="post"
              :processors="localNode.postProcessors || []"
              @update="updatePostProcessors"
            />
          </div>
        </Tabs.TabPane>

        <Tabs.TabPane key="settings" tab="设置">
          <div class="tab-content">
            <SettingsPanel
              :settings="localNode.config?.settings"
              @update="updateSettings"
            />
          </div>
        </Tabs.TabPane>
      </Tabs>
    </div>

    <!-- 分割条 -->
    <div
      v-if="debugResponse || isDebugging"
      class="resize-bar"
      :class="{ dragging: isDragging }"
      @mousedown="startDrag"
    >
      <GripHorizontalIcon class="resize-icon" />
    </div>

    <!-- 响应区域 -->
    <div
      v-if="debugResponse || isDebugging"
      class="response-section"
      :style="{ height: `calc(${100 - requestPanelHeight}% - 4px)` }"
    >
      <Spin :spinning="isDebugging" tip="请求中...">
        <ResponsePanel v-if="debugResponse" :response="debugResponse" />
        <div v-else class="loading-placeholder" />
      </Spin>
    </div>
  </div>
</template>


<style scoped>
.http-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: hsl(var(--background));
  overflow: hidden;
}

/* 请求区域 */
.request-section {
  display: flex;
  flex-direction: column;
  min-height: 200px;
  overflow: hidden;
}

/* URL 栏 */
.url-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: hsl(var(--card));
  border-bottom: 1px solid hsl(var(--border));
}

.method-btn {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--method-color);
  background: color-mix(in srgb, var(--method-color) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--method-color) 30%, transparent);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.method-btn:hover {
  background: color-mix(in srgb, var(--method-color) 18%, transparent);
}

.url-input {
  flex: 1;
  height: 32px;
  font-size: 13px;
  background: hsl(var(--accent) / 50%);
  border-radius: 6px;
}

.url-input :deep(.ant-input) {
  background: transparent;
  font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
}

.debug-ctx-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #52c41a;
  box-shadow: 0 0 4px #52c41a80;
  flex-shrink: 0;
}

.send-btn {
  height: 32px;
  padding: 0 20px;
  font-weight: 500;
  border-radius: 6px;
}

/* 配置 Tabs */
.config-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.config-tabs :deep(.ant-tabs-nav) {
  margin: 0;
  padding: 0 16px;
  background: hsl(var(--card));
  border-bottom: 1px solid hsl(var(--border));
}

.config-tabs :deep(.ant-tabs-nav::before) {
  display: none;
}

.config-tabs :deep(.ant-tabs-tab) {
  padding: 8px 4px;
  font-size: 13px;
}

.config-tabs :deep(.ant-tabs-tab + .ant-tabs-tab) {
  margin-left: 20px;
}

.config-tabs :deep(.ant-tabs-tab-active .ant-tabs-tab-btn) {
  color: hsl(var(--primary));
  font-weight: 500;
}

.config-tabs :deep(.ant-tabs-ink-bar) {
  background: hsl(var(--primary));
}

.config-tabs :deep(.ant-tabs-content-holder) {
  flex: 1;
  overflow: hidden;
}

.config-tabs :deep(.ant-tabs-content) {
  height: 100%;
}

.config-tabs :deep(.ant-tabs-tabpane) {
  height: 100%;
  overflow: hidden;
}

.tab-content {
  height: 100%;
  padding: 12px 16px;
  overflow-y: auto;
}

.tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  margin-left: 6px;
  font-size: 11px;
  font-weight: 500;
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 12%);
  border-radius: 9px;
}

/* 分割条 */
.resize-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 4px;
  background: hsl(var(--border));
  cursor: row-resize;
  transition: background 0.2s;
  flex-shrink: 0;
}

.resize-bar:hover,
.resize-bar.dragging {
  background: hsl(var(--primary) / 40%);
}

.resize-icon {
  width: 20px;
  height: 8px;
  color: hsl(var(--foreground) / 25%);
}

.resize-bar:hover .resize-icon,
.resize-bar.dragging .resize-icon {
  color: hsl(var(--primary));
}

/* 响应区域 */
.response-section {
  display: flex;
  flex-direction: column;
  min-height: 150px;
  overflow: hidden;
  background: hsl(var(--card));
}

.response-section :deep(.ant-spin-nested-loading),
.response-section :deep(.ant-spin-container) {
  height: 100%;
}

.loading-placeholder {
  height: 100%;
  min-height: 150px;
}
</style>
