import { ref, shallowRef } from 'vue';
import type { StreamStatus, ToolCallRecord, AiStreamOptions } from '../types';
import { parseSSEChunk } from '#/api/ai-model';

export function useAiStream() {
  const content = ref('');
  const thinking = ref('');
  const toolCalls = ref<ToolCallRecord[]>([]);
  const status = ref<StreamStatus>('idle');
  const error = ref<string | null>(null);
  const abortController = shallowRef<AbortController | null>(null);

  function reset() {
    content.value = '';
    thinking.value = '';
    toolCalls.value = [];
    status.value = 'idle';
    error.value = null;
  }

  async function startOpenAIStream(options: AiStreamOptions) {
    reset();
    status.value = 'connecting';
    abortController.value = new AbortController();

    try {
      const response = await fetch(options.url, {
        method: options.method || 'POST',
        headers: {
          'Accept': 'text/event-stream',
          'Content-Type': 'application/json',
          ...options.headers,
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: abortController.value.signal,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`请求失败 (${response.status}): ${errText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('无法获取响应流');

      status.value = 'streaming';
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const parsed = parseSSEChunk(chunk);
        if (parsed) {
          content.value += parsed;
          options.onChunk?.(parsed);
        }
      }

      status.value = 'done';
      options.onComplete?.(content.value);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        status.value = 'aborted';
      } else {
        status.value = 'error';
        error.value = err.message;
        options.onError?.(err);
      }
    } finally {
      abortController.value = null;
    }
  }

  /**
   * 处理工作流 SSE 事件（ai_chunk、ai_complete、ai_tool_call_start 等）
   * 由外部 SSEService 的 onMessage 回调调用
   */
  function handleWorkflowSSEEvent(eventType: string, data: any) {
    switch (eventType) {
      case 'ai_chunk': {
        const chunk = data?.content || data?.chunk || '';
        if (chunk) {
          content.value += chunk;
        }
        const thinkChunk = data?.thinking || '';
        if (thinkChunk) {
          thinking.value += thinkChunk;
        }
        status.value = 'streaming';
        break;
      }
      case 'ai_complete': {
        if (data?.content) {
          content.value = data.content;
        }
        status.value = 'done';
        break;
      }
      case 'ai_error': {
        error.value = data?.error || data?.message || '未知错误';
        status.value = 'error';
        break;
      }
      case 'ai_tool_call_start': {
        const partial: ToolCallRecord = {
          round: data?.round || toolCalls.value.length + 1,
          tool_name: data?.tool_name || '',
          arguments: data?.arguments || '',
          result: '',
          is_error: false,
          duration_ms: 0,
        };
        toolCalls.value.push(partial);
        break;
      }
      case 'ai_tool_call_complete': {
        const idx = toolCalls.value.findIndex(
          (tc) => tc.tool_name === data?.tool_name && !tc.result,
        );
        if (idx >= 0) {
          toolCalls.value[idx] = {
            ...toolCalls.value[idx]!,
            result: data?.result || '',
            is_error: data?.is_error || false,
            duration_ms: data?.duration_ms || 0,
          };
        }
        break;
      }
    }
  }

  function abort() {
    abortController.value?.abort();
  }

  return {
    content,
    thinking,
    toolCalls,
    status,
    error,
    reset,
    startOpenAIStream,
    handleWorkflowSSEEvent,
    abort,
  };
}
