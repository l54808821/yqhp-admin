import type { ViewApi } from '@vben/common-ui';

import {
  deleteTableViewApi,
  getTableViewsApi,
  saveTableViewApi,
  setDefaultViewApi,
  updateViewSortApi,
} from '#/api/system/table-view';

/**
 * 视图 API 实现
 * 将业务 API 适配为 SearchTable 组件需要的接口
 */
export const viewApi: ViewApi = {
  getViews: async (tableKey) => {
    const data = await getTableViewsApi(tableKey);
    return {
      views: data.views.map((v) => ({
        id: v.id,
        name: v.name,
        isSystem: v.isSystem,
        isDefault: v.isDefault,
        columns: v.columns || [],
        columnFixed: v.columnFixed,
        searchParams: v.searchParams,
      })),
    };
  },

  saveView: async (data) => {
    const result = await saveTableViewApi(data);
    return {
      id: result.id,
      name: result.name,
      isSystem: result.isSystem,
      isDefault: result.isDefault,
      columns: result.columns,
      columnFixed: result.columnFixed,
      searchParams: result.searchParams,
    };
  },

  deleteView: async (id) => {
    await deleteTableViewApi(id);
  },

  setDefaultView: async (tableKey, viewId) => {
    await setDefaultViewApi(tableKey, viewId);
  },

  updateViewSort: async (tableKey, viewIds) => {
    await updateViewSortApi(tableKey, viewIds);
  },
};
