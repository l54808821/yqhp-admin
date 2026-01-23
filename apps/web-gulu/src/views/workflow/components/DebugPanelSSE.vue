<!--
  此文件已重构，实际实现位于 ./debug/DebugPanelSSE.vue
  保留此文件以兼容现有导入
-->
<script setup lang="ts">
import { ref } from 'vue';
import DebugPanelSSEImpl from './debug/DebugPanelSSE.vue';
import type { DebugSummary, WorkflowDefinition } from './debug/types';

interface Props {
  workflowId: number;
  envId: number;
  visible?: boolean;
  executorType?: 'local' | 'remote';
  slaveId?: string;
  definition?: WorkflowDefinition;
  selectedSteps?: string[];
}

defineProps<Props>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'complete', summary: DebugSummary): void;
}>();

// 暴露子组件的方法
const implRef = ref<InstanceType<typeof DebugPanelSSEImpl> | null>(null);

defineExpose({
  startDebug: () => implRef.value?.startDebug(),
  stopDebug: () => implRef.value?.stopDebug(),
});
</script>

<template>
  <DebugPanelSSEImpl
    ref="implRef"
    :workflow-id="workflowId"
    :env-id="envId"
    :visible="visible"
    :executor-type="executorType"
    :slave-id="slaveId"
    :definition="definition"
    :selected-steps="selectedSteps"
    @close="emit('close')"
    @complete="(summary) => emit('complete', summary)"
  />
</template>
