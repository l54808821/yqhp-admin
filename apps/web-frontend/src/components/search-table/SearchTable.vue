<script setup lang="ts">
import type { ColumnConfig, SearchFieldConfig, ViewConfig } from './types';

import { computed, ref, watch } from 'vue';

import { IconifyIcon } from '@vben/icons';

import {
  Button,
  Card,
  Dropdown,
  Input,
  Menu,
  MenuItem,
  Modal,
  Select,
  Space,
} from 'ant-design-vue';

import { Dict } from '#/components/dict';
import { AutoHeightTable } from '#/components/table';

import { useView } from './useView';
import ViewEditModal from './ViewEditModal.vue';

// 组件属性
interface Props {
  // 唯一标识（用于存储视图配置）
  tableKey: string;
  // 搜索字段配置
  searchFields?: SearchFieldConfig[];
  // 表格列配置
  columns: ColumnConfig[];
  // 数据源
  dataSource: any[];
  // 加载状态
  loading?: boolean;
  // 总数
  total?: number;
  // 当前页
  page?: number;
  // 每页条数
  pageSize?: number;
  // 行键
  rowKey?: string;
  // 横向滚动宽度
  scrollX?: number | string;
  // 是否显示分页
  showPagination?: boolean;
  // 是否显示新增按钮
  showAdd?: boolean;
  // 新增按钮文字
  addText?: string;
  // 是否使用卡片包裹
  useCard?: boolean;
  // 默认展开所有行（树形表格）
  defaultExpandAllRows?: boolean;
  // 默认折叠搜索区域显示的字段数
  defaultCollapsedCount?: number;
  // 是否允许创建系统视图
  allowSystemView?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  total: 0,
  page: 1,
  pageSize: 10,
  rowKey: 'id',
  scrollX: 'max-content',
  showPagination: true,
  showAdd: true,
  addText: '新增',
  useCard: true,
  defaultExpandAllRows: false,
  defaultCollapsedCount: 3,
  allowSystemView: false,
});

const emit = defineEmits<{
  search: [];
  reset: [];
  add: [];
  pageChange: [page: number, pageSize: number];
}>();

// 搜索参数
const searchParams = defineModel<Record<string, any>>('searchParams', {
  default: () => ({}),
});

// 搜索区域展开状态
const searchExpanded = ref(false);

// 视图管理
const {
  views,
  currentViewId,
  currentView,
  visibleColumnKeys,
  currentColumnFixed,
  displayColumns,
  initialized,
  loadViews,
  switchView,
  saveView,
  deleteView,
} = useView(props.tableKey, () => props.columns, searchParams);

// 视图编辑弹框
const viewEditModalRef = ref<InstanceType<typeof ViewEditModal>>();

// 监听 columns 变化，初始化视图
watch(
  () => props.columns,
  (cols) => {
    if (cols.length && !initialized.value) {
      loadViews();
    }
  },
  { immediate: true },
);

// 计算显示的搜索字段
const visibleSearchFields = computed(() => {
  if (!props.searchFields) return [];
  if (searchExpanded.value) return props.searchFields;
  return props.searchFields.slice(0, props.defaultCollapsedCount);
});

// 是否有更多搜索字段
const hasMoreFields = computed(() => {
  return (props.searchFields?.length || 0) > props.defaultCollapsedCount;
});

// 分页配置
const paginationConfig = computed(() => {
  if (!props.showPagination) return false;
  return {
    current: props.page,
    pageSize: props.pageSize,
    total: props.total,
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: (t: number) => `共 ${t} 条`,
    onChange: handlePageChange,
  };
});

// 分页变化
function handlePageChange(page: number, pageSize: number) {
  emit('pageChange', page, pageSize);
}

// 搜索
function handleSearch() {
  emit('search');
}

// 防抖搜索（用于输入框）
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
function handleInputChange() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    emit('search');
  }, 300);
}

// 立即搜索（用于下拉框等）
function handleSelectChange() {
  emit('search');
}

// 重置
function handleReset() {
  if (props.searchFields) {
    for (const field of props.searchFields) {
      searchParams.value[field.field] = field.defaultValue;
    }
  }
  emit('reset');
}

// 新增
function handleAdd() {
  emit('add');
}

// 切换搜索展开
function toggleSearchExpand() {
  searchExpanded.value = !searchExpanded.value;
}

// 打开列设置（编辑当前视图）
function openColumnSetting() {
  if (currentView.value) {
    viewEditModalRef.value?.openEdit(currentView.value, searchParams.value);
  }
}

// 打开新建视图弹框
function openNewViewModal() {
  viewEditModalRef.value?.openCreate(
    visibleColumnKeys.value,
    currentColumnFixed.value,
    searchParams.value,
  );
}

// 视图编辑确认
function handleViewConfirm(view: ViewConfig) {
  saveView(view);
}

// 删除视图确认
function handleDeleteView(viewId: number) {
  Modal.confirm({
    title: '确认删除',
    content: '确定要删除该视图吗？',
    onOk: () => deleteView(viewId),
  });
}

// 获取搜索字段宽度
function getFieldWidth(field: SearchFieldConfig) {
  if (field.width) {
    return typeof field.width === 'number' ? `${field.width}px` : field.width;
  }
  return '160px';
}
</script>

