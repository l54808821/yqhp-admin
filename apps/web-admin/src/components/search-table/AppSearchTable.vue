<script setup lang="ts">
/**
 * 应用层 SearchTable 包装组件
 * 自动注入 viewApi 和处理 dict 类型搜索字段
 */
import type { ColumnConfig, SearchFieldConfig } from '@vben/common-ui';

import { SearchTable } from '@vben/common-ui';

import { Dict } from '#/components/dict';

import { viewApi } from './viewApi';

interface Props {
  tableKey: string;
  searchFields?: SearchFieldConfig[];
  columns: ColumnConfig[];
  dataSource: any[];
  loading?: boolean;
  total?: number;
  page?: number;
  pageSize?: number;
  rowKey?: string;
  scrollX?: number | string;
  showPagination?: boolean;
  showAdd?: boolean;
  addText?: string;
  useCard?: boolean;
  defaultExpandAllRows?: boolean;
  defaultCollapsedCount?: number;
  allowSystemView?: boolean;
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

defineEmits<{
  search: [];
  reset: [];
  add: [];
  pageChange: [page: number, pageSize: number];
}>();

const searchParams = defineModel<Record<string, any>>('searchParams', {
  default: () => ({}),
});

// 获取 dict 类型的搜索字段
function getDictFields() {
  return props.searchFields?.filter((f) => f.type === 'dict') || [];
}
</script>

<template>
  <SearchTable
    :table-key="tableKey"
    v-model:search-params="searchParams"
    :search-fields="searchFields"
    :columns="columns"
    :data-source="dataSource"
    :loading="loading"
    :total="total"
    :page="page"
    :page-size="pageSize"
    :row-key="rowKey"
    :scroll-x="scrollX"
    :show-pagination="showPagination"
    :show-add="showAdd"
    :add-text="addText"
    :use-card="useCard"
    :default-expand-all-rows="defaultExpandAllRows"
    :default-collapsed-count="defaultCollapsedCount"
    :allow-system-view="allowSystemView"
    :view-api="viewApi"
    @search="$emit('search')"
    @reset="$emit('reset')"
    @add="$emit('add')"
    @page-change="(p, ps) => $emit('pageChange', p, ps)"
  >
    <!-- 自动处理 dict 类型搜索字段 -->
    <template
      v-for="field in getDictFields()"
      :key="field.field"
      #[`search-${field.field}`]="{ onChange }"
    >
      <Dict
        v-model:value="searchParams[field.field]"
        type="select"
        :code="field.dictCode!"
        :placeholder="field.placeholder || `请选择${field.label}`"
        :style="{ width: field.width ? `${field.width}px` : '160px' }"
        @change="onChange"
      />
    </template>

    <!-- 视图管理弹框中的 dict 类型字段 -->
    <template
      v-for="field in getDictFields()"
      :key="`modal-${field.field}`"
      #[`search-field-${field.field}`]="{ value, onChange }"
    >
      <Dict
        :value="value"
        type="select"
        :code="field.dictCode!"
        :placeholder="field.placeholder || `请选择${field.label}`"
        style="width: 100%"
        @update:value="onChange"
      />
    </template>

    <!-- 透传其他插槽 -->
    <template v-if="$slots.search" #search="slotProps">
      <slot name="search" v-bind="slotProps" />
    </template>
    <template v-if="$slots.toolbar" #toolbar>
      <slot name="toolbar" />
    </template>
    <template #bodyCell="slotProps">
      <slot name="bodyCell" v-bind="slotProps" />
    </template>
    <template v-if="$slots.expandedRowRender" #expandedRowRender="slotProps">
      <slot name="expandedRowRender" v-bind="slotProps" />
    </template>
  </SearchTable>
</template>
