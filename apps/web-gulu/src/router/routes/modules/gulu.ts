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
      {
        name: 'WorkflowEditor',
        path: ':workflowId/edit',
        component: () => import('#/views/workflow/editor/index.vue'),
        meta: {
          hideInMenu: true,
          title: '工作流编辑器',
        },
      },
      {
        name: 'WorkflowExecute',
        path: ':workflowId/execute',
        component: () => import('#/views/workflow/execution/ExecuteDialog.vue'),
        meta: {
          hideInMenu: true,
          title: '执行工作流',
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
];

export default routes;
