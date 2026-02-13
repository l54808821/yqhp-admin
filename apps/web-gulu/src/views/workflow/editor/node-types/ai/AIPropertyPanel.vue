<script setup lang="ts">
/**
 * AI 节点属性面板（主编排组件）
 * 将配置拆分为子面板，保留调试/运行逻辑
 */
import { computed, ref, watch } from 'vue';

import { createIconifyIcon } from '@vben/icons';
import { Button, Spin, Tabs, Tooltip, message } from 'ant-design-vue';

import { executeApi } from '#/api/debug';
import { useDebugContext } from '../../../components/execution/composables/useDebugContext';
import {
  AIResponsePanel,
  type AIResponseData,
} from '../../../components/shared';

import type { AIConfig } from './types';
import { createDefaultAIConfig } from './types';
import BasicConfigPanel from './BasicConfigPanel.vue';
import PromptPanel from './PromptPanel.vue';
import ModelParamsPanel from './ModelParamsPanel.vue';
import ExecutionModePanel from './ExecutionModePanel.vue';
import ToolsPanel from './ToolsPanel.vue';

// 图标
const PlayIcon = createIconifyIcon('lucide:play');
const GripHorizontalIcon = createIconifyIcon('lucide:grip-horizontal');
const SparklesIcon = createIconifyIcon('lucide:sparkles');

interface AIStepNode {
  id: string;
  type: string;
  name: string;
  config: AIConfig;
}

interface Props {
  node: AIStepNode;
  envId?: number;
  workflowId?: number;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update', node: AIStepNode): void;
}>();

// 本地副本
const localNode = ref<AIStepNode | null>(null);

// 调试相关
const debugResponse = ref<AIResponseData | null>(null);
const isDebugging = ref(false);
const debugContext = useDebugContext();
const hasDebugCtx = computed(() =>
  !!props.workflowId && debugContext.hasContext(props.workflowId),
);

// 分割条
const containerRef = ref<HTMLElement | null>(null);
const editorPanelHeight = ref(60);
const isDragging = ref(false);

// 同步 props
watch(
  () => props.node,
  (newNode) => {
    if (newNode) {
      localNode.value = JSON.parse(JSON.stringify(newNode));
      if (!localNode.value!.config) {
        localNode.value!.config = createDefaultAIConfig();
      }
    }
  },
  { immediate: true, deep: true },
);

function emitUpdate() {
  if (localNode.value) {
    emit('update', JSON.parse(JSON.stringify(localNode.value)));
  }
}

// 子面板更新处理
function handleConfigUpdate(patch: Partial<AIConfig>) {
  if (!localNode.value?.config) return;
  Object.assign(localNode.value.config, patch);
  emitUpdate();
}

