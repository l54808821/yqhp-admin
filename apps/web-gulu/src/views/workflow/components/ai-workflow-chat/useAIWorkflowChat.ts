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
  deleteMessagesFromApi,
} from '#/api/workflow';
import type { AIInteractionData } from '#/api/debug';
import { submitInteractionApi } from '#/api/debug';

import type { ContentBlock, ChatAttachment, MultimodalContentPart } from '../shared/types';
import { parseMessageContent, serializeBlocks, blocksToPlainText } from '../shared/types';
import { handleBlockEvent } from '../shared/blockEventHandler';
import { uploadAttachmentApi } from '#/api/workflow';

export type StreamStatus = 'idle' | 'connecting' | 'streaming' | 'done' | 'error' | 'aborted';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  blocks: ContentBlock[];
  content: string;
  attachments?: ChatAttachment[];
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
  getDefinition?: () => Record<string, any> | undefined;
  envId?: number;
  persistConversation?: boolean;
}

export function useAIWorkflowChat(options: UseAIWorkflowChatOptions) {
  const { workflow, getDefinition, envId, persistConversation = true } = options;

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
      const liveDef = getDefinition?.();
      const def = liveDef || JSON.parse(workflow.definition || '{}');
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
          let metadata = m.metadata;
          if (typeof metadata === 'string') {
            try { metadata = JSON.parse(metadata); } catch { metadata = undefined; }
          }
          return {
            id: `db_${m.id}`,
            role: m.role as 'user' | 'assistant',
            blocks,
            content: blocksToPlainText(blocks) || m.content,
            metadata,
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

  function buildChatHistory(): Array<{ role: string; content: string | MultimodalContentPart[] }> {
    return messages.value
      .filter((m) => !m.loading && (m.content || m.attachments?.some((a) => a.status === 'done')))
      .map((m) => {
        const doneAttachments = m.attachments?.filter((a) => a.status === 'done' && a.url) || [];
        if (doneAttachments.length > 0) {
          return { role: m.role, content: buildMultimodalContent(m.content, doneAttachments) };
        }
        return { role: m.role, content: blocksToPlainText(m.blocks) || m.content };
      });
  }

  function resolveAttachmentUrl(relativeUrl: string): string {
    if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
      return relativeUrl;
    }
    const apiUrl = import.meta.env.VITE_GLOB_API_URL || '';
    const baseUrl = apiUrl.startsWith('http')
      ? apiUrl
      : `${window.location.origin}${apiUrl}`;
    const base = baseUrl.replace(/\/api\/?$/, '');
    return `${base}${relativeUrl.startsWith('/') ? '' : '/'}${relativeUrl}`;
  }

  function buildMultimodalContent(text: string, attachments: ChatAttachment[]): MultimodalContentPart[] {
    const parts: MultimodalContentPart[] = [];
    if (text.trim()) {
      parts.push({ type: 'text', text });
    }
    for (const att of attachments) {
      if (!att.url) continue;
      switch (att.type) {
        case 'image':
          parts.push({ type: 'image_url', image_url: { url: att.dataUrl || resolveAttachmentUrl(att.url) } });
          break;
        case 'audio':
          parts.push({ type: 'input_audio', input_audio: { url: resolveAttachmentUrl(att.url) } });
          break;
        case 'video':
          parts.push({ type: 'video_url', video_url: { url: resolveAttachmentUrl(att.url) } });
          break;
        case 'file':
          parts.push({ type: 'file_url', file_url: { url: resolveAttachmentUrl(att.url), name: att.name } });
          break;
      }
    }
    return parts;
  }

  function parseWorkflowDefinition() {
    const liveDef = getDefinition?.();
    if (liveDef) return liveDef;
    try {
      return JSON.parse(workflow.definition || '{}');
    } catch {
      return { steps: [] };
    }
  }

  async function editAndResend(msgId: string, newText: string, newAttachments?: ChatAttachment[]) {
    if (isStreaming.value) return;

    const msgIndex = messages.value.findIndex((m) => m.id === msgId);
    if (msgIndex < 0) return;

    const targetMsg = messages.value[msgIndex]!;
    if (targetMsg.role !== 'user') return;

    // 截断数据库中该用户消息及之后的所有记录
    if (targetMsg.id.startsWith('db_') && currentConversation.value) {
      const dbId = parseInt(targetMsg.id.replace('db_', ''), 10);
      if (!isNaN(dbId)) {
        try {
          await deleteMessagesFromApi(currentConversation.value.id, dbId);
        } catch {
          // 截断失败不阻塞
        }
      }
    }

    // 移除该消息及之后所有消息
    messages.value.splice(msgIndex);

    const doneAttachments = newAttachments?.filter((a) => a.status === 'done' && a.url) || [];

    const userBlocks: ContentBlock[] = [];
    if (newText.trim()) {
      userBlocks.push({ type: 'text', content: newText });
    }
    for (const att of doneAttachments) {
      if (att.type === 'image' && att.url) {
        userBlocks.push({ type: 'image', url: att.url, name: att.name });
      } else if (att.url) {
        userBlocks.push({ type: 'file', url: att.url, name: att.name, size: att.size, mimeType: att.mimeType });
      }
    }

    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      blocks: userBlocks,
      content: newText,
      attachments: doneAttachments.length > 0 ? doneAttachments : undefined,
      timestamp: Date.now(),
    };
    messages.value.push(userMsg);

    const chatHistory = buildChatHistory();

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

    const userMessage: string | MultimodalContentPart[] = doneAttachments.length > 0
      ? buildMultimodalContent(newText, doneAttachments)
      : newText;

    const userinputFiles = doneAttachments
      .filter((att) => att.url)
      .map((att) => ({
        url: att.dataUrl || resolveAttachmentUrl(att.url!),
        name: att.name,
        type: att.type,
        mimeType: att.mimeType,
      }));

    try {
      const wfDef = parseWorkflowDefinition();
      const accessStore = useAccessStore();
      const token = accessStore.accessToken || '';

      const wfParams = [...(wfDef.params || [])];
      const setOrAddParam = (name: string, value: string) => {
        const idx = wfParams.findIndex((p: any) => p.name === name);
        if (idx >= 0) {
          wfParams[idx] = { ...wfParams[idx], defaultValue: value };
        } else {
          wfParams.push({ name, type: 'string', defaultValue: value, required: false });
        }
      };
      setOrAddParam('userinput.query', newText);
      setOrAddParam('userinput.files', JSON.stringify(userinputFiles));

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
            params: wfParams,
            executorConfig: wfDef.executorConfig || undefined,
          },
          stream: true,
          mode: 'debug',
          persist: false,
          ...(envId ? { envId } : {}),
          conversationId: currentConversation.value?.id
            ? String(currentConversation.value.id)
            : undefined,
          userMessage,
          chatHistory,
        }),
        signal: abortController.value.signal,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`执行失败 (${response.status}): ${errText}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/event-stream')) {
        const text = await response.text();
        try {
          const json = JSON.parse(text);
          if (json.code !== 0 && json.message) {
            throw new Error(json.message);
          }
        } catch (e) {
          if (e instanceof SyntaxError) {
            throw new Error(`unexpected response: ${text.slice(0, 200)}`);
          }
          throw e;
        }
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

  async function regenerateMessage(msgId: string) {
    if (isStreaming.value) return;

    const msgIndex = messages.value.findIndex((m) => m.id === msgId);
    if (msgIndex < 0) return;

    const targetMsg = messages.value[msgIndex]!;
    if (targetMsg.role !== 'assistant') return;

    // 找到该 assistant 消息之前的 user 消息
    let userMsg: ChatMessage | null = null;
    for (let i = msgIndex - 1; i >= 0; i--) {
      if (messages.value[i]!.role === 'user') {
        userMsg = messages.value[i]!;
        break;
      }
    }
    if (!userMsg) return;

    // 如果是来自数据库的消息，先调用截断 API 删除该消息及之后的记录
    if (targetMsg.id.startsWith('db_') && currentConversation.value) {
      const dbId = parseInt(targetMsg.id.replace('db_', ''), 10);
      if (!isNaN(dbId)) {
        try {
          await deleteMessagesFromApi(currentConversation.value.id, dbId);
        } catch {
          // 截断失败不阻塞重新生成
        }
      }
    }

    // 移除该 assistant 消息及之后的所有消息，保留 user 消息
    messages.value.splice(msgIndex);

    // 构建到该 user 消息为止的历史（不包含被移除的部分）
    const chatHistory = buildChatHistory();

    // 添加新的空 assistant 消息
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

    const doneAttachments = userMsg.attachments?.filter((a) => a.status === 'done' && a.url) || [];
    const userMessage: string | MultimodalContentPart[] = doneAttachments.length > 0
      ? buildMultimodalContent(userMsg.content, doneAttachments)
      : userMsg.content;

    const userinputFiles = doneAttachments
      .filter((att) => att.url)
      .map((att) => ({
        url: att.dataUrl || resolveAttachmentUrl(att.url!),
        name: att.name,
        type: att.type,
        mimeType: att.mimeType,
      }));

    try {
      const wfDef = parseWorkflowDefinition();
      const accessStore = useAccessStore();
      const token = accessStore.accessToken || '';

      const wfParams = [...(wfDef.params || [])];
      const setOrAddParam = (name: string, value: string) => {
        const idx = wfParams.findIndex((p: any) => p.name === name);
        if (idx >= 0) {
          wfParams[idx] = { ...wfParams[idx], defaultValue: value };
        } else {
          wfParams.push({ name, type: 'string', defaultValue: value, required: false });
        }
      };
      setOrAddParam('userinput.query', userMsg.content);
      setOrAddParam('userinput.files', JSON.stringify(userinputFiles));

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
            params: wfParams,
            executorConfig: wfDef.executorConfig || undefined,
          },
          stream: true,
          mode: 'debug',
          persist: false,
          ...(envId ? { envId } : {}),
          conversationId: currentConversation.value?.id
            ? String(currentConversation.value.id)
            : undefined,
          userMessage,
          chatHistory,
        }),
        signal: abortController.value.signal,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`执行失败 (${response.status}): ${errText}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/event-stream')) {
        const text = await response.text();
        try {
          const json = JSON.parse(text);
          if (json.code !== 0 && json.message) {
            throw new Error(json.message);
          }
        } catch (e) {
          if (e instanceof SyntaxError) {
            throw new Error(`unexpected response: ${text.slice(0, 200)}`);
          }
          throw e;
        }
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

      if (currentConversation.value) {
        await persistAssistantMessage(assistantMsg);
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

  async function persistAssistantMessage(assistantMsg: ChatMessage) {
    if (!persistConversation || !currentConversation.value) return;
    const convId = currentConversation.value.id;
    try {
      const content = serializeBlocks(assistantMsg.blocks);
      if (content?.trim()) {
        await saveConversationMessageApi(convId, {
          role: 'assistant',
          content,
          metadata: assistantMsg.metadata,
        });
      }
    } catch {
      // 持久化失败不影响对话
    }
  }

  async function sendMessage(text: string, attachments?: ChatAttachment[]) {
    if ((!text.trim() && !attachments?.length) || isStreaming.value) return;

    // 自动创建会话
    if (!currentConversation.value) {
      try {
        await createConversation();
      } catch {
        return;
      }
    }

    const chatHistory = buildChatHistory();

    const doneAttachments = attachments?.filter((a) => a.status === 'done' && a.url) || [];

    const userBlocks: ContentBlock[] = [];
    if (text.trim()) {
      userBlocks.push({ type: 'text', content: text });
    }
    for (const att of doneAttachments) {
      if (att.type === 'image' && att.url) {
        userBlocks.push({ type: 'image', url: att.url, name: att.name });
      } else if (att.url) {
        userBlocks.push({ type: 'file', url: att.url, name: att.name, size: att.size, mimeType: att.mimeType });
      }
    }

    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      blocks: userBlocks,
      content: text,
      attachments: doneAttachments.length > 0 ? doneAttachments : undefined,
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

    const userMessage: string | MultimodalContentPart[] = doneAttachments.length > 0
      ? buildMultimodalContent(text, doneAttachments)
      : text;

    const userinputFiles = doneAttachments
      .filter((att) => att.url)
      .map((att) => ({
        url: att.dataUrl || resolveAttachmentUrl(att.url!),
        name: att.name,
        type: att.type,
        mimeType: att.mimeType,
      }));

    try {
      const wfDef = parseWorkflowDefinition();
      const accessStore = useAccessStore();
      const token = accessStore.accessToken || '';

      const wfParams = [...(wfDef.params || [])];
      const setOrAddParam = (name: string, value: string) => {
        const idx = wfParams.findIndex((p: any) => p.name === name);
        if (idx >= 0) {
          wfParams[idx] = { ...wfParams[idx], defaultValue: value };
        } else {
          wfParams.push({ name, type: 'string', defaultValue: value, required: false });
        }
      };
      setOrAddParam('userinput.query', text);
      setOrAddParam('userinput.files', JSON.stringify(userinputFiles));

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
            params: wfParams,
            executorConfig: wfDef.executorConfig || undefined,
          },
          stream: true,
          mode: 'debug',
          persist: false,
          ...(envId ? { envId } : {}),
          conversationId: currentConversation.value?.id
            ? String(currentConversation.value.id)
            : undefined,
          userMessage,
          chatHistory,
        }),
        signal: abortController.value.signal,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`执行失败 (${response.status}): ${errText}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/event-stream')) {
        const text = await response.text();
        try {
          const json = JSON.parse(text);
          if (json.code !== 0 && json.message) {
            throw new Error(json.message);
          }
        } catch (e) {
          if (e instanceof SyntaxError) {
            throw new Error(`unexpected response: ${text.slice(0, 200)}`);
          }
          throw e;
        }
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
    const changed = handleBlockEvent(msg.blocks, eventType, data);
    if (changed) {
      msg.blocks = [...msg.blocks];
    }

    switch (eventType) {
      case 'ai_chunk':
        msg.loading = false;
        msg.content = blocksToPlainText(msg.blocks);
        break;

      case 'ai_artifact_start':
      case 'ai_artifact_chunk':
        msg.loading = false;
        break;

      case 'message_complete':
        msg.loading = false;
        msg.content = blocksToPlainText(msg.blocks);
        msg.metadata = {
          ...msg.metadata,
          usage: data.usage,
          model: data.model || msg.metadata?.model,
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
      const savedUser = await saveConversationMessageApi(convId, {
        role: 'user',
        content: serializeBlocks(userMsg.blocks),
      });
      if (savedUser?.id) {
        userMsg.id = `db_${savedUser.id}`;
      }

      const assistantContent = serializeBlocks(assistantMsg.blocks);
      if (assistantContent?.trim()) {
        const savedAssistant = await saveConversationMessageApi(convId, {
          role: 'assistant',
          content: assistantContent,
          metadata: assistantMsg.metadata,
        });
        if (savedAssistant?.id) {
          assistantMsg.id = `db_${savedAssistant.id}`;
        }
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

  function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function uploadFiles(files: File[]): Promise<ChatAttachment[]> {
    const attachments: ChatAttachment[] = files.map((file) => ({
      id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      file,
      name: file.name,
      size: file.size,
      mimeType: file.type || 'application/octet-stream',
      type: inferAttachmentType(file.type),
      status: 'uploading' as const,
    }));

    await Promise.allSettled(
      attachments.map(async (att) => {
        try {
          const [result, dataUrl] = await Promise.all([
            uploadAttachmentApi(att.file!, 'chat'),
            att.type === 'image' ? fileToDataUrl(att.file!) : Promise.resolve(undefined),
          ]);
          att.url = result.url;
          att.type = result.type;
          att.status = 'done';
          if (dataUrl) att.dataUrl = dataUrl;
        } catch (err: any) {
          att.status = 'error';
          att.error = err.message || '上传失败';
        }
      }),
    );

    return attachments;
  }

  function inferAttachmentType(mimeType: string): ChatAttachment['type'] {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.startsWith('video/')) return 'video';
    return 'file';
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
    editAndResend,
    regenerateMessage,
    stopGeneration,
    startNewConversation,
    confirmInteraction,
    skipInteraction,
    uploadFiles,
  };
}
