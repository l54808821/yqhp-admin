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
  // 视图列表
  const views = ref<ViewConfig[]>([]);
  // 当前视图ID
  const currentViewId = ref<number>(0);
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

  // 从服务端加载视图配置
  async function loadViews() {
    const columns = getColumns();
    if (!columns.length) return;

    // 先初始化默认列，确保表格能正常渲染
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
        // 默认选中第一个视图
        currentViewId.value = views.value[0]?.id || 0;
        applyCurrentView();
      } else {
        // 没有视图时初始化默认视图（仅前端使用，不保存）
        initDefaultView();
      }
    } catch {
      initDefaultView();
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

  // 初始化默认视图（前端临时使用）
  function initDefaultView() {
    const columns = getColumns();
    const defaultColumns = columns
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

    views.value = [
      {
        id: 0,
        name: '默认视图',
        isDefault: true,
        columns: defaultColumns,
        columnFixed: defaultFixed,
      },
    ];
    currentViewId.value = 0;
  }

  // 应用当前视图
  function applyCurrentView() {
    const columns = getColumns();
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
    return views.value.find((v) => v.id === currentViewId.value);
  });

  return {
    views,
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
    deleteView,
  };
}
