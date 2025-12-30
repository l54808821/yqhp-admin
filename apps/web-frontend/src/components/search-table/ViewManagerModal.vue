<script setup lang="ts">
import type { ColumnConfig, ColumnFixedConfig, SearchFieldConfig, ViewConfig } from './types';

import { ref, computed } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { Checkbox, Input, Modal, Tabs, TabPane, message } from 'ant-design-vue';

import { deleteTableViewApi, saveTableViewApi, setDefaultViewApi, updateViewSortApi } from '#/api/system/table-view';

import ViewColumnEditor from './ViewColumnEditor.vue';
import ViewList from './ViewList.vue';
import ViewSearchEditor from './ViewSearchEditor.vue';

interface Props {
  tableKey: string;
  columns: ColumnConfig[];
  searchFields?: SearchFieldConfig[];
  allowSystemView?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  allowSystemView: false,
});

const emit = defineEmits<{
  saved: [];
  defaultChange: [];
}>();

const visible = ref(false);
const activeTab = ref('search');

// 本地视图列表（编辑中的副本）
const localViews = ref<ViewConfig[]>([]);
// 当前选中的视图ID
const selectedViewId = ref<number | null>(null);
// 新建视图的临时ID计数器
let tempIdCounter = -1;
// 标记哪些视图被修改过
const modifiedViewIds = ref<Set<number>>(new Set());

// 当前选中的视图
const selectedView = computed(() => {
  return localViews.value.find((v) => v.id === selectedViewId.value);
});

// 当前视图的列配置
const currentColumns = computed({
  get: () => selectedView.value?.columns || [],
  set: (val) => {
    if (selectedView.value) {
      // 比较是否真的有变化
      const oldVal = selectedView.value.columns;
      if (JSON.stringify(oldVal) !== JSON.stringify(val)) {
        selectedView.value.columns = val;
        modifiedViewIds.value.add(selectedView.value.id);
      }
    }
  },
});

// 当前视图的固定配置
const currentColumnFixed = computed({
  get: () => selectedView.value?.columnFixed || [],
  set: (val) => {
    if (selectedView.value) {
      // 比较是否真的有变化
      const oldVal = selectedView.value.columnFixed;
      if (JSON.stringify(oldVal) !== JSON.stringify(val)) {
        selectedView.value.columnFixed = val;
        modifiedViewIds.value.add(selectedView.value.id);
      }
    }
  },
});

// 当前视图的搜索参数
const currentSearchParams = computed({
  get: () => selectedView.value?.searchParams || {},
  set: (val) => {
    if (selectedView.value) {
      // 比较是否真的有变化
      const oldVal = selectedView.value.searchParams;
      if (JSON.stringify(oldVal) !== JSON.stringify(val)) {
        selectedView.value.searchParams = val;
        modifiedViewIds.value.add(selectedView.value.id);
      }
    }
  },
});

// 是否显示搜索条件tab（只要有searchFields配置且选中了视图就显示）
const showSearchTab = computed(() => {
  return !!props.searchFields?.length && selectedView.value;
});

// 打开弹框
function open(views: ViewConfig[], currentSearchParams: Record<string, any>) {
  // 深拷贝视图列表（过滤掉虚拟视图）
  localViews.value = views
    .filter((v) => !v.isVirtual)
    .map((v) => ({
      ...v,
      columns: [...v.columns],
      columnFixed: v.columnFixed ? [...v.columnFixed] : [],
      searchParams: v.searchParams ? { ...v.searchParams } : { ...currentSearchParams },
    }));
  tempIdCounter = -1;
  modifiedViewIds.value = new Set();

  // 默认选中第一个视图，如果没有则为null
  selectedViewId.value = localViews.value[0]?.id ?? null;
  activeTab.value = props.searchFields?.length ? 'search' : 'columns';
  visible.value = true;
}

// 关闭弹框
function close() {
  visible.value = false;
}

// 取消（需要重新加载以恢复状态）
function handleCancel() {
  close();
  // 如果有未保存的修改，通知外部重新加载
  if (modifiedViewIds.value.size > 0 || localViews.value.some((v) => v.id < 0)) {
    emit('saved');
  }
}

