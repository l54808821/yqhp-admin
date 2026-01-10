<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';

import { createIconifyIcon } from '@vben/icons';

import {
  Alert,
  Button,
  Card,
  Progress,
  Space,
  Spin,
  Tag,
  Timeline,
} from 'ant-design-vue';

// 创建图标组件
const CheckCircleOutlined = createIconifyIcon('lucide:check-circle');
const ClockCircleOutlined = createIconifyIcon('lucide:clock');
const CloseCircleOutlined = createIconifyIcon('lucide:x-circle');
const LoadingOutlined = createIconifyIcon('lucide:loader-2');
const PauseCircleOutlined = createIconifyIcon('lucide:pause-circle');
const StopOutlined = createIconifyIcon('lucide:square');

import type {
  DebugSummary,
  ProgressData,
  StepResult,
  StepStartedData,
  WSMessage,
} from '#/api/debug';

import {
  buildWebSocketUrl,
  startDebugApi,
  stopDebugApi,
} from '#/api/debug';
import { createWebSocketService, type WebSocketService, type WebSocketState } from '#/utils/websocket';

interface Props {
  workflowId: number;
  envId: number;
  visible?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
});

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'complete', summary: DebugSummary): void;
}>();

// 状态
const loading = ref(false);
const stopping = ref(false);
const sessionId = ref<string | null>(null);
const wsState = ref<WebSocketState>('disconnected');
const stepResults = ref<StepResult[]>([]);
const currentProgress = ref<ProgressData | null>(null);
const debugSummary = ref<DebugSummary | null>(null);
const logs = ref<string[]>([]);
const errorMessage = ref<string | null>(null);
const currentStepName = ref<string>('');

let wsService: WebSocketService | null = null;

// 计算属性
const isRunning = computed(() => wsState.value === 'connected' && !debugSummary.value);
const isCompleted = computed(() => !!debugSummary.value);
const progressPercent = computed(() => currentProgress.value?.percentage || 0);

const statusText = computed(() => {
  if (loading.value) return '正在启动调试...';
  if (stopping.value) return '正在停止...';
  if (wsState.value === 'connecting') return '正在连接...';
  if (wsState.value === 'reconnecting') return '正在重连...';
  if (wsState.value === 'error') return '连接错误';
  if (debugSummary.value) {
    const status = debugSummary.value.status;
    if (status === 'completed' || status === 'success') return '调试完成';
    if (status === 'failed') return '调试失败';
    if (status === 'timeout') return '调试超时';
    if (status === 'stopped') return '已停止';
  }
  if (isRunning.value) return '调试中...';
  return '未开始';
});

const statusColor = computed(() => {
  if (debugSummary.value) {
    const status = debugSummary.value.status;
    if (status === 'completed' || status === 'success') return 'success';
    if (status === 'failed' || status === 'timeout') return 'error';
    if (status === 'stopped') return 'warning';
  }
  if (wsState.value === 'error') return 'error';
  if (isRunning.value) return 'processing';
  return 'default';
});

// 监听 visible 变化
watch(
  () => props.visible,
  (visible) => {
    if (!visible) {
      cleanup();
    }
  },
);

// 组件卸载时清理
onBeforeUnmount(() => {
  cleanup();
});

// 开始调试
async function startDebug() {
  if (!props.workflowId || !props.envId) return;

  try {
    loading.value = true;
    errorMessage.value = null;
    stepResults.value = [];
    currentProgress.value = null;
    debugSummary.value = null;
    logs.value = [];
    currentStepName.value = '';

    const response = await startDebugApi(props.workflowId, {
      env_id: props.envId,
    });

    sessionId.value = response.session_id;
    connectWebSocket(response.session_id);
  } catch (error: any) {
    errorMessage.value = error?.message || '启动调试失败';
  } finally {
    loading.value = false;
  }
}

// 停止调试
async function stopDebug() {
  if (!sessionId.value) return;

  try {
    stopping.value = true;
    await stopDebugApi(sessionId.value);
  } catch (error: any) {
    errorMessage.value = error?.message || '停止调试失败';
  } finally {
    stopping.value = false;
  }
}

// 连接 WebSocket
function connectWebSocket(sid: string) {
  const url = buildWebSocketUrl(sid);

  wsService = createWebSocketService({
    url,
    onMessage: handleMessage,
    onStateChange: (state) => {
      wsState.value = state;
    },
    onError: () => {
      errorMessage.value = 'WebSocket 连接错误';
    },
  });

  wsService.connect();
}

