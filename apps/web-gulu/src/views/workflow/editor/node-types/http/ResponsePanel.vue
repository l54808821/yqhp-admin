<script setup lang="ts">
/**
 * HTTP 响应面板（单步调试）
 * 使用共享的 HttpResponsePanel 组件
 */
import { computed } from 'vue';

import type { ResponseData } from '../../types';
import {
  HttpResponsePanel,
  type HttpResponseData,
} from '../../../components/shared';

interface Props {
  response: ResponseData;
}

const props = defineProps<Props>();

// 将 ResponseData 转换为统一的 HttpResponseData 格式
const httpResponseData = computed((): HttpResponseData => {
  const r = props.response;
  return {
    statusCode: r.statusCode,
    statusText: r.statusText,
    duration: r.duration,
    size: r.size,
    headers: r.headers as Record<string, string | string[]>,
    cookies: r.cookies,
    body: r.body,
    bodyType: r.bodyType as HttpResponseData['bodyType'],
    consoleLogs: r.consoleLogs,
    assertions: r.assertions?.map(a => ({
      id: a.id,
      name: a.name,
      passed: a.passed,
      message: a.message,
      expected: a.expected,
      actual: a.actual,
    })),
    actualRequest: r.actualRequest,
  };
});
</script>

<template>
  <div class="response-panel">
    <HttpResponsePanel :response="httpResponseData" />
  </div>
</template>

<style scoped>
.response-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}
</style>
