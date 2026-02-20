<script setup lang="ts">
/**
 * 数据库步骤详情组件（流程调试）
 * 复用编辑器中的 DatabaseResponsePanel 组件
 */
import { computed } from 'vue';

import { Alert } from 'ant-design-vue';

import type { StepResult } from '#/api/debug';
import type { DatabaseResponseData } from '../../../editor/types/database';

import DatabaseResponsePanel from '../../../editor/node-types/database/DatabaseResponsePanel.vue';

interface Props {
  stepResult: StepResult;
}

const props = defineProps<Props>();

const dbResponse = computed(() => {
  return (props.stepResult.output as DatabaseResponseData | undefined) ?? null;
});
</script>

<template>
  <div class="db-step-detail">
    <Alert
      v-if="stepResult.error && !dbResponse"
      type="error"
      :message="stepResult.error"
      class="error-alert"
    />

    <DatabaseResponsePanel v-if="dbResponse" :response="dbResponse" />

    <div v-else class="empty-state">无响应数据</div>
  </div>
</template>

<style scoped>
.db-step-detail {
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 100%;
  min-height: 0;
}

.error-alert {
  margin: 0;
  flex-shrink: 0;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: hsl(var(--foreground) / 40%);
}
</style>
