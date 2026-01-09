import { defineOverridesPreferences } from '@vben/preferences';

/**
 * @description 项目配置文件
 * 只需要覆盖项目中的一部分配置，不需要的配置不用覆盖，会自动使用默认配置
 * !!! 更改配置后请清空缓存，否则可能不生效
 */
export const overridesPreferences = defineOverridesPreferences({
  // overrides
  app: {
    // 使用混合权限模式（前后端路由都展示）
    accessMode: 'mixed',
    name: import.meta.env.VITE_APP_TITLE,
    "authPageLayout": "panel-center"
  },
  breadcrumb: {
    enable: false,
  },
  sidebar: {
    collapsed: false,
    collapsedButton: false,
    collapsedShowTitle: true,
    fixedButton: false,
  },
  tabbar: {
    enable: false,
    styleType: 'plain',
  },
  theme: {
    mode: 'light',
  },
  widget: {
    refresh: false,
    lockScreen: false,
    languageToggle: false,
    timezone: false,
  },
});

/**
 * @description 项目自定义配置
 */
export const appCustomPreferences = {
  /**
   * 登录后是否跳转到之前的页面
   * true: 登录后跳转到退出前的页面
   * false: 登录后跳转到用户首页
   */
  loginRedirectToPreviousPage: true,
};
