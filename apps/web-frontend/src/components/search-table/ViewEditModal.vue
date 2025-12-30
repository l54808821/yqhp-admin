<script setup lang="ts">
import type { ColumnConfig, ColumnFixedConfig, SearchFieldConfig, ViewConfig } from './types';

import { ref, computed, reactive } from 'vue';

import { IconifyIcon } from '@vben/icons';

import {
  Button,
  Checkbox,
  Input,
  Modal,
  Select,
  Space,
  Tabs,
  TabPane,
  Tooltip,
} from 'ant-design-vue';

interface Props {
  columns: ColumnConfig[];
  searchFields?: SearchFieldConfig[];
  // 是否允许创建系统视图
  allowSystemView?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  allowSystemView: false,
});

const emit = defineEmits<{
  confirm: [view: ViewConfig];
}>();

const visible = ref(false);
const activeTab = ref('columns');

// 编辑的视图数据
const editingView = ref<ViewConfig | null>(null);
const isEdit = ref(false);

// 本地列顺序
const localColumnKeys = ref<string[]>([]);
// 本地列固定配置
const localColumnFixed = reactive<Record<string, 'left' | 'right'>>({});
// 本地搜索条件
const localSearchParams = ref<Record<string, any>>({});
// 视图名称
const viewName = ref('');
// 是否系统视图
const isSystemView = ref(false);

// 拖拽相关
const dragIndex = ref<number | null>(null);
const dragGroup = ref<'left' | 'normal' | 'right' | null>(null);

// 所有可配置的列
const allColumns = computed(() => {
  return props.columns.filter((col) => col.key);
});

// 锁定固定的列（不允许修改固定状态）
const lockedFixedKeys = computed(() => {
  return props.columns
    .filter((col) => col.fixedLock && col.key)
    .map((col) => String(col.key));
});

// 判断列是否锁定固定
function isColumnLocked(key: string): boolean {
  return lockedFixedKeys.value.includes(key);
}

// 左侧固定列
const leftFixedColumns = computed(() => {
  return localColumnKeys.value.filter((key) => localColumnFixed[key] === 'left');
});

// 右侧固定列
const rightFixedColumns = computed(() => {
  return localColumnKeys.value.filter((key) => localColumnFixed[key] === 'right');
});

// 普通列（未固定）
const normalColumns = computed(() => {
  return localColumnKeys.value.filter((key) => !localColumnFixed[key]);
});

// 设置列的固定状态
function setColumnFixed(key: string, fixed: 'left' | 'right' | false) {
  if (fixed) {
    localColumnFixed[key] = fixed;
  } else {
    delete localColumnFixed[key];
  }
}

// 清空固定配置
function clearColumnFixed() {
  Object.keys(localColumnFixed).forEach((key) => {
    delete localColumnFixed[key];
  });
}

// 打开弹框 - 新建
function openCreate(
  currentColumns: string[],
  currentFixed: ColumnFixedConfig[],
  currentSearchParams: Record<string, any>,
) {
  isEdit.value = false;
  editingView.value = null;
  viewName.value = '';
  isSystemView.value = false;
  localColumnKeys.value = [...currentColumns];
  clearColumnFixed();
  currentFixed.forEach((f) => {
    if (f.fixed) localColumnFixed[f.key] = f.fixed;
  });
  localSearchParams.value = { ...currentSearchParams };
  activeTab.value = 'columns';
  visible.value = true;
}

// 打开弹框 - 编辑
function openEdit(view: ViewConfig, currentSearchParams: Record<string, any>) {
  isEdit.value = true;
  editingView.value = view;
  viewName.value = view.name;
  isSystemView.value = view.isSystem || false;
  localColumnKeys.value = [...view.columns];
  clearColumnFixed();
  view.columnFixed?.forEach((f) => {
    if (f.fixed) localColumnFixed[f.key] = f.fixed;
  });
  localSearchParams.value = view.searchParams
    ? { ...view.searchParams }
    : { ...currentSearchParams };
  activeTab.value = 'columns';
  visible.value = true;
}

// 关闭弹框
function close() {
  visible.value = false;
}

