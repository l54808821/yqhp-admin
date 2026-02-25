<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '#/components/page';

import {
  Button,
  Card,
  Descriptions,
  message,
  Popconfirm,
  Space,
  Spin,
  Tag,
} from 'ant-design-vue';

import type { Execution } from '#/api/execution';

import {
  getExecutionApi,
  stopExecutionApi,
} from '#/api/execution';

const route = useRoute();
const router = useRouter();

const loading = ref(false);
const execution = ref<Execution | null>(null);
const pollingTimer = ref<number | null>(null);

const executionId = computed(() => Number(route.params.executionId));

const statusMap: Record<string, { color: string; text: string }> = {
  pending: { color: 'default', text: '等待中' },
  running: { color: 'processing', text: '执行中' },
  completed: { color: 'success', text: '成功' },
  failed: { color: 'error', text: '失败' },
  stopped: { color: 'warning', text: '已停止' },
  paused: { color: 'orange', text: '已暂停' },
};

const sourceTypeMap: Record<string, { color: string; text: string }> = {
  performance: { color: 'purple', text: '性能测试' },
  test_plan: { color: 'cyan', text: '测试计划' },
  debug: { color: 'blue', text: '调试' },
};

const isRunning = computed(() =>
  execution.value?.status === 'pending' || execution.value?.status === 'running'
);

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
    execution.value = await getExecutionApi(executionId.value);
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
  const projectId = route.params.projectId;
  router.push({ name: 'HistoryIndex', params: { projectId } });
}

function formatDuration(ms: number | null | undefined): string {
  if (!ms) return '-';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}min`;
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
      <Card title="执行信息">
        <Descriptions :column="2" size="small">
          <Descriptions.Item label="ID">
            {{ execution?.id }}
          </Descriptions.Item>
          <Descriptions.Item label="执行ID">
            {{ execution?.execution_id }}
          </Descriptions.Item>
          <Descriptions.Item label="工作流ID">
            {{ execution?.workflow_id }}
          </Descriptions.Item>
          <Descriptions.Item label="环境ID">
            {{ execution?.env_id }}
          </Descriptions.Item>
          <Descriptions.Item label="执行机ID">
            {{ execution?.executor_id || '-' }}
          </Descriptions.Item>
          <Descriptions.Item label="来源类型">
            <Tag :color="sourceTypeMap[execution?.source_type || '']?.color || 'default'">
              {{ sourceTypeMap[execution?.source_type || '']?.text || execution?.source_type }}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag :color="statusMap[execution?.status || 'pending']?.color">
              {{ statusMap[execution?.status || 'pending']?.text }}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="开始时间">
            {{ execution?.start_time ? new Date(execution.start_time).toLocaleString('zh-CN') : '-' }}
          </Descriptions.Item>
          <Descriptions.Item label="结束时间">
            {{ execution?.end_time ? new Date(execution.end_time).toLocaleString('zh-CN') : '-' }}
          </Descriptions.Item>
          <Descriptions.Item label="耗时">
            {{ execution?.duration ? formatDuration(execution.duration) : '-' }}
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </Spin>
  </Page>
</template>
