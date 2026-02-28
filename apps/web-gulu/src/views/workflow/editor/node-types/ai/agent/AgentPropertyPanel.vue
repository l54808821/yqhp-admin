<script setup lang="ts">
/**
 * ReAct Agent 节点属性面板（主编排组件）
 * 将配置拆分为子面板，保留调试/运行逻辑
 */
import { computed, ref, toRef, watch } from 'vue';

import { createIconifyIcon } from '@vben/icons';
import { Button, Checkbox, Form, InputNumber, Switch, Tabs, Tooltip, message } from 'ant-design-vue';

import type {
  StepExecutionResult,
  AIToolCallStartData,
  AIToolCallCompleteData,
} from '#/api/debug';
import { useStepDebug } from '../../../../components/execution/composables/useStepDebug';
import { useDebugContext } from '../../../../components/execution/composables/useDebugContext';
import {
  AIResponsePanel,
  type AIResponseData,
} from '../../../../components/shared';
import type { ToolCallRecord } from '../../../../components/shared/types';
import AIInteractionModal from '../../../../components/execution/AIInteractionModal.vue';

import type { KeywordConfig } from '../../../types';
import ProcessorPanel from '../../http/ProcessorPanel.vue';
import type { AgentConfig } from '../shared/types';
import { createDefaultAgentConfig, builtinTools } from '../shared/types';
import type { AIConfig } from '../types';
import PromptPanel from '../PromptPanel.vue';
import ModelSelector from '../shared/ModelSelector.vue';
import ModelParamsPanel from '../ModelParamsPanel.vue';
import ToolsPanel from '../ToolsPanel.vue';
import KnowledgePanel from '../KnowledgePanel.vue';

// 图标
const PlayIcon = createIconifyIcon('lucide:play');
const StopIcon = createIconifyIcon('lucide:square');
const GripHorizontalIcon = createIconifyIcon('lucide:grip-horizontal');
const SparklesIcon = createIconifyIcon('lucide:sparkles');

interface AgentStepNode {
  id: string;
  type: string;
  name: string;
  config: AgentConfig;
  postProcessors?: KeywordConfig[];
}

interface Props {
  node: AgentStepNode;
  envId?: number;
  workflowId?: number;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update', node: AgentStepNode): void;
}>();

// 本地副本
const localNode = ref<AgentStepNode | null>(null);

// 流式工具调用的中间状态（在 step_completed 前由钩子维护）
const pendingToolCalls = ref<ToolCallRecord[]>([]);

function transformResult(step: StepExecutionResult): AIResponseData {
  const r = step.result as any;
  if (!r) {
    return {
      success: step.success,
      content: '',
      model: '',
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      durationMs: step.durationMs || 0,
      error: step.error,
    };
  }
  return {
    success: !step.error,
    content: r.content || '',
    model: r.model || '',
    promptTokens: r.prompt_tokens || 0,
    completionTokens: r.completion_tokens || 0,
    totalTokens: r.total_tokens || 0,
    durationMs: step.durationMs || 0,
    error: r.error || step.error,
    toolCalls: Array.isArray(r.tool_calls) ? r.tool_calls : (pendingToolCalls.value.length ? [...pendingToolCalls.value] : undefined),
    agentTrace: r.agent_trace || undefined,
    systemPrompt: r.system_prompt || '',
    prompt: r.prompt || '',
    finishReason: r.finish_reason || '',
  };
}

function transformError(error: string, durationMs: number): AIResponseData {
  return {
    success: false,
    content: '',
    model: '',
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    durationMs,
    error,
  };
}

const {
  isDebugging, debugResponse, streamingContent, isStreaming, run, stop,
  interactionOpen, interactionData, interactionValue, interactionCountdown,
  handleInteractionConfirm, handleInteractionSkip,
} = useStepDebug<AIResponseData>({
    workflowId: toRef(props, 'workflowId'),
    envId: toRef(props, 'envId'),
    stream: true,
    transformResult,
    transformError,
    onToolCallStart(data: AIToolCallStartData) {
      pendingToolCalls.value.push({
        round: pendingToolCalls.value.length + 1,
        tool_name: data.toolName,
        arguments: data.arguments,
        result: '',
        is_error: false,
        duration_ms: 0,
      });
    },
    onToolCallComplete(data: AIToolCallCompleteData) {
      const idx = pendingToolCalls.value.findIndex(
        (c: ToolCallRecord) => c.tool_name === data.toolName && !c.result,
      );
      if (idx >= 0) {
        pendingToolCalls.value[idx] = {
          ...pendingToolCalls.value[idx]!,
          result: data.result,
          is_error: data.isError,
          duration_ms: data.durationMs,
        };
      }
    },
  });

