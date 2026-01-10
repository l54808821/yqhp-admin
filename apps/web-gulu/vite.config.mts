import { defineConfig } from '@vben/vite-config';

export default defineConfig(async () => {
  return {
    application: {},
    vite: {
      server: {
        proxy: {
          // WebSocket 代理到 Gulu 后端（调试功能）
          '/ws': {
            changeOrigin: true,
            target: 'http://localhost:5321',
            ws: true,
          },
          // 系统管理 API 代理到 Admin 服务 (用户、角色、权限等)
          '/api/system': {
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api/, ''),
            target: 'http://localhost:5320/api',
            ws: true,
          },
          // Gulu 业务 API 代理到 Gulu 后端
          '/api': {
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api/, ''),
            target: 'http://localhost:5321/api',
            ws: true,
          },
          // 认证 API 代理到 Admin 服务 (SSO)
          // /auth/login -> Admin /api/auth/login
          '/auth': {
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/auth/, '/auth'),
            target: 'http://localhost:5320/api',
            ws: true,
          },
        },
      },
    },
  };
});
