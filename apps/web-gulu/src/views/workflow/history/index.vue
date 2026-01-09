<script setup lang="ts">
import type { Execution, ExecutionListParams } from '#/api/execution';
import type { ColumnConfig, SearchFieldConfig } from '#/components/search-table';

import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '#/components/page';

import {
  Button,
  message,
  Popconfirm,
  Space,
  Tag,
} from 'ant-design-vue';

import {
  getExecutionListApi,
  stopExecutionApi,
} from '#/api/execution';
import { SearchTable } from '#/components/search-table';
import { useProjectStore } from '#/store/project';

const router = useRouter();
const projectStore = useProjectStore();

// 状态映射
const statusMap: Record<string, { color: string; text: string }> = {
  pending: { color: 'default', text: '等待中' },
  running: { color: 'processing', text: '执行中' },
  completed: { color: 'success', text: '成功' },
  failed: { color: 'error', text: '失败' },
  stopped: { color: 'warning', text: '已停止' },
  paused: { color: 'orange', text: '已暂停' },
};

// 搜索参数
const searchParams = ref<ExecutionListParams>({
  page: 1,
  pageSize: 10,
  project_id: projectStore.currentProjectId,
  workflow_id: undefined,
  status: undefined,
});

// 搜索字段配置
const searchFields: SearchFieldConfig[] = [
  { field: 'workflow_id', label: '工作流ID', type: 'input', defaultValue: undefined },
  {
    field: 'status',
    label: '状态',
    type: 'select',
    width: 120,
    defaultValue: undefined,
    options: [
      { label: '全部', value: '' },
      { label: '等待中', value: 'pending' },
      { label: '执行中', value: 'running' },
      { label: '成功', value: 'completed' },
      { label: '失败', value: 'failed' },
      { label: '已停止', value: 'stopped' },
      { label: '已暂停', value: 'paused' },
    ],
  },
];

// 表格列配置
const columns: ColumnConfig[] = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
  { title: '执行ID', dataIndex: 'execution_id', key: 'execution_id', width: 240 },
  { title: '工作流ID', dataIndex: 'workflow_id', key: 'workflow_id', width: 100 },
  { title: '环境ID', dataIndex: 'env_id', key: 'env_id', width: 80 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 100 },
  { title: '开始时间', dataIndex: 'start_time', key: 'start_time', width: 180 },
  { title: '结束时间', dataIndex: 'end_time', key: 'end_time', width: 180, defaultShow: false },
  { title: '耗时', dataIndex: 'duration', key: 'duration', width: 100 },
  { title: '操作', key: 'action', width: 150, fixed: 'right' as const, fixedLock: true },
];

// 表格数据
const tableData = ref<Execution[]>([]);
const total = ref(0);
const loading = ref(false);

// 监听项目变化
watch(
  () => projectStore.currentProjectId,
  (newVal) => {
    searchParams.value.project_id = newVal;
    if (newVal > 0) {
      loadData();
    } else {
      tableData.value = [];
      total.value = 0;
    }
  },
  { immediate: true },
);

// 加载数据
async function loadData() {
  if (!projectStore.currentProjectId) return;

  loading.value = true;
  try {
    const res = await getExecutionListApi(searchParams.value);
    tableData.value = res.list || [];
    total.value = res.total || 0;
  } catch {
    message.error('加载执行历史失败');
  } finally {
    loading.value = false;
  }
}

// 搜索
function handleSearch() {
  searchParams.value.page = 1;
  loadData();
}

// 重置
function handleReset() {
  loadData();
}

// 分页变化
function handlePageChange(page: number, pageSize: number) {
  searchParams.value.page = page;
  searchParams.value.pageSize = pageSize;
  loadData();
}

// 查看详情
function handleDetail(record: Execution) {
  router.push({
    name: 'ExecutionDetail',
    params: { executionId: String(record.id) }
  });
}

// 停止执行
async function handleStop(id: number) {
  try {
    await stopExecutionApi(id);
    message.success('已发送停止请求');
    loadData();
  } catch {
    message.error('停止执行失败');
  }
}

// 格式化耗时
function formatDuration(ms: number | null | undefined): string {
  if (!ms) return '-';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}min`;
}

// 格式化时间
function formatTime(time: string | null | undefined): string {
  if (!time) return '-';
  return new Date(time).toLocaleString('zh-CN');
}
</script>

<template>
  <Page auto-content-height>
    <div v-if="!projectStore.currentProjectId" class="text-center py-8 text-gray-500">
      请先选择项目
    </div>

    <SearchTable
      v-else
      table-key="execution-history"
      v-model:search-params="searchParams"
      :search-fields="searchFields"
      :columns="columns"
      :data-source="tableData"
      :loading="loading"
      :total="total"
      :page="searchParams.page"
      :page-size="searchParams.pageSize"
      :show-add="false"
      @search="handleSearch"
      @reset="handleReset"
      @page-change="handlePageChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'status'">
          <Tag :color="statusMap[record.status]?.color || 'default'">
            {{ statusMap[record.status]?.text || record.status }}
          </Tag>
        </template>
        <template v-else-if="column.key === 'start_time'">
          {{ formatTime(record.start_time) }}
        </template>
        <template v-else-if="column.key === 'end_time'">
          {{ formatTime(record.end_time) }}
        </template>
        <template v-else-if="column.key === 'duration'">
          {{ formatDuration(record.duration) }}
        </template>
        <template v-else-if="column.key === 'action'">
          <Space>
            <Button type="link" size="small" @click="handleDetail(record as Execution)">
              详情
            </Button>
            <Popconfirm
              v-if="record.status === 'running' || record.status === 'pending'"
              title="确定停止执行？"
              @confirm="handleStop(record.id)"
            >
              <Button type="link" size="small" danger>停止</Button>
            </Popconfirm>
          </Space>
        </template>
      </template>
    </SearchTable>
  </Page>
</template>
