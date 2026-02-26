import { ref, computed, shallowRef } from 'vue';

import { useAccessStore } from '@vben/stores';

import type {
  Workflow,
  AIConversation,
  AIConversationMessage,
  AIWorkflowConfig,
} from '#/api/workflow';
import {
  createConversationApi,
  listConversationsApi,
  getConversationApi,
  deleteConversationApi,
  updateConversationTitleApi,
  saveConversationMessageApi,
} from '#/api/workflow';

export type StreamStatus = 'idle' | 'connecting' | 'streaming' | 'done' | 'error' | 'aborted';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  loading?: boolean;
  error?: string;
  thinking?: { content: string; isComplete: boolean };
  toolCalls?: ToolCallInfo[];
  stepEvents?: StepEvent[];
  metadata?: Record<string, any>;
  timestamp: number;
}

export interface ToolCallInfo {
  toolName: string;
  arguments: string;
  result?: string;
  isError?: boolean;
  durationMs?: number;
  status: 'running' | 'completed' | 'error';
}

export interface StepEvent {
  stepId: string;
  stepName: string;
  stepType: string;
  status: 'running' | 'completed' | 'failed';
  durationMs?: number;
  result?: any;
}

function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function getExecuteUrl(): string {
  const apiUrl = import.meta.env.VITE_GLOB_API_URL || '';
  const baseUrl = apiUrl.startsWith('http')
    ? apiUrl
    : `${window.location.origin}${apiUrl}`;
  return `${baseUrl}/executions`;
}

export interface UseAIWorkflowChatOptions {
  workflow: Workflow;
  envId?: number;
}

