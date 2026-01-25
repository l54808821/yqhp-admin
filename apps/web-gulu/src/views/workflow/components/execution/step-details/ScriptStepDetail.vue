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

// 脚本输出类型定义
interface ScriptOutput {
  script?: string;
  language?: string;
  result?: unknown;
  consoleLogs?: Array<{ type: string; message?: string }>;
  error?: string;
  variables?: Record<string, unknown>;
  durationMs?: number;
}

interface Props {
  stepResult: StepResult;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'debug-step'): void;
}>();

// 转换为统一的响应格式
const scriptResponse = computed<ScriptResponseData | null>(() => {
  const output = props.stepResult.output as ScriptOutput | undefined;
  if (!output) return null;

  return {
    success: props.stepResult.status === 'success',
    language: output.language || 'javascript',
    durationMs: output.durationMs || props.stepResult.duration_ms || 0,
    script: output.script || '',
    result: output.result,
    error: output.error || props.stepResult.error || '',
    consoleLogs: output.consoleLogs || [],
    variables: output.variables || {},
  };
});

function handleDebugStep() {
  emit('debug-step');
}
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
      :show-debug-button="true"
      :show-script-tab="true"
      @debug="handleDebugStep"
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
