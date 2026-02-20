<script setup lang="ts">
/**
 * AI 节点属性面板（主编排组件）
 * 将配置拆分为子面板，保留调试/运行逻辑
 */
import { computed, ref, watch } from 'vue';

import { createIconifyIcon } from '@vben/icons';
import { useAccessStore } from '@vben/stores';
import { Button, Tabs, Tooltip, message } from 'ant-design-vue';

import type {
  AIChunkData,
  AICompleteData,
  SSEEvent,
} from '#/api/debug';
import {
  createSSEService,
  type SSEService,
  type AIToolCallStartData,
  type AIToolCallCompleteData,
} from '#/utils/sse';
import { stopExecutionApi } from '#/api/debug';
import { useDebugContext } from '../../../components/execution/composables/useDebugContext';
import {
  AIResponsePanel,
  type AIResponseData,
} from '../../../components/shared';
import type { ToolCallRecord } from '../../../components/shared/types';

import type { KeywordConfig } from '../../types';
import ProcessorPanel from '../http/ProcessorPanel.vue';
import type { AIConfig } from './types';
import { createDefaultAIConfig } from './types';
import BasicConfigPanel from './BasicConfigPanel.vue';
import PromptPanel from './PromptPanel.vue';
import ModelParamsPanel from './ModelParamsPanel.vue';
import ToolsPanel from './ToolsPanel.vue';
import KnowledgePanel from './KnowledgePanel.vue';

// 图标
const PlayIcon = createIconifyIcon('lucide:play');
const StopIcon = createIconifyIcon('lucide:square');
const GripHorizontalIcon = createIconifyIcon('lucide:grip-horizontal');
const SparklesIcon = createIconifyIcon('lucide:sparkles');

interface AIStepNode {
  id: string;
  type: string;
  name: string;
  config: AIConfig;
  postProcessors?: KeywordConfig[];
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
const streamingContent = ref<string | null>(null);
const isStreaming = ref(false);
let sseService: SSEService | null = null;
let sessionId: string | null = null;
let startTime = 0;
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
      if (!localNode.value!.postProcessors) {
        localNode.value!.postProcessors = [];
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

// 后置处理器计数
const postProcessorsCount = computed(() => {
  const processors = localNode.value?.postProcessors;
  return Array.isArray(processors) ? processors.filter((p: KeywordConfig) => p.enabled).length : 0;
});

// 更新后置处理器
function updatePostProcessors(processors: KeywordConfig[]) {
  if (localNode.value) {
    localNode.value.postProcessors = processors;
    emitUpdate();
  }
}

function cleanupSSE() {
  sseService?.disconnect();
  sseService = null;
  sessionId = null;
}

function finishDebugging() {
  isStreaming.value = false;
  isDebugging.value = false;
  cleanupSSE();
}

function handleStop() {
  if (sessionId) {
    stopExecutionApi(sessionId).catch(() => {});
  }
  finishDebugging();
  if (!debugResponse.value && streamingContent.value) {
    debugResponse.value = {
      success: false,
      content: streamingContent.value,
      model: '',
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      durationMs: Date.now() - startTime,
      error: '已手动停止',
    };
  }
  streamingContent.value = null;
}

function handleSSEMessage(event: SSEEvent) {
  const { type, data } = event;
  switch (type) {
    case 'connected':
      sessionId = event.sessionId;
      break;

    case 'ai_chunk': {
      const chunk = data as AIChunkData;
      if (chunk.index === 0) {
        streamingContent.value = chunk.chunk;
      } else {
        streamingContent.value = (streamingContent.value || '') + chunk.chunk;
      }
      if (!isStreaming.value) isStreaming.value = true;
      break;
    }

    case 'ai_complete': {
      const complete = data as AICompleteData;
      streamingContent.value = complete.content;
      break;
    }

    case 'ai_tool_call_start': {
      const toolStart = data as AIToolCallStartData;
      if (!debugResponse.value) {
        debugResponse.value = {
          success: true,
          content: streamingContent.value || '',
          model: '',
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          durationMs: 0,
          toolCalls: [],
        };
      }
      if (!debugResponse.value.toolCalls) debugResponse.value.toolCalls = [];
      debugResponse.value.toolCalls.push({
        round: debugResponse.value.toolCalls.length + 1,
        tool_name: toolStart.toolName,
        arguments: toolStart.arguments,
        result: '',
        is_error: false,
        duration_ms: 0,
      });
      break;
    }

    case 'ai_tool_call_complete': {
      const toolDone = data as AIToolCallCompleteData;
      if (debugResponse.value?.toolCalls) {
        const idx = debugResponse.value.toolCalls.findIndex(
          (c: ToolCallRecord) => c.tool_name === toolDone.toolName && !c.result,
        );
        if (idx >= 0) {
          debugResponse.value.toolCalls[idx] = {
            ...debugResponse.value.toolCalls[idx]!,
            result: toolDone.result,
            is_error: toolDone.isError,
            duration_ms: toolDone.durationMs,
          };
        }
      }
      break;
    }

    case 'step_completed': {
      const result = (data as any).result;
      const stepData = data as any;
      const durationMs = stepData.durationMs || (Date.now() - startTime);
      debugResponse.value = {
        success: !stepData.error,
        content: result?.content || streamingContent.value || '',
        model: result?.model || '',
        promptTokens: result?.prompt_tokens || 0,
        completionTokens: result?.completion_tokens || 0,
        totalTokens: result?.total_tokens || 0,
        durationMs,
        error: result?.error || stepData.error,
        toolCalls: Array.isArray(result?.tool_calls)
          ? result.tool_calls
          : debugResponse.value?.toolCalls,
        agentTrace: result?.agent_trace || undefined,
        systemPrompt: result?.system_prompt || '',
        prompt: result?.prompt || '',
        finishReason: result?.finish_reason || '',
      };
      streamingContent.value = null;
      finishDebugging();
      break;
    }

    case 'step_failed': {
      const failData = data as any;
      debugResponse.value = {
        success: false,
        content: streamingContent.value || '',
        model: '',
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        durationMs: failData.durationMs || (Date.now() - startTime),
        error: failData.error || '执行失败',
      };
      streamingContent.value = null;
      finishDebugging();
      break;
    }

    case 'workflow_completed':
      if (isDebugging.value) finishDebugging();
      break;

    case 'error': {
      const errData = data as any;
      debugResponse.value = {
        success: false,
        content: streamingContent.value || '',
        model: '',
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        durationMs: Date.now() - startTime,
        error: errData.message || '执行失败',
      };
      streamingContent.value = null;
      finishDebugging();
      break;
    }
  }
}

// 执行 AI 节点（流式）
function handleRun() {
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
  debugResponse.value = null;
  streamingContent.value = null;
  isStreaming.value = false;
  startTime = Date.now();

  const cachedVariables = props.workflowId
    ? debugContext.getVariables(props.workflowId)
    : undefined;

  const accessStore = useAccessStore();
  const token = accessStore.accessToken || '';

  const apiUrl = import.meta.env.VITE_GLOB_API_URL || '';
  const baseUrl = apiUrl.startsWith('http')
    ? apiUrl
    : `${window.location.origin}${apiUrl}`;
  const url = `${baseUrl}/executions`;

  const body = {
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
        streaming: true,
        interactive: false,
        tools: localNode.value.config.tools || [],
        mcp_server_ids: localNode.value.config.mcp_server_ids || [],
        skill_ids: localNode.value.config.skill_ids || [],
        max_tool_rounds: localNode.value.config.max_tool_rounds || 10,
        agent_mode: localNode.value.config.agent_mode || '',
        max_reflection_rounds: localNode.value.config.max_reflection_rounds || 2,
        knowledge_base_ids: localNode.value.config.knowledge_base_ids || [],
        kb_top_k: localNode.value.config.kb_top_k || 5,
        kb_score_threshold: localNode.value.config.kb_score_threshold || 0.7,
      },
      postProcessors: localNode.value.postProcessors?.map((p: KeywordConfig) => ({
        id: p.id,
        type: p.type,
        enabled: p.enabled,
        name: p.name,
        config: p.config,
      })),
    },
    variables: cachedVariables as Record<string, unknown> | undefined,
    envId: props.envId || 0,
    mode: 'debug',
    stream: true,
    persist: false,
  };

