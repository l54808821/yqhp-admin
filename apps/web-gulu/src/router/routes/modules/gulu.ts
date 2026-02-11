import type { RouteRecordRaw } from 'vue-router';

import { BasicLayout } from '#/layouts';

const routes: RouteRecordRaw[] = [
  // 团队管理首页
  {
    meta: {
      icon: 'lucide:home',
      order: 0,
      title: '首页',
    },
    name: 'Main',
    path: '/main',
    component: () => import('#/views/main/index.vue'),
  },
  // 工作流管理
  {
    meta: {
      icon: 'lucide:workflow',
      order: 10,
      title: '工作流管理',
    },
    name: 'WorkflowManagement',
    path: '/project/:projectId/workflow',
    component: BasicLayout,
    children: [
      {
        name: 'WorkflowIndex',
        path: '',
        component: () => import('#/views/workflow/index.vue'),
        meta: {
          hideInMenu: true,
          title: '工作流管理',
        },
      },

    ],
  },
  // 执行历史
  {
    meta: {
      icon: 'lucide:history',
      order: 20,
      title: '执行历史',
    },
    name: 'ExecutionHistory',
    path: '/project/:projectId/history',
    component: BasicLayout,
    children: [
      {
        name: 'HistoryIndex',
        path: '',
        component: () => import('#/views/workflow/history/index.vue'),
        meta: {
          hideInMenu: true,
          title: '执行历史',
        },
      },
      {
        name: 'ExecutionDetail',
        path: ':executionId',
        component: () => import('#/views/workflow/execution/index.vue'),
        meta: {
          hideInMenu: true,
          title: '执行详情',
        },
      },
      {
        name: 'ExecutionReport',
        path: ':executionId/report',
        component: () => import('#/views/workflow/execution/Report.vue'),
        meta: {
          hideInMenu: true,
          title: '执行报告',
        },
      },
    ],
  },
  // 执行机管理
  {
    meta: {
      icon: 'lucide:server',
      order: 30,
      title: '执行机管理',
    },
    name: 'ExecutorManagement',
    path: '/project/:projectId/executor',
    component: BasicLayout,
    children: [
      {
        name: 'ExecutorIndex',
        path: '',
        component: () => import('#/views/executor/index.vue'),
        meta: {
          hideInMenu: true,
          title: '执行机管理',
        },
      },
    ],
  },
  // AI 模型管理
  {
    meta: {
      icon: 'lucide:brain',
      order: 40,
      title: 'AI 模型管理',
    },
    name: 'AiModelManagement',
    path: '/project/:projectId/ai-model',
    component: BasicLayout,
    children: [
      {
        name: 'AiModelIndex',
        path: '',
        component: () => import('#/views/ai-model/index.vue'),
        meta: {
          hideInMenu: true,
          title: 'AI 模型管理',
        },
      },
      {
        name: 'AiModelChat',
        path: ':modelId/chat',
        component: () => import('#/views/ai-model/chat.vue'),
        meta: {
          hideInMenu: true,
          title: '在线体验',
        },
      },
    ],
  },
  // MCP 服务器管理
  {
    meta: {
      icon: 'lucide:plug',
      order: 45,
      title: 'MCP 服务器',
    },
    name: 'McpServerManagement',
    path: '/project/:projectId/mcp-server',
    component: BasicLayout,
    children: [
      {
        name: 'McpServerIndex',
        path: '',
        component: () => import('#/views/mcp-server/index.vue'),
        meta: {
          hideInMenu: true,
          title: 'MCP 服务器管理',
        },
      },
    ],
  },
];

export default routes;
