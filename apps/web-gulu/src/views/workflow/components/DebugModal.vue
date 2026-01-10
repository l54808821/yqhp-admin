<script setup lang="ts">
import { ref, watch } from 'vue';

import { Drawer, message } from 'ant-design-vue';

import type { DebugSummary } from '#/api/debug';
import type { Workflow } from '#/api/workflow';

import { useProjectStore } from '#/store/project';
import DebugPanel from './DebugPanel.vue';

interface Props {
  open: boolean;
  workflow: Workflow | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'complete', summary: DebugSummary): void;
}>();

const projectStore = useProjectStore();
const debugPanelRef = ref<InstanceType<typeof DebugPanel> | null>(null);

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
      // 等待 drawer 打开后启动调试
      setTimeout(() => {
        debugPanelRef.value?.startDebug();
      }, 300);
    }
  },
);

function handleClose() {
  emit('update:open', false);
}

function handleDebugComplete(summary: DebugSummary) {
  emit('complete', summary);
  if (summary.status === 'success' || summary.status === 'completed') {
    message.success('调试完成');
  } else if (summary.status === 'failed') {
    message.error('调试失败');
  }
}
</script>

<template>
  <Drawer
    :open="open"
    title="调试工作流"
    placement="right"
    :width="900"
    :mask-closable="false"
    @close="handleClose"
  >
    <DebugPanel
      v-if="workflow && projectStore.currentEnvId"
      ref="debugPanelRef"
      :workflow-id="workflow.id"
      :env-id="projectStore.currentEnvId"
      :visible="open"
      @close="handleClose"
      @complete="handleDebugComplete"
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
