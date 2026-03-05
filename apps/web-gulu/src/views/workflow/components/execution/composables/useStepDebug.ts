/**
 * 单步调试组合式函数
 * 封装阻塞和流式两种执行模式，统一状态管理
 * 流式过程中实时构建 ContentBlock[]，与对话调试保持一致的渲染
 */
import { ref, unref } from 'vue';
import type { Ref } from 'vue';

import { useAccessStore } from '@vben/stores';

import {
  executeApi,
  stopExecutionApi,
  submitInteractionApi,
  type StepConfig,
  type StepExecutionResult,
  type SSEEvent,
} from '#/api/debug';
import {
  createSSEService,
  type SSEService,
  type AIToolCallStartData,
  type AIToolCallCompleteData,
  type AIInteractionData,
} from '#/utils/sse';
import type { ContentBlock } from '../../shared/types';
import { handleBlockEvent } from '../../shared/blockEventHandler';
import { useDebugContext } from './useDebugContext';

type MaybeRef<T> = T | Ref<T>;

export interface UseStepDebugOptions<TResponse> {
  workflowId?: MaybeRef<number | undefined>;
  envId?: MaybeRef<number | undefined>;

  /** 是否使用流式模式（可以是静态布尔值或响应式 Ref） */
  stream?: MaybeRef<boolean>;

  /** 请求超时（毫秒），仅阻塞模式生效 */
  requestTimeout?: number;

  /** 把原始 StepExecutionResult 映射为面板特定的响应 */
  transformResult: (stepResult: StepExecutionResult) => TResponse;

  /** 把错误映射为面板特定的错误响应 */
  transformError: (error: string, durationMs: number) => TResponse;

  /** 流式事件钩子 */
  onToolCallStart?: (data: AIToolCallStartData) => void;
  onToolCallComplete?: (data: AIToolCallCompleteData) => void;
  onInteractionRequired?: (data: AIInteractionData) => void;
}