  sseService = createSSEService({
    url,
    method: 'POST',
    body,
    headers: { satoken: token },
    onMessage: handleSSEMessage,
    onStateChange: (state) => {
      if (state === 'error' || (state === 'disconnected' && isDebugging.value)) {
        if (!debugResponse.value) {
          debugResponse.value = {
            success: false,
            content: streamingContent.value || '',
            model: '',
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
            durationMs: Date.now() - startTime,
            error: 'SSE 连接断开',
          };
          streamingContent.value = null;
        }
        finishDebugging();
      }
    },
    onError: () => {
      if (!debugResponse.value) {
        debugResponse.value = {
          success: false,
          content: streamingContent.value || '',
          model: '',
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          durationMs: Date.now() - startTime,
          error: '执行失败',
        };
        streamingContent.value = null;
      }
      finishDebugging();
    },
  });

  sseService.connect();
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
          debugResponse || isDebugging || streamingContent ? `${editorPanelHeight}%` : '100%',
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
          v-if="isDebugging"
          type="primary"
          size="small"
          danger
          @click="handleStop"
        >
          <template #icon><StopIcon class="size-4" /></template>
          停 止
        </Button>
        <Button
          v-else
          type="primary"
          size="small"
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
          <Tabs.TabPane key="prompt" tab="提示词">
            <PromptPanel
              :config="localNode.config"
              @update="handleConfigUpdate"
            />
          </Tabs.TabPane>

          <Tabs.TabPane key="basic" tab="基本配置">
            <BasicConfigPanel
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

          <Tabs.TabPane key="knowledge" tab="知识库">
            <KnowledgePanel
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

          <Tabs.TabPane key="post">
            <template #tab>
              <span>后置处理</span>
              <span v-if="postProcessorsCount > 0" class="tab-badge">{{ postProcessorsCount }}</span>
            </template>
            <ProcessorPanel
              mode="post"
              :processors="localNode.postProcessors || []"
              @update="updatePostProcessors"
            />
          </Tabs.TabPane>
        </Tabs>
      </div>
    </div>

    <!-- 分割条 -->
    <div
      v-if="debugResponse || isDebugging || streamingContent"
      class="resize-bar"
      :class="{ dragging: isDragging }"
      @mousedown="startDrag"
    >
      <GripHorizontalIcon class="resize-icon" />
    </div>

    <!-- 调试响应区域 -->
    <div
      v-if="debugResponse || isDebugging || streamingContent"
      class="response-section"
      :style="{ height: `calc(${100 - editorPanelHeight}% - 4px)` }"
    >
      <AIResponsePanel
        v-if="debugResponse || streamingContent"
        :response="debugResponse || { success: true, content: '', model: '', promptTokens: 0, completionTokens: 0, totalTokens: 0, durationMs: 0 }"
        :streaming-content="streamingContent"
        :is-streaming="isStreaming"
      />
      <div v-else class="loading-placeholder">
        <span class="waiting-text">等待 AI 回复...</span>
      </div>
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

.loading-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 150px;
}

.waiting-text {
  font-size: 13px;
  color: hsl(var(--foreground) / 40%);
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
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
</style>
