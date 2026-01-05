import type { Ref } from 'vue';

import type { ColumnConfig, ColumnFixedConfig, ViewConfig } from './types';

import { computed, ref, toRaw } from 'vue';

import {
  deleteTableViewApi,
  getTableViewsApi,
  saveTableViewApi,
} from '#/api/system/table-view';

export function useView(
  tableKey: string,
  columnsRef: () => ColumnConfig[],
  searchParams: Ref<Record<string, any>>,
) {
  // 虚拟视图ID（不保存到数据库）
  const VIRTUAL_ALL_VIEW_ID = 0;

  // 视图列表（不包含虚拟视图）
  const views = ref<ViewConfig[]>([]);
  // 当前视图ID
  const currentViewId = ref<number>(VIRTUAL_ALL_VIEW_ID);
  // 显示的列key列表
  const visibleColumnKeys = ref<string[]>([]);
  // 列固定配置
  const columnFixedMap = ref<Map<string, 'left' | 'right'>>(new Map());
  // 是否已初始化
  const initialized = ref(false);
  // 是否正在加载
  const loading = ref(false);

  function getColumns() {
    return columnsRef();
  }

  // 获取虚拟的"全部"视图
  function getVirtualAllView(): ViewConfig {
    const columns = getColumns();
    const allColumnKeys = columns
      .filter((col) => col.defaultShow !== false && col.key)
      .map((col) => String(col.key));

    const defaultFixed: ColumnFixedConfig[] = [];
    columns.forEach((col) => {
      if (col.fixed && col.key) {
        defaultFixed.push({
          key: String(col.key),
          fixed: col.fixed as 'left' | 'right',
        });
      }
    });

    return {
      id: VIRTUAL_ALL_VIEW_ID,
      name: '全部',
      isDefault: false,
      isSystem: true,
      isVirtual: true,
      columns: allColumnKeys,
      columnFixed: defaultFixed,
    };
  }

  // 包含虚拟视图的完整视图列表（用于下拉显示）
  const allViews = computed(() => {
    return [getVirtualAllView(), ...views.value];
  });

  // 从服务端加载视图配置
  async function loadViews() {
    const columns = getColumns();
    if (!columns.length) return;

    // 先初始化为虚拟视图，确保表格能正常渲染
    visibleColumnKeys.value = getDefaultColumnKeys();
    applyDefaultFixed();

    loading.value = true;
    try {
      const data = await getTableViewsApi(tableKey);
      if (data.views && data.views.length > 0) {
        views.value = data.views.map((v) => ({
          id: v.id,
          name: v.name,
          isSystem: v.isSystem,
          isDefault: v.isDefault,
          columns: v.columns || [],
          columnFixed: v.columnFixed,
          searchParams: v.searchParams,
        }));

        // 查找默认视图，如果有则切换到默认视图，否则切换到虚拟视图
        const defaultView = views.value.find((v) => v.isDefault);
        if (defaultView) {
          currentViewId.value = defaultView.id;
        } else {
          currentViewId.value = VIRTUAL_ALL_VIEW_ID;
        }
        applyCurrentView();
      } else {
        // 没有视图时，使用虚拟视图
        views.value = [];
        currentViewId.value = VIRTUAL_ALL_VIEW_ID;
        applyCurrentView();
      }
    } catch {
      // 加载失败时保持虚拟视图
    } finally {
      loading.value = false;
    }

    initialized.value = true;
  }

  // 应用默认固定配置
  function applyDefaultFixed() {
    const columns = getColumns();
    columnFixedMap.value = new Map();
    columns.forEach((col) => {
      if (col.fixed && col.key) {
        columnFixedMap.value.set(String(col.key), col.fixed as 'left' | 'right');
      }
    });
  }

  // 应用当前视图
  function applyCurrentView() {
    const columns = getColumns();

    // 如果是虚拟视图，重置搜索参数并返回
    if (currentViewId.value === VIRTUAL_ALL_VIEW_ID) {
      visibleColumnKeys.value = getDefaultColumnKeys();
      applyDefaultFixed();
      // 重置所有搜索参数为 undefined
      Object.keys(searchParams.value).forEach((key) => {
        searchParams.value[key] = undefined;
      });
      return;
    }

    const view = views.value.find((v) => v.id === currentViewId.value);

    if (view && view.columns && view.columns.length > 0) {
      const validKeys = view.columns.filter((key) =>
        columns.some((col) => col.key === key),
      );
      visibleColumnKeys.value = validKeys.length
        ? validKeys
        : getDefaultColumnKeys();

      columnFixedMap.value = new Map();
      view.columnFixed?.forEach((f) => {
        if (f.fixed) {
          columnFixedMap.value.set(f.key, f.fixed);
        }
      });

      // 先重置所有搜索参数为 undefined
      Object.keys(searchParams.value).forEach((key) => {
        searchParams.value[key] = undefined;
      });
      // 再应用视图的搜索参数
      if (view.searchParams) {
        Object.keys(view.searchParams).forEach((key) => {
          searchParams.value[key] = view.searchParams![key];
        });
      }
    } else {
      visibleColumnKeys.value = getDefaultColumnKeys();
      applyDefaultFixed();
    }
  }

  function getDefaultColumnKeys() {
    const columns = getColumns();
    return columns
      .filter((col) => col.defaultShow !== false && col.key)
      .map((col) => String(col.key));
  }

  // 切换视图
  function switchView(viewId: number) {
    currentViewId.value = viewId;
    applyCurrentView();
  }

  // 保存视图
  async function saveView(view: ViewConfig) {
    // 保存到服务端
    try {
      const result = await saveTableViewApi({
        id: view.id || undefined,
        tableKey,
        name: view.name,
        isSystem: view.isSystem,
        isDefault: view.isDefault,
        columns: toRaw(view.columns),
        columnFixed: toRaw(view.columnFixed),
        searchParams: view.isDefault ? undefined : toRaw(view.searchParams),
      });

      // 更新本地视图列表
      const existingIndex = views.value.findIndex((v) => v.id === result.id);
      const newView: ViewConfig = {
        id: result.id,
        name: result.name,
        isSystem: result.isSystem,
        isDefault: result.isDefault,
        columns: result.columns,
        columnFixed: result.columnFixed,
        searchParams: result.searchParams,
      };

      if (existingIndex > -1) {
        views.value[existingIndex] = newView;
      } else {
        views.value.push(newView);
      }

      currentViewId.value = result.id;
      visibleColumnKeys.value = [...result.columns];

      columnFixedMap.value = new Map();
      result.columnFixed?.forEach((f) => {
        if (f.fixed) {
          columnFixedMap.value.set(f.key, f.fixed as 'left' | 'right');
        }
      });

      if (result.searchParams) {
        Object.keys(result.searchParams).forEach((key) => {
          searchParams.value[key] = result.searchParams![key];
        });
      }
    } catch (error) {
      console.error('保存视图失败:', error);
      throw error;
    }
  }

  // 删除视图
  async function deleteView(viewId: number) {
    const view = views.value.find((v) => v.id === viewId);
    if (!view || view.isDefault) return;

    try {
      await deleteTableViewApi(viewId);

      const index = views.value.findIndex((v) => v.id === viewId);
      if (index > -1) {
        views.value.splice(index, 1);
      }

      if (currentViewId.value === viewId) {
        currentViewId.value = views.value[0]?.id || 0;
        applyCurrentView();
      }
    } catch (error) {
      console.error('删除视图失败:', error);
      throw error;
    }
  }

  // 批量保存视图
  async function saveViews(newViews: ViewConfig[], deletedIds: number[]) {
    try {
      // 先删除
      for (const id of deletedIds) {
        await deleteTableViewApi(id);
      }

      // 保存/更新所有视图
      const savedViews: ViewConfig[] = [];
      for (const view of newViews) {
        const result = await saveTableViewApi({
          id: view.id > 0 ? view.id : undefined,
          tableKey,
          name: view.name,
          isSystem: view.isSystem,
          isDefault: view.isDefault,
          columns: toRaw(view.columns),
          columnFixed: toRaw(view.columnFixed),
          searchParams: toRaw(view.searchParams),
        });

        savedViews.push({
          id: result.id,
          name: result.name,
          isSystem: result.isSystem,
          isDefault: result.isDefault,
          columns: result.columns,
          columnFixed: result.columnFixed,
          searchParams: result.searchParams,
        });
      }

      views.value = savedViews;

      // 如果当前视图被删除，切换到默认视图或虚拟视图
      if (currentViewId.value !== VIRTUAL_ALL_VIEW_ID && !views.value.find((v) => v.id === currentViewId.value)) {
        const defaultView = views.value.find((v) => v.isDefault);
        currentViewId.value = defaultView?.id || VIRTUAL_ALL_VIEW_ID;
      }
      applyCurrentView();
    } catch (error) {
      console.error('批量保存视图失败:', error);
      throw error;
    }
  }

  // 获取当前固定配置数组
  const currentColumnFixed = computed<ColumnFixedConfig[]>(() => {
    const result: ColumnFixedConfig[] = [];
    columnFixedMap.value.forEach((fixed, key) => {
      result.push({ key, fixed });
    });
    return result;
  });

  // 计算实际显示的列
  const displayColumns = computed(() => {
    const columns = getColumns();
    const allCols = visibleColumnKeys.value
      .map((key) => {
        const col = columns.find((c) => c.key === key);
        if (!col) return null;
        if (col.fixedLock && col.fixed) {
          return { ...col };
        }
        const fixed = columnFixedMap.value.get(key);
        return fixed ? { ...col, fixed } : { ...col, fixed: undefined };
      })
      .filter(Boolean) as ColumnConfig[];

    const leftFixed = allCols.filter((c) => c.fixed === 'left');
    const rightFixed = allCols.filter((c) => c.fixed === 'right');
    const normal = allCols.filter((c) => !c.fixed);

    return [...leftFixed, ...normal, ...rightFixed];
  });

  const currentView = computed(() => {
    if (currentViewId.value === VIRTUAL_ALL_VIEW_ID) {
      return getVirtualAllView();
    }
    return views.value.find((v) => v.id === currentViewId.value);
  });

  return {
    views,
    allViews,
    currentViewId,
    currentView,
    visibleColumnKeys,
    columnFixedMap,
    currentColumnFixed,
    displayColumns,
    initialized,
    loading,
    loadViews,
    switchView,
    saveView,
    saveViews,
    deleteView,
  };
}
