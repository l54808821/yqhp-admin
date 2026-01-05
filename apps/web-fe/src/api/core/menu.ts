import type { RouteRecordStringComponent } from '@vben/types';

import { requestClient } from '#/api/request';

/**
 * 后端菜单响应格式
 */
interface BackendMenuResponse {
  id: number;
  parentId: number;
  name: string;
  code: string;
  type: number; // 1:目录 2:菜单 3:按钮
  path: string;
  component: string;
  redirect: string;
  icon: string;
  sort: number;
  isHidden: boolean;
  isCache: boolean;
  isFrame: boolean;
  status: number;
  remark: string;
  children?: BackendMenuResponse[];
}

/**
 * 将后端菜单格式转换为前端路由格式
 */
function convertToRouteRecord(
  menu: BackendMenuResponse,
): RouteRecordStringComponent {
  const route: RouteRecordStringComponent = {
    name: menu.code || `Menu_${menu.id}`,
    path: menu.path || '',
    component: menu.component || '',
    redirect: menu.redirect || undefined,
    meta: {
      title: menu.name,
      icon: menu.icon || undefined,
      hideInMenu: menu.isHidden,
      keepAlive: menu.isCache,
      order: menu.sort,
      link: menu.isFrame ? menu.path : undefined,
    },
    children: menu.children?.map(convertToRouteRecord),
  };

  // 移除空值
  if (!route.redirect) delete (route as any).redirect;
  if (!route.children || route.children.length === 0)
    delete (route as any).children;

  return route;
}

/**
 * 获取用户所有菜单（后端权限模式）
 */
export async function getAllMenusApi() {
  const menus = await requestClient.get<BackendMenuResponse[]>('/menus');
  return menus.map(convertToRouteRecord);
}
