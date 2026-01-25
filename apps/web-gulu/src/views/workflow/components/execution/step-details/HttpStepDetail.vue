<script setup lang="ts">
/**
 * HTTP 步骤详情组件（流程调试）
 * 使用共享的 HttpResponsePanel 组件
 */
import { computed } from 'vue';

import { Alert } from 'ant-design-vue';

import type { StepResult } from '#/api/debug';

import { HttpResponsePanel, type HttpResponseData } from '../../shared';

interface Props {
  stepResult: StepResult;
}

const props = defineProps<Props>();

// 直接使用 output 作为响应数据（后端已统一为 HTTPResponseData 格式）
const httpResponse = computed(() => {
  return props.stepResult.output as HttpResponseData | undefined ?? null;
});
</script>

<template>
  <div class="http-step-detail">
    <!-- 错误信息 -->
    <Alert
      v-if="stepResult.error"
      type="error"
      :message="stepResult.error"
      class="error-alert"
    />

    <!-- 使用统一的响应面板 -->
    <HttpResponsePanel
      v-if="httpResponse"
      :response="httpResponse"
    />

    <div v-else class="empty-state">
      无响应数据
    </div>
  </div>
</template>

<style scoped>
.http-step-detail {
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
  color: hsl(var(--foreground) / 45%);
}
</style>