// 确认
function handleConfirm() {
  if (!editingView.value?.isDefault && !viewName.value.trim()) {
    return;
  }

  const columnFixed: ColumnFixedConfig[] = [];
  Object.entries(localColumnFixed).forEach(([key, fixed]) => {
    if (fixed) {
      columnFixed.push({ key, fixed });
    }
  });

  const view: ViewConfig = {
    id: editingView.value?.id || 0,
    name: editingView.value?.isDefault ? '默认视图' : viewName.value.trim(),
    isSystem: isSystemView.value,
    isDefault: editingView.value?.isDefault,
    columns: [...localColumnKeys.value],
    columnFixed,
    searchParams: editingView.value?.isDefault
      ? undefined
      : { ...localSearchParams.value },
  };

  emit('confirm', view);
  close();
}

// 切换列显示
function toggleColumn(key: string, checked: boolean) {
  if (checked) {
    if (!localColumnKeys.value.includes(key)) {
      const allKeys = allColumns.value.map((c) => String(c.key));
      const targetIndex = allKeys.indexOf(key);
      let insertIndex = localColumnKeys.value.length;

      for (let i = 0; i < localColumnKeys.value.length; i++) {
        const currentIndex = allKeys.indexOf(localColumnKeys.value[i]!);
        if (currentIndex > targetIndex) {
          insertIndex = i;
          break;
        }
      }
      localColumnKeys.value.splice(insertIndex, 0, key);
    }
  } else {
    const index = localColumnKeys.value.indexOf(key);
    if (index > -1) {
      localColumnKeys.value.splice(index, 1);
      delete localColumnFixed[key];
    }
  }
}

// 拖拽 - 支持分组内拖拽
function handleDragStart(index: number, group: 'left' | 'normal' | 'right') {
  dragIndex.value = index;
  dragGroup.value = group;
}

function handleDragEnd() {
  dragIndex.value = null;
  dragGroup.value = null;
}

function handleDrop(targetIndex: number, targetGroup: 'left' | 'normal' | 'right') {
  if (dragIndex.value === null || dragGroup.value === null) return;
  // 只允许同组内拖拽
  if (dragGroup.value !== targetGroup) {
    dragIndex.value = null;
    dragGroup.value = null;
    return;
  }

  // 获取对应分组的列
  let groupColumns: string[];
  if (targetGroup === 'left') {
    groupColumns = leftFixedColumns.value;
  } else if (targetGroup === 'right') {
    groupColumns = rightFixedColumns.value;
  } else {
    groupColumns = normalColumns.value;
  }

  if (dragIndex.value === targetIndex) return;

  const dragKey = groupColumns[dragIndex.value];
  const targetKey = groupColumns[targetIndex];
  if (!dragKey || !targetKey) return;

  // 在 localColumnKeys 中交换位置
  const dragGlobalIndex = localColumnKeys.value.indexOf(dragKey);
  const targetGlobalIndex = localColumnKeys.value.indexOf(targetKey);

  if (dragGlobalIndex > -1 && targetGlobalIndex > -1) {
    localColumnKeys.value.splice(dragGlobalIndex, 1);
    const newTargetIndex = localColumnKeys.value.indexOf(targetKey);
    if (dragGlobalIndex < targetGlobalIndex) {
      localColumnKeys.value.splice(newTargetIndex + 1, 0, dragKey);
    } else {
      localColumnKeys.value.splice(newTargetIndex, 0, dragKey);
    }
  }

  dragIndex.value = null;
  dragGroup.value = null;
}

// 全选列
function selectAllColumns() {
  localColumnKeys.value = allColumns.value.map((col) => String(col.key));
}

// 重置列为默认
function resetColumnsDefault() {
  localColumnKeys.value = allColumns.value
    .filter((col) => col.defaultShow !== false)
    .map((col) => String(col.key));
  clearColumnFixed();
  props.columns.forEach((col) => {
    if (col.fixed && col.key) {
      localColumnFixed[String(col.key)] = col.fixed as 'left' | 'right';
    }
  });
}

// 清空搜索条件
function clearSearchParams() {
  if (props.searchFields) {
    for (const field of props.searchFields) {
      localSearchParams.value[field.field] = field.defaultValue;
    }
  }
}

function getFieldWidth(field: SearchFieldConfig) {
  if (field.width) {
    return typeof field.width === 'number' ? `${field.width}px` : field.width;
  }
  return '100%';
}

const modalTitle = computed(() => {
  if (editingView.value?.isDefault) return '列设置';
  return isEdit.value ? '编辑视图' : '新建视图';
});

const showNameInput = computed(() => !editingView.value?.isDefault);

defineExpose({ openCreate, openEdit, close });
</script>

