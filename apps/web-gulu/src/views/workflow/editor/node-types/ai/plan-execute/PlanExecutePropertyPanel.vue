<script setup lang="ts">
import { computed, ref, toRef, watch } from 'vue';

import { createIconifyIcon } from '@vben/icons';
import {
  Button,
  Form,
  Input,
  InputNumber,
  Switch,
  Tabs,
  Tooltip,
  message,
} from 'ant-design-vue';

import type { StepExecutionResult } from '#/api/debug';
import { useStepDebug } from '../../../../components/execution/composables/useStepDebug';
import { useDebugContext } from '../../../../components/execution/composables/useDebugContext';
import {
  AIResponsePanel,
  type AIResponseData,
} from '../../../../components/shared';
import type { ToolCallRecord } from '../../../../components/shared/types';

import type { PlanExecuteConfig } from '../shared/types';
import { createDefaultPlanExecuteConfig } from '../shared/types';
import type { AIConfig } from '../types';
import ModelSelector from '../shared/ModelSelector.vue';
import ModelParamsPanel from '../ModelParamsPanel.vue';
import ToolsPanel from '../ToolsPanel.vue';

const PlayIcon = createIconifyIcon('lucide:play');
const StopIcon = createIconifyIcon('lucide:square');
const GripHorizontalIcon = createIconifyIcon('lucide:grip-horizontal');
const SparklesIcon = createIconifyIcon('lucide:sparkles');

interface PlanExecuteStepNode {
  id: string;
  type: string;
  name: string;
  config: PlanExecuteConfig;
}

interface Props {
  node: PlanExecuteStepNode;
  envId?: number;
  workflowId?: number;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'update', node: PlanExecuteStepNode): void;
}>();

