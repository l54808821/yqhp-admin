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

import UnifiedAgentPropertyPanel from './ai/UnifiedAgentPropertyPanel.vue';
import { createDefaultUnifiedAgentConfig } from './ai/shared/types';
import ConditionProperty from './ConditionProperty.vue';
import ConditionBranchProperty from './ConditionBranchProperty.vue';
import DatabasePropertyPanel from './database/DatabasePropertyPanel.vue';
import HttpPropertyPanel from './http/HttpPropertyPanel.vue';
import LoopProperty from './LoopProperty.vue';
import MqPropertyPanel from './mq/MqPropertyPanel.vue';
import RefWorkflowPropertyPanel from './ref-workflow/RefWorkflowPropertyPanel.vue';
import ScriptPropertyPanel from './ScriptPropertyPanel.vue';
import WaitProperty from './WaitProperty.vue';

import { createIconifyIcon } from '@vben/icons';
const BrainCircuit = createIconifyIcon('lucide:brain-circuit');
const Workflow = createIconifyIcon('lucide:workflow');

export interface NodeTypeConfig {
  key: string;
  label: string;
  icon: Component;
  color: string;
  propertyComponent: Component;
  defaultConfig: () => Record<string, any>;
  getDescription?: (node: any) => string;
  canHaveChildren?: boolean;
}

// 旧 AI 节点类型列表（用于兼容迁移，打开时自动映射为 ai_agent）
const legacyAITypes = ['ai', 'ai_chat', 'ai_react', 'ai_plan', 'ai_direct', 'ai_plan_execute', 'ai_reflection', 'ai_supervisor', 'ai_deep_agent'];

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
  ai_agent: {
    key: 'ai_agent',
    label: '智能 Agent',
    icon: BrainCircuit,
    color: '#722ed1',
    propertyComponent: UnifiedAgentPropertyPanel,
    defaultConfig: () => ({ config: createDefaultUnifiedAgentConfig() }),
    getDescription: (node) => node.config?.ai_model_name || '未选择模型',
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
    propertyComponent: DatabasePropertyPanel,
    defaultConfig: () => ({
      config: {
        datasourceCode: '',
        action: 'query',
        sql: '',
        params: [],
        settings: {
          timeout: 30000,
          maxRows: 1000,
          saveToVariable: '',
        },
      },
      preProcessors: [],
      postProcessors: [],
    }),
    getDescription: (node) => {
      const sql = node.config?.sql?.trim();
      if (sql) {
        const firstWord = sql.split(/\s+/)[0]?.toUpperCase() || '';
        return `${firstWord} ${sql.slice(firstWord.length, firstWord.length + 30).trim()}`;
      }
      return '';
    },
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
    propertyComponent: MqPropertyPanel,
    defaultConfig: () => ({
      config: {
        mqConfigCode: '',
        action: 'send',
        topic: '',
        queue: '',
        message: '',
        key: '',
        headers: [],
        settings: {
          timeout: 30000,
          groupId: '',
          format: 'json',
          count: 1,
        },
      },
      preProcessors: [],
      postProcessors: [],
    }),
    getDescription: (node) => {
      const config = node.config;
      if (!config) return '';
      const action = config.action === 'receive' ? '接收' : '发送';
      const target = config.topic || config.queue || '';
      return target ? `${action} ${target}` : '';
    },
  },
  ref_workflow: {
    key: 'ref_workflow',
    label: '引用工作流',
    icon: Workflow,
    color: '#9254de',
    propertyComponent: RefWorkflowPropertyPanel,
    defaultConfig: () => ({
      config: {
        workflow_id: null,
        workflow_name: '',
        params: {},
        outputs: {},
      },
    }),
    getDescription: (node) => node.config?.workflow_name || '未选择工作流',
  },
};

// 获取所有节点类型列表
export function getNodeTypes(): NodeTypeConfig[] {
  return Object.values(nodeTypeRegistry);
}

// 获取节点类型配置（支持旧类型自动映射到 ai_agent）
export function getNodeTypeConfig(type: string): NodeTypeConfig | undefined {
  if (legacyAITypes.includes(type)) {
    return nodeTypeRegistry['ai_agent'];
  }
  return nodeTypeRegistry[type];
}

// 注册新的节点类型
export function registerNodeType(config: NodeTypeConfig) {
  nodeTypeRegistry[config.key] = config;
}
