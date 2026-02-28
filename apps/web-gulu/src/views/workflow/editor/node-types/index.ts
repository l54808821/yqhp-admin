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
import ChatPropertyPanel from './ai/chat/ChatPropertyPanel.vue';
import AgentPropertyPanel from './ai/agent/AgentPropertyPanel.vue';
import PlanExecutePropertyPanel from './ai/plan-execute/PlanExecutePropertyPanel.vue';
import ReflectionPropertyPanel from './ai/reflection/ReflectionPropertyPanel.vue';
import SupervisorPropertyPanel from './ai/supervisor/SupervisorPropertyPanel.vue';
import DeepAgentPropertyPanel from './ai/deep-agent/DeepAgentPropertyPanel.vue';
import {
  createDefaultChatConfig,
  createDefaultAgentConfig,
  createDefaultPlanExecuteConfig,
  createDefaultReflectionConfig,
  createDefaultSupervisorConfig,
  createDefaultDeepAgentConfig,
} from './ai/shared/types';
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
const Sparkles = createIconifyIcon('lucide:sparkles');
const Workflow = createIconifyIcon('lucide:workflow');
const Bot = createIconifyIcon('lucide:bot');
const BrainCircuit = createIconifyIcon('lucide:brain-circuit');
const ListChecks = createIconifyIcon('lucide:list-checks');
const RefreshCw = createIconifyIcon('lucide:refresh-cw');
const Users = createIconifyIcon('lucide:users');
const Layers = createIconifyIcon('lucide:layers');

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
        interaction_timeout: 300,
        timeout: 300,
        agent_mode: '',
        max_reflection_rounds: 2,
      },
    }),
    getDescription: (node) => {
      const config = node.config;
      if (!config) return '';
      return config.ai_model_name || '未选择模型';
    },
  },
  ai_chat: {
    key: 'ai_chat',
    label: 'AI 对话',
    icon: Bot,
    color: '#1677ff',
    propertyComponent: ChatPropertyPanel,
    defaultConfig: () => ({ config: createDefaultChatConfig() }),
    getDescription: (node) => node.config?.ai_model_name || '未选择模型',
  },
  ai_agent: {
    key: 'ai_agent',
    label: 'ReAct Agent',
    icon: BrainCircuit,
    color: '#722ed1',
    propertyComponent: AgentPropertyPanel,
    defaultConfig: () => ({ config: createDefaultAgentConfig() }),
    getDescription: (node) => node.config?.ai_model_name || '未选择模型',
  },
  ai_plan_execute: {
    key: 'ai_plan_execute',
    label: '规划执行',
    icon: ListChecks,
    color: '#13c2c2',
    propertyComponent: PlanExecutePropertyPanel,
    defaultConfig: () => ({ config: createDefaultPlanExecuteConfig() }),
    getDescription: (node) => node.config?.ai_model_name || '未选择模型',
  },
  ai_reflection: {
    key: 'ai_reflection',
    label: '反思迭代',
    icon: RefreshCw,
    color: '#eb2f96',
    propertyComponent: ReflectionPropertyPanel,
    defaultConfig: () => ({ config: createDefaultReflectionConfig() }),
    getDescription: (node) => node.config?.ai_model_name || '未选择模型',
  },
  ai_supervisor: {
    key: 'ai_supervisor',
    label: '监督者协调',
    icon: Users,
    color: '#fa8c16',
    propertyComponent: SupervisorPropertyPanel,
    defaultConfig: () => ({ config: createDefaultSupervisorConfig() }),
    getDescription: (node) => node.config?.ai_model_name || '未选择模型',
  },
  ai_deep_agent: {
    key: 'ai_deep_agent',
    label: '深度代理',
    icon: Layers,
    color: '#52c41a',
    propertyComponent: DeepAgentPropertyPanel,
    defaultConfig: () => ({ config: createDefaultDeepAgentConfig() }),
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

// 获取节点类型配置
export function getNodeTypeConfig(type: string): NodeTypeConfig | undefined {
  return nodeTypeRegistry[type];
}

// 注册新的节点类型（用于扩展）
export function registerNodeType(config: NodeTypeConfig) {
  nodeTypeRegistry[config.key] = config;
}