export function useAIWorkflowChat(options: UseAIWorkflowChatOptions) {
  const { workflow, envId } = options;

  const messages = ref<ChatMessage[]>([]);
  const conversations = ref<AIConversation[]>([]);
  const currentConversation = ref<AIConversation | null>(null);
  const streamStatus = ref<StreamStatus>('idle');
  const abortController = shallowRef<AbortController | null>(null);

  const isStreaming = computed(
    () => streamStatus.value === 'streaming' || streamStatus.value === 'connecting',
  );

  const aiConfig = computed<AIWorkflowConfig>(() => {
    try {
      const def = JSON.parse(workflow.definition || '{}');
      return def.ai_config || {};
    } catch {
      return {};
    }
  });

  async function loadConversations() {
    try {
      const result = await listConversationsApi(workflow.id);
      conversations.value = result || [];
    } catch {
      conversations.value = [];
    }
  }

  async function createConversation(variables?: Record<string, any>) {
    try {
      const conv = await createConversationApi(workflow.id, { variables });
      conversations.value.unshift(conv);
      await switchConversation(conv);
      return conv;
    } catch (err: any) {
      console.error('创建会话失败:', err);
      throw err;
    }
  }

  async function switchConversation(conv: AIConversation) {
    currentConversation.value = conv;
    messages.value = [];

    try {
      const detail = await getConversationApi(conv.id);
      if (detail.messages?.length) {
        messages.value = detail.messages.map((m: AIConversationMessage) => ({
          id: `db_${m.id}`,
          role: m.role as 'user' | 'assistant',
          content: m.content,
          metadata: m.metadata,
          timestamp: new Date(m.created_at || '').getTime(),
        }));
      }
    } catch {
      // 新会话，没有历史消息
    }
  }

  async function deleteConversation(convId: number) {
    try {
      await deleteConversationApi(convId);
      conversations.value = conversations.value.filter((c) => c.id !== convId);
      if (currentConversation.value?.id === convId) {
        currentConversation.value = null;
        messages.value = [];
      }
    } catch (err: any) {
      console.error('删除会话失败:', err);
    }
  }

  async function renameConversation(convId: number, title: string) {
    try {
      await updateConversationTitleApi(convId, title);
      const conv = conversations.value.find((c) => c.id === convId);
      if (conv) conv.title = title;
    } catch (err: any) {
      console.error('重命名会话失败:', err);
    }
  }

  function buildChatHistory(): Array<{ role: string; content: string }> {
    return messages.value
      .filter((m) => !m.loading && m.content)
      .map((m) => ({ role: m.role, content: m.content }));
  }

  function parseWorkflowDefinition() {
    try {
      return JSON.parse(workflow.definition || '{}');
    } catch {
      return { steps: [] };
    }
  }

  async function sendMessage(text: string) {
    if (!text.trim() || isStreaming.value) return;

    // 自动创建会话
    if (!currentConversation.value) {
      try {
        await createConversation();
      } catch {
        return;
      }
    }

    const chatHistory = buildChatHistory();

    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };
    messages.value.push(userMsg);

    messages.value.push({
      id: generateId(),
      role: 'assistant',
      content: '',
      loading: true,
      stepEvents: [],
      toolCalls: [],
      timestamp: Date.now(),
    });
    const assistantMsg = messages.value[messages.value.length - 1]!;

    streamStatus.value = 'connecting';
    abortController.value = new AbortController();

    try {
      const wfDef = parseWorkflowDefinition();
      const accessStore = useAccessStore();
      const token = accessStore.accessToken || '';

      const response = await fetch(getExecuteUrl(), {
        method: 'POST',
        headers: {
          'Accept': 'text/event-stream',
          'Content-Type': 'application/json',
          ...(token ? { satoken: token } : {}),
        },
        body: JSON.stringify({
          workflow: {
            id: `ai_wf_${workflow.id}`,
            name: workflow.name,
            steps: wfDef.steps || [],
            variables: wfDef.variables || {},
          },
          stream: true,
          mode: 'debug',
          persist: false,
          ...(envId ? { envId } : {}),
          conversationId: currentConversation.value?.id
            ? String(currentConversation.value.id)
            : undefined,
          userMessage: text,
          chatHistory,
        }),
        signal: abortController.value.signal,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`执行失败 (${response.status}): ${errText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('无法获取响应流');

      streamStatus.value = 'streaming';
      const decoder = new TextDecoder();
      let buffer = '';
      let eventType = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith('data: ') && eventType) {
            try {
              const raw = JSON.parse(line.slice(6));
              const eventData = raw.data || raw;
              handleSSEEvent(eventType, eventData, assistantMsg);
            } catch {
              // ignore parse errors
            }
            eventType = '';
          }
        }
      }

      assistantMsg.loading = false;
      streamStatus.value = 'done';

      // 持久化消息
      if (currentConversation.value) {
        await persistMessages(userMsg, assistantMsg);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        streamStatus.value = 'aborted';
        assistantMsg.loading = false;
        assistantMsg.content += '\n\n[已停止]';
      } else {
        streamStatus.value = 'error';
        assistantMsg.loading = false;
        assistantMsg.error = err.message;
        assistantMsg.content = assistantMsg.content || `请求失败: ${err.message}`;
      }
    } finally {
      abortController.value = null;
    }
  }

  function handleSSEEvent(eventType: string, data: any, msg: ChatMessage) {
    switch (eventType) {
      case 'ai_chunk':
        msg.loading = false;
        msg.content += data.chunk || data.content || '';
        break;

      case 'ai_thinking':
        msg.thinking = {
          content: (msg.thinking?.content || '') + (data.thinking || ''),
          isComplete: false,
        };
        break;

      case 'ai_tool_call_start':
        msg.toolCalls = msg.toolCalls || [];
        msg.toolCalls.push({
          toolName: data.toolName || data.tool_name || '',
          arguments: data.arguments || data.args || '',
          status: 'running',
        });
        break;

      case 'ai_tool_call_complete': {
        const tcName = data.toolName || data.tool_name || '';
        if (msg.toolCalls?.length && tcName) {
          const idx = msg.toolCalls.findIndex(
            (t) => t.toolName === tcName && t.status === 'running',
          );
          if (idx >= 0) {
            const isErr = data.isError || data.is_error || false;
            msg.toolCalls[idx] = {
              ...msg.toolCalls[idx]!,
              result: data.result || '',
              isError: isErr,
              durationMs: data.durationMs || data.duration_ms,
              status: isErr ? 'error' : 'completed',
            };
          }
        }
        break;
      }

      case 'step_started':
        msg.stepEvents = msg.stepEvents || [];
        msg.stepEvents.push({
          stepId: data.stepId,
          stepName: data.stepName,
          stepType: data.stepType,
          status: 'running',
        });
        break;

      case 'step_completed': {
        if (msg.stepEvents?.length && data.stepId) {
          const idx = msg.stepEvents.findIndex((s) => s.stepId === data.stepId);
          if (idx >= 0) {
            msg.stepEvents[idx] = {
              ...msg.stepEvents[idx]!,
              status: (data.success || data.status === 'success') ? 'completed' : 'failed',
              durationMs: data.durationMs,
              result: data.result || data.output,
            };
          }
        }
        break;
      }

      case 'step_failed': {
        if (msg.stepEvents?.length && data.stepId) {
          const idx = msg.stepEvents.findIndex((s) => s.stepId === data.stepId);
          if (idx >= 0) {
            msg.stepEvents[idx] = {
              ...msg.stepEvents[idx]!,
              status: 'failed',
              durationMs: data.durationMs,
              result: data.result,
            };
          }
        }
        break;
      }

      case 'ai_complete':
      case 'message_complete':
        msg.loading = false;
        if (data.content) {
          msg.content = data.content;
        }
        if (msg.thinking) {
          msg.thinking.isComplete = true;
        }
        msg.metadata = {
          ...msg.metadata,
          usage: data.usage || {
            prompt_tokens: data.promptTokens,
            completion_tokens: data.completionTokens,
            total_tokens: data.totalTokens,
          },
        };
        break;

      case 'workflow_completed':
        msg.loading = false;
        break;

      case 'error':
        msg.loading = false;
        msg.error = data.message || '执行出错';
        break;
    }
  }

  async function persistMessages(userMsg: ChatMessage, assistantMsg: ChatMessage) {
    if (!currentConversation.value) return;
    if (!userMsg.content?.trim()) return;

    const convId = currentConversation.value.id;

    try {
      await saveConversationMessageApi(convId, {
        role: 'user',
        content: userMsg.content,
      });

      if (assistantMsg.content?.trim()) {
        await saveConversationMessageApi(convId, {
          role: 'assistant',
          content: assistantMsg.content,
          metadata: assistantMsg.metadata,
        });
      }

      if (
        currentConversation.value.title === '新的对话' ||
        !currentConversation.value.title
      ) {
        const title = userMsg.content.slice(0, 30) + (userMsg.content.length > 30 ? '...' : '');
        await renameConversation(convId, title);
      }
    } catch {
      // 持久化失败不影响对话
    }
  }

  function stopGeneration() {
    abortController.value?.abort();
  }

  function startNewConversation() {
    currentConversation.value = null;
    messages.value = [];
    streamStatus.value = 'idle';
  }

  return {
    messages,
    conversations,
    currentConversation,
    streamStatus,
    isStreaming,
    aiConfig,
    loadConversations,
    createConversation,
    switchConversation,
    deleteConversation,
    renameConversation,
    sendMessage,
    stopGeneration,
    startNewConversation,
  };
}
