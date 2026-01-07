<script setup lang="ts">
/**
 * 自适应高度表格组件
 * 基于 ant-design-vue Table 封装，自动计算并设置 scroll.y 实现高度自适应
 */
import type { TableProps } from 'ant-design-vue';

import { onMounted, onUnmounted, ref, computed } from 'vue';

import { Table } from 'ant-design-vue';

interface Props {
  // 表格列配置
  columns?: TableProps['columns'];
  // 数据源
  dataSource?: TableProps['dataSource'];
  // 加载状态
  loading?: boolean;
  // 分页配置
  pagination?: TableProps['pagination'];
  // 横向滚动
  scrollX?: number | string;
  // 行键
  rowKey?: TableProps['rowKey'];
  // 表格大小
  size?: TableProps['size'];
  // 默认展开所有行
  defaultExpandAllRows?: boolean;
  // 表头高度（用于计算 scrollY）
  headerHeight?: number;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  scrollX: 'max-content',
  rowKey: 'id',
  size: 'middle',
  defaultExpandAllRows: false,
  headerHeight: 47,
});

// 表格容器引用
const wrapperRef = ref<HTMLElement>();
// 计算的滚动高度
const scrollY = ref<number | undefined>(undefined);

// 更新滚动高度
function updateScrollY() {
  if (!wrapperRef.value) return;
  const height = wrapperRef.value.clientHeight;
  scrollY.value = height > props.headerHeight ? height - props.headerHeight : undefined;
}

// ResizeObserver 监听容器大小变化
let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  if (wrapperRef.value) {
    resizeObserver = new ResizeObserver(updateScrollY);
    resizeObserver.observe(wrapperRef.value);
    // 延迟执行确保布局完成
    setTimeout(updateScrollY, 50);
  }
});

onUnmounted(() => {
  resizeObserver?.disconnect();
});

// 滚动配置
const scrollConfig = computed(() => ({
  x: props.scrollX,
  y: scrollY.value,
}));
</script>

<template>
  <div ref="wrapperRef" class="auto-height-table h-full min-h-0">
    <Table
      :columns="columns"
      :data-source="dataSource"
      :loading="loading"
      :pagination="pagination"
      :scroll="scrollConfig"
      :row-key="rowKey"
      :size="size"
      :default-expand-all-rows="defaultExpandAllRows"
    >
      <template #bodyCell="scope">
        <slot name="bodyCell" v-bind="scope" />
      </template>
      <template v-if="$slots.expandedRowRender" #expandedRowRender="scope">
        <slot name="expandedRowRender" v-bind="scope" />
      </template>
      <template v-if="$slots.summary" #summary>
        <slot name="summary" />
      </template>
    </Table>
  </div>
</template>

<style scoped>
/* 鼠标悬停在表格区域时显示滚动条，使用 overlay 避免挤压内容 */
.auto-height-table :deep(.ant-table-body) {
  overflow-y: scroll !important;
  scrollbar-gutter: stable;
}

/* 默认隐藏滚动条 */
.auto-height-table :deep(.ant-table-body)::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.auto-height-table :deep(.ant-table-body)::-webkit-scrollbar-thumb {
  background-color: transparent;
  border-radius: 4px;
}

.auto-height-table :deep(.ant-table-body)::-webkit-scrollbar-track {
  background-color: transparent;
}

/* 悬停时显示滚动条 */
.auto-height-table:hover :deep(.ant-table-body)::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.2);
}

.auto-height-table:hover :deep(.ant-table-body)::-webkit-scrollbar-thumb:hover {
  background-color: rgba(0, 0, 0, 0.3);
}
</style>