const streamingFallbackResponse = computed<AIResponseData>(() => ({
  success: true,
  content: '',
  model: '',
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0,
  durationMs: 0,
  toolCalls: pendingToolCalls.value.length ? [...pendingToolCalls.value] : undefined,
}));

// 调试上下文（用于 UI 指示器）
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
        localNode.value!.config = createDefaultAgentConfig();
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
function handleConfigUpdate(patch: Partial<AgentConfig>) {
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

function handleRun() {
  if (!localNode.value) return;

  if (!localNode.value.config.ai_model_id) {
    message.warning('请先选择 AI 模型');
    return;
  }
  if (!localNode.value.config.prompt?.trim()) {
    message.warning('请输入用户提示词');
    return;
  }
  const hasTools =
    (localNode.value.config.tools?.length ?? 0) > 0 ||
    (localNode.value.config.skill_ids?.length ?? 0) > 0 ||
    (localNode.value.config.mcp_server_ids?.length ?? 0) > 0;
  if (!hasTools) {
    message.warning('ReAct Agent 需配合工具使用，请至少添加一个工具');
    return;
  }

  pendingToolCalls.value = [];

  run({
    id: localNode.value.id,
    type: 'ai_agent',
    name: localNode.value.name || 'ReAct Agent 节点',
    config: {
      ai_model_id: localNode.value.config.ai_model_id,
      ai_model_name: localNode.value.config.ai_model_name || '',
      system_prompt: localNode.value.config.system_prompt || '',
      prompt: localNode.value.config.prompt || '',
      temperature: localNode.value.config.temperature,
      max_tokens: localNode.value.config.max_tokens,
      top_p: localNode.value.config.top_p,
      timeout: localNode.value.config.timeout || 0,
      streaming: localNode.value.config.streaming ?? true,
      interactive: localNode.value.config.interactive ?? false,
      tools: localNode.value.config.tools || [],
      mcp_server_ids: localNode.value.config.mcp_server_ids || [],
      skill_ids: localNode.value.config.skill_ids || [],
      knowledge_base_ids: localNode.value.config.knowledge_base_ids || [],
      kb_top_k: localNode.value.config.kb_top_k || 5,
      kb_score_threshold: localNode.value.config.kb_score_threshold || 0.7,
      max_tool_rounds: localNode.value.config.max_tool_rounds || 10,
      interaction_timeout: localNode.value.config.interaction_timeout || 300,
      hitl_enabled: localNode.value.config.hitl_enabled ?? false,
      hitl_approve_tools: localNode.value.config.hitl_approve_tools || [],
    },
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
        <div class="toolbar-header">
          <div class="toolbar-title">
            <SparklesIcon class="size-4" />
            <span>ReAct Agent</span>
          </div>
          <div class="agent-mode-tip">
            多轮「思考 → 行动 → 观察」循环推理，需配合工具使用
          </div>
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
          @click="stop"
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
            !localNode.config?.prompt?.trim() ||
            ((localNode.config?.tools?.length ?? 0) === 0 &&
              (localNode.config?.skill_ids?.length ?? 0) === 0 &&
              (localNode.config?.mcp_server_ids?.length ?? 0) === 0)
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
              :config="(localNode.config as unknown as AIConfig)"
              @update="handleConfigUpdate"
            />
          </Tabs.TabPane>

          <Tabs.TabPane key="basic" tab="基本配置">
            <Form layout="vertical" class="config-form">
              <ModelSelector
                :model-id="localNode.config.ai_model_id"
                :model-name="localNode.config.ai_model_name"
                @update="handleConfigUpdate"
              />
              <Form.Item label="流式输出">
                <Switch
                  :checked="localNode.config.streaming ?? true"
                  @change="(val: any) => handleConfigUpdate({ streaming: val })"
                />
                <div class="param-hint">
                  启用后，AI 输出将实时流式显示
                </div>
              </Form.Item>
              <Form.Item label="交互模式">
                <Switch
                  :checked="localNode.config.interactive ?? false"
                  @change="(val: any) => handleConfigUpdate({ interactive: val })"
                />
                <div class="param-hint">
                  启用后，AI 可以在执行过程中请求用户交互（确认、输入、选择等）
                </div>
              </Form.Item>
              <Form.Item label="最大工具调用轮次">
                <InputNumber
                  :value="localNode.config.max_tool_rounds"
                  :min="1"
                  :max="50"
                  style="width: 100%"
                  @change="(val: any) => handleConfigUpdate({ max_tool_rounds: val })"
                />
                <div class="param-hint">
                  AI 模型调用工具（含 Skill）的最大轮次，防止无限循环
                </div>
              </Form.Item>
              <Form.Item label="超时时间（秒）">
                <InputNumber
                  :value="localNode.config.timeout"
                  :min="0"
                  :max="3600"
                  style="width: 100%"
                  @change="(val: any) => handleConfigUpdate({ timeout: val })"
                />
                <div class="param-hint">
                  节点执行的最大超时时间，0 表示不限制
                </div>
              </Form.Item>
              <Form.Item
                v-if="localNode.config.interactive"
                label="交互超时（秒）"
              >
                <InputNumber
                  :value="localNode.config.interaction_timeout"
                  :min="10"
                  :max="3600"
                  style="width: 100%"
                  @change="(val: any) => handleConfigUpdate({ interaction_timeout: val })"
                />
                <div class="param-hint">
                  单次用户交互等待的最大时间
                </div>
              </Form.Item>
            </Form>
          </Tabs.TabPane>

          <Tabs.TabPane key="model" tab="模型参数">
            <ModelParamsPanel
              :config="(localNode.config as unknown as AIConfig)"
              @update="handleConfigUpdate"
            />
          </Tabs.TabPane>

          <Tabs.TabPane key="tools" tab="工具">
            <ToolsPanel
              :config="(localNode.config as unknown as AIConfig)"
              @update="handleConfigUpdate"
            />
            <div class="tools-required-hint">
              必填：ReAct Agent 需至少添加一个工具（内置工具 / Skill / MCP）才能正常运行
            </div>
          </Tabs.TabPane>

          <Tabs.TabPane key="knowledge" tab="知识库">
            <KnowledgePanel
              :config="(localNode.config as unknown as AIConfig)"
              @update="handleConfigUpdate"
            />
          </Tabs.TabPane>

          <Tabs.TabPane key="hitl" tab="HITL">
            <Form layout="vertical" class="config-form">
              <Form.Item label="启用 HITL（人在回路）">
                <Switch
                  :checked="localNode.config.hitl_enabled ?? false"
                  @change="(val: any) => handleConfigUpdate({ hitl_enabled: val })"
                />
                <div class="param-hint">
                  启用后，指定的工具调用需要人工审批后才能执行。
                </div>
              </Form.Item>

              <Form.Item
                v-if="localNode.config.hitl_enabled"
                label="需要审批的工具"
              >
                <Checkbox.Group
                  :value="localNode.config.hitl_approve_tools || []"
                  @change="(val: any) => handleConfigUpdate({ hitl_approve_tools: val as string[] })"
                >
                  <div class="hitl-tools-list">
                    <div
                      v-for="toolName in localNode.config.tools || []"
                      :key="toolName"
                      class="hitl-tool-item"
                    >
                      <Checkbox :value="toolName">
                        {{ builtinTools.find((t) => t.name === toolName)?.label || toolName }}
                      </Checkbox>
                    </div>
                    <div v-if="(localNode.config.tools || []).length === 0" class="hitl-empty-hint">
                      请先在「工具」标签页添加工具
                    </div>
                  </div>
                </Checkbox.Group>
                <div class="param-hint">
                  选择需要人工审批后才能执行的工具。只有已添加的工具才会显示在此列表中。
                </div>
              </Form.Item>
            </Form>
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
        v-if="debugResponse || streamingContent || pendingToolCalls.length > 0"
        :response="debugResponse || streamingFallbackResponse"
        :streaming-content="streamingContent"
        :is-streaming="isStreaming"
      />
      <div v-else class="loading-placeholder">
        <span class="waiting-text">等待 AI 回复...</span>
      </div>
    </div>

    <!-- 人机交互弹窗 -->
    <AIInteractionModal
      :open="interactionOpen"
      :data="interactionData"
      :value="interactionValue"
      :countdown="interactionCountdown"
      @update:value="interactionValue = $event"
      @confirm="handleInteractionConfirm"
      @skip="handleInteractionSkip"
    />
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

.toolbar-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.toolbar-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
  color: hsl(var(--foreground));
}

.agent-mode-tip {
  font-size: 11px;
  color: hsl(var(--muted-foreground));
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

.config-form {
  padding-top: 0;
}

.param-hint {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  margin-top: 4px;
}

.tools-required-hint {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  margin-top: 12px;
  padding: 8px 12px;
  background: hsl(var(--primary) / 8%);
  border-radius: 6px;
}

.hitl-tools-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  background: hsl(var(--card));
}

.hitl-tool-item {
  padding: 4px 0;
}

.hitl-empty-hint {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  text-align: center;
  padding: 16px 0;
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