// 选择视图
function handleSelectView(id: number) {
  selectedViewId.value = id;
}

// 是否有未保存的新视图
const hasUnsavedView = computed(() => {
  return localViews.value.some((v) => v.id < 0);
});

// 新建视图
function handleAddView() {
  // 如果已有未保存的视图，不允许再新建
  if (hasUnsavedView.value) {
    message.warning('请先保存当前新建的视图');
    return;
  }

  const defaultColumns = props.columns
    .filter((col) => col.defaultShow !== false && col.key)
    .map((col) => String(col.key));

  const defaultFixed: ColumnFixedConfig[] = [];
  props.columns.forEach((col) => {
    if (col.fixed && col.key) {
      defaultFixed.push({ key: String(col.key), fixed: col.fixed as 'left' | 'right' });
    }
  });

  const newView: ViewConfig = {
    id: tempIdCounter--,
    name: `新视图 ${localViews.value.length + 1}`,
    isSystem: false,
    isDefault: false,
    columns: defaultColumns,
    columnFixed: defaultFixed,
    searchParams: {},
  };

  localViews.value.push(newView);
  selectedViewId.value = newView.id;
}

// 删除视图（实时删除）
async function handleDeleteView(id: number) {
  const view = localViews.value.find((v) => v.id === id);
  if (!view) return;

  // 如果是已保存的视图，调用删除 API
  if (id > 0) {
    try {
      await deleteTableViewApi(id);
      message.success('删除成功');
    } catch (error) {
      message.error('删除失败');
      return;
    }
  }

  const index = localViews.value.findIndex((v) => v.id === id);
  localViews.value.splice(index, 1);

  // 如果删除的是当前选中的，选中第一个
  if (selectedViewId.value === id) {
    selectedViewId.value = localViews.value[0]?.id ?? null;
  }

  emit('saved');
}

// 更新视图名称
function handleUpdateName(id: number, name: string) {
  const view = localViews.value.find((v) => v.id === id);
  if (view) {
    view.name = name;
    modifiedViewIds.value.add(id);
  }
}

// 更新系统视图状态
function handleUpdateSystem(id: number, isSystem: boolean) {
  const view = localViews.value.find((v) => v.id === id);
  if (view) {
    view.isSystem = isSystem;
    modifiedViewIds.value.add(id);
  }
}

// 视图排序（实时保存）
async function handleReorder(fromIndex: number, toIndex: number) {
  const item = localViews.value.splice(fromIndex, 1)[0];
  if (item) {
    localViews.value.splice(toIndex, 0, item);
  }

  // 只对已保存的视图调用排序 API
  const savedViewIds = localViews.value.filter((v) => v.id > 0).map((v) => v.id);
  if (savedViewIds.length > 0) {
    try {
      await updateViewSortApi(props.tableKey, savedViewIds);
    } catch (error) {
      message.error('排序保存失败');
    }
  }
}

// 设置默认视图（实时保存）
async function handleSetDefault(id: number, isDefault: boolean) {
  const view = localViews.value.find((v) => v.id === id);
  if (!view) return;

  // 只有已保存的视图才能设为默认
  if (id < 0) {
    message.warning('请先保存视图后再设为默认');
    return;
  }

  try {
    if (isDefault) {
      // 调用 API 设置默认视图
      await setDefaultViewApi(props.tableKey, id);
      // 更新本地状态
      localViews.value.forEach((v) => {
        v.isDefault = v.id === id;
      });
      emit('defaultChange');
    } else {
      // 取消默认：设置 viewId 为 0 表示清除默认
      await setDefaultViewApi(props.tableKey, 0);
      // 更新本地状态
      localViews.value.forEach((v) => {
        v.isDefault = false;
      });
      emit('defaultChange');
    }
    message.success(isDefault ? '已设为默认视图' : '已取消默认视图');
  } catch (error) {
    message.error('操作失败');
  }
}

