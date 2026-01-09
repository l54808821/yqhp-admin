<script setup lang="ts">
import type { Executor, ExecutorListParams } from '#/api/executor';
import type { ColumnConfig, SearchFieldConfig } from '#/components/search-table';

import { ref } from 'vue';

import { Page } from '#/components/page';

import {
  Badge,
  Button,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Tag,
} from 'ant-design-vue';

import {
  createExecutorApi,
  deleteExecutorApi,
  getExecutorListApi,
  syncExecutorsApi,
  updateExecutorApi,
  updateExecutorStatusApi,
} from '#/api/executor';
import { SearchTable } from '#/components/search-table';

// 搜索参数
const searchParams = ref<ExecutorListParams>({
  page: 1,
  pageSize: 10,
  name: undefined,
  type: undefined,
  status: undefined,
});

// 搜索字段配置
const searchFields: SearchFieldConfig[] = [
  { field: 'name', label: '名称', type: 'input', defaultValue: undefined },
  {
    field: 'type',
    label: '类型',
    type: 'select',
    width: 120,
    defaultValue: undefined,
    options: [
      { label: '全部', value: '' },
      { label: '普通', value: 'normal' },
      { label: '压测专用', value: 'performance' },
      { label: '调试专用', value: 'debug' },
    ],
  },
  {
    field: 'status',
    label: '状态',
    type: 'select',
    width: 100,
    defaultValue: undefined,
    options: [
      { label: '全部', value: '' },
      { label: '启用', value: 1 },
      { label: '禁用', value: 0 },
    ],
  },
];

// 表格列配置
const columns: ColumnConfig[] = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
  { title: '名称', dataIndex: 'name', key: 'name', width: 150 },
  { title: 'Slave ID', dataIndex: 'slave_id', key: 'slave_id', width: 180 },
  { title: '类型', dataIndex: 'type', key: 'type', width: 100 },
  { title: '运行状态', dataIndex: 'state', key: 'state', width: 100 },
  { title: '负载', dataIndex: 'load', key: 'load', width: 80 },
  { title: '最大VU', dataIndex: 'max_vus', key: 'max_vus', width: 80, defaultShow: false },
  { title: '优先级', dataIndex: 'priority', key: 'priority', width: 80 },
  { title: '启用', dataIndex: 'status', key: 'status', width: 80 },
  { title: '最后心跳', dataIndex: 'last_seen', key: 'last_seen', width: 180, defaultShow: false },
  { title: '操作', key: 'action', width: 150, fixed: 'right' as const, fixedLock: true },
];

// 表格数据
const tableData = ref<Executor[]>([]);
const total = ref(0);
const loading = ref(false);
const syncLoading = ref(false);

// 弹框状态
const modalVisible = ref(false);
const modalTitle = ref('新增执行机');
const editingId = ref<number | null>(null);

const formState = ref({
  slave_id: '',
  name: '',
  type: 'normal',
  description: '',
  labels: {} as Record<string, string>,
  max_vus: 0,
  priority: 0,
  status: 1,
});

const labelInput = ref({ key: '', value: '' });

const typeOptions = [
  { label: '普通', value: 'normal' },
  { label: '压测专用', value: 'performance' },
  { label: '调试专用', value: 'debug' },
];

