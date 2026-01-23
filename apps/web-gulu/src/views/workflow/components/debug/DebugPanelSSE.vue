<script setup lang="ts">
import { computed, onBeforeUnmount, toRef, watch } from 'vue';

import type { DebugSummary, WorkflowDefinition } from './types';
import { useDebugSSE } from './composables/useDebugSSE';
import { useStepTree } from './composables/useStepTree';

import DebugHeader from './DebugHeader.vue';
import DebugAlerts from './DebugAlerts.vue';
import DebugSummaryBar from './DebugSummaryBar.vue';
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
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  executorType: 'local',
  selectedSteps: () => [],
});

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'complete', summary: DebugSummary): void;
}>();

// 使用 composables
const debugSSE = useDebugSSE({
  workflowId: toRef(props, 'workflowId'),
  envId: toRef(props, 'envId'),
  executorType: toRef(props, 'executorType'),
  slaveId: toRef(props, 'slaveId'),
  definition: toRef(props, 'definition'),
  selectedSteps: toRef(props, 'selectedSteps'),
  onStepStarted: (result) => {
    stepTree.setSelectedStep(result);
  },
  onComplete: (summary) => {
    emit('complete', summary);
  },
});

const stepTree = useStepTree({
  stepResults: debugSSE.stepResults,
  definition: toRef(props, 'definition'),
  generateNodeKey: debugSSE.generateNodeKey,
});

// 日志弹窗状态
const logsModalOpen = computed({
  get: () => false, // 使用本地状态
  set: () => {},
});

// 实际使用本地状态来控制日志弹窗
import { ref } from 'vue';
const showLogsModal = ref(false);

// 选中步骤的 AI 内容
const selectedStepAIContent = computed(() => {
  if (!stepTree.selectedStep.value) return null;
  return debugSSE.aiContent.value.get(stepTree.selectedStep.value.step_id) || null;
});

// 监听 visible 变化
watch(
  () => props.visible,
  (visible) => {
    if (!visible) {
      debugSSE.cleanup();
      stepTree.resetSelection();
    }
  }
);

// 组件卸载时清理
onBeforeUnmount(() => {
  debugSSE.cleanup();
});

// 关闭面板
function handleClose() {
  debugSSE.cleanup();
  emit('close');
}

// 调试 HTTP 步骤
function handleDebugHttpStep() {
  console.log('Debug HTTP step:', stepTree.selectedStep.value);
}

// 调试脚本步骤
function handleDebugScriptStep() {
  console.log('Debug Script step:', stepTree.selectedStep.value);
}

// 暴露方法
defineExpose({
  startDebug: debugSSE.startDebug,
  stopDebug: debugSSE.stopDebug,
});
</script>

<template>
  <div class="debug-panel">
    <!-- 头部状态 -->
    <DebugHeader
      :loading="debugSSE.loading.value"
      :stopping="debugSSE.stopping.value"
      :is-running="debugSSE.isRunning.value"
      :is-completed="debugSSE.isCompleted.value"
      :status-text="debugSSE.statusText.value"
      :status-color="debugSSE.statusColor.value"
      :progress-percent="debugSSE.progressPercent.value"
      :current-progress="debugSSE.currentProgress.value"
      :debug-summary="debugSSE.debugSummary.value"
      @start="debugSSE.startDebug"
      @stop="debugSSE.stopDebug"
      @restart="debugSSE.restart"
      @show-logs="showLogsModal = true"
      @close="handleClose"
    />

    <!-- 错误/断开连接提示 -->
    <DebugAlerts
      :error-message="debugSSE.errorMessage.value"
      :disconnected="debugSSE.disconnected.value"
      :reconnecting="debugSSE.reconnecting.value"
      :reconnect-attempts="debugSSE.reconnectAttempts.value"
      :max-reconnect-attempts="debugSSE.maxReconnectAttempts"
      :has-debug-summary="!!debugSSE.debugSummary.value"
      @clear-error="debugSSE.errorMessage.value = null"
      @reconnect="debugSSE.handleReconnect"
    />

    <!-- 执行汇总 -->
    <DebugSummaryBar v-if="debugSSE.debugSummary.value" :summary="debugSSE.debugSummary.value" />

    <!-- 主体内容：左右结构 -->
    <div class="debug-content">
      <!-- 左侧：步骤树 -->
      <StepTreePanel
        :loading="debugSSE.loading.value"
        :is-running="debugSSE.isRunning.value"
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
        :current-a-i-step-id="debugSSE.currentAIStepId.value"
        @debug-http-step="handleDebugHttpStep"
        @debug-script-step="handleDebugScriptStep"
      />
    </div>

    <!-- 执行日志 Modal -->
    <LogsModal v-model:open="showLogsModal" :logs="debugSSE.logs.value" />

    <!-- AI 交互对话框 -->
    <AIInteractionModal
      :open="debugSSE.interactionOpen.value"
      :data="debugSSE.interactionData.value"
      :value="debugSSE.interactionValue.value"
      :countdown="debugSSE.interactionCountdown.value"
      @update:value="debugSSE.interactionValue.value = $event"
      @confirm="debugSSE.handleInteractionConfirm"
      @skip="debugSSE.handleInteractionSkip"
    />
  </div>
</template>

<style scoped>
.debug-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  padding: 16px;
}

.debug-content {
  display: flex;
  gap: 12px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
</style>