// 处理 WebSocket 消息
function handleMessage(message: WSMessage) {
  addLog(`[${message.type}] ${JSON.stringify(message.data || {})}`);

  switch (message.type) {
    case 'step_started':
      handleStepStarted(message.data as StepStartedData);
      break;
    case 'step_completed':
    case 'step_failed':
      handleStepResult(message.data as StepResult);
      break;
    case 'progress':
      handleProgress(message.data as ProgressData);
      break;
    case 'debug_completed':
      handleDebugComplete(message.data as DebugSummary);
      break;
    case 'error':
      handleError(message.data as { message: string });
      break;
  }
}

function handleStepStarted(data: StepStartedData) {
  currentStepName.value = data.step_name;
  // 添加一个 running 状态的步骤
  const existingIndex = stepResults.value.findIndex(s => s.step_id === data.step_id);
  if (existingIndex === -1) {
    stepResults.value.push({
      step_id: data.step_id,
      step_name: data.step_name,
      status: 'running',
      duration_ms: 0,
    });
  }
}

function handleStepResult(result: StepResult) {
  const existingIndex = stepResults.value.findIndex(s => s.step_id === result.step_id);
  if (existingIndex >= 0) {
    stepResults.value[existingIndex] = result;
  } else {
    stepResults.value.push(result);
  }
}

function handleProgress(progress: ProgressData) {
  currentProgress.value = progress;
}

function handleDebugComplete(summary: DebugSummary) {
  debugSummary.value = summary;
  emit('complete', summary);
  // 断开 WebSocket
  wsService?.disconnect();
}

function handleError(data: { message: string }) {
  errorMessage.value = data.message;
}

function addLog(log: string) {
  const timestamp = new Date().toLocaleTimeString();
  logs.value.push(`[${timestamp}] ${log}`);
  // 限制日志数量
  if (logs.value.length > 500) {
    logs.value = logs.value.slice(-500);
  }
}

// 清理资源
function cleanup() {
  wsService?.disconnect();
  wsService = null;
  sessionId.value = null;
}

// 关闭面板
function handleClose() {
  cleanup();
  emit('close');
}

// 重新开始
function handleRestart() {
  cleanup();
  startDebug();
}

// 获取步骤状态图标
function getStepIcon(status: string) {
  switch (status) {
    case 'success':
      return CheckCircleOutlined;
    case 'failed':
      return CloseCircleOutlined;
    case 'running':
      return LoadingOutlined;
    case 'skipped':
      return PauseCircleOutlined;
    default:
      return ClockCircleOutlined;
  }
}

// 获取步骤状态颜色
function getStepColor(status: string) {
  switch (status) {
    case 'success':
      return 'green';
    case 'failed':
      return 'red';
    case 'running':
      return 'blue';
    case 'skipped':
      return 'gray';
    default:
      return 'gray';
  }
}

// 格式化时长
function formatDuration(ms: number) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

// 暴露方法
defineExpose({
  startDebug,
  stopDebug,
});
</script>

