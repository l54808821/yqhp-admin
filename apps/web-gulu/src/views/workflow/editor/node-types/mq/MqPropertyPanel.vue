<script setup lang="ts">
import { computed, ref, toRef, watch } from 'vue';
import { useDebounceFn } from '@vueuse/core';

import { createIconifyIcon } from '@vben/icons';
import {
  Button,
  Input,
  Select,
  Spin,
  Tabs,
  Tooltip,
} from 'ant-design-vue';

import type { MqStepNode, MqResponseData, ParamItem, KeywordConfig } from '../../types';
import { createMqConfig, MQ_ACTION_COLORS } from '../../types/mq';
import type { StepExecutionResult } from '#/api/debug';
import { useStepDebug } from '../../../components/execution/composables/useStepDebug';
import { useDebugContext } from '../../../components/execution/composables/useDebugContext';

import ParamTable from '../../components/ParamTable.vue';
import ProcessorPanel from '../http/ProcessorPanel.vue';
import MqConfigSelector from './MqConfigSelector.vue';
import MqSettingsPanel from './MqSettingsPanel.vue';
import MqResponsePanel from './MqResponsePanel.vue';

const SendIcon = createIconifyIcon('lucide:send');
const InboxIcon = createIconifyIcon('lucide:inbox');
const GripHorizontalIcon = createIconifyIcon('lucide:grip-horizontal');

interface Props {
  node: MqStepNode;
  envId?: number;
  workflowId?: number;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update', node: MqStepNode): void;
}>();

// 调试上下文
const debugContext = useDebugContext();
const hasDebugCtx = computed(
  () => !!props.workflowId && debugContext.hasContext(props.workflowId),
);

// 本地数据
const localNode = ref<MqStepNode | null>(null);
const activeTab = ref('message');

// 单步调试
const { isDebugging, debugResponse, run: runStep } = useStepDebug<MqResponseData | null>({
  workflowId: toRef(props, 'workflowId'),
  envId: toRef(props, 'envId'),
  stream: false,
  transformResult(step: StepExecutionResult) {
    const r = step.result as any;
    if (!r) {
      return {
        success: false,
        action: localNode.value?.config?.action || 'send',
        durationMs: step.durationMs ?? 0,
        error: step.error || '未获取到执行结果',
      };
    }
    return {
      success: r.success ?? step.success,
      action: r.action || localNode.value?.config?.action || 'send',
      durationMs: r.durationMs ?? r.duration ?? step.durationMs ?? 0,
      topic: r.topic,
      queue: r.queue,
      messages: r.messages,
      count: r.count ?? r.messages?.length,
      error: r.error ?? step.error,
      consoleLogs: r.consoleLogs,
      assertions: r.assertions,
    };
  },
  transformError(error: string) {
    return {
      success: false,
      action: localNode.value?.config?.action || 'send',
      durationMs: 0,
      error,
    };
  },
});

// 分割面板
const containerRef = ref<HTMLElement | null>(null);
const isDragging = ref(false);
const requestPanelHeight = ref(60);

// 同步外部数据
watch(
  () => props.node,
  (newNode) => {
    if (newNode) {
      localNode.value = JSON.parse(JSON.stringify(newNode));
      if (!localNode.value!.config) {
        localNode.value!.config = createMqConfig();
      }
      if (!localNode.value!.config.headers) {
        localNode.value!.config.headers = [];
      }
      if (!localNode.value!.preProcessors) {
        localNode.value!.preProcessors = [];
      }
      if (!localNode.value!.postProcessors) {
        localNode.value!.postProcessors = [];
      }
    }
  },
  { immediate: true, deep: true },
);

// 当前操作颜色
const currentActionColor = computed(() => {
  const action = localNode.value?.config?.action || 'send';
  return MQ_ACTION_COLORS[action] || MQ_ACTION_COLORS.send;
});

// 是否发送模式
const isSendMode = computed(() => localNode.value?.config?.action === 'send');

// 防抖更新
const debouncedEmit = useDebounceFn(() => {
  if (localNode.value) {
    emit('update', JSON.parse(JSON.stringify(localNode.value)));
  }
}, 300);

function emitUpdate() {
  debouncedEmit();
}

function updateMqConfigCode(code: string) {
  if (localNode.value?.config) {
    localNode.value.config.mqConfigCode = code;
    emitUpdate();
  }
}

function updateAction(action: any) {
  if (localNode.value?.config) {
    localNode.value.config.action = action;
    emitUpdate();
  }
}

