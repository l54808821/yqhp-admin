<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';

import { createIconifyIcon } from '@vben/icons';

import {
  Alert,
  Button,
  Card,
  Descriptions,
  Modal,
  Progress,
  Space,
  Spin,
  Tag,
  Tree,
  Input,
  Radio,
  RadioGroup,
} from 'ant-design-vue';

// 创建图标组件
const CheckCircleOutlined = createIconifyIcon('lucide:check-circle');
const CloseCircleOutlined = createIconifyIcon('lucide:x-circle');
const LoadingOutlined = createIconifyIcon('lucide:loader-2');
const ClockCircleOutlined = createIconifyIcon('lucide:clock');
const StopOutlined = createIconifyIcon('lucide:square');
const FileTextOutlined = createIconifyIcon('lucide:file-text');
const BanOutlined = createIconifyIcon('lucide:ban');

import type {
  DebugSummary,
  ProgressData,
  StepResult,
  StepStartedData,
} from '#/api/debug';

import HttpStepDetail from './HttpStepDetail.vue';

import {
  buildSSEUrl,
  stopExecutionApi,
  submitInteractionApi,
} from '#/api/debug';
import {
  createSSEService,
  type SSEService,
  type SSEState,
  type SSEEvent,
  type AIInteractionData,
  type AIChunkData,
  type AICompleteData,
  type WorkflowCompletedData,
} from '#/utils/sse';
import { useAccessStore } from '@vben/stores';


// 树节点类型（动态构建）
interface TreeNode {
  key: string;
  title: string;
  type: string;
  status?: string;
  duration?: number;
  children?: TreeNode[];
  stepResult?: StepResult;
  iteration?: number;
}

interface Props {
  workflowId: number;
  envId: number;
  visible?: boolean;
  executorType?: 'local' | 'remote';
  slaveId?: string;
  definition?: { name: string; steps: any[] };  // 工作流定义（用于调试未保存的工作流）
  selectedSteps?: string[];  // 选中的步骤 ID（用于选择性调试）
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  executorType: 'local',
  selectedSteps: () => [],
});

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'complete', summary: DebugSummary): void;
}>();

// 状态
const loading = ref(false);
const stopping = ref(false);
const sessionId = ref<string | null>(null);
const sseState = ref<SSEState>('disconnected');
const stepResults = ref<StepResult[]>([]);
const currentProgress = ref<ProgressData | null>(null);
const debugSummary = ref<DebugSummary | null>(null);
const logs = ref<string[]>([]);
const errorMessage = ref<string | null>(null);
const logsModalOpen = ref(false);
const selectedStepKey = ref<string | null>(null);
const expandedKeys = ref<string[]>([]);

// AI 相关状态
const aiContent = ref<Map<string, string>>(new Map()); // stepId -> content
const currentAIStepId = ref<string | null>(null);

// AI 交互状态
const interactionOpen = ref(false);
const interactionData = ref<AIInteractionData | null>(null);
const interactionValue = ref('');
const interactionCountdown = ref(0);
let interactionTimer: ReturnType<typeof setInterval> | null = null;

// 连接断开状态
const disconnected = ref(false);
const reconnecting = ref(false);
const reconnectAttempts = ref(0);
const maxReconnectAttempts = 3;
let lastSSEUrl = '';

let sseService: SSEService | null = null;

// 计算属性
const isRunning = computed(() => sseState.value === 'connected' && !debugSummary.value);
const isCompleted = computed(() => !!debugSummary.value);
const progressPercent = computed(() => {
  const percent = currentProgress.value?.percentage || 0;
  // 如果还在运行中，进度最多显示 99%
  if (isRunning.value && percent >= 100) {
    return 99;
  }
  return percent;
});


// 生成唯一的树节点key
function generateNodeKey(result: StepResult): string {
  if (result.parent_id && result.iteration) {
    return `${result.parent_id}_iter${result.iteration}_${result.step_id}`;
  }
  if (result.parent_id) {
    return `${result.parent_id}_${result.step_id}`;
  }
  return result.step_id;
}

