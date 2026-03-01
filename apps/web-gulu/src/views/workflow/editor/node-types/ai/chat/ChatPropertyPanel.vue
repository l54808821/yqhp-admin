<script setup lang="ts">
/**
 * AI 对话节点属性面板（ai_chat）
 * 单轮对话，可选工具，无 Agent 模式 / HITL / 知识库 / max_tool_rounds
 */
import { computed, ref, toRef, watch } from 'vue';

import { createIconifyIcon } from '@vben/icons';
import { Button, Form, Input, InputNumber, Switch, Tabs, Tooltip, message } from 'ant-design-vue';

import type { StepExecutionResult } from '#/api/debug';
import { useStepDebug } from '../../../../components/execution/composables/useStepDebug';
import { useDebugContext } from '../../../../components/execution/composables/useDebugContext';
import {
  AIResponsePanel,
  type AIResponseData,
} from '../../../../components/shared';

import ModelSelector from '../shared/ModelSelector.vue';
import ModelParamsPanel from '../ModelParamsPanel.vue';
import ToolsPanel from '../ToolsPanel.vue';
import type { ChatConfig } from '../shared/types';
import { createDefaultChatConfig } from '../shared/types';

const PlayIcon = createIconifyIcon('lucide:play');
const StopIcon = createIconifyIcon('lucide:square');
const GripHorizontalIcon = createIconifyIcon('lucide:grip-horizontal');
const SparklesIcon = createIconifyIcon('lucide:sparkles');

interface ChatStepNode {
  id: string;
  type: string;
  name: string;
  config: ChatConfig;
}

interface Props {
  node: ChatStepNode;
  envId?: number;
  workflowId?: number;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update', node: ChatStepNode): void;
}>();

const localNode = ref<ChatStepNode | null>(null);

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
});

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
        localNode.value!.config = createDefaultChatConfig();
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

function handleConfigUpdate(patch: Partial<ChatConfig> & Record<string, unknown>) {
  if (!localNode.value?.config) return;
  const { max_tool_rounds, ...rest } = patch as {
    max_tool_rounds?: number;
  } & Partial<ChatConfig>;
  Object.assign(localNode.value.config, rest);
  emitUpdate();
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
    type: 'ai_chat',
    name: localNode.value.name || 'AI 对话',
    config: {
      ai_model_id: localNode.value.config.ai_model_id,
      ai_model_name: localNode.value.config.ai_model_name,
      system_prompt: localNode.value.config.system_prompt || '',
      prompt: localNode.value.config.prompt || '',
      temperature: localNode.value.config.temperature,
      max_tokens: localNode.value.config.max_tokens,
      top_p: localNode.value.config.top_p,
      timeout: localNode.value.config.timeout || 300,
      streaming: localNode.value.config.streaming ?? true,
      tools: localNode.value.config.tools || [],
      mcp_server_ids: localNode.value.config.mcp_server_ids || [],
      skill_ids: localNode.value.config.skill_ids || [],
    },
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
          debugResponse || isDebugging || streamingContent
            ? `${editorPanelHeight}%`
            : '100%',
      }"
    >
      <div class="toolbar">
        <div class="toolbar-title">
          <SparklesIcon class="size-4" />
          <span>AI 对话</span>
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
            !localNode.config?.ai_model_id || !localNode.config?.prompt?.trim()
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
              <Form.Item label="系统提示词">
                <Input.TextArea
                  :value="localNode.config.system_prompt"
                  :rows="3"
                  placeholder="可选：设定 AI 角色和行为..."
                  @change="
                    (e: any) =>
                      handleConfigUpdate({ system_prompt: e.target?.value ?? '' })
                  "
                />
              </Form.Item>
              <Form.Item label="用户提示词" required>
                <Input.TextArea
                  :value="localNode.config.prompt"
                  :rows="6"
                  placeholder="输入你的问题或任务，支持 ${variable} 格式引用变量"
                  @change="
                    (e: any) => handleConfigUpdate({ prompt: e.target?.value ?? '' })
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
                <Tooltip title="启用后，AI 输出将实时流式显示">
                  <label class="switch-item">
                    <Switch
                      size="small"
                      :checked="localNode.config.streaming"
                      @change="(checked: any) => handleConfigUpdate({ streaming: !!checked })"
                    />
                    <span class="switch-label">流式输出</span>
                  </label>
                </Tooltip>
              </div>
              <Form.Item label="超时（秒）">
                <InputNumber
                  :value="localNode.config.timeout"
                  :min="0"
                  :max="3600"
                  :step="30"
                  placeholder="300"
                  style="width: 100%"
                  @change="(val: any) => handleConfigUpdate({ timeout: val ?? 300 })"
                />
              </Form.Item>
            </Form>
          </Tabs.TabPane>

          <Tabs.TabPane key="params" tab="模型参数">
            <ModelParamsPanel
              :config="localNode.config as any"
              @update="handleConfigUpdate"
            />
          </Tabs.TabPane>

          <Tabs.TabPane key="tools" tab="工具（可选）">
            <ToolsPanel
              :config="localNode.config as any"
              @update="handleConfigUpdate"
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
        v-if="debugResponse || streamingContent"
        :response="
          debugResponse || {
            success: true,
            content: '',
            model: '',
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
            durationMs: 0,
          }
        "
        :streaming-content="streamingContent"
        :is-streaming="isStreaming"
      />
      <div v-else-if="isDebugging" class="loading-placeholder">
        <span class="waiting-text" style="color: hsl(var(--primary) / 70%)">AI 正在思考...</span>
      </div>
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
