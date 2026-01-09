<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  Button,
  message,
  Popconfirm,
  Space,
  Table,
  Tag,
} from 'ant-design-vue';

import type { Execution } from '#/api/execution';

import {
  deleteExecutionApi,
  getExecutionListApi,
  stopExecutionApi,
} from '#/api/execution';
import { useProjectStore } from '#/store/project';

const router = useRouter();
const projectStore = useProjectStore();

const loading = ref(false);
const executions = ref<Execution[]>([]);
const pagination = ref({
  current: 1,
  pageSize: 20,
  total: 0,
});

const statusMap: Record<string, { color: string; text: string }> = {
  pending: { color: 'default', text: '等待中' },
  running: { color: 'processing', text: '执行中' },
  success: { color: 'success', text: '成功' },
  failed: { color: 'error', text: '失败' },
  stopped: { color: 'warning', text: '已停止' },
};

const columns = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
  { title: '工作流', dataIndex: 'workflow_name', key: 'workflow_name' },
  { title: '环境', dataIndex: 'env_name', key: 'env_name', width: 100 },
  { title: '执行机', dataIndex: 'executor_name', key: 'executor_name', width: 120 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 100 },
  { title: '开始时间', dataIndex: 'started_at', key: 'started_at', width: 180 },
  { title: '耗时', dataIndex: 'duration', key: 'duration', width: 100 },
  { title: '操作', key: 'action', width: 180 },
];

const canLoad = computed(() => projectStore.currentProjectId > 0);

watch(
  () => projectStore.currentProjectId,
  async () => {
    if (canLoad.value) {
      pagination.value.current = 1;
      await loadExecutions();
    } else {
      executions.value = [];
    }
  },
  { immediate: true },
);

async function loadExecutions() {
  if (!canLoad.value) return;

  try {
    loading.value = true;
    const result = await getExecutionListApi({
      project_id: projectStore.currentProjectId,
      page: pagination.value.current,
      pageSize: pagination.value.pageSize,
    });
    executions.value = result.list || [];
    pagination.value.total = result.total || 0;
  } catch {
    message.error('加载执行历史失败');
  } finally {
    loading.value = false;
  }
}

function handleTableChange(pag: any) {
  pagination.value.current = pag.current;
  pagination.value.pageSize = pag.pageSize;
  loadExecutions();
}

function goToDetail(id: number) {
  router.push({ name: 'ExecutionDetail', params: { id } });
}

async function handleStop(id: number) {
  try {
    await stopExecutionApi(id);
    message.success('已发送停止请求');
    await loadExecutions();
  } catch {
    message.error('停止执行失败');
  }
}

async function handleDelete(id: number) {
  try {
    await deleteExecutionApi(id);
    message.success('删除成功');
    await loadExecutions();
  } catch {
    message.error('删除失败');
  }
}

function formatDuration(ms: number | undefined): string {
  if (!ms) return '-';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}min`;
}
</script>

<template>
  <Page title="执行历史" description="查看工作流执行记录">
    <div v-if="!canLoad" class="text-center py-8 text-gray-500">
      请先选择项目
    </div>

    <Table
      v-else
      :columns="columns"
      :data-source="executions"
      :loading="loading"
      :pagination="pagination"
      row-key="id"
      @change="handleTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'status'">
          <Tag :color="statusMap[record.status]?.color">
            {{ statusMap[record.status]?.text }}
          </Tag>
        </template>
        <template v-if="column.key === 'duration'">
          {{ formatDuration(record.duration) }}
        </template>
        <template v-if="column.key === 'action'">
          <Space>
            <Button type="link" size="small" @click="goToDetail(record.id)">
              详情
            </Button>
            <Popconfirm
              v-if="record.status === 'running' || record.status === 'pending'"
              title="确定停止执行？"
              @confirm="handleStop(record.id)"
            >
              <Button type="link" size="small" danger>停止</Button>
            </Popconfirm>
            <Popconfirm
              v-if="record.status !== 'running' && record.status !== 'pending'"
              title="确定删除此记录？"
              @confirm="handleDelete(record.id)"
            >
              <Button type="link" size="small" danger>删除</Button>
            </Popconfirm>
          </Space>
        </template>
      </template>
    </Table>
  </Page>
</template>