function updateHeaders(headers: ParamItem[]) {
  if (localNode.value?.config) {
    localNode.value.config.headers = headers;
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

function handleExecute() {
  if (!localNode.value) return;

  const config = localNode.value.config;
  runStep({
    id: localNode.value.id,
    type: 'mq',
    name: localNode.value.name || 'MQ 消息',
    config: {
      mq_config: config.mqConfigCode,
      action: config.action,
      topic: config.topic,
      queue: config.queue,
      message: config.message,
      key: config.key,
      headers: config.headers?.reduce((acc: Record<string, string>, h: ParamItem) => {
        if (h.enabled && h.key) acc[h.key] = h.value;
        return acc;
      }, {}),
      timeout: config.settings?.timeout ? `${config.settings.timeout}ms` : undefined,
      group_id: config.settings?.groupId || undefined,
      format: config.settings?.format || undefined,
      count: config.settings?.count || undefined,
    } as any,
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
  requestPanelHeight.value = Math.min(80, Math.max(20, percentage));
}

function stopDrag() {
  isDragging.value = false;
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
}

// Tab 数量
const headersCount = computed(() => {
  const headers = localNode.value?.config?.headers;
  return Array.isArray(headers) ? headers.filter((p) => p.enabled && p.key).length : 0;
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
  <div class="mq-panel" ref="containerRef" v-if="localNode">
    <!-- 请求区域 -->
    <div
      class="request-section"
      :style="{ height: debugResponse ? `${requestPanelHeight}%` : '100%' }"
    >
      <!-- 操作栏 -->
      <div class="action-bar">
        <!-- MQ 配置选择器 -->
        <MqConfigSelector
          :mq-config-code="localNode.config?.mqConfigCode || ''"
          @update:mq-config-code="updateMqConfigCode"
        />

        <!-- 操作类型 -->
        <Select
          :value="localNode.config?.action || 'send'"
          class="action-select"
          :style="{ '--action-color': currentActionColor }"
          @change="updateAction"
        >
          <Select.Option value="send">
            <span class="action-option">
              <SendIcon class="size-3.5" />
              发送
            </span>
          </Select.Option>
          <Select.Option value="receive">
            <span class="action-option">
              <InboxIcon class="size-3.5" />
              接收
            </span>
          </Select.Option>
        </Select>

        <div class="action-bar-spacer" />

        <!-- 调试上下文指示器 -->
        <Tooltip v-if="hasDebugCtx" title="使用调试上下文变量">
          <span class="debug-ctx-dot" />
        </Tooltip>

        <!-- 执行按钮 -->
        <Button
          type="primary"
          class="execute-btn"
          :loading="isDebugging"
          @click="handleExecute"
        >
          <template #icon>
            <SendIcon v-if="isSendMode" class="size-4" />
            <InboxIcon v-else class="size-4" />
          </template>
          {{ isSendMode ? '发 送' : '接 收' }}
        </Button>
      </div>

      <!-- 配置 Tabs -->
      <Tabs v-model:activeKey="activeTab" class="config-tabs" size="small">
        <Tabs.TabPane key="message">
          <template #tab>
            <span>消息配置</span>
          </template>
          <div class="tab-content">
            <div class="message-form">
              <div class="form-row">
                <label class="form-label">Topic</label>
                <Input
                  v-model:value="localNode.config.topic"
                  placeholder="消息主题，支持变量 ${var}"
                  @change="emitUpdate"
                />
              </div>
              <div class="form-row">
                <label class="form-label">Queue</label>
                <Input
                  v-model:value="localNode.config.queue"
                  placeholder="队列名称（RabbitMQ），支持变量 ${var}"
                  @change="emitUpdate"
                />
              </div>
              <div v-if="isSendMode" class="form-row">
                <label class="form-label">Key</label>
                <Input
                  v-model:value="localNode.config.key"
                  placeholder="消息 Key（可选），支持变量 ${var}"
                  @change="emitUpdate"
                />
              </div>
              <div v-if="isSendMode" class="form-row">
                <label class="form-label">消息内容</label>
                <Input.TextArea
                  v-model:value="localNode.config.message"
                  :rows="6"
                  placeholder="消息体，支持 JSON 或纯文本，支持变量 ${var}"
                  class="message-textarea"
                  @change="emitUpdate"
                />
              </div>
            </div>
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
              @update="updateHeaders"
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
            <MqSettingsPanel
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
      <Spin :spinning="isDebugging" tip="执行中...">
        <MqResponsePanel v-if="debugResponse" :response="debugResponse" />
        <div v-else class="loading-placeholder" />
      </Spin>
    </div>
  </div>
</template>

<style scoped>
.mq-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: hsl(var(--background));
  overflow: hidden;
}

.request-section {
  display: flex;
  flex-direction: column;
  min-height: 200px;
  overflow: hidden;
}

/* 操作栏 */
.action-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: hsl(var(--card));
  border-bottom: 1px solid hsl(var(--border));
}

.action-select {
  width: 110px;
}

.action-option {
  display: flex;
  align-items: center;
  gap: 4px;
}

.action-bar-spacer {
  flex: 1;
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

.execute-btn {
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

/* 消息表单 */
.message-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-label {
  font-size: 12px;
  font-weight: 500;
  color: hsl(var(--foreground) / 65%);
}

.message-textarea :deep(textarea) {
  font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
  font-size: 13px;
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
