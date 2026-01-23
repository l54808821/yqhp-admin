<!--
  此文件已重构为 execution/ExecutionPanel.vue
  保留此文件以兼容现有导入
-->
<script setup lang="ts">
import { ref } from 'vue';
import ExecutionPanel from './execution/ExecutionPanel.vue';
import type { ExecutionSummary, WorkflowDefinition } from './execution/types';

interface Props {
  workflowId: number;
  envId: number;
  visible?: boolean;
  executorType?: 'local' | 'remote';
  slaveId?: string;
  definition?: WorkflowDefinition;
  selectedSteps?: string[];
  persist?: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'complete', summary: ExecutionSummary): void;
}>();

const implRef = ref<InstanceType<typeof ExecutionPanel> | null>(null);

defineExpose({
  startDebug: () => implRef.value?.startExecution(),
  stopDebug: () => implRef.value?.stopExecution(),
  startExecution: () => implRef.value?.startExecution(),
  stopExecution: () => implRef.value?.stopExecution(),
});
</script>

<template>
  <ExecutionPanel
    ref="implRef"
    :workflow-id="workflowId"
    :env-id="envId"
    :visible="visible"
    :executor-type="executorType"
    :slave-id="slaveId"
    :definition="definition"
    :selected-steps="selectedSteps"
    :persist="persist"
    @close="emit('close')"
    @complete="(summary) => emit('complete', summary)"
  />
</template>
