<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useDebounceFn } from '@vueuse/core';

import { createIconifyIcon } from '@vben/icons';
import {
  Button,
  Select,
  Tabs,
  message,
} from 'ant-design-vue';

import { debugStepApi } from '#/api/debug';
import { CodeEditor } from '#/components/code-editor';

// 图标
const PlayIcon = createIconifyIcon('lucide:play');
const GripHorizontalIcon = createIconifyIcon('lucide:grip-horizontal');

interface ScriptConfig {
  language: string;
  script: string;
  timeout?: number;
}

interface ScriptStepNode {
  id: string;
  type: 'script';
  name: string;
  config: ScriptConfig;
}

interface Props {
  node: ScriptStepNode;
  envId?: number;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update', node: ScriptStepNode): void;
}>();

// 本地数据
const localNode = ref<ScriptStepNode | null>(null);
const activeTab = ref('script');
const isDebugging = ref(false);
const debugResponse = ref<any>(null);

// 分割面板相关
const containerRef = ref<HTMLElement | null>(null);
const isDragging = ref(false);
const editorPanelHeight = ref(60); // 编辑区高度百分比

// 语言选项
const languageOptions = [
  { label: 'JavaScript', value: 'javascript' },
];

// 同步外部数据
watch(
  () => props.node,
  (newNode) => {
    if (newNode) {
      localNode.value = JSON.parse(JSON.stringify(newNode));
      if (!localNode.value!.config) {
        localNode.value!.config = {
          language: 'javascript',
          script: '',
        };
      }
    }
  },
  { immediate: true, deep: true }
);

// 防抖更新
const debouncedEmit = useDebounceFn(() => {
  if (localNode.value) {
    emit('update', JSON.parse(JSON.stringify(localNode.value)));
  }
}, 300);

function emitUpdate() {
  debouncedEmit();
}

function updateLanguage(value: any) {
  if (localNode.value?.config && value) {
    localNode.value.config.language = String(value);
    emitUpdate();
  }
}

function updateScript(script: string) {
  if (localNode.value?.config) {
    localNode.value.config.script = script;
    emitUpdate();
  }
}

// 执行脚本
async function handleRun() {
  if (!localNode.value || isDebugging.value) return;

  isDebugging.value = true;
  debugResponse.value = null;

  try {
    const response = await debugStepApi({
      nodeConfig: {
        id: localNode.value.id,
        type: 'script',
        name: localNode.value.name || '脚本',
        config: {
          language: localNode.value.config?.language || 'javascript',
          script: localNode.value.config?.script || '',
          timeout: localNode.value.config?.timeout || 60,
        },
      },
      envId: props.envId,
    });

    if (response.success) {
      // 脚本结果在 scriptResult 字段
      const scriptResult = response.scriptResult;
      debugResponse.value = {
        success: !scriptResult?.error,
        result: scriptResult?.result,
        consoleLogs: scriptResult?.console_logs || response.consoleLogs || [],
        variables: scriptResult?.variables || {},
        durationMs: scriptResult?.duration_ms || 0,
        error: scriptResult?.error || response.error,
      };
      // 有响应时调整面板比例
      if (editorPanelHeight.value > 50) {
        editorPanelHeight.value = 50;
      }
    } else {
      debugResponse.value = {
        success: false,
        error: response.error || '执行失败',
        consoleLogs: response.consoleLogs || [],
        variables: {},
        durationMs: 0,
      };
      message.error(response.error || '执行失败');
    }
  } catch (error: any) {
    debugResponse.value = {
      success: false,
      error: error.message || '执行失败',
      consoleLogs: [],
      variables: {},
      durationMs: 0,
    };
    message.error(error.message || '执行失败');
  } finally {
    isDebugging.value = false;
  }
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
  editorPanelHeight.value = Math.min(80, Math.max(20, percentage));
}

function stopDrag() {
  isDragging.value = false;
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
}

// 格式化结果
function formatResult(result: any): string {
  if (result === undefined) return 'undefined';
  if (result === null) return 'null';
  if (typeof result === 'object') {
    return JSON.stringify(result, null, 2);
  }
  return String(result);
}

// 格式化时长
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

// 变量数量
const variablesCount = computed(() => {
  return Object.keys(debugResponse.value?.variables || {}).length;
});
</script>