<template>
  <component :is="useCard ? Card : 'div'" class="flex flex-col h-full overflow-hidden" :body-style="useCard ? { display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', padding: '16px' } : undefined">
    <!-- 搜索区域 -->
    <div v-if="searchFields?.length || $slots.search" class="mb-4 flex-shrink-0">
      <div class="flex flex-wrap items-center gap-4">
        <!-- 配置的搜索字段 -->
        <template v-if="searchFields?.length">
          <div
            v-for="field in visibleSearchFields"
            :key="field.field"
            class="flex items-center gap-2"
          >
            <span class="text-gray-600 text-sm whitespace-nowrap">{{ field.label }}</span>
            <!-- Input -->
            <Input
              v-if="field.type === 'input'"
              v-model:value="searchParams[field.field]"
              :placeholder="field.placeholder || `请输入${field.label}`"
              :style="{ width: getFieldWidth(field) }"
              allow-clear
              @input="handleInputChange"
              @pressEnter="handleSearch"
            />
            <!-- Select -->
            <Select
              v-else-if="field.type === 'select'"
              v-model:value="searchParams[field.field]"
              :placeholder="field.placeholder || `请选择${field.label}`"
              :style="{ width: getFieldWidth(field) }"
              :options="field.options"
              allow-clear
              @change="handleSelectChange"
            />
            <!-- Dict -->
            <Dict
              v-else-if="field.type === 'dict'"
              v-model:value="searchParams[field.field]"
              type="select"
              :code="field.dictCode!"
              :placeholder="field.placeholder || `请选择${field.label}`"
              :style="{ width: getFieldWidth(field) }"
              @change="handleSelectChange"
            />
            <!-- 自定义插槽 -->
            <slot
              v-else-if="field.type === 'custom'"
              :name="`search-${field.field}`"
              :field="field"
            />
          </div>
        </template>

        <!-- 自定义搜索插槽 -->
        <slot name="search" :on-change="handleSelectChange" />

        <!-- 操作按钮 -->
        <Space>
          <Button type="primary" @click="handleSearch">搜索</Button>
          <Button @click="handleReset">重置</Button>
          <Button
            v-if="hasMoreFields"
            type="link"
            class="px-0"
            @click="toggleSearchExpand"
          >
            {{ searchExpanded ? '收起' : '展开' }}
            <IconifyIcon v-if="searchExpanded" icon="ant-design:up-outlined" class="ml-1 size-3" />
            <IconifyIcon v-else icon="ant-design:down-outlined" class="ml-1 size-3" />
          </Button>
        </Space>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="mb-3 flex items-center justify-between flex-shrink-0">
      <Space>
        <Button v-if="showAdd" type="primary" @click="handleAdd">
          {{ addText }}
        </Button>
        <slot name="toolbar" />
      </Space>

      <Space class="ml-auto">
        <!-- 视图切换 -->
        <Dropdown>
          <Button class="inline-flex items-center">
            {{ currentView?.name || '默认视图' }}
            <IconifyIcon icon="ant-design:down-outlined" class="ml-1 size-3" />
          </Button>
          <template #overlay>
            <Menu>
              <MenuItem
                v-for="view in views"
                :key="view.id"
              >
                <div class="flex items-center justify-between min-w-[140px]">
                  <span
                    class="flex-1 cursor-pointer"
                    :class="{ 'text-blue-500': view.id === currentViewId }"
                    @click="switchView(view.id)"
                  >
                    {{ view.name }}
                    <span v-if="view.isSystem" class="ml-1 text-xs text-orange-500">[系统]</span>
                  </span>
                  <Space :size="4">
                    <IconifyIcon
                      v-if="!view.isDefault"
                      icon="ant-design:delete-outlined"
                      class="size-4 text-gray-400 hover:text-red-500 cursor-pointer"
                      @click.stop="handleDeleteView(view.id)"
                    />
                  </Space>
                </div>
              </MenuItem>
              <Menu.Divider />
              <MenuItem key="__new__" @click="openNewViewModal">
                <span class="inline-flex items-center">
                  <IconifyIcon icon="ant-design:plus-outlined" class="mr-1 size-4" />
                  新建视图
                </span>
              </MenuItem>
            </Menu>
          </template>
        </Dropdown>

        <!-- 列设置 -->
        <Button class="inline-flex items-center" @click="openColumnSetting">
          <IconifyIcon icon="ant-design:setting-outlined" class="size-4 mr-1" />
          列设置
        </Button>
      </Space>
    </div>

    <!-- 表格 -->
    <div class="flex-1 min-h-0 overflow-hidden">
      <AutoHeightTable
        :columns="displayColumns"
        :data-source="dataSource"
        :loading="loading"
        :pagination="paginationConfig"
        :scroll-x="scrollX"
        :row-key="rowKey"
        :default-expand-all-rows="defaultExpandAllRows"
      >
        <template #bodyCell="scope">
          <slot name="bodyCell" v-bind="scope" />
        </template>
        <template v-if="$slots.expandedRowRender" #expandedRowRender="scope">
          <slot name="expandedRowRender" v-bind="scope" />
        </template>
      </AutoHeightTable>
    </div>

    <!-- 视图编辑弹框 -->
    <ViewEditModal
      ref="viewEditModalRef"
      :columns="columns"
      :search-fields="searchFields"
      :allow-system-view="allowSystemView"
      @confirm="handleViewConfirm"
    />
  </component>
</template>


<style scoped>
/* 确保 Card 组件能正确限制高度 */
:deep(.ant-card) {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

:deep(.ant-card-body) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>