<template>
  <Modal
    v-model:open="visible"
    :title="modalTitle"
    width="600px"
    @ok="handleConfirm"
  >
    <div class="py-2">
      <!-- 视图名称 -->
      <div v-if="showNameInput" class="mb-4">
        <div class="mb-1 text-gray-600">视图名称</div>
        <Input v-model:value="viewName" placeholder="请输入视图名称" />
      </div>

      <!-- 系统视图选项 -->
      <div v-if="showNameInput && allowSystemView" class="mb-4">
        <Checkbox v-model:checked="isSystemView">
          设为系统视图（所有用户可见）
        </Checkbox>
      </div>

      <Tabs v-model:activeKey="activeTab">
        <!-- 列设置 -->
        <TabPane key="columns" tab="列设置">
          <div class="mb-3 flex justify-between">
            <Space>
              <Button size="small" @click="selectAllColumns">全选</Button>
              <Button size="small" @click="resetColumnsDefault">重置</Button>
            </Space>
            <span class="text-gray-400 text-sm">勾选显示，拖拽排序，图钉固定</span>
          </div>

          <div class="max-h-[55vh] overflow-auto">
            <!-- 左侧固定列 -->
            <div v-if="leftFixedColumns.length" class="mb-3">
              <div class="text-xs text-gray-400 mb-1 px-2">固定在左侧</div>
              <div class="space-y-1">
                <div
                  v-for="(key, index) in leftFixedColumns"
                  :key="key"
                  class="flex items-center gap-2 p-2 bg-blue-50 rounded cursor-move hover:bg-blue-100 border-l-2 border-blue-400"
                  draggable="true"
                  @dragstart="handleDragStart(index, 'left')"
                  @dragend="handleDragEnd"
                  @dragover.prevent
                  @drop="handleDrop(index, 'left')"
                >
                  <IconifyIcon icon="ant-design:holder-outlined" class="text-gray-400 size-4" />
                  <Checkbox
                    :checked="true"
                    class="flex-1"
                    @change="(e: any) => toggleColumn(key, e.target.checked)"
                  >
                    {{ allColumns.find((c) => c.key === key)?.title || key }}
                  </Checkbox>
                  <div v-if="isColumnLocked(key)" class="flex items-center">
                    <Tooltip title="固定位置已锁定">
                      <IconifyIcon icon="ant-design:lock-outlined" class="size-4 text-gray-400" />
                    </Tooltip>
                  </div>
                  <div v-else class="flex items-center gap-1">
                    <Tooltip title="固定在左侧">
                      <div class="cursor-pointer text-blue-500" @click.stop="setColumnFixed(key, false)">
                        <IconifyIcon icon="ant-design:pushpin-filled" class="size-4 rotate-45" />
                      </div>
                    </Tooltip>
                    <Tooltip title="固定在右侧">
                      <div class="cursor-pointer text-gray-400 hover:text-gray-600" @click.stop="setColumnFixed(key, 'right')">
                        <IconifyIcon icon="ant-design:pushpin-filled" class="size-4 -rotate-45" />
                      </div>
                    </Tooltip>
                  </div>
                </div>
              </div>
            </div>

            <!-- 普通列（未固定） -->
            <div class="mb-3">
              <div v-if="leftFixedColumns.length || rightFixedColumns.length" class="text-xs text-gray-400 mb-1 px-2">普通列</div>
              <div class="space-y-1">
                <div
                  v-for="(key, index) in normalColumns"
                  :key="key"
                  class="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-move hover:bg-gray-100"
                  draggable="true"
                  @dragstart="handleDragStart(index, 'normal')"
                  @dragend="handleDragEnd"
                  @dragover.prevent
                  @drop="handleDrop(index, 'normal')"
                >
                  <IconifyIcon icon="ant-design:holder-outlined" class="text-gray-400 size-4" />
                  <Checkbox
                    :checked="true"
                    class="flex-1"
                    @change="(e: any) => toggleColumn(key, e.target.checked)"
                  >
                    {{ allColumns.find((c) => c.key === key)?.title || key }}
                  </Checkbox>
                  <div class="flex items-center gap-1">
                    <Tooltip title="固定在左侧">
                      <div class="cursor-pointer text-gray-400 hover:text-gray-600" @click.stop="setColumnFixed(key, 'left')">
                        <IconifyIcon icon="ant-design:pushpin-filled" class="size-4" />
                      </div>
                    </Tooltip>
                    <Tooltip title="固定在右侧">
                      <div class="cursor-pointer text-gray-400 hover:text-gray-600" @click.stop="setColumnFixed(key, 'right')">
                        <IconifyIcon icon="ant-design:pushpin-filled" class="size-4 -rotate-90" />
                      </div>
                    </Tooltip>
                  </div>
                </div>

                <!-- 未选中的列 -->
                <div
                  v-for="col in allColumns.filter((c) => !localColumnKeys.includes(String(c.key)))"
                  :key="String(col.key)"
                  class="flex items-center gap-2 p-2 rounded hover:bg-gray-50"
                >
                  <IconifyIcon icon="ant-design:holder-outlined" class="text-transparent size-4" />
                  <Checkbox
                    :checked="false"
                    class="flex-1"
                    @change="(e: any) => toggleColumn(String(col.key), e.target.checked)"
                  >
                    {{ col.title }}
                  </Checkbox>
                  <span class="w-9"></span>
                </div>
              </div>
            </div>

            <!-- 右侧固定列 -->
            <div v-if="rightFixedColumns.length">
              <div class="text-xs text-gray-400 mb-1 px-2">固定在右侧</div>
              <div class="space-y-1">
                <div
                  v-for="(key, index) in rightFixedColumns"
                  :key="key"
                  class="flex items-center gap-2 p-2 bg-blue-50 rounded cursor-move hover:bg-blue-100 border-r-2 border-blue-400"
                  draggable="true"
                  @dragstart="handleDragStart(index, 'right')"
                  @dragend="handleDragEnd"
                  @dragover.prevent
                  @drop="handleDrop(index, 'right')"
                >
                  <IconifyIcon icon="ant-design:holder-outlined" class="text-gray-400 size-4" />
                  <Checkbox
                    :checked="true"
                    class="flex-1"
                    @change="(e: any) => toggleColumn(key, e.target.checked)"
                  >
                    {{ allColumns.find((c) => c.key === key)?.title || key }}
                  </Checkbox>
                  <div v-if="isColumnLocked(key)" class="flex items-center">
                    <Tooltip title="固定位置已锁定">
                      <IconifyIcon icon="ant-design:lock-outlined" class="size-4 text-gray-400" />
                    </Tooltip>
                  </div>
                  <div v-else class="flex items-center gap-1">
                    <Tooltip title="固定在左侧">
                      <div class="cursor-pointer text-gray-400 hover:text-gray-600" @click.stop="setColumnFixed(key, 'left')">
                        <IconifyIcon icon="ant-design:pushpin-filled" class="size-4 rotate-45" />
                      </div>
                    </Tooltip>
                    <Tooltip title="固定在右侧">
                      <div class="cursor-pointer text-blue-500" @click.stop="setColumnFixed(key, false)">
                        <IconifyIcon icon="ant-design:pushpin-filled" class="size-4 -rotate-45" />
                      </div>
                    </Tooltip>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabPane>

        <!-- 查询条件 -->
        <TabPane v-if="searchFields?.length && showNameInput" key="search" tab="查询条件">
          <div class="mb-3 flex justify-end">
            <Button size="small" @click="clearSearchParams">清空</Button>
          </div>

          <div class="max-h-[45vh] overflow-auto space-y-3">
            <div
              v-for="field in searchFields"
              :key="field.field"
              class="flex items-center gap-3"
            >
              <span class="w-20 text-gray-600 text-sm text-right flex-shrink-0">
                {{ field.label }}
              </span>
              <div class="flex-1">
                <Input
                  v-if="field.type === 'input'"
                  v-model:value="localSearchParams[field.field]"
                  :placeholder="field.placeholder || `请输入${field.label}`"
                  :style="{ width: getFieldWidth(field) }"
                  allow-clear
                />
                <Select
                  v-else-if="field.type === 'select'"
                  v-model:value="localSearchParams[field.field]"
                  :placeholder="field.placeholder || `请选择${field.label}`"
                  :style="{ width: getFieldWidth(field) }"
                  :options="field.options"
                  allow-clear
                />
              </div>
            </div>
          </div>

          <div class="mt-3 p-3 bg-blue-50 rounded text-sm text-blue-600">
            <IconifyIcon icon="ant-design:info-circle-outlined" class="mr-1 size-4" />
            保存的查询条件会在切换到此视图时自动应用
          </div>
        </TabPane>
      </Tabs>
    </div>
  </Modal>
</template>