// 动态构建树结构
const treeData = computed<TreeNode[]>(() => {
  const rootNodes: TreeNode[] = [];
  const nodeMap = new Map<string, TreeNode>();
  const parentChildMap = new Map<string, Map<number, TreeNode[]>>();

  for (const result of stepResults.value) {
    const nodeKey = generateNodeKey(result);
    const node: TreeNode = {
      key: nodeKey,
      title: result.step_name,
      type: result.step_type || 'unknown',
      status: result.status,
      duration: result.duration_ms,
      stepResult: result,
      iteration: result.iteration,
      children: [],
    };
    nodeMap.set(nodeKey, node);

    if (result.parent_id) {
      const iteration = result.iteration || 0;
      if (!parentChildMap.has(result.parent_id)) {
        parentChildMap.set(result.parent_id, new Map());
      }
      const iterMap = parentChildMap.get(result.parent_id)!;
      if (!iterMap.has(iteration)) {
        iterMap.set(iteration, []);
      }
      iterMap.get(iteration)!.push(node);
    } else {
      rootNodes.push(node);
    }
  }

  for (const result of stepResults.value) {
    if (result.step_type === 'loop' && parentChildMap.has(result.step_id)) {
      const nodeKey = generateNodeKey(result);
      const parentNode = nodeMap.get(nodeKey);
      if (parentNode) {
        const iterMap = parentChildMap.get(result.step_id)!;
        const iterations = Array.from(iterMap.keys()).sort((a, b) => a - b);
        for (const iter of iterations) {
          const children = iterMap.get(iter)!;
          if (iter > 0) {
            const iterNode: TreeNode = {
              key: `${result.step_id}_iteration_${iter}`,
              title: `第 ${iter} 次迭代`,
              type: 'iteration',
              status: children.every(c => c.status === 'success') ? 'success' :
                      children.some(c => c.status === 'failed') ? 'failed' :
                      children.some(c => c.status === 'running') ? 'running' : 'pending',
              children: children,
            };
            parentNode.children!.push(iterNode);
          } else {
            parentNode.children!.push(...children);
          }
        }
      }
    }
  }

  return rootNodes;
});


// 选中的步骤详情
const selectedStep = computed<StepResult | null>(() => {
  if (!selectedStepKey.value) return null;
  for (const result of stepResults.value) {
    const nodeKey = generateNodeKey(result);
    if (nodeKey === selectedStepKey.value) {
      return result;
    }
  }
  return null;
});

// 选中步骤的 AI 内容
const selectedStepAIContent = computed(() => {
  if (!selectedStep.value) return null;
  return aiContent.value.get(selectedStep.value.step_id) || null;
});

const statusText = computed(() => {
  if (loading.value) return '正在启动...';
  if (stopping.value) return '正在停止...';
  if (sseState.value === 'connecting') return '正在连接...';
  if (sseState.value === 'error') return '连接错误';
  if (debugSummary.value) {
    const status = debugSummary.value.status;
    if (status === 'completed' || status === 'success') return '执行完成';
    if (status === 'failed') return '执行失败';
    if (status === 'timeout') return '执行超时';
    if (status === 'stopped') return '已停止';
  }
  if (isRunning.value) return '执行中...';
  return '未开始';
});

