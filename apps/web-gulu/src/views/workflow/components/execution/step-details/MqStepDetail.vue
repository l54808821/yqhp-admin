<script setup lang="ts">
import { computed } from 'vue';

import { Alert } from 'ant-design-vue';

import type { StepResult } from '#/api/debug';
import type { MqResponseData } from '../../../editor/types/mq';

import MqResponsePanel from '../../../editor/node-types/mq/MqResponsePanel.vue';

interface Props {
  stepResult: StepResult;
}

const props = defineProps<Props>();

const mqResponse = computed((): MqResponseData | null => {
  const o = props.stepResult.output as any;
  if (!o) return null;
  return {
    success: o.success ?? false,
    action: o.action ?? 'send',
    durationMs: o.durationMs ?? o.duration ?? 0,
    topic: o.topic,
    queue: o.queue,
    messages: o.messages,
    count: o.count ?? o.messages?.length ?? 0,
    error: o.error,
    consoleLogs: o.consoleLogs,
    assertions: o.assertions,
  };
});
</script>

<template>
  <div class="mq-step-detail">
    <Alert
      v-if="stepResult.error"
      type="error"
      :message="stepResult.error"
      class="error-alert"
    />

    <MqResponsePanel v-if="mqResponse" :response="mqResponse" />

    <div v-else class="empty-state">无响应数据</div>
  </div>
</template>

<style scoped>
.mq-step-detail {
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
