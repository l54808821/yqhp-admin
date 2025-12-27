import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:settings',
      order: 100,
      title: '系统管理',
    },
    name: 'System',
    path: '/system',
    children: [
      {
        name: 'SystemUser',
        path: '/system/user',
        component: () => import('#/views/system/user/index.vue'),
        meta: {
          icon: 'lucide:users',
          title: '用户管理',
        },
      },
      {
        name: 'SystemRole',
        path: '/system/role',
        component: () => import('#/views/system/role/index.vue'),
        meta: {
          icon: 'lucide:shield',
          title: '角色管理',
        },
      },
      {
        name: 'SystemMenu',
        path: '/system/menu',
        component: () => import('#/views/system/menu/index.vue'),
        meta: {
          icon: 'lucide:menu',
          title: '菜单管理',
        },
      },
      {
        name: 'SystemDept',
        path: '/system/dept',
        component: () => import('#/views/system/dept/index.vue'),
        meta: {
          icon: 'lucide:building-2',
          title: '部门管理',
        },
      },
      {
        name: 'SystemDict',
        path: '/system/dict',
        component: () => import('#/views/system/dict/index.vue'),
        meta: {
          icon: 'lucide:book-open',
          title: '字典管理',
        },
      },
      {
        name: 'SystemConfig',
        path: '/system/config',
        component: () => import('#/views/system/config/index.vue'),
        meta: {
          icon: 'lucide:wrench',
          title: '参数配置',
        },
      },
      {
        name: 'SystemOAuth',
        path: '/system/oauth',
        component: () => import('#/views/system/oauth/index.vue'),
        meta: {
          icon: 'lucide:link',
          title: '第三方登录',
        },
      },
      {
        name: 'SystemToken',
        path: '/system/token',
        component: () => import('#/views/system/token/index.vue'),
        meta: {
          icon: 'lucide:key',
          title: '令牌管理',
        },
      },
      {
        name: 'SystemLog',
        path: '/system/log',
        component: () => import('#/views/system/log/index.vue'),
        meta: {
          icon: 'lucide:file-text',
          title: '日志管理',
        },
      },
    ],
  },
];

export default routes;