const statusColor = computed(() => {
  if (debugSummary.value) {
    const status = debugSummary.value.status;
    if (status === 'completed' || status === 'success') return 'success';
    if (status === 'failed' || status === 'timeout') return 'error';
    if (status === 'stopped') return 'warning';
  }
  if (sseState.value === 'error') return 'error';
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

// 监听树数据变化，自动展开所有节点
watch(
  () => treeData.value,
  () => {
    expandAllNodes();
  },
  { deep: true },
);

// 展开所有节点
function expandAllNodes() {
  const keys: string[] = [];
  function collectKeys(nodes: TreeNode[]) {
    for (const node of nodes) {
      keys.push(node.key);
      if (node.children && node.children.length > 0) {
        collectKeys(node.children);
      }
    }
  }
  collectKeys(treeData.value);
  expandedKeys.value = keys;
}

// 组件卸载时清理
onBeforeUnmount(() => {
  cleanup();
});


// 开始执行
async function startDebug() {
  if (!props.workflowId || !props.envId) return;

  try {
    loading.value = true;
    errorMessage.value = null;
    stepResults.value = [];
    currentProgress.value = null;
    debugSummary.value = null;
    logs.value = [];
    selectedStepKey.value = null;
    expandedKeys.value = [];
    aiContent.value = new Map();
    currentAIStepId.value = null;

    // 获取认证 token
    const accessStore = useAccessStore();
    const token = accessStore.accessToken || '';

    // 构建请求参数
    const params: any = {
      env_id: props.envId,
      executor_type: props.executorType,
      slave_id: props.slaveId,
    };

    // 如果有工作流定义，添加到参数中（用于调试未保存的工作流）
    if (props.definition) {
      params.definition = JSON.stringify(props.definition);
    }

    // 如果有选中的步骤，添加到参数中（用于选择性调试）
    if (props.selectedSteps && props.selectedSteps.length > 0) {
      params.selected_steps = props.selectedSteps;
    }

    // 构建 SSE URL（包含认证 token）
    const url = buildSSEUrl(props.workflowId, params, token);

    // 连接 SSE
    connectSSE(url);
  } catch (error: any) {
    errorMessage.value = error?.message || '启动执行失败';
    loading.value = false;
  }
}

// 停止执行
async function stopDebug() {
  if (!sessionId.value) return;

  try {
    stopping.value = true;
    await stopExecutionApi(sessionId.value);
  } catch (error: any) {
    errorMessage.value = error?.message || '停止执行失败';
  } finally {
    stopping.value = false;
  }
}

// 连接 SSE
function connectSSE(url: string) {
  lastSSEUrl = url;
  disconnected.value = false;

  sseService = createSSEService({
    url,
    onMessage: handleSSEMessage,
    onStateChange: (state) => {
      sseState.value = state;
      if (state === 'connected') {
        loading.value = false;
        reconnecting.value = false;
        reconnectAttempts.value = 0;
        disconnected.value = false;
      } else if (state === 'disconnected' && !debugSummary.value) {
        // 非正常断开（执行未完成时断开）
        handleDisconnect();
      }
    },
    onError: () => {
      loading.value = false;
      if (!debugSummary.value) {
        handleDisconnect();
      }
    },
  });

  sseService.connect();
}

// 处理连接断开
function handleDisconnect() {
  if (debugSummary.value) return; // 执行已完成，不需要处理

  disconnected.value = true;
  errorMessage.value = 'SSE 连接已断开';

  // 自动重连（最多尝试 maxReconnectAttempts 次）
  if (reconnectAttempts.value < maxReconnectAttempts && lastSSEUrl) {
    autoReconnect();
  }
}

// 自动重连
function autoReconnect() {
  if (reconnecting.value || debugSummary.value) return;

  reconnecting.value = true;
  reconnectAttempts.value++;
  errorMessage.value = `正在尝试重连 (${reconnectAttempts.value}/${maxReconnectAttempts})...`;

  // 延迟重连
  setTimeout(() => {
    if (disconnected.value && !debugSummary.value) {
      sseService?.disconnect();
      connectSSE(lastSSEUrl);
    }
  }, 2000 * reconnectAttempts.value); // 递增延迟
}

// 手动重连
function handleReconnect() {
  if (!lastSSEUrl) return;

  reconnectAttempts.value = 0;
  reconnecting.value = false;
  disconnected.value = false;
  errorMessage.value = null;

  sseService?.disconnect();
  connectSSE(lastSSEUrl);
}

// 处理 SSE 消息
function handleSSEMessage(event: SSEEvent) {
  // 保存会话ID
  if (event.session_id && !sessionId.value) {
    sessionId.value = event.session_id;
  }

  addLog(`[${event.type}] ${JSON.stringify(event.data || {})}`);

  switch (event.type) {
    case 'connected':
      // 连接成功
      break;
    case 'step_started':
      handleStepStarted(event.data as StepStartedData);
      break;
    case 'step_completed':
    case 'step_failed':
      handleStepResult(event.data as StepResult);
      break;
    case 'step_skipped':
      handleStepSkipped(event.data as { step_id: string; step_name: string; step_type?: string; parent_id?: string; iteration?: number; reason: string });
      break;
    case 'progress':
      handleProgress(event.data as ProgressData);
      break;
    case 'workflow_completed':
      handleWorkflowComplete(event.data as WorkflowCompletedData);
      break;
    case 'ai_chunk':
      handleAIChunk(event.data as AIChunkData);
      break;
    case 'ai_complete':
      handleAIComplete(event.data as AICompleteData);
      break;
    case 'ai_interaction_required':
      handleAIInteraction(event.data as AIInteractionData);
      break;
    case 'error':
      handleError(event.data as { message: string });
      break;
  }
}


function handleStepStarted(data: StepStartedData) {
  const result: StepResult = {
    step_id: data.step_id,
    step_name: data.step_name,
    step_type: data.step_type,
    parent_id: data.parent_id,
    iteration: data.iteration,
    status: 'running',
    duration_ms: 0,
  };
  stepResults.value = [...stepResults.value, result];
  selectedStepKey.value = generateNodeKey(result);
}

function handleStepSkipped(data: { step_id: string; step_name: string; step_type?: string; parent_id?: string; iteration?: number; reason: string }) {
  const result: StepResult = {
    step_id: data.step_id,
    step_name: data.step_name,
    step_type: data.step_type,
    parent_id: data.parent_id,
    iteration: data.iteration,
    status: 'skipped',
    duration_ms: 0,
    error: data.reason,
  };
  stepResults.value = [...stepResults.value, result];
}

function handleStepResult(result: StepResult) {
  const index = stepResults.value.findIndex(r =>
    r.step_id === result.step_id &&
    r.parent_id === result.parent_id &&
    r.iteration === result.iteration
  );

  if (index >= 0) {
    const newResults = [...stepResults.value];
    newResults[index] = result;
    stepResults.value = newResults;
  } else {
    stepResults.value = [...stepResults.value, result];
  }
}

function handleProgress(progress: ProgressData) {
  currentProgress.value = progress;
}

function handleWorkflowComplete(data: WorkflowCompletedData) {
  debugSummary.value = {
    session_id: data.session_id,
    total_steps: data.total_steps,
    success_steps: data.success_steps,
    failed_steps: data.failed_steps,
    total_duration_ms: data.total_duration_ms,
    status: data.status as any,
    step_results: stepResults.value,
    start_time: '',
    end_time: '',
  };
  emit('complete', debugSummary.value);
  sseService?.disconnect();
}

function handleAIChunk(data: AIChunkData) {
  currentAIStepId.value = data.step_id;
  const current = aiContent.value.get(data.step_id) || '';
  aiContent.value.set(data.step_id, current + data.chunk);
  // 触发响应式更新
  aiContent.value = new Map(aiContent.value);
}

function handleAIComplete(data: AICompleteData) {
  aiContent.value.set(data.step_id, data.content);
  aiContent.value = new Map(aiContent.value);
  currentAIStepId.value = null;
}

function handleAIInteraction(data: AIInteractionData) {
  interactionData.value = data;
  interactionValue.value = data.default_value || '';
  interactionOpen.value = true;

  // 启动倒计时
  if (data.timeout > 0) {
    interactionCountdown.value = data.timeout;
    interactionTimer = setInterval(() => {
      interactionCountdown.value--;
      if (interactionCountdown.value <= 0) {
        handleInteractionTimeout();
      }
    }, 1000);
  }
}

function handleError(data: { message: string }) {
  errorMessage.value = data.message;
}


// 交互超时处理
function handleInteractionTimeout() {
  if (interactionTimer) {
    clearInterval(interactionTimer);
    interactionTimer = null;
  }
  submitInteraction(interactionData.value?.default_value || '', true);
}

// 提交交互响应
async function submitInteraction(value: string, skipped: boolean = false) {
  if (!sessionId.value) return;

  try {
    await submitInteractionApi(sessionId.value, { value, skipped });
  } catch (error: any) {
    errorMessage.value = error?.message || '提交交互响应失败';
  } finally {
    interactionOpen.value = false;
    interactionData.value = null;
    interactionValue.value = '';
    if (interactionTimer) {
      clearInterval(interactionTimer);
      interactionTimer = null;
    }
  }
}

// 确认交互
function handleInteractionConfirm() {
  submitInteraction(interactionValue.value, false);
}

// 跳过交互
function handleInteractionSkip() {
  submitInteraction('', true);
}

function addLog(log: string) {
  const timestamp = new Date().toLocaleTimeString();
  logs.value.push(`[${timestamp}] ${log}`);
  if (logs.value.length > 500) {
    logs.value = logs.value.slice(-500);
  }
}

// 清理资源
function cleanup() {
  sseService?.disconnect();
  sseService = null;
  sessionId.value = null;
  disconnected.value = false;
  reconnecting.value = false;
  reconnectAttempts.value = 0;
  lastSSEUrl = '';
  if (interactionTimer) {
    clearInterval(interactionTimer);
    interactionTimer = null;
  }
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

// 调试 HTTP 步骤
function handleDebugHttpStep() {
  // TODO: 实现单步调试功能
  // 需要获取选中步骤的配置，调用 /api/v1/debug/step 接口
  console.log('Debug HTTP step:', selectedStep.value);
}

// 树节点选择
function handleTreeSelect(selectedKeys: (string | number)[]) {
  const key = selectedKeys[0];
  selectedStepKey.value = key ? String(key) : null;
}

// 获取步骤状态图标
function getStepIcon(status?: string) {
  switch (status) {
    case 'success':
      return CheckCircleOutlined;
    case 'failed':
      return CloseCircleOutlined;
    case 'running':
      return LoadingOutlined;
    case 'skipped':
      return BanOutlined;
    default:
      return ClockCircleOutlined;
  }
}

// 获取步骤状态颜色
function getStepColor(status?: string) {
  switch (status) {
    case 'success':
      return '#52c41a';
    case 'failed':
      return '#ff4d4f';
    case 'running':
      return '#1890ff';
    case 'skipped':
      return '#faad14';
    default:
      return '#d9d9d9';
  }
}

// 格式化时长
function formatDuration(ms?: number) {
  if (!ms) return '-';
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
      <Space align="center">
        <Tag :color="statusColor">{{ statusText }}</Tag>
        <Tag v-if="currentProgress" class="progress-tag">
          {{ currentProgress.current_step }}/{{ currentProgress.total_steps }}
        </Tag>
        <Progress
          v-if="isRunning || isCompleted"
          :percent="progressPercent"
          :status="debugSummary?.status === 'failed' ? 'exception' : undefined"
          :stroke-color="(debugSummary?.status === 'completed' || debugSummary?.status === 'success') ? '#52c41a' : undefined"
          class="header-progress"
        />
      </Space>
      <Space>
        <Button
          v-if="!isRunning && !isCompleted"
          type="primary"
          :loading="loading"
          @click="startDebug"
        >
          开始执行
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
          重新执行
        </Button>
        <Button @click="logsModalOpen = true">
          <template #icon><FileTextOutlined /></template>
          执行日志
        </Button>
        <Button @click="handleClose">关闭</Button>
      </Space>
    </div>

    <!-- 错误提示 -->
    <Alert
      v-if="errorMessage && !disconnected"
      type="error"
      :message="errorMessage"
      closable
      class="error-alert"
      @close="errorMessage = null"
    />

    <!-- 连接断开提示 -->
    <Alert
      v-if="disconnected && !debugSummary"
      type="warning"
      class="disconnect-alert"
    >
      <template #message>
        <div class="disconnect-message">
          <span v-if="reconnecting">
            {{ errorMessage || '正在尝试重连...' }}
          </span>
          <span v-else>
            连接已断开
            <span v-if="reconnectAttempts >= maxReconnectAttempts">（已达最大重试次数）</span>
          </span>
          <Button
            v-if="!reconnecting"
            type="link"
            size="small"
            @click="handleReconnect"
          >
            重新连接
          </Button>
        </div>
      </template>
    </Alert>

    <!-- 执行汇总 -->
    <div v-if="debugSummary" class="summary-bar">
      <span>总步骤: <strong>{{ debugSummary.total_steps }}</strong></span>
      <span class="success">成功: <strong>{{ debugSummary.success_steps }}</strong></span>
      <span class="error">失败: <strong>{{ debugSummary.failed_steps }}</strong></span>
      <span>耗时: <strong>{{ formatDuration(debugSummary.total_duration_ms) }}</strong></span>
    </div>


    <!-- 主体内容：左右结构 -->
    <div class="debug-content">
      <!-- 左侧：步骤树 -->
      <Card class="tree-panel" size="small" title="执行步骤">
        <template #default>
          <div class="tree-panel-body">
            <Spin v-if="loading" />
            <Tree
              v-else-if="treeData.length > 0"
              v-model:expandedKeys="expandedKeys"
              :tree-data="treeData"
              :selectable="true"
              :selected-keys="selectedStepKey ? [selectedStepKey] : []"
              @select="handleTreeSelect"
            >
              <template #title="{ title, status, duration, type }">
                <div class="tree-node">
                  <component
                    :is="getStepIcon(status)"
                    :style="{ color: getStepColor(status), marginRight: '6px' }"
                    :class="{ 'spin-icon': status === 'running' }"
                  />
                  <span class="node-title">{{ title }}</span>
                  <Tag v-if="type === 'loop'" color="purple" size="small">循环</Tag>
                  <Tag v-if="type === 'ai'" color="blue" size="small">AI</Tag>
                  <Tag v-if="type === 'iteration'" color="cyan" size="small">迭代</Tag>
                  <Tag v-if="status === 'running'" color="processing" size="small">执行中</Tag>
                  <Tag v-else-if="status === 'success' || status === 'completed'" color="success" size="small">成功</Tag>
              <Tag v-else-if="status === 'failed'" color="error" size="small">失败</Tag>
              <Tag v-else-if="status === 'skipped'" color="warning" size="small">已跳过</Tag>
              <span v-if="duration" class="node-duration">{{ formatDuration(duration) }}</span>
            </div>
          </template>
        </Tree>
        <div v-else class="empty-tip">
          {{ isRunning ? '等待执行...' : '暂无步骤' }}
        </div>
          </div>
        </template>
      </Card>

      <!-- 右侧：步骤详情 -->
      <Card class="detail-panel" size="small" title="步骤详情">
        <template #default>
          <div class="detail-panel-body">
            <template v-if="selectedStep">
              <!-- HTTP 步骤使用专用组件 -->
              <HttpStepDetail
                v-if="selectedStep.step_type === 'http'"
                :step-result="selectedStep"
                @debug-step="handleDebugHttpStep"
              />

              <!-- 其他步骤类型使用通用展示 -->
              <template v-else>
                <Descriptions :column="1" size="small" bordered>
                  <Descriptions.Item label="步骤名称">{{ selectedStep.step_name }}</Descriptions.Item>
                  <Descriptions.Item label="步骤ID">{{ selectedStep.step_id }}</Descriptions.Item>
                  <Descriptions.Item label="步骤类型">{{ selectedStep.step_type || '-' }}</Descriptions.Item>
                  <Descriptions.Item v-if="selectedStep.parent_id" label="父步骤">{{ selectedStep.parent_id }}</Descriptions.Item>
                  <Descriptions.Item v-if="selectedStep.iteration" label="迭代次数">第 {{ selectedStep.iteration }} 次</Descriptions.Item>
                  <Descriptions.Item label="状态">
                    <Tag v-if="selectedStep.status === 'running'" color="processing">执行中</Tag>
                    <Tag v-else-if="selectedStep.status === 'success'" color="success">成功</Tag>
                    <Tag v-else-if="selectedStep.status === 'failed'" color="error">失败</Tag>
                    <Tag v-else color="default">等待</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="耗时">{{ formatDuration(selectedStep.duration_ms) }}</Descriptions.Item>
                </Descriptions>


            <!-- 错误信息 -->
            <div v-if="selectedStep.error" class="detail-section">
              <div class="section-title">错误信息</div>
              <Alert type="error" :message="selectedStep.error" />
            </div>

            <!-- AI 输出内容 -->
            <div v-if="selectedStep.step_type === 'ai' && selectedStepAIContent" class="detail-section">
              <div class="section-title">AI 输出</div>
              <div class="ai-output">
                <pre>{{ selectedStepAIContent }}</pre>
                <span v-if="currentAIStepId === selectedStep.step_id" class="typing-cursor">|</span>
              </div>
            </div>

            <!-- 输出数据 -->
            <div v-if="selectedStep.output && Object.keys(selectedStep.output).length > 0" class="detail-section">
              <div class="section-title">输出数据</div>
              <pre class="output-json">{{ JSON.stringify(selectedStep.output, null, 2) }}</pre>
            </div>

            <!-- 步骤日志 -->
            <div v-if="selectedStep.logs && selectedStep.logs.length > 0" class="detail-section">
              <div class="section-title">步骤日志</div>
              <div class="step-logs">
                <div v-for="(log, idx) in selectedStep.logs" :key="idx" class="log-line">{{ log }}</div>
              </div>
            </div>
          </template>
        </template>
        <div v-else class="empty-tip">
          请选择左侧步骤查看详情
        </div>
          </div>
        </template>
      </Card>
    </div>

    <!-- 执行日志 Modal -->
    <Modal
      v-model:open="logsModalOpen"
      title="执行日志"
      :width="700"
      :footer="null"
    >
      <div class="logs-container">
        <div v-for="(log, idx) in logs" :key="idx" class="log-line">{{ log }}</div>
        <div v-if="logs.length === 0" class="empty-logs">暂无日志</div>
      </div>
    </Modal>


    <!-- AI 交互对话框 -->
    <Modal
      v-model:open="interactionOpen"
      title="AI 交互"
      :closable="false"
      :maskClosable="false"
      :footer="null"
    >
      <div v-if="interactionData" class="interaction-content">
        <!-- 交互提示 -->
        <div class="interaction-prompt">{{ interactionData.prompt }}</div>

        <!-- 确认模式 -->
        <div v-if="interactionData.type === 'confirm'" class="confirm-buttons">
          <Space>
            <Button type="primary" @click="interactionValue = 'confirm'; handleInteractionConfirm()">
              确认
            </Button>
            <Button @click="interactionValue = 'reject'; handleInteractionConfirm()">
              拒绝
            </Button>
          </Space>
        </div>

        <!-- 输入模式 -->
        <div v-else-if="interactionData.type === 'input'">
          <Input.TextArea
            v-model:value="interactionValue"
            :rows="4"
            placeholder="请输入..."
          />
          <div class="interaction-actions">
            <Space>
              <Button @click="handleInteractionSkip">跳过</Button>
              <Button type="primary" @click="handleInteractionConfirm">提交</Button>
            </Space>
          </div>
        </div>

        <!-- 选择模式 -->
        <div v-else-if="interactionData.type === 'select'">
          <RadioGroup v-model:value="interactionValue">
            <Space direction="vertical">
              <Radio
                v-for="option in interactionData.options"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </Radio>
            </Space>
          </RadioGroup>
          <div class="interaction-actions">
            <Space>
              <Button @click="handleInteractionSkip">跳过</Button>
              <Button type="primary" @click="handleInteractionConfirm">提交</Button>
            </Space>
          </div>
        </div>

        <!-- 倒计时 -->
        <div v-if="interactionCountdown > 0" class="countdown">
          剩余时间：{{ interactionCountdown }} 秒
        </div>
      </div>
    </Modal>
  </div>
</template>


<style scoped>
.debug-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  padding: 16px;
}

.debug-header {
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

.error-alert {
  margin: 4px 0;
}

.disconnect-alert {
  margin: 4px 0;
}

.disconnect-message {
  display: flex;
  align-items: center;
  gap: 8px;
}

.summary-bar {
  display: flex;
  gap: 24px;
  padding: 8px 12px;
  background: #fafafa;
  border-radius: 4px;
  font-size: 13px;
}

.summary-bar .success {
  color: #52c41a;
}

.summary-bar .error {
  color: #ff4d4f;
}

.debug-content {
  display: flex;
  gap: 12px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.tree-panel {
  width: 360px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}

.tree-panel :deep(.ant-card-body) {
  flex: 1;
  padding: 0;
  overflow: hidden;
}

.tree-panel-body {
  height: 100%;
  overflow: auto;
  padding: 12px;
}

.detail-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.detail-panel :deep(.ant-card-body) {
  flex: 1;
  padding: 0;
  overflow: hidden;
}

.detail-panel-body {
  height: 100%;
  overflow: hidden;
  padding: 12px;
  display: flex;
  flex-direction: column;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 4px;
}

.node-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node-duration {
  font-size: 11px;
  color: #999;
  margin-left: 8px;
}

.spin-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.detail-section {
  margin-top: 16px;
}

.section-title {
  font-weight: 500;
  margin-bottom: 8px;
  color: #333;
}

.output-json {
  background: #f5f5f5;
  padding: 8px;
  border-radius: 4px;
  font-size: 12px;
  overflow: auto;
  max-height: 200px;
}

.ai-output {
  background: #f0f7ff;
  padding: 12px;
  border-radius: 4px;
  font-size: 13px;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 300px;
  overflow: auto;
}

.ai-output pre {
  margin: 0;
  font-family: inherit;
}

.typing-cursor {
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.step-logs {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 8px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
  max-height: 150px;
  overflow: auto;
}

.logs-container {
  max-height: 400px;
  overflow: auto;
  font-family: monospace;
  font-size: 12px;
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 12px;
  border-radius: 4px;
}

.log-line {
  white-space: pre-wrap;
  word-break: break-all;
}

.empty-tip,
.empty-logs {
  text-align: center;
  color: #999;
  padding: 20px;
}

.interaction-content {
  padding: 16px 0;
}

.interaction-prompt {
  font-size: 14px;
  margin-bottom: 16px;
}

.confirm-buttons {
  text-align: center;
}

.interaction-actions {
  margin-top: 16px;
  text-align: right;
}

.countdown {
  margin-top: 12px;
  text-align: center;
  color: #ff4d4f;
  font-size: 13px;
}
</style>
