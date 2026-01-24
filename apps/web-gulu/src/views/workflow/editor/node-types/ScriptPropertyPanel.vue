<script setup lang="ts">
/**
 * 脚本属性面板
 * 编辑器 + 调试响应（使用共享组件）
 */
import { ref, watch } from 'vue';
import { useDebounceFn } from '@vueuse/core';

import { createIconifyIcon } from '@vben/icons';
import { Button, Select, Spin, message } from 'ant-design-vue';

import { debugStepApi } from '#/api/debug';
import { ScriptEditor } from '#/components/code-editor';

import {
  ScriptResponsePanel,
  type ScriptResponseData,
} from '../../components/shared';

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
const isDebugging = ref(false);
const debugResponse = ref<ScriptResponseData | null>(null);

// 分割面板相关
const containerRef = ref<HTMLElement | null>(null);
const isDragging = ref(false);
const editorPanelHeight = ref(60);

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
      const scriptResult = response.scriptResult;
      debugResponse.value = {
        success: !scriptResult?.error,
        language: scriptResult?.language || 'javascript',
        durationMs: scriptResult?.duration_ms || 0,
        result: scriptResult?.result,
        consoleLogs: scriptResult?.console_logs || response.consoleLogs || [],
        variables: scriptResult?.variables || {},
        error: scriptResult?.error || response.error,
      };
    } else {
      debugResponse.value = {
        success: false,
        durationMs: 0,
        error: response.error || '执行失败',
        consoleLogs: response.consoleLogs || [],
        variables: {},
      };
      message.error(response.error || '执行失败');
    }
  } catch (error: any) {
    debugResponse.value = {
      success: false,
      durationMs: 0,
      error: error.message || '执行失败',
      consoleLogs: [],
      variables: {},
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

  editorPanelHeight.value = Math.min(80, Math.max(20, percentage));
}

function stopDrag() {
  isDragging.value = false;
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
}
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
        <ScriptEditor
          :model-value="localNode.config?.script || ''"
          language="javascript"
          height="100%"
          :show-toolbar="true"
          :show-snippets="true"
          @update:model-value="updateScript"
        />
      </div>
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

    <!-- 响应区域（使用共享组件） -->
    <div
      v-if="debugResponse || isDebugging"
      class="response-section"
      :style="{ height: `calc(${100 - editorPanelHeight}% - 4px)` }"
    >
      <Spin :spinning="isDebugging" tip="执行中...">
        <ScriptResponsePanel
          v-if="debugResponse"
          :response="debugResponse"
          :show-script-tab="false"
        />
        <div v-else class="loading-placeholder" />
      </Spin>
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

.editor-section {
  display: flex;
  flex-direction: column;
  min-height: 200px;
  overflow: hidden;
}

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

.editor-wrapper {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

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
