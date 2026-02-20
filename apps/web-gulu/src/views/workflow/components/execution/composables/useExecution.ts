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
  type AIToolCallStartData,
  type AIToolCallCompleteData,
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

export interface UseExecutionOptions {
  workflowId: Ref<number>;
  envId: Ref<number>;
  executorType?: Ref<'local' | 'remote'>;
  slaveId?: Ref<string | undefined>;
  definition?: Ref<{ name: string; steps: any[] } | undefined>;
  selectedSteps?: Ref<string[]>;
  persist?: Ref<boolean>; // 是否持久化执行记录，默认 true
  onStepStarted?: (result: StepResult) => void;
  onStepResult?: (result: StepResult) => void;
  onStepSkipped?: (result: StepResult) => void;
  onComplete?: (summary: DebugSummary) => void;
}

// 递归过滤禁用的步骤
function filterDisabledSteps(steps: any[]): any[] {
  return steps
    .filter((step) => !step.disabled)
    .map((step) => {
      const newStep = { ...step };
      // 处理循环节点的 steps
      if (newStep.steps && Array.isArray(newStep.steps)) {
        newStep.steps = filterDisabledSteps(newStep.steps);
      }
      // 处理条件节点的 branches
      if (newStep.branches && Array.isArray(newStep.branches)) {
        newStep.branches = newStep.branches.map((branch: any) => ({
          ...branch,
          steps: branch.steps ? filterDisabledSteps(branch.steps) : [],
        }));
      }
      return newStep;
    });
}

