<script setup lang="ts">
import type { JobApi } from '#/api/system/job';
import type { ColumnConfig, SearchFieldConfig } from '#/components/search-table';

import { ref } from 'vue';

import { UserDisplay } from '@vben/common-ui';

import { Page } from '#/components/page';

import {
  Button,
  message,
  Popconfirm,
  Space,
  Switch,
  Tag,
} from 'ant-design-vue';

import {
  changeJobStatusApi,
  deleteJobApi,
  getJobListApi,
  runJobOnceApi,
} from '#/api';
import { SearchTable } from '#/components/search-table';

import JobFormModal from './components/JobFormModal.vue';
import JobLogDrawer from './components/JobLogDrawer.vue';

const searchParams = ref<JobApi.ListParams>({
  page: 1,
  pageSize: 10,
  name: '',
  jobGroup: '',
  status: null,
});

const searchFields: SearchFieldConfig[] = [
  { field: 'name', label: '任务名称', type: 'input', defaultValue: '' },
  { field: 'jobGroup', label: '任务分组', type: 'input', defaultValue: '' },
  {
    field: 'status',
    label: '状态',
    type: 'select',
    defaultValue: null,
    options: [
      { label: '全部', value: null },
      { label: '运行中', value: 1 },
      { label: '已暂停', value: 0 },
    ],
  },
];

const columns: ColumnConfig[] = [
  { title: '任务名称', dataIndex: 'name', key: 'name', width: 150 },
  { title: '任务分组', dataIndex: 'jobGroup', key: 'jobGroup', width: 120 },
  {
    title: '处理器',
    dataIndex: 'handlerName',
    key: 'handlerName',
    width: 180,
    ellipsis: true,
  },
  {
    title: 'Cron表达式',
    dataIndex: 'cronExpression',
    key: 'cronExpression',
    width: 140,
  },
  { title: '状态', dataIndex: 'status', key: 'status', width: 100 },
  {
    title: '备注',
    dataIndex: 'remark',
    key: 'remark',
    ellipsis: true,
    defaultShow: false,
  },
  {
    title: '创建人',
    dataIndex: 'createdBy',
    key: 'createdBy',
    width: 120,
  },
  {
    title: '创建时间',
    dataIndex: 'createdAt',
    key: 'createdAt',
    width: 180,
  },
  {
    title: '操作',
    key: 'action',
    width: 260,
    fixed: 'right' as const,
    fixedLock: true,
  },
];

const tableData = ref<JobApi.Job[]>([]);
const total = ref(0);
const loading = ref(false);

const jobFormModalRef = ref<InstanceType<typeof JobFormModal>>();
const jobLogDrawerRef = ref<InstanceType<typeof JobLogDrawer>>();

async function loadData() {
  loading.value = true;
  try {
    const res = await getJobListApi(searchParams.value);
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

function handleAdd() {
  jobFormModalRef.value?.open();
}

function handleEdit(record: JobApi.Job) {
  jobFormModalRef.value?.open(record.id);
}

async function handleDelete(id: number) {
  await deleteJobApi(id);
  message.success('删除成功');
  loadData();
}

async function handleStatusChange(record: JobApi.Job, checked: boolean) {
  const newStatus = checked ? 1 : 0;
  await changeJobStatusApi(record.id, { status: newStatus });
  message.success(checked ? '已启动' : '已暂停');
  loadData();
}

async function handleRunOnce(record: JobApi.Job) {
  await runJobOnceApi(record.id);
  message.success('已触发执行');
}

function handleViewLog(record: JobApi.Job) {
  jobLogDrawerRef.value?.open(record);
}

loadData();
</script>

<template>
  <Page auto-content-height>
    <SearchTable
      table-key="system-job"
      v-model:search-params="searchParams"
      :search-fields="searchFields"
      :columns="columns"
      :data-source="tableData"
      :loading="loading"
      :total="total"
      :page="searchParams.page"
      :page-size="searchParams.pageSize"
      @search="handleSearch"
      @reset="handleReset"
      @add="handleAdd"
      @page-change="handlePageChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'status'">
          <Switch
            :checked="record.status === 1"
            checked-children="运行"
            un-checked-children="暂停"
            @change="(checked: boolean) => handleStatusChange(record as JobApi.Job, checked)"
          />
        </template>
        <template v-else-if="column.key === 'jobGroup'">
          <Tag v-if="record.jobGroup" color="blue">{{ record.jobGroup }}</Tag>
          <span v-else>-</span>
        </template>
        <template v-else-if="column.key === 'createdBy'">
          <UserDisplay :user-id="record.createdBy" />
        </template>
        <template v-else-if="column.key === 'action'">
          <Space>
            <Button
              type="link"
              size="small"
              @click="handleEdit(record as JobApi.Job)"
            >
              编辑
            </Button>
            <Button
              type="link"
              size="small"
              @click="handleViewLog(record as JobApi.Job)"
            >
              日志
            </Button>
            <Popconfirm
              title="确定立即执行一次？"
              @confirm="handleRunOnce(record as JobApi.Job)"
            >
              <Button type="link" size="small">执行</Button>
            </Popconfirm>
            <Popconfirm
              title="确定删除吗？"
              @confirm="handleDelete(record.id)"
            >
              <Button type="link" size="small" danger>删除</Button>
            </Popconfirm>
          </Space>
        </template>
      </template>
    </SearchTable>

    <JobFormModal ref="jobFormModalRef" @success="loadData" />
    <JobLogDrawer ref="jobLogDrawerRef" />
  </Page>
</template>