// 确认保存
async function handleConfirm() {
  // 验证
  for (const view of localViews.value) {
    if (!view.name.trim()) {
      message.error('视图名称不能为空');
      selectedViewId.value = view.id;
      return;
    }
    if (view.columns.length === 0) {
      message.error(`视图"${view.name}"至少需要选择一列`);
      selectedViewId.value = view.id;
      return;
    }
  }

  // 找出需要保存的视图：新建的（id < 0）或被修改的
  const viewsToSave = localViews.value.filter(
    (v) => v.id < 0 || modifiedViewIds.value.has(v.id),
  );

  if (viewsToSave.length === 0) {
    close();
    return;
  }

  try {
    for (const view of viewsToSave) {
      await saveTableViewApi({
        id: view.id > 0 ? view.id : undefined,
        tableKey: props.tableKey,
        name: view.name,
        isSystem: view.isSystem,
        isDefault: view.isDefault,
        columns: view.columns,
        columnFixed: view.columnFixed,
        searchParams: view.searchParams,
      });
    }
    message.success('保存成功');
    emit('saved');
    close();
  } catch (error) {
    message.error('保存失败');
  }
}

defineExpose({ open, close });
</script>

<template>
  <Modal
    v-model:open="visible"
    title="配置个人视图"
    width="900px"
    :body-style="{ padding: 0 }"
    @ok="handleConfirm"
    @cancel="handleCancel"
  >
    <div class="flex h-[60vh]">
      <!-- 左侧视图列表 -->
      <div class="w-56 border-r p-4 flex-shrink-0">
        <ViewList
          :views="localViews"
          :selected-id="selectedViewId"
          :allow-system-view="allowSystemView"
          @select="handleSelectView"
          @add="handleAddView"
          @delete="handleDeleteView"
          @set-default="handleSetDefault"
          @reorder="handleReorder"
        />
      </div>

      <!-- 右侧编辑区域 -->
      <div class="flex-1 px-4 flex flex-col min-w-0 overflow-hidden">
        <template v-if="selectedView">
          <!-- 视图名称 -->
          <div class="py-3 border-b flex-shrink-0">
            <div class="flex items-center gap-3">
              <span class="text-gray-600 text-sm flex-shrink-0">视图名称</span>
              <Input
                :value="selectedView.name"
                placeholder="请输入视图名称"
                class="flex-1"
                @change="(e: any) => handleUpdateName(selectedView!.id, e.target.value)"
              />
              <span v-if="selectedView.id < 0" class="text-xs text-orange-500 flex-shrink-0">[未保存]</span>
            </div>
          </div>

          <!-- 系统视图选项 -->
          <div v-if="allowSystemView" class="py-2 flex-shrink-0">
            <Checkbox
              :checked="selectedView.isSystem"
              @change="(e: any) => handleUpdateSystem(selectedView!.id, e.target.checked)"
            >
              设为系统视图（所有用户可见）
            </Checkbox>
          </div>

          <Tabs v-model:activeKey="activeTab" class="flex-1 flex flex-col min-h-0">
            <TabPane v-if="showSearchTab" key="search" tab="查询条件" class="flex-1 overflow-hidden">
              <ViewSearchEditor
                v-model:search-params="currentSearchParams"
                :search-fields="searchFields!"
              />
            </TabPane>

            <TabPane key="columns" tab="列设置" class="flex-1 overflow-hidden">
              <ViewColumnEditor
                v-model:selected-keys="currentColumns"
                v-model:column-fixed="currentColumnFixed"
                :columns="columns"
              />
            </TabPane>
          </Tabs>
        </template>

        <div v-else class="flex-1 flex items-center justify-center text-gray-400">
          <div class="text-center">
            <IconifyIcon icon="ant-design:inbox-outlined" class="size-12 mb-2" />
            <p>请选择或新建一个视图</p>
          </div>
        </div>
      </div>
    </div>
  </Modal>
</template>

<style scoped>
:deep(.ant-tabs) {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

:deep(.ant-tabs-content-holder) {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

:deep(.ant-tabs-content) {
  height: 100%;
}

:deep(.ant-tabs-tabpane) {
  height: 100%;
  overflow: hidden;
}
</style>
