<script setup lang="ts">
import { computed, onBeforeUnmount, ref, toRef } from 'vue';

import type { ExecutionSummary, WorkflowDefinition } from './types';
import { useExecution } from './composables/useExecution';
import { useStepTree } from './composables/useStepTree';

import ExecutionHeader from './ExecutionHeader.vue';
import ExecutionAlerts from './ExecutionAlerts.vue';
import ExecutionSummaryBar from './ExecutionSummaryBar.vue';
import StepTreePanel from './StepTreePanel.vue';
import StepDetailPanel from './StepDetailPanel.vue';
import LogsModal from './LogsModal.vue';
import AIInteractionModal from './AIInteractionModal.vue';

interface Props {
  workflowId: number;
  envId: number;
  visible?: boolean;
  executorType?: 'local' | 'remote';
  slaveId?: string;
  definition?: WorkflowDefinition;
  selectedSteps?: string[];
  persist?: boolean; // 是否持久化执行记录，默认 true
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  executorType: 'local',
  selectedSteps: () => [],
  persist: true,
});

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'complete', summary: ExecutionSummary): void;
}>();

// 使用 composables
const execution = useExecution({
  workflowId: toRef(props, 'workflowId'),
  envId: toRef(props, 'envId'),
  executorType: toRef(props, 'executorType'),
  slaveId: toRef(props, 'slaveId'),
  definition: toRef(props, 'definition'),
  selectedSteps: toRef(props, 'selectedSteps'),
  persist: toRef(props, 'persist'),
  onStepStarted: (result) => {
    stepTree.setSelectedStep(result);
  },
  onComplete: (summary) => {
    emit('complete', summary);
  },
});

const stepTree = useStepTree({
  stepResults: execution.stepResults,
  definition: toRef(props, 'definition'),
  generateNodeKey: execution.generateNodeKey,
});

// 日志弹窗状态
const showLogsModal = ref(false);

// 选中步骤的 AI 内容
const selectedStepAIContent = computed(() => {
  if (!stepTree.selectedStep.value) return null;
  return execution.aiContent.value.get(stepTree.selectedStep.value.stepId) || null;
});

// 选中步骤的 AI 工具调用
const selectedStepAIToolCalls = computed(() => {
  if (!stepTree.selectedStep.value) return null;
  return execution.aiToolCalls.value.get(stepTree.selectedStep.value.stepId) || null;
});

// 组件卸载时清理
onBeforeUnmount(() => {
  execution.cleanup();
});

// 关闭面板（仅关闭 UI，不中断执行）
function handleClose() {
  emit('close');
}

// 暴露方法
defineExpose({
  startExecution: execution.start,
  stopExecution: execution.stop,
  cleanup: execution.cleanup,
  // 兼容旧接口
  startDebug: execution.start,
  stopDebug: execution.stop,
});
</script>

<template>
  <div class="execution-panel">
    <!-- 头部状态 -->
    <ExecutionHeader
      :loading="execution.loading.value"
      :stopping="execution.stopping.value"
      :is-running="execution.isRunning.value"
      :is-completed="execution.isCompleted.value"
      :status-text="execution.statusText.value"
      :status-color="execution.statusColor.value"
      :progress-percent="execution.progressPercent.value"
      :current-progress="execution.currentProgress.value"
      :execution-summary="execution.executionSummary.value"
      @start="execution.start"
      @stop="execution.stop"
      @restart="execution.restart"
      @show-logs="showLogsModal = true"
      @close="handleClose"
    />

    <!-- 错误/断开连接提示 -->
    <ExecutionAlerts
      :error-message="execution.errorMessage.value"
      :disconnected="execution.disconnected.value"
      :reconnecting="execution.reconnecting.value"
      :reconnect-attempts="execution.reconnectAttempts.value"
      :max-reconnect-attempts="execution.maxReconnectAttempts"
      :has-execution-summary="!!execution.executionSummary.value"
      @clear-error="execution.errorMessage.value = null"
      @reconnect="execution.handleReconnect"
    />

    <!-- 执行汇总 -->
    <ExecutionSummaryBar
      v-if="execution.executionSummary.value"
      :summary="execution.executionSummary.value"
    />

    <!-- 主体内容：左右结构 -->
    <div class="execution-content">
      <!-- 左侧：步骤树 -->
      <StepTreePanel
        :loading="execution.loading.value"
        :is-running="execution.isRunning.value"
        :tree-data="stepTree.treeData.value"
        :expanded-keys="stepTree.expandedKeys.value"
        :selected-step-key="stepTree.selectedStepKey.value"
        @select="stepTree.handleTreeSelect"
        @update:expanded-keys="stepTree.expandedKeys.value = $event"
      />

      <!-- 右侧：步骤详情 -->
      <StepDetailPanel
        :selected-step="stepTree.selectedStep.value"
        :selected-tree-node="stepTree.selectedTreeNode.value"
        :is-iteration-selected="stepTree.isIterationSelected.value"
        :ai-content="selectedStepAIContent"
        :ai-tool-calls="selectedStepAIToolCalls"
        :current-a-i-step-id="execution.currentAIStepId.value"
      />
    </div>

    <!-- 执行日志 Modal -->
    <LogsModal v-model:open="showLogsModal" :logs="execution.logs.value" />

    <!-- AI 交互对话框 -->
    <AIInteractionModal
      :open="execution.interactionOpen.value"
      :data="execution.interactionData.value"
      :value="execution.interactionValue.value"
      :countdown="execution.interactionCountdown.value"
      @update:value="execution.interactionValue.value = $event"
      @confirm="execution.handleInteractionConfirm"
      @skip="execution.handleInteractionSkip"
    />
  </div>
</template>

<style scoped>
.execution-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  padding: 16px;
}

.execution-content {
  display: flex;
  gap: 12px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
</style>
