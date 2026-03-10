<script setup lang="ts">
import type { JobLogApi } from '#/api/system/job-log';
import type { ColumnConfig, SearchFieldConfig } from '#/components/search-table';

import { ref } from 'vue';

import { Page } from '#/components/page';

import {
  Button,
  message,
  Modal,
  Popconfirm,
  Space,
  Tag,
  Typography,
} from 'ant-design-vue';

import { cleanJobLogsApi, getJobLogListApi } from '#/api';
import { SearchTable } from '#/components/search-table';

const searchParams = ref<JobLogApi.ListParams>({
  page: 1,
  pageSize: 10,
  jobName: '',
  status: null,
});

const searchFields: SearchFieldConfig[] = [
  { field: 'jobName', label: '任务名称', type: 'input', defaultValue: '' },
  {
    field: 'status',
    label: '执行状态',
    type: 'select',
    defaultValue: null,
    options: [
      { label: '全部', value: null },
      { label: '成功', value: 1 },
      { label: '失败', value: 0 },
    ],
  },
];

const columns: ColumnConfig[] = [
  { title: '任务名称', dataIndex: 'jobName', key: 'jobName', width: 150 },
  {
    title: '处理器',
    dataIndex: 'handlerName',
    key: 'handlerName',
    width: 180,
    ellipsis: true,
  },
  { title: '执行状态', dataIndex: 'status', key: 'status', width: 100 },
  {
    title: '耗时(ms)',
    dataIndex: 'duration',
    key: 'duration',
    width: 100,
  },
  {
    title: '开始时间',
    dataIndex: 'startTime',
    key: 'startTime',
    width: 180,
  },
  {
    title: '结束时间',
    dataIndex: 'endTime',
    key: 'endTime',
    width: 180,
    defaultShow: false,
  },
  {
    title: '错误信息',
    dataIndex: 'errorMessage',
    key: 'errorMessage',
    ellipsis: true,
  },
  {
    title: '操作',
    key: 'action',
    width: 80,
    fixed: 'right' as const,
    fixedLock: true,
  },
];

const tableData = ref<JobLogApi.JobLog[]>([]);
const total = ref(0);
const loading = ref(false);

async function loadData() {
  loading.value = true;
  try {
    const res = await getJobLogListApi(searchParams.value);
    tableData.value = res.list;
    total.value = res.total;
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  searchParams.value.page = 1;
  loadData();
}

function handleReset() {
  loadData();
}

function handlePageChange(page: number, pageSize: number) {
  searchParams.value.page = page;
  searchParams.value.pageSize = pageSize;
  loadData();
}

function handleClean() {
  Modal.confirm({
    title: '确认清空',
    content: '确定要清空所有执行日志吗？此操作不可恢复。',
    okType: 'danger',
    async onOk() {
      await cleanJobLogsApi();
      message.success('清空成功');
      loadData();
    },
  });
}

function showErrorDetail(record: JobLogApi.JobLog) {
  Modal.error({
    title: '错误详情',
    content: record.errorMessage || '无错误信息',
    width: 600,
  });
}

loadData();
</script>

<template>
  <Page auto-content-height>
    <SearchTable
      table-key="system-job-log"
      v-model:search-params="searchParams"
      :search-fields="searchFields"
      :columns="columns"
      :data-source="tableData"
      :loading="loading"
      :total="total"
      :page="searchParams.page"
      :page-size="searchParams.pageSize"
      :show-add-button="false"
      @search="handleSearch"
      @reset="handleReset"
      @page-change="handlePageChange"
    >
      <template #toolbar>
        <Popconfirm title="确定要清空所有日志吗？" @confirm="handleClean">
          <Button danger>清空日志</Button>
        </Popconfirm>
      </template>

      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'status'">
          <Tag v-if="record.status === 1" color="success">成功</Tag>
          <Tag v-else color="error">失败</Tag>
        </template>
        <template v-else-if="column.key === 'duration'">
          <Typography.Text
            :type="record.duration > 5000 ? 'warning' : undefined"
          >
            {{ record.duration }}
          </Typography.Text>
        </template>
        <template v-else-if="column.key === 'action'">
          <Space>
            <Button
              v-if="record.status === 0 && record.errorMessage"
              type="link"
              size="small"
              @click="showErrorDetail(record as JobLogApi.JobLog)"
            >
              详情
            </Button>
          </Space>
        </template>
      </template>
    </SearchTable>
  </Page>
</template>
