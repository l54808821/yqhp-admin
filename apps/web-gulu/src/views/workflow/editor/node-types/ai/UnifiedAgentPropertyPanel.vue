<script setup lang="ts">
import { computed, ref, toRef, watch } from 'vue';

import { createIconifyIcon } from '@vben/icons';
import { Button, Form, InputNumber, Switch, Tabs, Tooltip, message } from 'ant-design-vue';

import type { StepExecutionResult } from '#/api/debug';
import { useStepDebug } from '../../../components/execution/composables/useStepDebug';
import { useDebugContext } from '../../../components/execution/composables/useDebugContext';
import {
  AIResponsePanel,
  type AIResponseData,
} from '../../../components/shared';
import AIInteractionModal from '../../../components/execution/AIInteractionModal.vue';

import type { KeywordConfig } from '../../types';
import ProcessorPanel from '../http/ProcessorPanel.vue';
import type { UnifiedAgentConfig } from './shared/types';
import { createDefaultUnifiedAgentConfig } from './shared/types';
import type { AIConfig } from './types';
import PromptPanel from './PromptPanel.vue';
import ModelSelector from './shared/ModelSelector.vue';
import ToolsPanel from './ToolsPanel.vue';
import KnowledgePanel from './KnowledgePanel.vue';

const PlayIcon = createIconifyIcon('lucide:play');
const StopIcon = createIconifyIcon('lucide:square');
const GripHorizontalIcon = createIconifyIcon('lucide:grip-horizontal');
const BrainIcon = createIconifyIcon('lucide:brain-circuit');

interface AgentStepNode {
  id: string;
  type: string;
  name: string;
  config: UnifiedAgentConfig;
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

const localNode = ref<AgentStepNode | null>(null);

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
    toolCalls: Array.isArray(r.tool_calls) ? r.tool_calls : undefined,
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
  isDebugging, debugResponse, streamingBlocks, isStreaming, run, stop,
  interactionOpen, interactionData, interactionValue, interactionCountdown,
  handleInteractionConfirm, handleInteractionSkip,
} = useStepDebug<AIResponseData>({
    workflowId: toRef(props, 'workflowId'),
    envId: toRef(props, 'envId'),
    stream: true,
    transformResult,
    transformError,
  });

const emptyResponse: AIResponseData = {
  success: true, content: '', model: '',
  promptTokens: 0, completionTokens: 0, totalTokens: 0, durationMs: 0,
};

const hasStreamingBlocks = computed(() => streamingBlocks.value.length > 0);

const debugContext = useDebugContext();
const hasDebugCtx = computed(() =>
  !!props.workflowId && debugContext.hasContext(props.workflowId),
);

const containerRef = ref<HTMLElement | null>(null);
const editorPanelHeight = ref(60);
const isDragging = ref(false);

const nodeType = computed(() => localNode.value?.type || 'ai_agent');
const isDirect = computed(() => nodeType.value === 'ai_direct');
const isPlan = computed(() => nodeType.value === 'ai_plan');
const isRouter = computed(() => nodeType.value === 'ai_agent');
const showToolsTab = computed(() => !isDirect.value);
const showPlanSwitch = computed(() => isRouter.value);
const showToolRounds = computed(() => !isDirect.value);

const agentLabel = computed(() => {
  switch (nodeType.value) {
    case 'ai_react': return 'ReAct Agent';
    case 'ai_plan': return 'Plan Agent';
    case 'ai_direct': return 'Direct Agent';
    default: return '智能 Agent';
  }
});

const agentModeTip = computed(() => {
  switch (nodeType.value) {
    case 'ai_react': return '思考 → 行动 → 观察循环，适合需要工具的任务';
    case 'ai_plan': return '规划 → 逐步执行 → 汇总，适合复杂多步任务';
    case 'ai_direct': return '单次 LLM 调用，适合简单问答和文本生成';
    default: return '自动路由：直接回答 / 工具调用 / Plan 模式';
  }
});

