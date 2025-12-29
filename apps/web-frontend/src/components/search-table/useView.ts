import type { Ref } from 'vue';

import type { ColumnConfig, ColumnFixedConfig, ViewConfig } from './types';

import { computed, ref, toRaw } from 'vue';

const STORAGE_PREFIX = 'search-table-view:';

export function useView(
  tableKey: string,
  columnsRef: () => ColumnConfig[],
  searchParams: Ref<Record<string, any>>,
) {
  // 视图列表
  const views = ref<ViewConfig[]>([]);
  // 当前视图ID
  const currentViewId = ref<string>('default');
  // 显示的列key列表
  const visibleColumnKeys = ref<string[]>([]);
  // 列固定配置
  const columnFixedMap = ref<Map<string, 'left' | 'right'>>(new Map());
  // 是否已初始化
  const initialized = ref(false);

  function getColumns() {
    return columnsRef();
  }

  // 从localStorage加载视图配置
  function loadViews() {
    const columns = getColumns();
    if (!columns.length) return;

    const stored = localStorage.getItem(`${STORAGE_PREFIX}${tableKey}`);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        views.value = data.views || [];
        currentViewId.value = data.currentViewId || 'default';

        if (!views.value.find((v) => v.id === 'default')) {
          initDefaultView();
        }
      } catch {
        initDefaultView();
      }
    } else {
      initDefaultView();
    }
    applyCurrentView();
    initialized.value = true;
  }

  // 初始化默认视图
  function initDefaultView() {
    const columns = getColumns();
    const defaultColumns = columns
      .filter((col) => col.defaultShow !== false && col.key)
      .map((col) => String(col.key));

    // 获取默认固定配置
    const defaultFixed: ColumnFixedConfig[] = [];
    columns.forEach((col) => {
      if (col.fixed && col.key) {
        defaultFixed.push({
          key: String(col.key),
          fixed: col.fixed as 'left' | 'right',
        });
      }
    });

    const existingDefault = views.value.find((v) => v.id === 'default');
    if (existingDefault) {
      existingDefault.columns = defaultColumns;
      existingDefault.columnFixed = defaultFixed;
    } else {
      views.value.unshift({
        id: 'default',
        name: '默认视图',
        isDefault: true,
        columns: defaultColumns,
        columnFixed: defaultFixed,
      });
    }
    currentViewId.value = 'default';
  }

  // 保存视图配置到localStorage
  function saveToStorage() {
    localStorage.setItem(
      `${STORAGE_PREFIX}${tableKey}`,
      JSON.stringify({
        views: toRaw(views.value),
        currentViewId: currentViewId.value,
      }),
    );
  }

  // 应用当前视图
  function applyCurrentView() {
    const columns = getColumns();
    const view = views.value.find((v) => v.id === currentViewId.value);

    if (view) {
      // 过滤掉不存在的列
      const validKeys = view.columns.filter((key) =>
        columns.some((col) => col.key === key),
      );
      visibleColumnKeys.value = validKeys.length ? validKeys : getDefaultColumnKeys();

      // 应用固定配置
      columnFixedMap.value = new Map();
      view.columnFixed?.forEach((f) => {
        if (f.fixed) {
          columnFixedMap.value.set(f.key, f.fixed);
        }
      });

      // 恢复搜索条件
      if (view.searchParams) {
        Object.keys(view.searchParams).forEach((key) => {
          searchParams.value[key] = view.searchParams![key];
        });
      }
    } else {
      visibleColumnKeys.value = getDefaultColumnKeys();
      columnFixedMap.value = new Map();
    }
  }

  function getDefaultColumnKeys() {
    const columns = getColumns();
    return columns
      .filter((col) => col.defaultShow !== false && col.key)
      .map((col) => String(col.key));
  }

  // 切换视图
  function switchView(viewId: string) {
    if (viewId === '__new__') return;
    currentViewId.value = viewId;
    applyCurrentView();
    saveToStorage();
  }

  // 保存视图
  function saveView(view: ViewConfig) {
    const existingIndex = views.value.findIndex((v) => v.id === view.id);

    if (existingIndex > -1) {
      views.value[existingIndex] = { ...view };
    } else {
      views.value.push(view);
    }

    currentViewId.value = view.id;
    visibleColumnKeys.value = [...view.columns];

    // 应用固定配置
    columnFixedMap.value = new Map();
    view.columnFixed?.forEach((f) => {
      if (f.fixed) {
        columnFixedMap.value.set(f.key, f.fixed);
      }
    });

    // 应用搜索条件
    if (view.searchParams) {
      Object.keys(view.searchParams).forEach((key) => {
        searchParams.value[key] = view.searchParams![key];
      });
    }

    saveToStorage();
  }

  // 删除视图
  function deleteView(viewId: string) {
    const index = views.value.findIndex((v) => v.id === viewId);
    if (index > -1 && !views.value[index]?.isDefault) {
      views.value.splice(index, 1);
      if (currentViewId.value === viewId) {
        currentViewId.value = 'default';
        applyCurrentView();
      }
      saveToStorage();
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

  // 计算实际显示的列（带固定属性，按固定位置排序）
  const displayColumns = computed(() => {
    const columns = getColumns();
    const allCols = visibleColumnKeys.value
      .map((key) => {
        const col = columns.find((c) => c.key === key);
        if (!col) return null;
        // 如果列设置了 fixedLock，强制使用原始 fixed 值
        if (col.fixedLock && col.fixed) {
          return { ...col };
        }
        const fixed = columnFixedMap.value.get(key);
        return fixed ? { ...col, fixed } : { ...col, fixed: undefined };
      })
      .filter(Boolean) as ColumnConfig[];

    // 分组：左侧固定、普通列、右侧固定
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
    loadViews,
    switchView,
    saveView,
    deleteView,
  };
}