// 执行 AI 节点
async function handleRun() {
  if (!localNode.value || isDebugging.value) return;

  if (!localNode.value.config.ai_model_id) {
    message.warning('请先选择 AI 模型');
    return;
  }
  if (!localNode.value.config.prompt?.trim()) {
    message.warning('请输入用户提示词');
    return;
  }

  isDebugging.value = true;

  const cachedVariables = props.workflowId
    ? debugContext.getVariables(props.workflowId)
    : undefined;

  try {
    const response = await executeApi(
      {
        step: {
          id: localNode.value.id,
          type: 'ai',
          name: localNode.value.name || 'AI 节点',
          config: {
            ai_model_id: localNode.value.config.ai_model_id,
            system_prompt: localNode.value.config.system_prompt || '',
            prompt: localNode.value.config.prompt || '',
            temperature: localNode.value.config.temperature,
            max_tokens: localNode.value.config.max_tokens,
            top_p: localNode.value.config.top_p,
            timeout: localNode.value.config.timeout || 0,
            streaming: false,
            interactive: false,
            tools: localNode.value.config.tools || [],
            mcp_server_ids: localNode.value.config.mcp_server_ids || [],
            max_tool_rounds: localNode.value.config.max_tool_rounds || 10,
          },
        },
        variables: cachedVariables as Record<string, unknown> | undefined,
        envId: props.envId || 0,
        mode: 'debug',
        stream: false,
        persist: false,
      },
      (localNode.value.config.timeout || 300 + 30) * 1000,
    );

    const stepResult = response.steps?.[0];
    if (stepResult) {
      const result = stepResult.result as any;
      if (result) {
        debugResponse.value = {
          success: !stepResult.error,
          content: result.content || '',
          model: result.model || '',
          promptTokens: result.prompt_tokens || 0,
          completionTokens: result.completion_tokens || 0,
          totalTokens: result.total_tokens || 0,
          durationMs: stepResult.durationMs || 0,
          error: result.error || stepResult.error,
          toolCalls: Array.isArray(result.tool_calls)
            ? result.tool_calls
            : undefined,
          systemPrompt: result.system_prompt || '',
          prompt: result.prompt || '',
          finishReason: result.finish_reason || '',
        };
      } else {
        debugResponse.value = {
          success: stepResult.success,
          content: '',
          model: '',
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          durationMs: stepResult.durationMs || 0,
          error: stepResult.error,
        };
      }
    } else {
      message.warning('未获取到执行结果');
    }
  } catch (error: any) {
    debugResponse.value = {
      success: false,
      content: '',
      model: '',
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      durationMs: 0,
      error: error.message || '执行失败',
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
  <div ref="containerRef" class="ai-panel" v-if="localNode">
    <!-- 配置区域 -->
    <div
      class="config-section"
      :style="{
        height:
          debugResponse || isDebugging ? `${editorPanelHeight}%` : '100%',
      }"
    >
      <!-- 工具栏 -->
      <div class="toolbar">
        <div class="toolbar-title">
          <SparklesIcon class="size-4" />
          <span>AI 配置</span>
        </div>
        <div class="toolbar-spacer" />
        <Tooltip v-if="hasDebugCtx" title="使用调试上下文变量">
          <span class="debug-ctx-dot" />
        </Tooltip>
        <Button
          type="primary"
          size="small"
          :loading="isDebugging"
          :disabled="
            !localNode.config?.ai_model_id ||
            !localNode.config?.prompt?.trim()
          "
          @click="handleRun"
        >
          <template #icon><PlayIcon class="size-4" /></template>
          运 行
        </Button>
      </div>

      <!-- 配置内容（可滚动） -->
      <div class="config-content">
        <Tabs size="small">
          <Tabs.TabPane key="basic" tab="基本配置">
            <BasicConfigPanel
              :config="localNode.config"
              @update="handleConfigUpdate"
            />
          </Tabs.TabPane>

          <Tabs.TabPane key="prompt" tab="提示词">
            <PromptPanel
              :config="localNode.config"
              @update="handleConfigUpdate"
            />
          </Tabs.TabPane>

          <Tabs.TabPane key="params" tab="模型参数">
            <ModelParamsPanel
              :config="localNode.config"
              @update="handleConfigUpdate"
            />
          </Tabs.TabPane>

          <Tabs.TabPane key="mode" tab="执行模式">
            <ExecutionModePanel
              :config="localNode.config"
              @update="handleConfigUpdate"
            />
          </Tabs.TabPane>

          <Tabs.TabPane key="tools" tab="工具">
            <ToolsPanel
              :config="localNode.config"
              @update="handleConfigUpdate"
            />
          </Tabs.TabPane>
        </Tabs>
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

    <!-- 调试响应区域 -->
    <div
      v-if="debugResponse || isDebugging"
      class="response-section"
      :style="{ height: `calc(${100 - editorPanelHeight}% - 4px)` }"
    >
      <Spin :spinning="isDebugging" tip="AI 执行中...">
        <AIResponsePanel v-if="debugResponse" :response="debugResponse" />
        <div v-else class="loading-placeholder" />
      </Spin>
    </div>
  </div>
</template>

<style scoped>
.ai-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: hsl(var(--background));
  overflow: hidden;
}

.config-section {
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
  flex-shrink: 0;
}

.toolbar-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
  color: hsl(var(--foreground));
}

.toolbar-spacer {
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

.config-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0 16px 16px;
}

.config-content :deep(.ant-tabs-nav) {
  margin-bottom: 8px;
}

.config-content :deep(.ant-tabs-content) {
  padding-top: 0;
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