export function useStepDebug<TResponse>(options: UseStepDebugOptions<TResponse>) {
  const {
    transformResult,
    transformError,
    onToolCallStart,
    onToolCallComplete,
    onInteractionRequired,
  } = options;

  const isDebugging = ref(false);
  const debugResponse = ref<TResponse | null>(null) as Ref<TResponse | null>;
  const isStreaming = ref(false);
  const streamingBlocks = ref<ContentBlock[]>([]);

  // 交互状态
  const interactionOpen = ref(false);
  const interactionData = ref<AIInteractionData | null>(null);
  const interactionValue = ref('');
  const interactionCountdown = ref(0);
  let interactionTimer: ReturnType<typeof setInterval> | null = null;

  let sseService: SSEService | null = null;
  let sessionId: string | null = null;
  let startTime = 0;

  const debugContext = useDebugContext();

  function cleanupInteraction() {
    interactionOpen.value = false;
    interactionData.value = null;
    interactionValue.value = '';
    if (interactionTimer) {
      clearInterval(interactionTimer);
      interactionTimer = null;
    }
  }

  function cleanupSSE() {
    sseService?.disconnect();
    sseService = null;
    sessionId = null;
    cleanupInteraction();
  }

  function finish() {
    isStreaming.value = false;
    isDebugging.value = false;
    cleanupSSE();
  }

  function stop() {
    if (sessionId) {
      stopExecutionApi(sessionId).catch(() => {});
    }
    finish();
    if (!debugResponse.value) {
      debugResponse.value = transformError('已手动停止', Date.now() - startTime);
    }
  }

  // ========== 流式 SSE 事件处理 ==========

  function handleSSEMessage(event: SSEEvent) {
    const { type, data } = event;

    switch (type) {
      case 'connected':
        sessionId = event.sessionId;
        break;

      case 'ai_chunk':
      case 'ai_thinking':
      case 'ai_plan_update':
      case 'ai_verify':
      case 'step_started': {
        if (!isStreaming.value) isStreaming.value = true;
        handleBlockEvent(streamingBlocks.value, type, data);
        break;
      }

      case 'ai_tool_call_start': {
        if (!isStreaming.value) isStreaming.value = true;
        handleBlockEvent(streamingBlocks.value, type, data);
        onToolCallStart?.(data as AIToolCallStartData);
        break;
      }

      case 'ai_tool_call_complete': {
        handleBlockEvent(streamingBlocks.value, type, data);
        onToolCallComplete?.(data as AIToolCallCompleteData);
        break;
      }

      case 'message_complete': {
        handleBlockEvent(streamingBlocks.value, type, data);
        break;
      }

      case 'ai_interaction_required': {
        const interaction = data as AIInteractionData;
        interactionData.value = interaction;
        interactionValue.value = interaction.defaultValue || '';
        interactionOpen.value = true;

        if (interaction.timeout > 0) {
          interactionCountdown.value = interaction.timeout;
          interactionTimer = setInterval(() => {
            interactionCountdown.value--;
            if (interactionCountdown.value <= 0) {
              submitInteraction(interactionData.value?.defaultValue || '', true);
            }
          }, 1000);
        }

        onInteractionRequired?.(interaction);
        break;
      }

      case 'step_completed': {
        handleBlockEvent(streamingBlocks.value, type, data);
        const stepData = data as any;
        const stepResult: StepExecutionResult = {
          stepId: stepData.stepId || '',
          stepName: stepData.stepName || '',
          stepType: stepData.stepType || '',
          success: stepData.status === 'success',
          durationMs: stepData.durationMs || (Date.now() - startTime),
          result: stepData.result,
          error: stepData.error,
        };
        debugResponse.value = transformResult(stepResult);
        finish();
        break;
      }

      case 'workflow_completed':
        if (isDebugging.value) finish();
        break;

      case 'error': {
        const errData = data as any;
        debugResponse.value = transformError(
          errData.message || '执行失败',
          Date.now() - startTime,
        );
        handleBlockEvent(streamingBlocks.value, type, data);
        finish();
        break;
      }
    }
  }

  // ========== 执行入口 ==========

  async function run(stepConfig: StepConfig) {
    if (isDebugging.value) return;

    isDebugging.value = true;
    debugResponse.value = null;
    streamingBlocks.value = [];
    isStreaming.value = false;
    startTime = Date.now();

    const wfId = unref(options.workflowId);
    const envId = unref(options.envId) || 0;
    const useStream = unref(options.stream) ?? false;

    const cachedVariables = wfId
      ? debugContext.getVariables(wfId)
      : undefined;

    if (useStream) {
      runStream(stepConfig, envId, cachedVariables);
    } else {
      await runBlocking(stepConfig, envId, cachedVariables);
    }
  }

  // ========== 阻塞模式 ==========

  async function runBlocking(
    stepConfig: StepConfig,
    envId: number,
    variables?: Record<string, unknown>,
  ) {
    try {
      const response = await executeApi(
        {
          step: stepConfig,
          variables,
          envId,
          mode: 'debug',
          stream: false,
          persist: false,
        },
        options.requestTimeout,
      );

      const stepResult = response.steps?.[0];
      if (stepResult) {
        debugResponse.value = transformResult(stepResult);
      }
    } catch (error: any) {
      debugResponse.value = transformError(
        error.message || '执行失败',
        Date.now() - startTime,
      );
    } finally {
      isDebugging.value = false;
    }
  }

  // ========== 流式模式 ==========

  function runStream(
    stepConfig: StepConfig,
    envId: number,
    variables?: Record<string, unknown>,
  ) {
    const accessStore = useAccessStore();
    const token = accessStore.accessToken || '';

    const apiUrl = import.meta.env.VITE_GLOB_API_URL || '';
    const baseUrl = apiUrl.startsWith('http')
      ? apiUrl
      : `${window.location.origin}${apiUrl}`;
    const url = `${baseUrl}/executions`;

    const body = {
      step: stepConfig,
      variables,
      envId,
      mode: 'debug',
      stream: true,
      persist: false,
    };

    sseService = createSSEService({
      url,
      method: 'POST',
      body,
      headers: { satoken: token },
      onMessage: handleSSEMessage,
      onStateChange: (state) => {
        if (state === 'error' || (state === 'disconnected' && isDebugging.value)) {
          if (!debugResponse.value) {
            debugResponse.value = transformError('SSE 连接断开', Date.now() - startTime);
          }
          finish();
        }
      },
      onError: () => {
        if (!debugResponse.value) {
          debugResponse.value = transformError('执行失败', Date.now() - startTime);
        }
        finish();
      },
    });

    sseService.connect();
  }

  async function submitInteraction(value: string, skipped: boolean = false) {
    if (!sessionId) return;
    try {
      await submitInteractionApi(sessionId, { value, skipped });
    } catch {
      // ignore
    } finally {
      cleanupInteraction();
    }
  }

  function handleInteractionConfirm() {
    submitInteraction(interactionValue.value, false);
  }

  function handleInteractionSkip() {
    submitInteraction('', true);
  }

  return {
    isDebugging,
    debugResponse,
    streamingBlocks,
    isStreaming,
    run,
    stop,
    interactionOpen,
    interactionData,
    interactionValue,
    interactionCountdown,
    handleInteractionConfirm,
    handleInteractionSkip,
  };
}
