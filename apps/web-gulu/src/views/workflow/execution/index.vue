<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  Descriptions,
  message,
  Popconfirm,
  Progress,
  Space,
  Spin,
  Tag,
  Timeline,
} from 'ant-design-vue';

import type { Execution } from '#/api/execution';

import {
  getExecutionApi,
  getExecutionLogsApi,
  stopExecutionApi,
} from '#/api/execution';

const route = useRoute();
const router = useRouter();

const loading = ref(false);
const execution = ref<Execution | null>(null);
const logs = ref<any[]>([]);
const pollingTimer = ref<number | null>(null);

const executionId = computed(() => Number(route.params.id));

const statusMap: Record<string, { color: string; text: string }> = {
  pending: { color: 'default', text: '等待中' },
  running: { color: 'processing', text: '执行中' },
  success: { color: 'success', text: '成功' },
  failed: { color: 'error', text: '失败' },
  stopped: { color: 'warning', text: '已停止' },
};

const isRunning = computed(() =>
  execution.value?.status === 'pending' || execution.value?.status === 'running'
);

const progress = computed(() => {
  if (!execution.value) return 0;
  const total = execution.value.total_steps || 1;
  const completed = execution.value.completed_steps || 0;
  return Math.round((completed / total) * 100);
});

onMounted(async () => {
  await loadExecution();
  startPolling();
});

onUnmounted(() => {
  stopPolling();
});

function startPolling() {
  pollingTimer.value = window.setInterval(async () => {
    if (isRunning.value) {
      await loadExecution();
    } else {
      stopPolling();
    }
  }, 2000);
}

function stopPolling() {
  if (pollingTimer.value) {
    clearInterval(pollingTimer.value);
    pollingTimer.value = null;
  }
}

async function loadExecution() {
  if (!executionId.value) return;

  try {
    loading.value = !execution.value;
    const [exec, logList] = await Promise.all([
      getExecutionApi(executionId.value),
      getExecutionLogsApi(executionId.value),
    ]);
    execution.value = exec;
    logs.value = logList || [];
  } catch {
    message.error('加载执行信息失败');
  } finally {
    loading.value = false;
  }
}

async function handleStop() {
  if (!executionId.value) return;

  try {
    await stopExecutionApi(executionId.value);
    message.success('已发送停止请求');
    await loadExecution();
  } catch {
    message.error('停止执行失败');
  }
}

function handleBack() {
  router.push({ name: 'ExecutionHistory' });
}

function getLogColor(level: string): string {
  const colors: Record<string, string> = {
    info: 'blue',
    success: 'green',
    warning: 'orange',
    error: 'red',
  };
  return colors[level] || 'gray';
}
</script>

<template>
  <Page title="执行详情">
    <template #extra>
      <Space>
        <Popconfirm
          v-if="isRunning"
          title="确定停止执行？"
          @confirm="handleStop"
        >
          <Button danger>停止执行</Button>
        </Popconfirm>
        <Button @click="handleBack">返回列表</Button>
      </Space>
    </template>

    <Spin :spinning="loading">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="执行信息">
          <Descriptions :column="1" size="small">
            <Descriptions.Item label="执行ID">
              {{ execution?.id }}
            </Descriptions.Item>
            <Descriptions.Item label="工作流">
              {{ execution?.workflow_name }}
            </Descriptions.Item>
            <Descriptions.Item label="环境">
              {{ execution?.env_name }}
            </Descriptions.Item>
            <Descriptions.Item label="执行机">
              {{ execution?.executor_name }}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag :color="statusMap[execution?.status || 'pending']?.color">
                {{ statusMap[execution?.status || 'pending']?.text }}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="开始时间">
              {{ execution?.started_at || '-' }}
            </Descriptions.Item>
            <Descriptions.Item label="结束时间">
              {{ execution?.finished_at || '-' }}
            </Descriptions.Item>
            <Descriptions.Item label="耗时">
              {{ execution?.duration ? `${execution.duration}ms` : '-' }}
            </Descriptions.Item>
          </Descriptions>

          <div v-if="isRunning" class="mt-4">
            <div class="text-sm text-gray-500 mb-2">执行进度</div>
            <Progress :percent="progress" :status="isRunning ? 'active' : 'normal'" />
          </div>
        </Card>

        <Card title="执行日志" class="max-h-96 overflow-y-auto">
          <Timeline v-if="logs.length > 0">
            <Timeline.Item
              v-for="(log, index) in logs"
              :key="index"
              :color="getLogColor(log.level)"
            >
              <div class="text-xs text-gray-400">{{ log.timestamp }}</div>
              <div :class="{ 'text-red-500': log.level === 'error' }">
                {{ log.message }}
              </div>
            </Timeline.Item>
          </Timeline>
          <div v-else class="text-center text-gray-400 py-8">
            暂无日志
          </div>
        </Card>
      </div>
    </Spin>
  </Page>
</template>
