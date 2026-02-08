<script setup lang="ts">
import { ref, watch } from 'vue';

import { Drawer, message } from 'ant-design-vue';

import type { DebugSummary } from '#/api/debug';
import type { Workflow } from '#/api/workflow';
import type { StepNode } from '../editor/WorkflowTreeEditor.vue';

import { useProjectStore } from '#/store/project';
import { useDebugContext } from './execution/composables/useDebugContext';
import ExecutionPanel from './execution/ExecutionPanel.vue';

interface Props {
  open: boolean;
  workflow: Workflow | null;
  definition?: { name: string; steps: StepNode[] };  // 当前内存中的工作流定义
  selectedSteps?: string[];  // 选中的步骤 ID
  persist?: boolean;  // 是否持久化执行记录，默认 false（调试模式不入库）
}

const props = withDefaults(defineProps<Props>(), {
  persist: false,  // 调试模式默认不入库
});

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'complete', summary: DebugSummary): void;
}>();

const projectStore = useProjectStore();
const debugContext = useDebugContext();
const executionPanelRef = ref<InstanceType<typeof ExecutionPanel> | null>(null);

watch(
  () => props.open,
  (open) => {
    if (open) {
      // 检查是否选择了环境
      if (!projectStore.currentEnvId) {
        message.warning('请先在右上角选择执行环境');
        emit('update:open', false);
        return;
      }
      // 等待 drawer 打开后启动执行
      setTimeout(() => {
        executionPanelRef.value?.startExecution();
      }, 300);
    }
  },
);

function handleClose() {
  emit('update:open', false);
}

function handleExecutionComplete(summary: DebugSummary) {
  // 保存调试上下文（缓存变量和执行结果，用于单步快速调试）
  if (props.workflow) {
    debugContext.saveContext(
      props.workflow.id,
      summary.variables || {},
      projectStore.currentEnvId || 0,
      summary,
      summary.envVariables,
    );
    if (summary.variables && Object.keys(summary.variables).length > 0) {
      message.info('调试上下文已缓存，可在单步调试中使用');
    }
  }

  emit('complete', summary);
  if (summary.status === 'success' || summary.status === 'completed') {
    message.success('执行完成');
  } else if (summary.status === 'failed') {
    message.error('执行失败');
  }
}
</script>

<template>
  <Drawer
    :open="open"
    title="执行工作流"
    placement="right"
    :width="1100"
    :mask-closable="false"
    :body-style="{ padding: 0 }"
    :header-style="{ padding: '10px 16px' }"
    @close="handleClose"
  >
    <ExecutionPanel
      v-if="workflow && projectStore.currentEnvId"
      ref="executionPanelRef"
      :workflow-id="workflow.id"
      :env-id="projectStore.currentEnvId"
      :visible="open"
      :definition="definition"
      :selected-steps="selectedSteps"
      :persist="persist"
      @close="handleClose"
      @complete="handleExecutionComplete"
    />
    <div v-else class="no-env-tip">
      请先在右上角选择执行环境
    </div>
  </Drawer>
</template>

<style scoped>
.no-env-tip {
  text-align: center;
  color: #999;
  padding: 40px;
}
</style>
