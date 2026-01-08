<script setup lang="ts">
import type { ColumnConfig, SearchFieldConfig, ViewApi } from './types';

import { computed, ref, watch } from 'vue';

import { IconifyIcon } from '@vben/icons';

import {
  Button,
  Card,
  Dropdown,
  Input,
  Menu,
  MenuItem,
  Select,
  Space,
} from 'ant-design-vue';

import AutoHeightTable from './AutoHeightTable.vue';
import { useView } from './useView';
import ViewManagerModal from './ViewManagerModal.vue';

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
  // 视图 API（可选，不提供则禁用视图功能）
  viewApi?: ViewApi;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  total: 0,
  page: 1,
  pageSize: 10,
  rowKey: 'id',
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
  allViews,
  currentViewId,
  currentView,
  displayColumns,
  initialized,
  viewEnabled,
  loadViews,
  switchView,
} = useView(props.tableKey, () => props.columns, searchParams, props.viewApi);

// 视图管理弹框
const viewManagerModalRef = ref<InstanceType<typeof ViewManagerModal>>();

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

// 监听视图切换，触发搜索
watch(currentViewId, (newId, oldId) => {
  if (initialized.value && oldId !== undefined && newId !== oldId) {
    emit('search');
  }
});

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

// 计算 scrollX：如果有列同时设置了 width 和 ellipsis，则使用列宽总和，否则使用传入值或 max-content
const computedScrollX = computed(() => {
  // 如果用户明确传入了 scrollX，使用传入值
  if (props.scrollX !== undefined) {
    return props.scrollX;
  }
  // 检查是否有列同时设置了 width 和 ellipsis
  const hasEllipsisWithWidth = displayColumns.value.some(
    (col) => col.ellipsis && col.width,
  );
  if (hasEllipsisWithWidth) {
    // 计算所有列宽总和，让 ellipsis 生效
    return displayColumns.value.reduce((sum, col) => {
      const width = typeof col.width === 'number' ? col.width : 100;
      return sum + width;
    }, 0);
  }
  // 默认使用 max-content
  return 'max-content';
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

// 打开视图管理弹框
function openViewManager() {
  viewManagerModalRef.value?.open(views.value, searchParams.value);
}

// 视图管理保存完成
function handleViewManagerSaved() {
  loadViews();
}

// 默认视图变更（实时生效）
function handleDefaultChange() {
  loadViews();
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
  <component
    :is="useCard ? Card : 'div'"
    class="flex h-full flex-col overflow-hidden"
    :body-style="
      useCard
        ? {
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden',
            padding: '16px',
          }
        : undefined
    "
  >
    <!-- 搜索区域 -->
    <div
      v-if="searchFields?.length || $slots.search"
      class="mb-4 flex-shrink-0"
    >
      <div class="flex flex-wrap items-center gap-4">
        <!-- 配置的搜索字段 -->
        <template v-if="searchFields?.length">
          <div
            v-for="field in visibleSearchFields"
            :key="field.field"
            class="flex items-center gap-2"
          >
            <span class="whitespace-nowrap text-sm text-gray-600">{{
              field.label
            }}</span>
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
            <!-- Dict 类型通过插槽渲染 -->
            <slot
              v-else-if="field.type === 'dict'"
              :name="`search-${field.field}`"
              :field="field"
              :on-change="handleSelectChange"
            />
            <!-- 自定义插槽 -->
            <slot
              v-else-if="field.type === 'custom'"
              :name="`search-${field.field}`"
              :field="field"
              :on-change="handleSelectChange"
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
            <IconifyIcon
              v-if="searchExpanded"
              icon="ant-design:up-outlined"
              class="ml-1 size-3"
            />
            <IconifyIcon
              v-else
              icon="ant-design:down-outlined"
              class="ml-1 size-3"
            />
          </Button>
        </Space>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="mb-3 flex flex-shrink-0 items-center justify-between">
      <Space>
        <Button v-if="showAdd" type="primary" @click="handleAdd">
          {{ addText }}
        </Button>
        <slot name="toolbar" />
      </Space>

      <Space class="ml-auto">
        <!-- 视图切换（仅在启用视图功能时显示） -->
        <Dropdown v-if="viewEnabled">
          <div
            class="inline-flex cursor-pointer items-center text-gray-600 hover:text-blue-500"
          >
            <IconifyIcon icon="ant-design:eye-outlined" class="mr-1 size-4" />
            <span class="mr-1 text-gray-500">视图</span>
            <span class="font-medium text-blue-500">{{
              currentView?.name || '全部'
            }}</span>
            <IconifyIcon icon="ant-design:down-outlined" class="ml-1 size-3" />
          </div>
          <template #overlay>
            <Menu class="min-w-[160px]">
              <!-- 系统视图分组 -->
              <div class="px-3 py-1.5 text-xs text-gray-400">系统视图</div>
              <MenuItem
                v-for="view in allViews.filter(
                  (v) => v.isVirtual || v.isSystem,
                )"
                :key="view.id"
              >
                <div
                  class="flex items-center justify-between"
                  :class="{ 'text-blue-500': view.id === currentViewId }"
                  @click="switchView(view.id)"
                >
                  <span>{{ view.name }}</span>
                  <IconifyIcon
                    v-if="view.isDefault"
                    icon="ant-design:check-outlined"
                    class="size-4 text-green-500"
                  />
                </div>
              </MenuItem>

              <!-- 个人视图分组 -->
              <template
                v-if="
                  allViews.filter((v) => !v.isVirtual && !v.isSystem).length > 0
                "
              >
                <Menu.Divider />
                <div class="px-3 py-1.5 text-xs text-gray-400">个人视图</div>
                <MenuItem
                  v-for="view in allViews.filter(
                    (v) => !v.isVirtual && !v.isSystem,
                  )"
                  :key="view.id"
                >
                  <div
                    class="flex items-center justify-between"
                    :class="{ 'text-blue-500': view.id === currentViewId }"
                    @click="switchView(view.id)"
                  >
                    <span>{{ view.name }}</span>
                    <IconifyIcon
                      v-if="view.isDefault"
                      icon="ant-design:check-outlined"
                      class="size-4 text-green-500"
                    />
                  </div>
                </MenuItem>
              </template>

              <!-- 配置个人视图 -->
              <Menu.Divider />
              <MenuItem key="__manage__" @click="openViewManager">
                <span class="inline-flex items-center text-gray-600">
                  <IconifyIcon
                    icon="ant-design:setting-outlined"
                    class="mr-2 size-4"
                  />
                  配置个人视图
                </span>
              </MenuItem>
            </Menu>
          </template>
        </Dropdown>
      </Space>
    </div>

    <!-- 表格 -->
    <div class="min-h-0 flex-1 overflow-hidden">
      <AutoHeightTable
        :columns="displayColumns"
        :data-source="dataSource"
        :loading="loading"
        :pagination="paginationConfig"
        :scroll-x="computedScrollX"
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

    <!-- 视图管理弹框 -->
    <ViewManagerModal
      v-if="viewEnabled"
      ref="viewManagerModalRef"
      :table-key="tableKey"
      :columns="columns"
      :search-fields="searchFields"
      :allow-system-view="allowSystemView"
      :view-api="viewApi"
      @saved="handleViewManagerSaved"
      @default-change="handleDefaultChange"
    >
      <template
        v-for="field in searchFields"
        :key="field.field"
        #[`search-field-${field.field}`]="slotProps"
      >
        <slot :name="`search-field-${field.field}`" v-bind="slotProps" />
      </template>
    </ViewManagerModal>
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