<template>
  <div class="script-panel" ref="containerRef" v-if="localNode">
    <!-- 编辑区域 -->
    <div
      class="editor-section"
      :style="{ height: debugResponse ? `${editorPanelHeight}%` : '100%' }"
    >
      <!-- 工具栏 -->
      <div class="toolbar">
        <Select
          :value="localNode.config?.language || 'javascript'"
          :options="languageOptions"
          style="width: 140px"
          size="small"
          @change="updateLanguage"
        />
        <div class="toolbar-spacer" />
        <Button
          type="primary"
          size="small"
          :loading="isDebugging"
          @click="handleRun"
        >
          <template #icon><PlayIcon class="size-4" /></template>
          执 行
        </Button>
      </div>

      <!-- 代码编辑器 -->
      <div class="editor-wrapper">
        <CodeEditor
          :model-value="localNode.config?.script || ''"
          language="javascript"
          height="100%"
          @update:model-value="updateScript"
        />
      </div>
    </div>

    <!-- 分割条 -->
    <div
      v-if="debugResponse"
      class="resize-bar"
      :class="{ dragging: isDragging }"
      @mousedown="startDrag"
    >
      <GripHorizontalIcon class="resize-icon" />
    </div>

    <!-- 响应区域 -->
    <div
      v-if="debugResponse"
      class="response-section"
      :style="{ height: `calc(${100 - editorPanelHeight}% - 4px)` }"
    >
      <!-- 状态栏 -->
      <div class="status-bar" :class="{ success: debugResponse.success, error: !debugResponse.success }">
        <span class="status-text">
          {{ debugResponse.success ? '执行成功' : '执行失败' }}
        </span>
        <span class="divider">|</span>
        <span class="metric">耗时: {{ formatDuration(debugResponse.durationMs) }}</span>
      </div>

      <!-- Tab 内容 -->
      <Tabs v-model:activeKey="activeTab" class="response-tabs" size="small">
        <!-- 结果 Tab -->
        <Tabs.TabPane key="result" tab="结果">
          <div class="tab-content">
            <div v-if="debugResponse.error" class="error-message">
              {{ debugResponse.error }}
            </div>
            <pre v-else class="result-content">{{ formatResult(debugResponse.result) }}</pre>
          </div>
        </Tabs.TabPane>

        <!-- 控制台 Tab -->
        <Tabs.TabPane key="console">
          <template #tab>
            <span>控制台</span>
            <span v-if="debugResponse.consoleLogs?.length > 0" class="tab-badge">
              {{ debugResponse.consoleLogs.length }}
            </span>
          </template>
          <div class="tab-content">
            <div v-if="debugResponse.consoleLogs?.length > 0" class="console-logs">
              <div
                v-for="(log, idx) in debugResponse.consoleLogs"
                :key="idx"
                class="log-line"
                :class="{
                  warn: log.startsWith('[WARN]'),
                  error: log.startsWith('[ERROR]'),
                }"
              >
                {{ log }}
              </div>
            </div>
            <div v-else class="empty-tip">无日志输出</div>
          </div>
        </Tabs.TabPane>

        <!-- 变量 Tab -->
        <Tabs.TabPane key="variables">
          <template #tab>
            <span>变量</span>
            <span v-if="variablesCount > 0" class="tab-badge">{{ variablesCount }}</span>
          </template>
          <div class="tab-content">
            <div v-if="variablesCount > 0" class="variables-list">
              <div
                v-for="(value, key) in debugResponse.variables"
                :key="key"
                class="variable-item"
              >
                <span class="variable-key">{{ key }}</span>
                <span class="variable-value">{{ formatResult(value) }}</span>
              </div>
            </div>
            <div v-else class="empty-tip">无变量设置</div>
          </div>
        </Tabs.TabPane>
      </Tabs>
    </div>
  </div>
</template>


<style scoped>
.script-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: hsl(var(--background));
  overflow: hidden;
}

/* 编辑区域 */
.editor-section {
  display: flex;
  flex-direction: column;
  min-height: 200px;
  overflow: hidden;
}

/* 工具栏 */
.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: hsl(var(--card));
  border-bottom: 1px solid hsl(var(--border));
}

.toolbar-spacer {
  flex: 1;
}

/* 编辑器包装 */
.editor-wrapper {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding: 12px 12px;
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

/* 状态栏 */
.status-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  font-size: 13px;
  border-bottom: 1px solid hsl(var(--border));
}

.status-bar.success {
  background: hsl(142 76% 36% / 10%);
}

.status-bar.error {
  background: hsl(0 84% 60% / 10%);
}

.status-text {
  font-weight: 500;
}

.status-bar.success .status-text {
  color: #52c41a;
}

.status-bar.error .status-text {
  color: #ff4d4f;
}

.divider {
  color: hsl(var(--border));
}

.metric {
  color: hsl(var(--foreground) / 65%);
}

/* 响应 Tabs */
.response-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.response-tabs :deep(.ant-tabs-nav) {
  margin: 0;
  padding: 0 16px;
  background: hsl(var(--card));
  border-bottom: 1px solid hsl(var(--border));
}

.response-tabs :deep(.ant-tabs-tab) {
  padding: 8px 4px;
  font-size: 13px;
}

.response-tabs :deep(.ant-tabs-tab + .ant-tabs-tab) {
  margin-left: 20px;
}

.response-tabs :deep(.ant-tabs-content-holder) {
  flex: 1;
  overflow: hidden;
}

.response-tabs :deep(.ant-tabs-content) {
  height: 100%;
}

.response-tabs :deep(.ant-tabs-tabpane) {
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

/* 结果内容 */
.result-content {
  margin: 0;
  padding: 12px;
  background: hsl(var(--accent) / 50%);
  border-radius: 6px;
  font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
  font-size: 13px;
  white-space: pre-wrap;
  word-break: break-all;
  color: hsl(var(--foreground) / 85%);
}

.error-message {
  padding: 12px;
  background: hsl(0 84% 60% / 10%);
  border: 1px solid hsl(0 84% 60% / 30%);
  border-radius: 6px;
  color: #ff4d4f;
  font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
  font-size: 13px;
  white-space: pre-wrap;
}

/* 控制台日志 */
.console-logs {
  background: hsl(var(--accent) / 50%);
  border-radius: 6px;
  padding: 8px 12px;
  font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
  font-size: 12px;
}

.log-line {
  padding: 4px 0;
  color: hsl(var(--foreground) / 75%);
  white-space: pre-wrap;
  word-break: break-all;
}

.log-line.warn {
  color: #faad14;
}

.log-line.error {
  color: #ff4d4f;
}

/* 变量列表 */
.variables-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.variable-item {
  display: flex;
  gap: 12px;
  padding: 8px 12px;
  background: hsl(var(--accent) / 50%);
  border-radius: 6px;
  font-size: 13px;
}

.variable-key {
  min-width: 100px;
  font-weight: 500;
  color: hsl(var(--primary));
  font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
}

.variable-value {
  flex: 1;
  color: hsl(var(--foreground) / 75%);
  font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
  word-break: break-all;
}

.empty-tip {
  text-align: center;
  color: hsl(var(--foreground) / 45%);
  padding: 20px;
}
</style>
