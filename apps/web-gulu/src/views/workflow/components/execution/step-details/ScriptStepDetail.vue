<script setup lang="ts">
/**
 * 脚本步骤详情组件（流程调试）
 * 使用共享的 ScriptResponsePanel 组件
 */
import { computed } from 'vue';

import { Alert } from 'ant-design-vue';

import type { StepResult } from '#/api/debug';

import {
  ScriptResponsePanel,
  type ScriptResponseData,
} from '../../shared';

interface Props {
  stepResult: StepResult;
}

const props = defineProps<Props>();

// 直接使用 output 作为响应数据（后端已统一为 ScriptResponseData 格式）
const scriptResponse = computed<ScriptResponseData | null>(() => {
  const output = props.stepResult.output as ScriptResponseData | undefined;
  if (!output) return null;

  // 补充 success 状态（后端 output 中没有此字段，需要从 stepResult 推断）
  return {
    ...output,
    success: props.stepResult.status === 'success',
  };
});
</script>

<template>
  <div class="script-step-detail">
    <!-- 错误信息（组件外的错误） -->
    <Alert
      v-if="stepResult.error && !scriptResponse?.error"
      type="error"
      :message="stepResult.error"
      class="error-alert"
    />

    <!-- 使用统一的响应面板 -->
    <ScriptResponsePanel
      v-if="scriptResponse"
      :response="scriptResponse"
      :show-script-tab="true"
    />

    <div v-else class="empty-state">
      无脚本执行数据
    </div>
  </div>
</template>

<style scoped>
.script-step-detail {
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
