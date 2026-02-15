import type Sortable from 'sortablejs';

import { nextTick, onUnmounted, ref, watch } from 'vue';

import { message } from 'ant-design-vue';

import type { ConfigItem, ConfigType } from '#/api/env';

import {
  batchUpdateConfigValuesApi,
  deleteConfigDefinitionApi,
  getConfigsApi,
  updateConfigDefinitionApi,
  updateConfigDefinitionSortApi,
} from '#/api/env';

export interface UseConfigTabOptions {
  /** 环境 ID getter */
  envId: () => number;
  /** 项目 ID getter */
  projectId: () => number;
  /** 配置类型 */
  configType: ConfigType;
  /** 获取拖拽排序的容器元素 */
  getSortableElement?: () => HTMLElement | null | undefined;
  /** sortablejs 额外选项（会合并到默认配置上） */
  sortableOptions?: Record<string, any>;
  /** 加载失败时的错误提示 */
  loadErrorMessage?: string;
  /** 环境切换时的回调（在 loadConfigs 之前执行，可用于关闭弹窗等） */
  onEnvChange?: () => void;
}

/**
 * 配置 Tab 公共逻辑
 *
 * 提取了以下共享逻辑：
 * - 配置列表的加载（loadConfigs）
 * - 拖拽排序（initSortable / handleSortEnd / destroySortable）
 * - 删除配置定义（removeConfig）
 * - 配置定义变更检测与保存（saveDefinitionChanges）
 * - 配置值批量保存（batchSaveValues）
 * - 完整保存：定义 + 值（saveAll）
 * - 本地名称更新（setName）
 */
export function useConfigTab(options: UseConfigTabOptions) {
  const {
    configType,
    getSortableElement,
    sortableOptions = {},
    loadErrorMessage = '加载配置失败',
    onEnvChange,
  } = options;

  // ==================== 状态 ====================

  const loading = ref(false);
  const configs = ref<ConfigItem[]>([]);
  /** 原始数据快照，用于检测配置定义（名称/状态）是否变更 */
  const originalConfigs = ref<ConfigItem[]>([]);
  let sortableInstance: Sortable | null = null;

  // ==================== 环境监听 ====================

  watch(
    options.envId,
    async () => {
      onEnvChange?.();
      await loadConfigs();
    },
    { immediate: true },
  );

  // ==================== 数据加载 ====================

  /** 从 API 加载配置列表 */
  async function loadConfigs() {
    try {
      loading.value = true;
      const data = await getConfigsApi(options.envId(), configType);
      configs.value = data || [];
      originalConfigs.value = JSON.parse(JSON.stringify(data || []));
      await nextTick();
      if (getSortableElement) {
        await initSortable();
      }
    } catch {
      message.error(loadErrorMessage);
    } finally {
      loading.value = false;
    }
  }

  // ==================== 拖拽排序 ====================

  /** 初始化拖拽排序 */
  async function initSortable() {
    destroySortable();

    const element = getSortableElement?.();
    if (!element) return;

    const SortableModule = await import('sortablejs');
    const SortableClass = SortableModule.default;

    sortableInstance = SortableClass.create(element, {
      animation: 200,
      handle: '.drag-handle',
      ...sortableOptions,
      onEnd: handleSortEnd,
    });
  }

  /** 处理拖拽排序结束 */
  async function handleSortEnd(event: {
    oldIndex?: number;
    newIndex?: number;
  }) {
    const { oldIndex, newIndex } = event;
    if (
      oldIndex === undefined ||
      newIndex === undefined ||
      oldIndex === newIndex
    ) {
      return;
    }

    const draggedConfig = configs.value[oldIndex];
    if (!draggedConfig) return;

    const targetConfig = configs.value[newIndex]!;
    const position = newIndex > oldIndex ? 'after' : 'before';

    try {
      await updateConfigDefinitionSortApi(options.projectId(), configType, {
        code: draggedConfig.code,
        target_code: targetConfig.code,
        position,
      });
      await loadConfigs();
    } catch {
      message.error('排序更新失败');
      await loadConfigs();
    }
  }

  /** 销毁拖拽排序实例 */
  function destroySortable() {
    if (sortableInstance) {
      sortableInstance.destroy();
      sortableInstance = null;
    }
  }

  onUnmounted(destroySortable);

  // ==================== 增删操作 ====================

  /** 删除配置定义（项目级别，所有环境都会删除） */
  async function removeConfig(config: Record<string, any>) {
    try {
      await deleteConfigDefinitionApi(options.projectId(), config.code);
      message.success('删除成功');
      await loadConfigs();
    } catch (error: any) {
      message.error(error?.message || '删除失败');
    }
  }

  // ==================== 保存逻辑 ====================

  /**
   * 保存配置定义的变更（名称、状态等项目级别属性）
   * 通过对比 originalConfigs 检测哪些项有变化
   */
  async function saveDefinitionChanges() {
    const promises = configs.value
      .filter((c) => {
        const original = originalConfigs.value.find(
          (o) => o.code === c.code,
        );
        return (
          original &&
          (original.name !== c.name || original.status !== c.status)
        );
      })
      .map((c) => {
        const original = originalConfigs.value.find(
          (o) => o.code === c.code,
        )!;
        const params: Record<string, any> = {};
        if (original.name !== c.name) params.name = c.name;
        if (original.status !== c.status) params.status = c.status;
        return updateConfigDefinitionApi(options.projectId(), c.code, params);
      });

    if (promises.length > 0) {
      await Promise.all(promises);
    }
  }

  /** 批量保存配置值（环境级别） */
  async function batchSaveValues() {
    const items = configs.value.map((c) => ({
      code: c.code,
      value: c.value || {},
    }));
    await batchUpdateConfigValuesApi(options.envId(), { items });
  }

  /**
   * 完整保存：配置定义变更 + 配置值
   * @param emitUpdated 保存成功后的回调（通常用于 emit('updated')）
   */
  async function saveAll(emitUpdated?: () => void) {
    try {
      await saveDefinitionChanges();
      await batchSaveValues();
      // 更新原始数据快照
      originalConfigs.value = JSON.parse(JSON.stringify(configs.value));
      message.success('保存成功');
      emitUpdated?.();
    } catch (error: any) {
      message.error(error?.message || '保存失败');
    }
  }

  // ==================== 工具方法 ====================

  /** 设置配置项名称（仅本地更新，需调用 saveAll 持久化） */
  function setName(config: any, value: string) {
    config.name = value;
  }

  return {
    // 状态
    loading,
    configs,
    originalConfigs,
    // 数据操作
    loadConfigs,
    removeConfig,
    // 拖拽排序
    initSortable,
    destroySortable,
    // 保存
    saveDefinitionChanges,
    batchSaveValues,
    saveAll,
    // 工具
    setName,
  };
}
