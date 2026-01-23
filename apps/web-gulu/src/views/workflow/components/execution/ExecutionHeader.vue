<script setup lang="ts">
import { createIconifyIcon } from '@vben/icons';
import { Button, Progress, Space, Tag } from 'ant-design-vue';
import type { ProgressData, ExecutionSummary } from './types';

const StopOutlined = createIconifyIcon('lucide:square');
const FileTextOutlined = createIconifyIcon('lucide:file-text');

interface Props {
  loading: boolean;
  stopping: boolean;
  isRunning: boolean;
  isCompleted: boolean;
  statusText: string;
  statusColor: string;
  progressPercent: number;
  currentProgress: ProgressData | null;
  executionSummary: ExecutionSummary | null;
}

defineProps<Props>();

const emit = defineEmits<{
  (e: 'start'): void;
  (e: 'stop'): void;
  (e: 'restart'): void;
  (e: 'showLogs'): void;
  (e: 'close'): void;
}>();
</script>

<template>
  <div class="execution-header">
    <Space align="center">
      <Tag :color="statusColor">{{ statusText }}</Tag>
      <Tag v-if="currentProgress" class="progress-tag">
        {{ currentProgress.current_step }}/{{ currentProgress.total_steps }}
      </Tag>
      <Progress
        v-if="isRunning || isCompleted"
        :percent="progressPercent"
        :status="executionSummary?.status === 'failed' ? 'exception' : undefined"
        :stroke-color="
          executionSummary?.status === 'completed' || executionSummary?.status === 'success'
            ? '#52c41a'
            : undefined
        "
        class="header-progress"
      />
    </Space>
    <Space>
      <Button
        v-if="!isRunning && !isCompleted"
        type="primary"
        :loading="loading"
        @click="emit('start')"
      >
        开始执行
      </Button>
      <Button v-if="isRunning" danger :loading="stopping" @click="emit('stop')">
        <template #icon><StopOutlined /></template>
        停止
      </Button>
      <Button v-if="isCompleted" @click="emit('restart')"> 重新执行 </Button>
      <Button @click="emit('showLogs')">
        <template #icon><FileTextOutlined /></template>
        执行日志
      </Button>
      <Button @click="emit('close')">关闭</Button>
    </Space>
  </div>
</template>

<style scoped>
.execution-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.progress-tag {
  font-size: 12px;
  margin: 0;
}

.header-progress {
  width: 300px;
  margin-bottom: 4px !important;
  line-height: 1;
  margin-left: 5px;
}

.header-progress :deep(.ant-progress-line) {
  margin-bottom: 0;
}
</style>
