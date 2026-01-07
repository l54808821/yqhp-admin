import type { RouteRecordStringComponent } from '@vben/types';

import { requestClient } from '#/api/request';

/**
 * 后端菜单响应格式 (Gulu 后端)
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
 * 构建菜单树
 */
function buildMenuTree(menus: BackendMenuResponse[]): BackendMenuResponse[] {
  const menuMap = new Map<number, BackendMenuResponse>();
  const rootMenus: BackendMenuResponse[] = [];

  // 先将所有菜单放入 map
  menus.forEach((menu) => {
    menuMap.set(menu.id, { ...menu, children: [] });
  });

  // 构建树结构
  menus.forEach((menu) => {
    const currentMenu = menuMap.get(menu.id)!;
    if (menu.parentId === 0 || !menuMap.has(menu.parentId)) {
      rootMenus.push(currentMenu);
    } else {
      const parentMenu = menuMap.get(menu.parentId)!;
      if (!parentMenu.children) {
        parentMenu.children = [];
      }
      parentMenu.children.push(currentMenu);
    }
  });

  return rootMenus;
}

/**
 * 获取用户所有菜单（从 Gulu 后端获取，按 gulu 应用过滤）
 */
export async function getAllMenusApi() {
  const menus = await requestClient.get<BackendMenuResponse[]>('/user/menus');
  // 构建菜单树并转换为路由格式
  const menuTree = buildMenuTree(menus);
  return menuTree.map(convertToRouteRecord);
}
