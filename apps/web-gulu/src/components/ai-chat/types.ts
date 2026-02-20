import type { VNode } from 'vue';
import type { ToolCallRecord } from '#/views/workflow/components/shared/types';

export type { ToolCallRecord };

export type MessageRole = 'user' | 'assistant' | 'system';

export type StreamStatus = 'idle' | 'connecting' | 'streaming' | 'done' | 'error' | 'aborted';

export interface ThinkingBlock {
  content: string;
  isComplete: boolean;
}

export interface AiChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  thinking?: ThinkingBlock;
  toolCalls?: ToolCallRecord[];
  loading?: boolean;
  error?: string;
  timestamp: number;
}

export interface AiStreamOptions {
  url: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
  onChunk?: (content: string) => void;
  onThinkingChunk?: (content: string) => void;
  onToolCallStart?: (toolCall: Partial<ToolCallRecord>) => void;
  onToolCallComplete?: (toolCall: ToolCallRecord) => void;
  onComplete?: (content: string) => void;
  onError?: (error: Error) => void;
}

export interface AiChatConfig {
  modelId: number;
  apiBaseUrl: string;
  token?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface MessageAction {
  key: string;
  label: string;
  icon?: VNode;
  onClick: (message: AiChatMessage) => void;
}