<template>
  <div class="debug-panel">
    <!-- 头部状态 -->
    <div class="debug-header">
      <Space>
        <Tag :color="statusColor">{{ statusText }}</Tag>
        <span v-if="currentProgress" class="progress-text">
          {{ currentProgress.current_step }}/{{ currentProgress.total_steps }}
          <span v-if="currentStepName" class="step-name">- {{ currentStepName }}</span>
        </span>
      </Space>
      <Space>
        <Button
          v-if="!isRunning && !isCompleted"
          type="primary"
          :loading="loading"
          @click="startDebug"
        >
          开始调试
        </Button>
        <Button
          v-if="isRunning"
          danger
          :loading="stopping"
          @click="stopDebug"
        >
          <template #icon><StopOutlined /></template>
          停止
        </Button>
        <Button v-if="isCompleted" @click="handleRestart">
          重新调试
        </Button>
        <Button @click="handleClose">关闭</Button>
      </Space>
    </div>

    <!-- 进度条 -->
    <Progress
      v-if="isRunning || isCompleted"
      :percent="progressPercent"
      :status="debugSummary?.status === 'failed' ? 'exception' : undefined"
      :stroke-color="(debugSummary?.status === 'completed' || debugSummary?.status === 'success') ? '#52c41a' : undefined"
    />

    <!-- 错误提示 -->
    <Alert
      v-if="errorMessage"
      type="error"
      :message="errorMessage"
      closable
      class="error-alert"
      @close="errorMessage = null"
    />

    <!-- 调试汇总 -->
    <Card v-if="debugSummary" class="summary-card" size="small" title="调试结果">
      <div class="summary-stats">
        <div class="stat-item">
          <span class="stat-label">总步骤</span>
          <span class="stat-value">{{ debugSummary.total_steps }}</span>
        </div>
        <div class="stat-item success">
          <span class="stat-label">成功</span>
          <span class="stat-value">{{ debugSummary.success_steps }}</span>
        </div>
        <div class="stat-item error">
          <span class="stat-label">失败</span>
          <span class="stat-value">{{ debugSummary.failed_steps }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">耗时</span>
          <span class="stat-value">{{ formatDuration(debugSummary.total_duration_ms) }}</span>
        </div>
      </div>
    </Card>

    <!-- 步骤执行结果 -->
    <Card class="steps-card" size="small" title="执行步骤">
      <Spin v-if="loading" />
      <Timeline v-else-if="stepResults.length > 0">
        <Timeline.Item
          v-for="step in stepResults"
          :key="step.step_id"
          :color="getStepColor(step.status)"
        >
          <div class="step-item">
            <div class="step-header">
              <component :is="getStepIcon(step.status)" :style="{ color: getStepColor(step.status) }" />
              <span class="step-name">{{ step.step_name }}</span>
              <Tag v-if="step.status === 'running'" color="processing">执行中</Tag>
              <Tag v-else-if="step.status === 'success'" color="success">成功</Tag>
              <Tag v-else-if="step.status === 'failed'" color="error">失败</Tag>
              <Tag v-else-if="step.status === 'skipped'" color="default">跳过</Tag>
              <span v-if="step.duration_ms > 0" class="step-duration">
                {{ formatDuration(step.duration_ms) }}
              </span>
            </div>
            <div v-if="step.error" class="step-error">
              {{ step.error }}
            </div>
            <div v-if="step.logs && step.logs.length > 0" class="step-logs">
              <div v-for="(log, idx) in step.logs" :key="idx" class="log-line">
                {{ log }}
              </div>
            </div>
          </div>
        </Timeline.Item>
      </Timeline>
      <div v-else class="empty-steps">
        暂无执行步骤
      </div>
    </Card>

    <!-- 日志输出 -->
    <Card class="logs-card" size="small" title="调试日志">
      <div class="logs-container">
        <div v-for="(log, idx) in logs" :key="idx" class="log-line">
          {{ log }}
        </div>
        <div v-if="logs.length === 0" class="empty-logs">
          暂无日志
        </div>
      </div>
    </Card>
  </div>
</template>

<style scoped>
.debug-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  padding: 12px;
}

.debug-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.progress-text {
  font-size: 12px;
  color: #666;
}

.step-name {
  margin-left: 4px;
  color: #999;
}

.error-alert {
  margin: 8px 0;
}

.summary-card {
  flex-shrink: 0;
}

.summary-stats {
  display: flex;
  gap: 24px;
}

.stat-item {
  text-align: center;
}

.stat-item.success .stat-value {
  color: #52c41a;
}

.stat-item.error .stat-value {
  color: #ff4d4f;
}

.stat-label {
  display: block;
  font-size: 12px;
  color: #999;
}

.stat-value {
  display: block;
  font-size: 20px;
  font-weight: 600;
}

.steps-card {
  flex: 1;
  min-height: 200px;
  overflow: auto;
}

.step-item {
  padding: 4px 0;
}

.step-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.step-name {
  font-weight: 500;
}

.step-duration {
  font-size: 12px;
  color: #999;
}

.step-error {
  margin-top: 4px;
  padding: 4px 8px;
  background: #fff2f0;
  border-radius: 4px;
  color: #ff4d4f;
  font-size: 12px;
}

.step-logs {
  margin-top: 4px;
  padding: 4px 8px;
  background: #f5f5f5;
  border-radius: 4px;
  font-size: 12px;
  font-family: monospace;
}

.logs-card {
  flex-shrink: 0;
  max-height: 200px;
}

.logs-container {
  max-height: 150px;
  overflow: auto;
  font-family: monospace;
  font-size: 12px;
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 8px;
  border-radius: 4px;
}

.log-line {
  white-space: pre-wrap;
  word-break: break-all;
}

.empty-steps,
.empty-logs {
  text-align: center;
  color: #999;
  padding: 20px;
}
</style>