const localNode = ref<PlanExecuteStepNode | null>(null);
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
    toolCalls: Array.isArray(r.tool_calls)
      ? r.tool_calls
      : pendingToolCalls.value.length
        ? [...pendingToolCalls.value]
        : undefined,
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
  isDebugging,
  debugResponse,
  streamingContent,
  isStreaming,
  run,
  stop,
} = useStepDebug<AIResponseData>({
  workflowId: toRef(props, 'workflowId'),
  envId: toRef(props, 'envId'),
  stream: true,
  transformResult,
  transformError,
  onToolCallStart(data) {
    pendingToolCalls.value.push({
      round: pendingToolCalls.value.length + 1,
      tool_name: data.toolName,
      arguments: data.arguments,
      result: '',
      is_error: false,
      duration_ms: 0,
    });
  },
  onToolCallComplete(data) {
    const idx = pendingToolCalls.value.findIndex(
      (c) => c.tool_name === data.toolName && !c.result,
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
  toolCalls: pendingToolCalls.value.length
    ? [...pendingToolCalls.value]
    : undefined,
}));

const debugContext = useDebugContext();
const hasDebugCtx = computed(
  () => !!props.workflowId && debugContext.hasContext(props.workflowId),
);

const containerRef = ref<HTMLElement | null>(null);
const editorPanelHeight = ref(60);
const isDragging = ref(false);

watch(
  () => props.node,
  (newNode) => {
    if (newNode) {
      localNode.value = JSON.parse(JSON.stringify(newNode));
      if (!localNode.value!.config) {
        localNode.value!.config = createDefaultPlanExecuteConfig();
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

function handleConfigUpdate(patch: Partial<PlanExecuteConfig>) {
  if (!localNode.value?.config) return;
  Object.assign(localNode.value.config, patch);
  emitUpdate();
}

/**
 * ToolsPanel uses AIConfig field names (tools / mcp_server_ids / skill_ids).
 * Remap them to executor_* fields for PlanExecuteConfig.
 */
const toolsPanelConfig = computed(() => {
  const c = localNode.value?.config;
  if (!c) return {} as AIConfig;
  return {
    ...c,
    tools: c.executor_tools || [],
    mcp_server_ids: c.executor_mcp_server_ids || [],
    skill_ids: c.executor_skill_ids || [],
  } as unknown as AIConfig;
});

function handleToolsUpdate(patch: Partial<AIConfig>) {
  const remap: Partial<PlanExecuteConfig> = {};
  if ('tools' in patch) remap.executor_tools = patch.tools;
  if ('mcp_server_ids' in patch)
    remap.executor_mcp_server_ids = patch.mcp_server_ids;
  if ('skill_ids' in patch) remap.executor_skill_ids = patch.skill_ids;
  handleConfigUpdate(remap);
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
  pendingToolCalls.value = [];
  run({
    id: localNode.value.id,
    type: 'ai_plan_execute',
    name: localNode.value.name || '规划执行',
    config: { ...localNode.value.config },
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
  const percentage = ((e.clientY - rect.top) / rect.height) * 100;
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
          debugResponse || isDebugging || streamingContent
            ? `${editorPanelHeight}%`
            : '100%',
      }"
    >
      <div class="toolbar">
        <div class="toolbar-title">
          <SparklesIcon class="size-4" />
          <span>规划执行</span>
        </div>
        <div class="toolbar-tip">
          先制定计划 → 逐步执行 → 汇总结果，适合复杂多步骤任务
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
            !localNode.config?.prompt?.trim()
          "
          @click="handleRun"
        >
          <template #icon><PlayIcon class="size-4" /></template>
          运 行
        </Button>
      </div>

      <div class="config-content">
        <Tabs size="small">
          <Tabs.TabPane key="prompt" tab="提示词">
            <Form layout="vertical">
              <Form.Item label="主提示词">
                <Input.TextArea
                  :value="localNode.config.system_prompt"
                  :rows="3"
                  placeholder="可选：设定 AI 角色和行为..."
                  @change="
                    (e: any) =>
                      handleConfigUpdate({ system_prompt: e.target.value })
                  "
                />
              </Form.Item>
              <Form.Item label="用户输入" required>
                <Input.TextArea
                  :value="localNode.config.prompt"
                  :rows="5"
                  placeholder="输入你的问题或任务..."
                  @change="
                    (e: any) =>
                      handleConfigUpdate({ prompt: e.target.value })
                  "
                />
              </Form.Item>
              <Form.Item label="规划器提示词">
                <Input.TextArea
                  :value="localNode.config.planner_prompt"
                  :rows="3"
                  placeholder="可选，留空使用默认规划提示词"
                  @change="
                    (e: any) =>
                      handleConfigUpdate({ planner_prompt: e.target.value })
                  "
                />
              </Form.Item>
            </Form>
          </Tabs.TabPane>

          <Tabs.TabPane key="basic" tab="基本配置">
            <Form layout="vertical">
              <ModelSelector
                :model-id="localNode.config.ai_model_id"
                :model-name="localNode.config.ai_model_name"
                @update="handleConfigUpdate"
              />
              <div class="switch-row">
                <label class="switch-item">
                  <Switch
                    size="small"
                    :checked="localNode.config.streaming"
                    @change="
                      (val: any) => handleConfigUpdate({ streaming: val })
                    "
                  />
                  <span class="switch-label">流式输出</span>
                </label>
              </div>
              <Form.Item label="超时（秒）">
                <InputNumber
                  :value="localNode.config.timeout"
                  :min="0"
                  :max="3600"
                  :step="30"
                  style="width: 100%"
                  @change="
                    (val: any) => handleConfigUpdate({ timeout: val })
                  "
                />
              </Form.Item>
              <Form.Item label="最大计划步数">
                <InputNumber
                  :value="localNode.config.max_plan_steps"
                  :min="2"
                  :max="20"
                  style="width: 100%"
                  @change="
                    (val: any) => handleConfigUpdate({ max_plan_steps: val })
                  "
                />
                <div class="param-hint">
                  限制计划中的最大步骤数量（2–20）。
                </div>
              </Form.Item>
              <Form.Item label="启用重新规划">
                <Switch
                  :checked="localNode.config.enable_replanner"
                  @change="
                    (val: any) =>
                      handleConfigUpdate({ enable_replanner: val })
                  "
                />
                <div class="param-hint">
                  执行过程中遇到问题时，自动调整后续计划。
                </div>
              </Form.Item>
              <Form.Item label="执行前审批计划">
                <Switch
                  :checked="localNode.config.hitl_approve_plan"
                  @change="
                    (val: any) =>
                      handleConfigUpdate({ hitl_approve_plan: val })
                  "
                />
                <div class="param-hint">
                  启用后，计划生成后需人工审批才会开始执行。
                </div>
              </Form.Item>
            </Form>
          </Tabs.TabPane>

          <Tabs.TabPane key="params" tab="模型参数">
            <ModelParamsPanel
              :config="localNode.config as any"
              @update="handleConfigUpdate"
            />
          </Tabs.TabPane>

          <Tabs.TabPane key="tools" tab="执行器工具">
            <ToolsPanel
              :config="toolsPanelConfig"
              @update="handleToolsUpdate"
            />
          </Tabs.TabPane>
        </Tabs>
      </div>
    </div>

    <div
      v-if="debugResponse || isDebugging || streamingContent"
      class="resize-bar"
      :class="{ dragging: isDragging }"
      @mousedown="startDrag"
    >
      <GripHorizontalIcon class="resize-icon" />
    </div>

    <div
      v-if="debugResponse || isDebugging || streamingContent"
      class="response-section"
      :style="{ height: `calc(${100 - editorPanelHeight}% - 4px)` }"
    >
      <AIResponsePanel
        v-if="
          debugResponse ||
          streamingContent ||
          pendingToolCalls.length > 0
        "
        :response="debugResponse || streamingFallbackResponse"
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

.toolbar-tip {
  font-size: 11px;
  color: hsl(var(--muted-foreground));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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

.switch-row {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 4px 0 16px;
}

.switch-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.switch-label {
  font-size: 13px;
  color: hsl(var(--foreground));
  user-select: none;
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
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}
</style>
