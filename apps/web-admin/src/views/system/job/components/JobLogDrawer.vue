<script setup lang="ts">
import type { JobLogApi } from '#/api/system/job-log';
import type { JobApi } from '#/api/system/job';

import { ref, watch } from 'vue';

import {
  Button,
  Drawer,
  Modal,
  Pagination,
  Space,
  Table,
  Tag,
  Typography,
} from 'ant-design-vue';

import { cleanJobLogsApi, getJobLogListApi } from '#/api';

const visible = ref(false);
const loading = ref(false);
const currentJob = ref<JobApi.Job | null>(null);

const tableData = ref<JobLogApi.JobLog[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);

const columns = [
  { title: '执行状态', dataIndex: 'status', key: 'status', width: 90 },
  { title: '耗时(ms)', dataIndex: 'duration', key: 'duration', width: 90 },
  { title: '开始时间', dataIndex: 'startTime', key: 'startTime', width: 170 },
  {
    title: '错误信息',
    dataIndex: 'errorMessage',
    key: 'errorMessage',
    ellipsis: true,
  },
  { title: '操作', key: 'action', width: 70 },
];

async function loadData() {
  if (!currentJob.value) return;
  loading.value = true;
  try {
    const res = await getJobLogListApi({
      jobId: currentJob.value.id,
      page: page.value,
      pageSize: pageSize.value,
    });
    tableData.value = res.list;
    total.value = res.total;
  } finally {
    loading.value = false;
  }
}

function open(job: JobApi.Job) {
  currentJob.value = job;
  page.value = 1;
  visible.value = true;
}

function handlePageChange(p: number, ps: number) {
  page.value = p;
  pageSize.value = ps;
  loadData();
}

function handleClean() {
  if (!currentJob.value) return;
  const jobId = currentJob.value.id;
  Modal.confirm({
    title: '确认清空',
    content: `确定要清空「${currentJob.value.name}」的所有执行日志吗？`,
    okType: 'danger',
    async onOk() {
      await cleanJobLogsApi(jobId);
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

watch(visible, (val) => {
  if (val) loadData();
});

defineExpose({ open });
</script>

<template>
  <Drawer
    v-model:open="visible"
    :title="`执行日志 - ${currentJob?.name || ''}`"
    width="700px"
    :destroy-on-close="true"
  >
    <template #extra>
      <Button size="small" danger @click="handleClean">清空日志</Button>
    </template>

    <Table
      :columns="columns"
      :data-source="tableData"
      :loading="loading"
      :pagination="false"
      size="small"
      row-key="id"
    >
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
          <Button
            v-if="record.status === 0 && record.errorMessage"
            type="link"
            size="small"
            @click="showErrorDetail(record as JobLogApi.JobLog)"
          >
            详情
          </Button>
        </template>
      </template>
    </Table>

    <div
      v-if="total > 0"
      style="display: flex; justify-content: flex-end; margin-top: 16px"
    >
      <Pagination
        :current="page"
        :page-size="pageSize"
        :total="total"
        size="small"
        show-size-changer
        @change="handlePageChange"
      />
    </div>
  </Drawer>
</template>
