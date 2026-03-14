import type { RouteRecordRaw } from 'vue-router';

import { BasicLayout } from '#/layouts';

const routes: RouteRecordRaw[] = [
  // 团队管理首页（登录后落地页，不显示在菜单中）
  {
    meta: {
      title: '首页',
      hideInMenu: true,
      noBasicLayout: true,
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
      title: '工作流',
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
          title: '工作流',
          keepAlive: true,
        },
      },
    ],
  },
  // AI 应用（全屏独立页面，新窗口打开）
  {
    meta: {
      hideInMenu: true,
      title: 'AI 应用',
      noBasicLayout: true,
    },
    name: 'AIWorkflowApp',
    path: '/project/:projectId/workflow/:workflowId/app',
    component: () => import('#/views/workflow/ai-app/index.vue'),
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
  // 知识库管理
  {
    meta: {
      icon: 'lucide:book-open',
      order: 47,
      title: '知识库',
    },
    name: 'KnowledgeManagement',
    path: '/project/:projectId/knowledge',
    component: BasicLayout,
    children: [
      {
        name: 'KnowledgeIndex',
        path: '',
        component: () => import('#/views/knowledge/index.vue'),
        meta: {
          hideInMenu: true,
          title: '知识库管理',
        },
      },
      {
        name: 'KnowledgeDetail',
        path: ':kbId',
        component: () => import('#/views/knowledge/detail.vue'),
        meta: {
          hideInMenu: true,
          title: '知识库详情',
        },
      },
    ],
  },
  // 设置（包含执行机、模型管理、MCP、Skill）
  {
    meta: {
      icon: 'lucide:settings',
      order: 90,
      title: '设置',
    },
    name: 'Settings',
    path: '/project/:projectId/settings',
    component: BasicLayout,
    redirect: { name: 'SettingsExecutor' },
    children: [
      {
        name: 'SettingsIndex',
        path: '',
        component: () => import('#/views/settings/index.vue'),
        meta: {
          hideInMenu: true,
          title: '设置',
        },
        children: [
          {
            name: 'SettingsExecutor',
            path: 'executor',
            component: () => import('#/views/executor/index.vue'),
            meta: {
              hideInMenu: true,
              title: '执行机',
            },
          },
          {
            name: 'SettingsAiModel',
            path: 'ai-model',
            component: () => import('#/views/ai-model/index.vue'),
            meta: {
              hideInMenu: true,
              title: '模型管理',
            },
          },
          {
            name: 'SettingsAiModelChat',
            path: 'ai-model/:modelId/chat',
            component: () => import('#/views/ai-model/chat.vue'),
            meta: {
              hideInMenu: true,
              title: '在线体验',
            },
          },
          {
            name: 'SettingsMcp',
            path: 'mcp',
            component: () => import('#/views/mcp-server/index.vue'),
            meta: {
              hideInMenu: true,
              title: 'MCP',
            },
          },
          {
            name: 'SettingsSkill',
            path: 'skill',
            component: () => import('#/views/skill/index.vue'),
            meta: {
              hideInMenu: true,
              title: 'Skill',
            },
          },
          {
            name: 'SettingsSkillDetail',
            path: 'skill/:skillId',
            component: () => import('#/views/skill/detail.vue'),
            meta: {
              hideInMenu: true,
              title: 'Skill详情',
            },
          },
        ],
      },
    ],
  },
];

export default routes;
