import type { MenuRecordRaw } from '@vben-core/typings';

/**
 * 替换菜单路径中的 :projectId 为实际的项目ID
 */
export function replaceProjectIdInMenus(
  menus: MenuRecordRaw[],
  projectId: number,
): MenuRecordRaw[] {
  return menus.map((menu) => {
    const newMenu = { ...menu };
    if (
      typeof newMenu.path === 'string' &&
      newMenu.path.includes(':projectId')
    ) {
      newMenu.path = newMenu.path.replace(':projectId', String(projectId));
    }
    if (newMenu.children && newMenu.children.length > 0) {
      newMenu.children = replaceProjectIdInMenus(newMenu.children, projectId);
    }
    if (newMenu.parents) {
      newMenu.parents = newMenu.parents.map((p) =>
        typeof p === 'string' && p.includes(':projectId')
          ? p.replace(':projectId', String(projectId))
          : p,
      );
    }
    if (
      typeof newMenu.parent === 'string' &&
      newMenu.parent.includes(':projectId')
    ) {
      newMenu.parent = newMenu.parent.replace(':projectId', String(projectId));
    }
    // 替换 activeMenu
    if (
      typeof newMenu.activeMenu === 'string' &&
      newMenu.activeMenu.includes(':projectId')
    ) {
      newMenu.activeMenu = newMenu.activeMenu.replace(':projectId', String(projectId));
    }
    return newMenu;
  });
}

/**
 * 提取项目路由的子菜单作为顶级菜单
 * 因为项目路由本身是隐藏的，需要把子菜单提升到顶级
 */
export function extractProjectMenus(
  menus: MenuRecordRaw[],
  projectId: number,
): MenuRecordRaw[] {
  const result: MenuRecordRaw[] = [];

  for (const menu of menus) {
    // 如果是项目路由（路径包含 /project/），提取其子菜单
    if (menu.path?.includes('/project/') && menu.children) {
      // 将子菜单添加到结果中
      for (const child of menu.children) {
        result.push(child);
      }
    } else {
      result.push(menu);
    }
  }

  return replaceProjectIdInMenus(result, projectId);
}
