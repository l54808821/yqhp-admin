/**
 * 单步调试组合式函数
 * 封装阻塞和流式两种执行模式，统一状态管理
 * 各属性面板只需提供 stepConfig 和结果转换器即可
 */
import { ref, unref } from 'vue';
import type { Ref } from 'vue';

import { useAccessStore } from '@vben/stores';

import {
  executeApi,
  stopExecutionApi,
  type StepConfig,
  type StepExecutionResult,
  type AIChunkData,
  type AICompleteData,
  type SSEEvent,
} from '#/api/debug';
import {
  createSSEService,
  type SSEService,
  type AIToolCallStartData,
  type AIToolCallCompleteData,
} from '#/utils/sse';
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

  /** 流式事件钩子：AI 块到达 */
  onAiChunk?: (chunk: AIChunkData) => void;
  /** 流式事件钩子：AI 完成 */
  onAiComplete?: (data: AICompleteData) => void;
  /** 流式事件钩子：工具调用开始 */
  onToolCallStart?: (data: AIToolCallStartData) => void;
  /** 流式事件钩子：工具调用完成 */
  onToolCallComplete?: (data: AIToolCallCompleteData) => void;
}

export function useStepDebug<TResponse>(options: UseStepDebugOptions<TResponse>) {
  const {
    transformResult,
    transformError,
    onAiChunk,
    onAiComplete,
    onToolCallStart,
    onToolCallComplete,
  } = options;

  const isDebugging = ref(false);
  const debugResponse = ref<TResponse | null>(null) as Ref<TResponse | null>;
  const streamingContent = ref<string | null>(null);
  const isStreaming = ref(false);

  let sseService: SSEService | null = null;
  let sessionId: string | null = null;
  let startTime = 0;

  const debugContext = useDebugContext();

  function cleanupSSE() {
    sseService?.disconnect();
    sseService = null;
    sessionId = null;
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
    const hadStreaming = !!streamingContent.value;
    finish();
    if (!debugResponse.value && hadStreaming) {
      debugResponse.value = transformError('已手动停止', Date.now() - startTime);
    }
    streamingContent.value = null;
  }

  // ========== 流式 SSE 事件处理 ==========

  function handleSSEMessage(event: SSEEvent) {
    const { type, data } = event;

    switch (type) {
      case 'connected':
        sessionId = event.sessionId;
        break;

      case 'ai_chunk': {
        const chunk = data as AIChunkData;
        if (chunk.index === 0) {
          streamingContent.value = chunk.chunk;
        } else {
          streamingContent.value = (streamingContent.value || '') + chunk.chunk;
        }
        if (!isStreaming.value) isStreaming.value = true;
        onAiChunk?.(chunk);
        break;
      }

      case 'ai_complete': {
        const complete = data as AICompleteData;
        streamingContent.value = complete.content;
        onAiComplete?.(complete);
        break;
      }

      case 'ai_tool_call_start': {
        const toolStart = data as AIToolCallStartData;
        onToolCallStart?.(toolStart);
        break;
      }

      case 'ai_tool_call_complete': {
        const toolDone = data as AIToolCallCompleteData;
        onToolCallComplete?.(toolDone);
        break;
      }

      case 'step_completed':
      case 'step_failed': {
        const stepData = data as any;
        const stepResult: StepExecutionResult = {
          stepId: stepData.stepId || '',
          stepName: stepData.stepName || '',
          stepType: stepData.stepType || '',
          success: type === 'step_completed' && !stepData.error,
          durationMs: stepData.durationMs || (Date.now() - startTime),
          result: stepData.result,
          error: stepData.error,
        };
        debugResponse.value = transformResult(stepResult);
        streamingContent.value = null;
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
        streamingContent.value = null;
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
    streamingContent.value = null;
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
            debugResponse.value = transformError(
              'SSE 连接断开',
              Date.now() - startTime,
            );
            streamingContent.value = null;
          }
          finish();
        }
      },
      onError: () => {
        if (!debugResponse.value) {
          debugResponse.value = transformError(
            '执行失败',
            Date.now() - startTime,
          );
          streamingContent.value = null;
        }
        finish();
      },
    });

    sseService.connect();
  }

  return {
    isDebugging,
    debugResponse,
    streamingContent,
    isStreaming,
    run,
    stop,
  };
}
