import { ref, computed } from 'vue';
import type { Ref } from 'vue';

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
import {
  stopExecutionApi,
  submitInteractionApi,
} from '#/api/debug';
import type {
  DebugSummary,
  ProgressData,
  StepResult,
  StepStartedData,
} from '#/api/debug';
import { useAccessStore } from '@vben/stores';

export interface UseDebugSSEOptions {
  workflowId: Ref<number>;
  envId: Ref<number>;
  executorType?: Ref<'local' | 'remote'>;
  slaveId?: Ref<string | undefined>;
  definition?: Ref<{ name: string; steps: any[] } | undefined>;
  selectedSteps?: Ref<string[]>;
  onStepStarted?: (result: StepResult) => void;
  onStepResult?: (result: StepResult) => void;
  onStepSkipped?: (result: StepResult) => void;
  onComplete?: (summary: DebugSummary) => void;
}

export function useDebugSSE(options: UseDebugSSEOptions) {
  const {
    workflowId,
    envId,
    executorType,
    slaveId,
    definition,
    selectedSteps,
    onStepStarted,
    onStepResult,
    onStepSkipped,
    onComplete,
  } = options;

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

  // AI 相关状态
  const aiContent = ref<Map<string, string>>(new Map());
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
  let lastSSEParams: any = null;
  let lastSSEToken = '';
  let sseService: SSEService | null = null;

  // 计算属性
  const isRunning = computed(() => sseState.value === 'connected' && !debugSummary.value);
  const isCompleted = computed(() => !!debugSummary.value);
  const progressPercent = computed(() => {
    const percent = currentProgress.value?.percentage || 0;
    if (isRunning.value && percent >= 100) {
      return 99;
    }
    return percent;
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

  // 添加日志
  function addLog(log: string) {
    const timestamp = new Date().toLocaleTimeString();
    logs.value.push(`[${timestamp}] ${log}`);
    if (logs.value.length > 500) {
      logs.value = logs.value.slice(-500);
    }
  }

  // 处理 SSE 消息
  function handleSSEMessage(event: SSEEvent) {
    if (event.session_id && !sessionId.value) {
      sessionId.value = event.session_id;
    }

    addLog(`[${event.type}] ${JSON.stringify(event.data || {})}`);

    switch (event.type) {
      case 'connected':
        break;
      case 'step_started':
        handleStepStarted(event.data as StepStartedData);
        break;
      case 'step_completed':
      case 'step_failed':
        handleStepResult(event.data as StepResult);
        break;
      case 'step_skipped':
        handleStepSkipped(event.data as {
          step_id: string;
          step_name: string;
          step_type?: string;
          parent_id?: string;
          iteration?: number;
          reason: string;
        });
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
    onStepStarted?.(result);
  }

  function handleStepSkipped(data: {
    step_id: string;
    step_name: string;
    step_type?: string;
    parent_id?: string;
    iteration?: number;
    reason: string;
  }) {
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
    onStepSkipped?.(result);
  }

  function handleStepResult(result: StepResult) {
    const index = stepResults.value.findIndex(
      (r) =>
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
    onStepResult?.(result);
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
    onComplete?.(debugSummary.value);
    sseService?.disconnect();
  }

  function handleAIChunk(data: AIChunkData) {
    currentAIStepId.value = data.step_id;
    const current = aiContent.value.get(data.step_id) || '';
    aiContent.value.set(data.step_id, current + data.chunk);
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

  // 处理连接断开
  function handleDisconnect() {
    if (debugSummary.value) return;

    disconnected.value = true;
    errorMessage.value = 'SSE 连接已断开';

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

    setTimeout(() => {
      if (disconnected.value && !debugSummary.value) {
        sseService?.disconnect();
        connectSSE(lastSSEUrl);
      }
    }, 2000 * reconnectAttempts.value);
  }

  // 连接 SSE
  function connectSSE(url: string, params?: any, token?: string) {
    lastSSEUrl = url;
    if (params) lastSSEParams = params;
    if (token) lastSSEToken = token;
    disconnected.value = false;

    sseService = createSSEService({
      url,
      method: 'POST',
      body: lastSSEParams,
      headers: {
        satoken: lastSSEToken,
      },
      onMessage: handleSSEMessage,
      onStateChange: (state) => {
        sseState.value = state;
        if (state === 'connected') {
          loading.value = false;
          reconnecting.value = false;
          reconnectAttempts.value = 0;
          disconnected.value = false;
        } else if (state === 'disconnected' && !debugSummary.value) {
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

  // 开始执行
  async function startDebug() {
    if (!workflowId.value || !envId.value) return;

    try {
      loading.value = true;
      errorMessage.value = null;
      stepResults.value = [];
      currentProgress.value = null;
      debugSummary.value = null;
      logs.value = [];
      aiContent.value = new Map();
      currentAIStepId.value = null;

      const accessStore = useAccessStore();
      const token = accessStore.accessToken || '';

      const params: any = {
        env_id: envId.value,
        executor_type: executorType?.value || 'local',
        slave_id: slaveId?.value,
      };

      if (definition?.value) {
        params.definition = definition.value;
      }

      if (selectedSteps?.value && selectedSteps.value.length > 0) {
        params.selected_steps = selectedSteps.value;
      }

      const apiUrl = import.meta.env.VITE_GLOB_API_URL || '';
      const baseUrl = apiUrl.startsWith('http')
        ? apiUrl
        : `${window.location.origin}${apiUrl}`;
      const url = `${baseUrl}/workflows/${workflowId.value}/run/stream`;

      connectSSE(url, params, token);
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

  // 重新开始
  function restart() {
    cleanup();
    startDebug();
  }

  return {
    // 状态
    loading,
    stopping,
    sessionId,
    sseState,
    stepResults,
    currentProgress,
    debugSummary,
    logs,
    errorMessage,

    // AI 状态
    aiContent,
    currentAIStepId,

    // AI 交互状态
    interactionOpen,
    interactionData,
    interactionValue,
    interactionCountdown,

    // 连接状态
    disconnected,
    reconnecting,
    reconnectAttempts,
    maxReconnectAttempts,

    // 计算属性
    isRunning,
    isCompleted,
    progressPercent,
    statusText,
    statusColor,

    // 方法
    generateNodeKey,
    startDebug,
    stopDebug,
    restart,
    cleanup,
    handleReconnect,
    handleInteractionConfirm,
    handleInteractionSkip,
    addLog,
  };
}