export function useExecution(options: UseExecutionOptions) {
  const {
    workflowId,
    envId,
    executorType,
    slaveId,
    definition,
    selectedSteps,
    persist,
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
  const executionSummary = ref<DebugSummary | null>(null);
  const logs = ref<string[]>([]);
  const errorMessage = ref<string | null>(null);

  // AI 相关状态
  const aiContent = ref<Map<string, string>>(new Map());
  const currentAIStepId = ref<string | null>(null);
  const aiToolCalls = ref<Map<string, Array<{ toolName: string; arguments: string; result?: string; isError?: boolean; durationMs?: number; status: 'running' | 'done' }>>>(new Map());

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
  const isRunning = computed(() => sseState.value === 'connected' && !executionSummary.value);
  const isCompleted = computed(() => !!executionSummary.value);
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
    if (executionSummary.value) {
      const status = executionSummary.value.status;
      if (status === 'completed' || status === 'success') return '执行完成';
      if (status === 'failed') return '执行失败';
      if (status === 'timeout') return '执行超时';
      if (status === 'stopped') return '已停止';
    }
    if (isRunning.value) return '执行中...';
    return '未开始';
  });

  const statusColor = computed(() => {
    if (executionSummary.value) {
      const status = executionSummary.value.status;
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
    if (result.parentId && result.iteration) {
      return `${result.parentId}_iter${result.iteration}_${result.stepId}`;
    }
    if (result.parentId) {
      return `${result.parentId}_${result.stepId}`;
    }
    return result.stepId;
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
    if (event.sessionId && !sessionId.value) {
      sessionId.value = event.sessionId;
    }

    addLog(`[${event.type}] ${JSON.stringify(event.data || {})}`);

    switch (event.type) {
      case 'connected':
        break;
      case 'step_started':
        handleStepStarted(event.data as StepStartedData);
        break;
      case 'step_completed': {
        // 后端 SSE 事件中 output 数据可能在 result 字段中，统一映射到 output
        const completedData = event.data as any;
        handleStepResult({
          ...completedData,
          output: completedData.output || completedData.result,
        } as StepResult);
        break;
      }
      case 'step_failed': {
        // step_failed 事件：确保 status 为 'failed'，并将 result 映射到 output
        const failedData = event.data as any;
        handleStepResult({
          ...failedData,
          status: 'failed',
          output: failedData.output || failedData.result,
        } as StepResult);
        break;
      }
      case 'step_skipped':
        handleStepSkipped(event.data as {
          stepId: string;
          stepName: string;
          stepType?: string;
          parentId?: string;
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
      case 'ai_tool_call_start':
        handleAIToolCallStart(event.data as AIToolCallStartData);
        break;
      case 'ai_tool_call_complete':
        handleAIToolCallComplete(event.data as AIToolCallCompleteData);
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
      stepId: data.stepId,
      stepName: data.stepName,
      stepType: data.stepType,
      parentId: data.parentId,
      iteration: data.iteration,
      status: 'running',
      durationMs: 0,
    };
    stepResults.value = [...stepResults.value, result];
    onStepStarted?.(result);
  }

  function handleStepSkipped(data: {
    stepId: string;
    stepName: string;
    stepType?: string;
    parentId?: string;
    iteration?: number;
    reason: string;
  }) {
    const result: StepResult = {
      stepId: data.stepId,
      stepName: data.stepName,
      stepType: data.stepType,
      parentId: data.parentId,
      iteration: data.iteration,
      status: 'skipped',
      durationMs: 0,
      error: data.reason,
    };
    stepResults.value = [...stepResults.value, result];
    onStepSkipped?.(result);
  }

  function handleStepResult(result: StepResult) {
    const index = stepResults.value.findIndex(
      (r) =>
        r.stepId === result.stepId &&
        r.parentId === result.parentId &&
        r.iteration === result.iteration
    );

    if (index >= 0) {
      const newResults = [...stepResults.value];
      newResults[index] = result;
      stepResults.value = newResults;
    } else {
      stepResults.value = [...stepResults.value, result];
    }

    // 步骤完成时清除 AI 流式状态
    if (currentAIStepId.value === result.stepId) {
      currentAIStepId.value = null;
    }

    onStepResult?.(result);
  }

  function handleProgress(progress: ProgressData) {
    currentProgress.value = progress;
  }

  function handleWorkflowComplete(data: WorkflowCompletedData) {
    executionSummary.value = {
      sessionId: data.sessionId,
      totalSteps: data.totalSteps,
      successSteps: data.successSteps,
      failedSteps: data.failedSteps,
      totalDurationMs: data.totalDurationMs,
      status: data.status as any,
      stepResults: stepResults.value,
      startTime: '',
      endTime: '',
      variables: data.variables,
      envVariables: data.envVariables,
    };
    onComplete?.(executionSummary.value);
    sseService?.disconnect();
  }

  function handleAIChunk(data: AIChunkData) {
    currentAIStepId.value = data.stepId;
    // index === 0 表示新一轮流式输出开始，重置之前累积的内容
    // 这样在多轮工具调用场景下，每轮的流式内容不会互相叠加
    const current = data.index === 0 ? '' : (aiContent.value.get(data.stepId) || '');
    aiContent.value.set(data.stepId, current + data.chunk);
    aiContent.value = new Map(aiContent.value);
  }

  function handleAIComplete(data: AICompleteData) {
    // 设置最终内容（覆盖流式累积的内容，确保最终内容正确）
    aiContent.value.set(data.stepId, data.content);
    aiContent.value = new Map(aiContent.value);
    // 注意：不在这里清除 currentAIStepId，让 step_completed 事件来处理过渡
    // 这样可以避免 ai_complete 和 step_completed 之间的短暂空白
  }

  function handleAIToolCallStart(data: AIToolCallStartData) {
    // 设置当前 AI 步骤 ID，确保面板在工具调用阶段就能渲染
    currentAIStepId.value = data.stepId;
    const calls = aiToolCalls.value.get(data.stepId) || [];
    calls.push({
      toolName: data.toolName,
      arguments: data.arguments,
      status: 'running',
    });
    aiToolCalls.value.set(data.stepId, calls);
    aiToolCalls.value = new Map(aiToolCalls.value);
  }

  function handleAIToolCallComplete(data: AIToolCallCompleteData) {
    const calls = aiToolCalls.value.get(data.stepId) || [];
    // 找到对应的 running 状态的调用并更新
    const idx = calls.findIndex(
      (c) => c.toolName === data.toolName && c.status === 'running'
    );
    if (idx >= 0) {
      calls[idx] = {
        ...calls[idx],
        result: data.result,
        isError: data.isError,
        durationMs: data.durationMs,
        status: 'done',
      };
    } else {
      calls.push({
        toolName: data.toolName,
        arguments: data.arguments,
        result: data.result,
        isError: data.isError,
        durationMs: data.durationMs,
        status: 'done',
      });
    }
    aiToolCalls.value.set(data.stepId, calls);
    aiToolCalls.value = new Map(aiToolCalls.value);
  }

  function handleAIInteraction(data: AIInteractionData) {
    interactionData.value = data;
    interactionValue.value = data.defaultValue || '';
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
    // 服务器返回错误时停止重连
    reconnecting.value = false;
    reconnectAttempts.value = maxReconnectAttempts; // 阻止进一步重连
    loading.value = false;
    sseService?.disconnect();
  }

  // 处理连接断开
  function handleDisconnect() {
    if (executionSummary.value) return;

    disconnected.value = true;

    // 只有在未达到最大重连次数时才自动重连
    if (reconnectAttempts.value < maxReconnectAttempts && lastSSEUrl && !reconnecting.value) {
      autoReconnect();
    } else if (reconnectAttempts.value >= maxReconnectAttempts) {
      errorMessage.value = 'SSE 连接已断开，已达最大重试次数';
      reconnecting.value = false;
    } else {
      errorMessage.value = 'SSE 连接已断开';
    }
  }

  // 自动重连
  function autoReconnect() {
    if (reconnecting.value || executionSummary.value) return;
    if (reconnectAttempts.value >= maxReconnectAttempts) {
      errorMessage.value = 'SSE 连接已断开，已达最大重试次数';
      reconnecting.value = false;
      return;
    }

    reconnecting.value = true;
    reconnectAttempts.value++;
    errorMessage.value = `正在尝试重连 (${reconnectAttempts.value}/${maxReconnectAttempts})...`;

    setTimeout(() => {
      if (disconnected.value && !executionSummary.value) {
        sseService?.disconnect();
        connectSSE(lastSSEUrl);
      } else {
        reconnecting.value = false;
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
        } else if (state === 'disconnected' && !executionSummary.value) {
          handleDisconnect();
        }
      },
      onError: () => {
        loading.value = false;
        if (!executionSummary.value) {
          handleDisconnect();
        }
      },
    });

    sseService.connect();
  }

  // 开始执行
  async function start() {
    if (!workflowId.value || !envId.value) return;

    try {
      loading.value = true;
      errorMessage.value = null;
      stepResults.value = [];
      currentProgress.value = null;
      executionSummary.value = null;
      logs.value = [];
      aiContent.value = new Map();
      aiToolCalls.value = new Map();
      currentAIStepId.value = null;

      const accessStore = useAccessStore();
      const token = accessStore.accessToken || '';

      const params: any = {
        envId: envId.value,
        executorType: executorType?.value || 'local',
        slaveId: slaveId?.value,
        persist: persist?.value ?? true,
      };

      if (definition?.value) {
        const def = definition.value as any;
        params.workflow = {
          ...def,
          steps: filterDisabledSteps(def.steps || []),
        };
        if (def.variables && Object.keys(def.variables).length > 0) {
          params.workflow.variables = def.variables;
        }
      }

      if (selectedSteps?.value && selectedSteps.value.length > 0) {
        params.selectedSteps = selectedSteps.value;
      }

      // 添加 stream 标识
      params.stream = true;
      params.mode = 'debug';

      const apiUrl = import.meta.env.VITE_GLOB_API_URL || '';
      const baseUrl = apiUrl.startsWith('http')
        ? apiUrl
        : `${window.location.origin}${apiUrl}`;
      const url = `${baseUrl}/executions`;

      connectSSE(url, params, token);
    } catch (error: any) {
      errorMessage.value = error?.message || '启动执行失败';
      loading.value = false;
    }
  }

  // 停止执行
  async function stop() {
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
    start();
  }

  return {
    // 状态
    loading,
    stopping,
    sessionId,
    sseState,
    stepResults,
    currentProgress,
    executionSummary,
    logs,
    errorMessage,

    // AI 状态
    aiContent,
    aiToolCalls,
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
    start,
    stop,
    restart,
    cleanup,
    handleReconnect,
    handleInteractionConfirm,
    handleInteractionSkip,
    addLog,
  };
}