// 加载数据
async function loadData() {
  loading.value = true;
  try {
    const res = await getExecutorListApi(searchParams.value);
    tableData.value = res.list || [];
    total.value = res.total || 0;
  } catch {
    message.error('加载执行机列表失败');
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

// 同步执行机
async function handleSync() {
  try {
    syncLoading.value = true;
    const result = await syncExecutorsApi();
    message.success(`同步完成，新增 ${result.synced_count} 台执行机`);
    await loadData();
  } catch {
    message.error('同步失败');
  } finally {
    syncLoading.value = false;
  }
}

// 新增
function handleAdd() {
  modalTitle.value = '新增执行机';
  editingId.value = null;
  formState.value = {
    slave_id: '',
    name: '',
    type: 'normal',
    description: '',
    labels: {},
    max_vus: 0,
    priority: 0,
    status: 1,
  };
  modalVisible.value = true;
}

// 编辑
function handleEdit(record: Executor) {
  modalTitle.value = '编辑执行机';
  editingId.value = record.id;
  formState.value = {
    slave_id: record.slave_id,
    name: record.name,
    type: record.type,
    description: record.description || '',
    labels: record.labels || {},
    max_vus: record.max_vus || 0,
    priority: record.priority || 0,
    status: record.status,
  };
  modalVisible.value = true;
}

// 提交表单
async function handleSubmit() {
  try {
    if (editingId.value) {
      await updateExecutorApi(editingId.value, {
        name: formState.value.name,
        type: formState.value.type,
        description: formState.value.description,
        labels: formState.value.labels,
        max_vus: formState.value.max_vus,
        priority: formState.value.priority,
        status: formState.value.status,
      });
      message.success('更新成功');
    } else {
      await createExecutorApi({
        slave_id: formState.value.slave_id,
        name: formState.value.name,
        type: formState.value.type,
        description: formState.value.description,
        labels: formState.value.labels,
        max_vus: formState.value.max_vus,
        priority: formState.value.priority,
        status: formState.value.status,
      });
      message.success('创建成功');
    }
    modalVisible.value = false;
    await loadData();
  } catch {
    message.error('操作失败');
  }
}

// 删除
async function handleDelete(id: number) {
  try {
    await deleteExecutorApi(id);
    message.success('删除成功');
    await loadData();
  } catch {
    message.error('删除失败');
  }
}

// 状态变更
async function handleStatusChange(id: number, checked: boolean | string | number) {
  try {
    const status = checked ? 1 : 0;
    await updateExecutorStatusApi(id, status);
    message.success('状态更新成功');
    await loadData();
  } catch {
    message.error('状态更新失败');
  }
}

// 添加标签
function addLabel() {
  if (labelInput.value.key && labelInput.value.value) {
    formState.value.labels[labelInput.value.key] = labelInput.value.value;
    labelInput.value = { key: '', value: '' };
  }
}

// 移除标签
function removeLabel(key: string) {
  delete formState.value.labels[key];
}

// 获取运行状态颜色
function getStateColor(state?: string) {
  switch (state) {
    case 'online':
      return 'success';
    case 'busy':
      return 'processing';
    case 'draining':
      return 'warning';
    default:
      return 'error';
  }
}

// 获取运行状态文本
function getStateText(state?: string) {
  switch (state) {
    case 'online':
      return '在线';
    case 'busy':
      return '繁忙';
    case 'draining':
      return '下线中';
    default:
      return '离线';
  }
}

// 获取类型颜色
function getTypeColor(type: string) {
  switch (type) {
    case 'performance':
      return 'red';
    case 'debug':
      return 'blue';
    default:
      return 'default';
  }
}

// 获取类型文本
function getTypeText(type: string) {
  switch (type) {
    case 'performance':
      return '压测专用';
    case 'debug':
      return '调试专用';
    default:
      return '普通';
  }
}

// 格式化时间
function formatTime(time: string | null | undefined): string {
  if (!time) return '-';
  return new Date(time).toLocaleString('zh-CN');
}

// 初始化
loadData();
</script>

<template>
  <Page auto-content-height>
    <SearchTable
      table-key="executor-management"
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
      <!-- 额外按钮 -->
      <template #toolbar>
        <Button :loading="syncLoading" @click="handleSync">
          同步执行机
        </Button>
      </template>

      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'type'">
          <Tag :color="getTypeColor(record.type)">
            {{ getTypeText(record.type) }}
          </Tag>
        </template>
        <template v-else-if="column.key === 'state'">
          <Badge :status="getStateColor(record.state)" :text="getStateText(record.state)" />
        </template>
        <template v-else-if="column.key === 'load'">
          {{ record.load ? `${(record.load * 100).toFixed(0)}%` : '-' }}
        </template>
        <template v-else-if="column.key === 'status'">
          <Switch
            :checked="record.status === 1"
            size="small"
            @change="(checked: any) => handleStatusChange(record.id, checked)"
          />
        </template>
        <template v-else-if="column.key === 'last_seen'">
          {{ formatTime(record.last_seen) }}
        </template>
        <template v-else-if="column.key === 'action'">
          <Space>
            <Button type="link" size="small" @click="handleEdit(record as Executor)">
              编辑
            </Button>
            <Popconfirm title="确定删除此执行机？" @confirm="handleDelete(record.id)">
              <Button type="link" size="small" danger>删除</Button>
            </Popconfirm>
          </Space>
        </template>
      </template>
    </SearchTable>

    <!-- 新增/编辑弹框 -->
    <Modal
      v-model:open="modalVisible"
      :title="modalTitle"
      width="600px"
      @ok="handleSubmit"
    >
      <Form :model="formState" layout="vertical">
        <Form.Item v-if="!editingId" label="Slave ID" required>
          <Input
            v-model:value="formState.slave_id"
            placeholder="请输入 Slave ID"
          />
        </Form.Item>
        <Form.Item label="名称" required>
          <Input
            v-model:value="formState.name"
            placeholder="请输入执行机名称"
          />
        </Form.Item>
        <Form.Item label="类型" required>
          <Select v-model:value="formState.type" :options="typeOptions" />
        </Form.Item>
        <Form.Item label="最大虚拟用户数">
          <InputNumber
            v-model:value="formState.max_vus"
            :min="0"
            style="width: 100%"
          />
        </Form.Item>
        <Form.Item label="优先级">
          <InputNumber
            v-model:value="formState.priority"
            :min="0"
            style="width: 100%"
          />
        </Form.Item>
        <Form.Item label="标签">
          <div class="mb-2">
            <Tag
              v-for="(value, key) in formState.labels"
              :key="key"
              closable
              @close="removeLabel(key as string)"
            >
              {{ key }}={{ value }}
            </Tag>
          </div>
          <Space>
            <Input
              v-model:value="labelInput.key"
              placeholder="Key"
              style="width: 120px"
            />
            <Input
              v-model:value="labelInput.value"
              placeholder="Value"
              style="width: 120px"
            />
            <Button type="dashed" @click="addLabel">添加</Button>
          </Space>
        </Form.Item>
        <Form.Item label="描述">
          <Input.TextArea
            v-model:value="formState.description"
            placeholder="请输入描述"
            :rows="2"
          />
        </Form.Item>
        <Form.Item label="状态">
          <Switch
            v-model:checked="formState.status"
            :checked-value="1"
            :un-checked-value="0"
            checked-children="启用"
            un-checked-children="禁用"
          />
        </Form.Item>
      </Form>
    </Modal>
  </Page>
</template>
