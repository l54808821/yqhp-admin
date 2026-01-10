<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';

import { createIconifyIcon } from '@vben/icons';

import {
  Alert,
  Button,
  Card,
  Descriptions,
  Progress,
  Space,
  Spin,
  Tag,
  Tree,
} from 'ant-design-vue';

// 创建图标组件
const CheckCircleOutlined = createIconifyIcon('lucide:check-circle');
const CloseCircleOutlined = createIconifyIcon('lucide:x-circle');
const LoadingOutlined = createIconifyIcon('lucide:loader-2');
const ClockCircleOutlined = createIconifyIcon('lucide:clock');
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
const stepResults = ref<StepResult[]>([]); // 改为数组，保持顺序
const currentProgress = ref<ProgressData | null>(null);
const debugSummary = ref<DebugSummary | null>(null);
const logs = ref<string[]>([]);
const errorMessage = ref<string | null>(null);
const selectedStepKey = ref<string | null>(null);
const expandedKeys = ref<string[]>([]);

let wsService: WebSocketService | null = null;

// 计算属性
const isRunning = computed(() => wsState.value === 'connected' && !debugSummary.value);
const isCompleted = computed(() => !!debugSummary.value);
const progressPercent = computed(() => currentProgress.value?.percentage || 0);

// 生成唯一的树节点key（考虑parent_id和iteration）
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
  const parentChildMap = new Map<string, Map<number, TreeNode[]>>(); // parent_id -> iteration -> children

  // 第一遍：创建所有节点
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

    // 如果有parent_id，记录父子关系
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
      // 根节点
      rootNodes.push(node);
    }
  }

  // 第二遍：构建树结构，为循环步骤添加迭代子节点
  for (const result of stepResults.value) {
    if (result.step_type === 'loop' && parentChildMap.has(result.step_id)) {
      const nodeKey = generateNodeKey(result);
      const parentNode = nodeMap.get(nodeKey);
      if (parentNode) {
        const iterMap = parentChildMap.get(result.step_id)!;
        // 按迭代次数排序
        const iterations = Array.from(iterMap.keys()).sort((a, b) => a - b);
        for (const iter of iterations) {
          const children = iterMap.get(iter)!;
          if (iter > 0) {
            // 创建迭代容器节点
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
            // iteration为0的直接作为子节点
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
  // 在所有结果中查找
  for (const result of stepResults.value) {
    const nodeKey = generateNodeKey(result);
    if (nodeKey === selectedStepKey.value) {
      return result;
    }
  }
  return null;
});

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
    selectedStepKey.value = null;
    expandedKeys.value = [];

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
  // 添加一个 running 状态的步骤结果
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

  // 自动选中当前执行的步骤
  selectedStepKey.value = generateNodeKey(result);
}

function handleStepResult(result: StepResult) {
  // 更新已有的步骤结果
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
    // 如果没找到（可能step_started消息丢失），直接添加
    stepResults.value = [...stepResults.value, result];
  }
}

function handleProgress(progress: ProgressData) {
  currentProgress.value = progress;
}

function handleDebugComplete(summary: DebugSummary) {
  debugSummary.value = summary;
  emit('complete', summary);
  wsService?.disconnect();
}

function handleError(data: { message: string }) {
  errorMessage.value = data.message;
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
      <Space>
        <Tag :color="statusColor">{{ statusText }}</Tag>
        <span v-if="currentProgress" class="progress-text">
          {{ currentProgress.current_step }}/{{ currentProgress.total_steps }}
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
      size="small"
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
              <Tag v-if="type === 'iteration'" color="cyan" size="small">迭代</Tag>
              <Tag v-if="status === 'running'" color="processing" size="small">执行中</Tag>
              <Tag v-else-if="status === 'success' || status === 'completed'" color="success" size="small">成功</Tag>
              <Tag v-else-if="status === 'failed'" color="error" size="small">失败</Tag>
              <span v-if="duration" class="node-duration">{{ formatDuration(duration) }}</span>
            </div>
          </template>
        </Tree>
        <div v-else class="empty-tip">
          {{ isRunning ? '等待执行...' : '暂无步骤' }}
        </div>
      </Card>

      <!-- 右侧：步骤详情 -->
      <Card class="detail-panel" size="small" title="步骤详情">
        <template v-if="selectedStep">
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
        <div v-else class="empty-tip">
          请选择左侧步骤查看详情
        </div>
      </Card>
    </div>

    <!-- 底部：调试日志 -->
    <Card class="logs-card" size="small" title="调试日志">
      <div class="logs-container">
        <div v-for="(log, idx) in logs" :key="idx" class="log-line">{{ log }}</div>
        <div v-if="logs.length === 0" class="empty-logs">暂无日志</div>
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
  padding: 16px;
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

.error-alert {
  margin: 4px 0;
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
  overflow: auto;
}

.detail-panel {
  flex: 1;
  overflow: auto;
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

.logs-card {
  flex-shrink: 0;
  max-height: 180px;
}

.logs-container {
  max-height: 120px;
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

.empty-tip,
.empty-logs {
  text-align: center;
  color: #999;
  padding: 20px;
}
</style>