watch(
  () => props.node,
  (newNode) => {
    if (newNode) {
      localNode.value = JSON.parse(JSON.stringify(newNode));
      if (!localNode.value!.config) {
        localNode.value!.config = createDefaultUnifiedAgentConfig();
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

function handleConfigUpdate(patch: Partial<UnifiedAgentConfig>) {
  if (!localNode.value?.config) return;
  Object.assign(localNode.value.config, patch);
  emitUpdate();
}

const postProcessorsCount = computed(() => {
  const processors = localNode.value?.postProcessors;
  return Array.isArray(processors) ? processors.filter((p: KeywordConfig) => p.enabled).length : 0;
});

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

  run({
    id: localNode.value.id,
    type: localNode.value.type || 'ai_agent',
    name: localNode.value.name || agentLabel.value,
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
      max_tool_rounds: localNode.value.config.max_tool_rounds || 15,
      tool_timeout: localNode.value.config.tool_timeout || 180,
      interaction_timeout: localNode.value.config.interaction_timeout || 300,
      enable_plan_mode: localNode.value.config.enable_plan_mode ?? true,
      max_plan_steps: localNode.value.config.max_plan_steps || 10,
      fallback_models: localNode.value.config.fallback_models || [],
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
    <div
      class="config-section"
      :style="{
        height:
          debugResponse || isDebugging || hasStreamingBlocks ? `${editorPanelHeight}%` : '100%',
      }"
    >
      <div class="toolbar">
        <div class="toolbar-title">
          <BrainIcon class="size-4" />
          <span>{{ agentLabel }}</span>
          <span class="agent-mode-tip">{{ agentModeTip }}</span>
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
          :disabled="!localNode.config?.ai_model_id || !localNode.config?.prompt?.trim()"
          @click="handleRun"
        >
          <template #icon><PlayIcon class="size-4" /></template>
          运 行
        </Button>
      </div>

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
                :temperature="localNode.config.temperature"
                :max-tokens="localNode.config.max_tokens"
                :top-p="localNode.config.top_p"
                :show-params="true"
                @update="handleConfigUpdate"
              />
              <Form.Item label="流式输出">
                <Switch
                  :checked="localNode.config.streaming ?? true"
                  @change="(val: any) => handleConfigUpdate({ streaming: val })"
                />
                <div class="param-hint">启用后，AI 输出将实时流式显示</div>
              </Form.Item>
              <Form.Item label="交互模式">
                <Switch
                  :checked="localNode.config.interactive ?? false"
                  @change="(val: any) => handleConfigUpdate({ interactive: val })"
                />
                <div class="param-hint">启用后，AI 可在执行过程中请求用户交互</div>
              </Form.Item>
              <Form.Item v-if="showPlanSwitch" label="Plan 模式">
                <Switch
                  :checked="localNode.config.enable_plan_mode ?? true"
                  @change="(val: any) => handleConfigUpdate({ enable_plan_mode: val })"
                />
                <div class="param-hint">启用后，Agent 遇到复杂任务会自动切换到分步规划执行模式</div>
              </Form.Item>
              <Form.Item v-if="isPlan || (showPlanSwitch && localNode.config.enable_plan_mode)" label="最大计划步骤">
                <InputNumber
                  :value="localNode.config.max_plan_steps"
                  :min="2"
                  :max="20"
                  style="width: 100%"
                  @change="(val: any) => handleConfigUpdate({ max_plan_steps: val })"
                />
                <div class="param-hint">Plan 模式下最大步骤数</div>
              </Form.Item>
              <Form.Item v-if="showToolRounds" label="最大工具调用轮次">
                <InputNumber
                  :value="localNode.config.max_tool_rounds"
                  :min="1"
                  :max="50"
                  style="width: 100%"
                  @change="(val: any) => handleConfigUpdate({ max_tool_rounds: val })"
                />
                <div class="param-hint">ReAct 循环中工具调用的最大轮次</div>
              </Form.Item>
              <Form.Item v-if="showToolRounds" label="单工具超时（秒）">
                <InputNumber
                  :value="localNode.config.tool_timeout"
                  :min="10"
                  :max="600"
                  style="width: 100%"
                  @change="(val: any) => handleConfigUpdate({ tool_timeout: val })"
                />
                <div class="param-hint">单个工具（含 Skill）执行的最大超时时间，默认 180 秒</div>
              </Form.Item>
              <Form.Item label="超时时间（秒）">
                <InputNumber
                  :value="localNode.config.timeout"
                  :min="0"
                  :max="3600"
                  style="width: 100%"
                  @change="(val: any) => handleConfigUpdate({ timeout: val })"
                />
                <div class="param-hint">节点执行的最大超时时间，0 表示不限制</div>
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
                <div class="param-hint">单次用户交互等待的最大时间</div>
              </Form.Item>
            </Form>
          </Tabs.TabPane>

          <Tabs.TabPane v-if="showToolsTab" key="tools" tab="工具">
            <ToolsPanel
              :config="(localNode.config as unknown as AIConfig)"
              @update="handleConfigUpdate"
            />
          </Tabs.TabPane>

          <Tabs.TabPane key="knowledge" tab="知识库">
            <KnowledgePanel
              :config="(localNode.config as unknown as AIConfig)"
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

    <div
      v-if="debugResponse || isDebugging || hasStreamingBlocks"
      class="resize-bar"
      :class="{ dragging: isDragging }"
      @mousedown="startDrag"
    >
      <GripHorizontalIcon class="resize-icon" />
    </div>

    <div
      v-if="debugResponse || isDebugging || hasStreamingBlocks"
      class="response-section"
      :style="{ height: `calc(${100 - editorPanelHeight}% - 4px)` }"
    >
      <AIResponsePanel
        v-if="debugResponse || hasStreamingBlocks"
        :response="debugResponse || emptyResponse"
        :blocks="isStreaming ? streamingBlocks : undefined"
        :is-streaming="isStreaming"
      />
      <div v-else-if="isDebugging" class="loading-placeholder">
        <span class="waiting-text thinking-text">AI 正在思考...</span>
      </div>
      <div v-else class="loading-placeholder">
        <span class="waiting-text">等待 AI 回复...</span>
      </div>
    </div>

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
  padding: 8px 16px;
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
  white-space: nowrap;
}

.agent-mode-tip {
  font-size: 11px;
  color: hsl(var(--muted-foreground));
  margin-left: 4px;
  font-weight: normal;
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
}

.thinking-text {
  color: hsl(var(--primary) / 70%);
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
