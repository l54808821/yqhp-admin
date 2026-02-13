import type { Component } from 'vue';

import { GripVertical } from '@vben/icons';
import {
  Clock,
  Code,
  Database,
  GitBranch,
  Globe,
  MessageSquare,
} from '#/components/icons';

import AIProperty from './ai/AIPropertyPanel.vue';
import ConditionProperty from './ConditionProperty.vue';
import ConditionBranchProperty from './ConditionBranchProperty.vue';
import DatabaseProperty from './DatabaseProperty.vue';
import HttpPropertyPanel from './http/HttpPropertyPanel.vue';
import LoopProperty from './LoopProperty.vue';
import MqProperty from './MqProperty.vue';
import ScriptPropertyPanel from './ScriptPropertyPanel.vue';
import WaitProperty from './WaitProperty.vue';

// AI 图标（使用 sparkles 表示 AI）
import { createIconifyIcon } from '@vben/icons';
const Sparkles = createIconifyIcon('lucide:sparkles');

export interface NodeTypeConfig {
  key: string;
  label: string;
  icon: Component;
  color: string;
  // 属性编辑组件
  propertyComponent: Component;
  // 创建节点时的默认配置
  defaultConfig: () => Record<string, any>;
  // 获取节点描述（用于树形列表显示）
  getDescription?: (node: any) => string;
  // 是否可以有子节点
  canHaveChildren?: boolean;
}

// 节点类型注册表
export const nodeTypeRegistry: Record<string, NodeTypeConfig> = {
  http: {
    key: 'http',
    label: 'HTTP请求',
    icon: Globe,
    color: '#52c41a',
    propertyComponent: HttpPropertyPanel,
    defaultConfig: () => ({
      config: {
        method: 'GET',
        url: '',
        domainCode: '',
        params: [],
        headers: [],
        cookies: [],
        body: { type: 'none', formData: [], urlencoded: [], raw: '' },
        auth: { type: 'none' },
        settings: {
          connectTimeout: 30000,
          readTimeout: 30000,
          followRedirects: true,
          maxRedirects: 10,
          verifySsl: true,
          saveCookies: true,
        },
      },
      preProcessors: [],
      postProcessors: [],
    }),
    getDescription: (node) =>
      node.config?.url ? `${node.config.method || 'GET'} ${node.config.url}` : '',
  },
  script: {
    key: 'script',
    label: '脚本',
    icon: Code,
    color: '#722ed1',
    propertyComponent: ScriptPropertyPanel,
    defaultConfig: () => ({
      config: { language: 'javascript', script: '' },
    }),
    getDescription: (node) => node.config?.language || 'javascript',
  },
  ai: {
    key: 'ai',
    label: 'AI 节点',
    icon: Sparkles,
    color: '#1677ff',
    propertyComponent: AIProperty,
    defaultConfig: () => ({
      config: {
        ai_model_id: null,
        ai_model_name: '',
        system_prompt: '',
        prompt: '',
        temperature: 0.7,
        max_tokens: 4096,
        top_p: 1,
        streaming: true,
        interactive: false,
        interaction_type: 'confirm',
        interaction_prompt: '',
        interaction_options: [],
        interaction_timeout: 300,
        interaction_default: '',
        timeout: 300,
      },
    }),
    getDescription: (node) => {
      const config = node.config;
      if (!config) return '';
      return config.ai_model_name || '未选择模型';
    },
  },
  condition: {
    key: 'condition',
    label: '条件判断',
    icon: GitBranch,
    color: '#fa8c16',
    propertyComponent: ConditionProperty,
    defaultConfig: () => ({
      branches: [
        { id: `br_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, name: '条件1', kind: 'if', expression: '', steps: [] },
        { id: `br_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, name: '默认', kind: 'else', steps: [] },
      ],
    }),
    getDescription: (node) => {
      const branches = node.branches || [];
      const parts: string[] = [];
      for (const br of branches) {
        if (br.kind === 'else') parts.push('else');
        else parts.push(`${br.kind} ${br.expression || ''}`.trim());
      }
      return parts.join(' | ');
    },
    canHaveChildren: true,
  },
  condition_branch: {
    key: 'condition_branch',
    label: '条件分支',
    icon: GitBranch,
    color: '#fa8c16',
    propertyComponent: ConditionBranchProperty,
    defaultConfig: () => ({}),
    getDescription: (node) => {
      const br = node.branch;
      if (!br) return '';
      if (br.kind === 'else') return 'else';
      return br.expression ? `${br.kind} ${br.expression}` : br.kind;
    },
    canHaveChildren: true,
  },
  loop: {
    key: 'loop',
    label: '循环',
    icon: GripVertical,
    color: '#13c2c2',
    propertyComponent: LoopProperty,
    defaultConfig: () => ({
      loop: {
        mode: 'for',
        count: 1,
        items: '',
        item_var: '',
        condition: '',
        max_iterations: 0,
        break_condition: '',
        continue_condition: '',
      },
      children: [],
    }),
    getDescription: (node) => {
      const loop = node.loop;
      if (!loop) return '';
      if (loop.mode === 'for' && loop.count > 0) return `循环 ${loop.count} 次`;
      if (loop.mode === 'foreach' && loop.items) return `遍历 ${loop.items}`;
      if (loop.mode === 'while' && loop.condition) return loop.condition;
      return '';
    },
    canHaveChildren: true,
  },
  database: {
    key: 'database',
    label: '数据库',
    icon: Database,
    color: '#1890ff',
    propertyComponent: DatabaseProperty,
    defaultConfig: () => ({
      config: { database_config: '', query: '', params: [] },
    }),
    getDescription: (node) => (node.config?.query ? node.config.query.slice(0, 30) : ''),
  },
  wait: {
    key: 'wait',
    label: '等待',
    icon: Clock,
    color: '#eb2f96',
    propertyComponent: WaitProperty,
    defaultConfig: () => ({
      config: { duration: 1000 },
    }),
    getDescription: (node) => (node.config?.duration ? `${node.config.duration}ms` : ''),
  },
  mq: {
    key: 'mq',
    label: 'MQ消息',
    icon: MessageSquare,
    color: '#faad14',
    propertyComponent: MqProperty,
    defaultConfig: () => ({
      config: { mq_config: '', action: 'send', topic: '', message: '' },
    }),
    getDescription: (node) => node.config?.topic || '',
  },
};

// 获取所有节点类型列表
export function getNodeTypes(): NodeTypeConfig[] {
  return Object.values(nodeTypeRegistry);
}

// 获取节点类型配置
export function getNodeTypeConfig(type: string): NodeTypeConfig | undefined {
  return nodeTypeRegistry[type];
}

// 注册新的节点类型（用于扩展）
export function registerNodeType(config: NodeTypeConfig) {
  nodeTypeRegistry[config.key] = config;
}
