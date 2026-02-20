/**
 * MQ 消息节点相关类型定义
 * 参考 HTTP / Database 节点风格
 */

import type { KeywordConfig } from './keyword';
import type { ParamItem } from './http';
import type { ConsoleLogEntry, AssertionResult } from '../../components/shared/types';

// ==================== MQ 操作类型 ====================

export type MqAction = 'send' | 'receive';

export const MQ_ACTION_OPTIONS: { label: string; value: MqAction; color: string; description: string }[] = [
  { label: '发送', value: 'send', color: '#49cc90', description: '发布消息到 Topic / Queue' },
  { label: '接收', value: 'receive', color: '#61affe', description: '从 Topic / Queue 消费消息' },
];

export const MQ_ACTION_COLORS: Record<MqAction, string> = {
  send: '#49cc90',
  receive: '#61affe',
};

// ==================== MQ 设置 ====================

export interface MqSettings {
  timeout?: number;
  groupId?: string;
  format?: 'json' | 'text' | 'protobuf';
  count?: number;
}

export function createMqSettings(): MqSettings {
  return {
    timeout: 30000,
    groupId: '',
    format: 'json',
    count: 1,
  };
}

// ==================== MQ 配置 ====================

export interface MqConfig {
  mqConfigCode: string;
  action: MqAction;
  topic: string;
  queue: string;
  message: string;
  key: string;
  headers: ParamItem[];
  settings: MqSettings;
}

export function createMqConfig(): MqConfig {
  return {
    mqConfigCode: '',
    action: 'send',
    topic: '',
    queue: '',
    message: '',
    key: '',
    headers: [],
    settings: createMqSettings(),
  };
}

// ==================== MQ 步骤节点 ====================

export interface MqStepNode {
  id: string;
  type: 'mq';
  name: string;
  config: MqConfig;
  preProcessors?: KeywordConfig[];
  postProcessors?: KeywordConfig[];
}

// ==================== MQ 响应数据 ====================

export interface MqMessageItem {
  id?: string;
  key?: string;
  value: string;
  headers?: Record<string, string>;
  timestamp?: string;
  topic?: string;
  partition?: number;
  offset?: number;
}

export interface MqResponseData {
  success: boolean;
  action: string;
  durationMs: number;
  topic?: string;
  queue?: string;
  messages?: MqMessageItem[];
  count?: number;
  error?: string;
  consoleLogs?: ConsoleLogEntry[];
  assertions?: AssertionResult[];
}
