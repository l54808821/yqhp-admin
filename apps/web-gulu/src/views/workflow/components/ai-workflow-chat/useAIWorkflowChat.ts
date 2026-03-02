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
import type { AIInteractionData } from '#/api/debug';
import { submitInteractionApi } from '#/api/debug';

import type { ContentBlock } from '../shared/types';
import { parseMessageContent, serializeBlocks, blocksToPlainText } from '../shared/types';
import { handleBlockEvent } from '../shared/blockEventHandler';

export type StreamStatus = 'idle' | 'connecting' | 'streaming' | 'done' | 'error' | 'aborted';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  blocks: ContentBlock[];
  content: string;
  loading?: boolean;
  error?: string;
  metadata?: Record<string, any>;
  timestamp: number;
}

// 兼容旧接口
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
  persistConversation?: boolean;
}

export function useAIWorkflowChat(options: UseAIWorkflowChatOptions) {
  const { workflow, envId, persistConversation = true } = options;

  const messages = ref<ChatMessage[]>([]);
  const conversations = ref<AIConversation[]>([]);
  const currentConversation = ref<AIConversation | null>(null);
  const streamStatus = ref<StreamStatus>('idle');
  const abortController = shallowRef<AbortController | null>(null);
  const sessionId = ref<string | null>(null);

  const interactionData = ref<AIInteractionData | null>(null);
  const interactionValue = ref('');
  const interactionCountdown = ref(0);
  let interactionTimer: ReturnType<typeof setInterval> | null = null;

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
    if (!persistConversation) return;
    try {
      const result = await listConversationsApi(workflow.id);
      conversations.value = result || [];
    } catch {
      conversations.value = [];
    }
  }

  async function createConversation(variables?: Record<string, any>) {
    if (!persistConversation) {
      const localConv: AIConversation = {
        id: Date.now(),
        workflow_id: workflow.id,
        title: '新的对话',
        variables,
      };
      conversations.value.unshift(localConv);
      currentConversation.value = localConv;
      messages.value = [];
      return localConv;
    }

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

    if (!persistConversation) return;

    try {
      const detail = await getConversationApi(conv.id);
      if (detail.messages?.length) {
        messages.value = detail.messages.map((m: AIConversationMessage) => {
          const blocks = parseMessageContent(m.content);
          return {
            id: `db_${m.id}`,
            role: m.role as 'user' | 'assistant',
            blocks,
            content: blocksToPlainText(blocks) || m.content,
            metadata: m.metadata,
            timestamp: new Date(m.created_at || '').getTime(),
          };
        });
      }
    } catch {
      // 新会话，没有历史消息
    }
  }

  async function deleteConversation(convId: number) {
    if (!persistConversation) {
      conversations.value = conversations.value.filter((c) => c.id !== convId);
      if (currentConversation.value?.id === convId) {
        currentConversation.value = null;
        messages.value = [];
      }
      return;
    }

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
    const conv = conversations.value.find((c) => c.id === convId);
    if (conv) conv.title = title;

    if (!persistConversation) return;

    try {
      await updateConversationTitleApi(convId, title);
    } catch (err: any) {
      console.error('重命名会话失败:', err);
    }
  }

  function buildChatHistory(): Array<{ role: string; content: string }> {
    return messages.value
      .filter((m) => !m.loading && m.content)
      .map((m) => ({ role: m.role, content: blocksToPlainText(m.blocks) || m.content }));
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
      blocks: [{ type: 'text', content: text }],
      content: text,
      timestamp: Date.now(),
    };
    messages.value.push(userMsg);

    messages.value.push({
      id: generateId(),
      role: 'assistant',
      blocks: [],
      content: '',
      loading: true,
      metadata: {},
      timestamp: Date.now(),
    });
    const assistantMsg = messages.value[messages.value.length - 1]!;

    streamStatus.value = 'connecting';
    sessionId.value = null;
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
              if (raw.sessionId && !sessionId.value) {
                sessionId.value = raw.sessionId;
              }
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
    // 共享的 block 构建逻辑
    handleBlockEvent(msg.blocks, eventType, data);

    // ChatMessage 特有的副作用
    switch (eventType) {
      case 'ai_chunk':
        msg.loading = false;
        msg.content = blocksToPlainText(msg.blocks);
        break;

      case 'ai_complete':
      case 'message_complete':
        msg.loading = false;
        msg.content = blocksToPlainText(msg.blocks);
        msg.metadata = {
          ...msg.metadata,
          usage: data.usage || {
            prompt_tokens: data.promptTokens,
            completion_tokens: data.completionTokens,
            total_tokens: data.totalTokens,
          },
        };
        break;

      case 'ai_interaction_required':
        interactionData.value = data as AIInteractionData;
        interactionValue.value = data.defaultValue || '';
        if (data.timeout > 0) {
          interactionCountdown.value = data.timeout;
          interactionTimer = setInterval(() => {
            interactionCountdown.value--;
            if (interactionCountdown.value <= 0) {
              submitInteraction(interactionData.value?.defaultValue || '', true);
            }
          }, 1000);
        }
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
    if (!persistConversation) return;
    if (!currentConversation.value) return;
    if (!userMsg.blocks?.length && !userMsg.content?.trim()) return;

    const convId = currentConversation.value.id;

    try {
      await saveConversationMessageApi(convId, {
        role: 'user',
        content: serializeBlocks(userMsg.blocks),
      });

      const assistantContent = serializeBlocks(assistantMsg.blocks);
      if (assistantContent?.trim()) {
        await saveConversationMessageApi(convId, {
          role: 'assistant',
          content: assistantContent,
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

  async function submitInteraction(value: string, skipped: boolean = false) {
    if (!sessionId.value) return;
    try {
      await submitInteractionApi(sessionId.value, { value, skipped });
    } catch {
      // ignore
    } finally {
      clearInteraction();
    }
  }

  function confirmInteraction() {
    submitInteraction(interactionValue.value, false);
  }

  function skipInteraction() {
    submitInteraction('', true);
  }

  function clearInteraction() {
    interactionData.value = null;
    interactionValue.value = '';
    interactionCountdown.value = 0;
    if (interactionTimer) {
      clearInterval(interactionTimer);
      interactionTimer = null;
    }
  }

  function stopGeneration() {
    abortController.value?.abort();
    clearInteraction();
  }

  function startNewConversation() {
    currentConversation.value = null;
    messages.value = [];
    streamStatus.value = 'idle';
    sessionId.value = null;
    clearInteraction();
  }

  return {
    messages,
    conversations,
    currentConversation,
    streamStatus,
    isStreaming,
    aiConfig,
    interactionData,
    interactionValue,
    interactionCountdown,
    loadConversations,
    createConversation,
    switchConversation,
    deleteConversation,
    renameConversation,
    sendMessage,
    stopGeneration,
    startNewConversation,
    confirmInteraction,
    skipInteraction,
  };
}
