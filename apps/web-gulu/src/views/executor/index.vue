<script setup lang="ts">
import { onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

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
  Table,
  Tag,
} from 'ant-design-vue';

import type { Executor } from '#/api/executor';

import {
  createExecutorApi,
  deleteExecutorApi,
  getExecutorListApi,
  syncExecutorsApi,
  updateExecutorApi,
  updateExecutorStatusApi,
} from '#/api/executor';

const loading = ref(false);
const syncLoading = ref(false);
const executors = ref<Executor[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
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

const columns = [
  { title: '名称', dataIndex: 'name', key: 'name' },
  { title: 'Slave ID', dataIndex: 'slave_id', key: 'slave_id' },
  { title: '类型', dataIndex: 'type', key: 'type', width: 100 },
  { title: '状态', dataIndex: 'state', key: 'state', width: 100 },
  { title: '负载', dataIndex: 'load', key: 'load', width: 80 },
  { title: '优先级', dataIndex: 'priority', key: 'priority', width: 80 },
  { title: '启用', dataIndex: 'status', key: 'status', width: 80 },
  { title: '操作', key: 'action', width: 150 },
];

const typeOptions = [
  { label: '普通', value: 'normal' },
  { label: '压测专用', value: 'performance' },
  { label: '调试专用', value: 'debug' },
];

onMounted(async () => {
  await loadExecutors();
});

async function loadExecutors() {
  try {
    loading.value = true;
    const result = await getExecutorListApi({
      page: page.value,
      pageSize: pageSize.value,
    });
    executors.value = result.list;
    total.value = result.total;
  } catch {
    message.error('加载执行机列表失败');
  } finally {
    loading.value = false;
  }
}

async function handleSync() {
  try {
    syncLoading.value = true;
    const result = await syncExecutorsApi();
    message.success(`同步完成，新增 ${result.synced_count} 台执行机`);
    await loadExecutors();
  } catch {
    message.error('同步失败');
  } finally {
    syncLoading.value = false;
  }
}

function showAddModal() {
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

function showEditModal(record: Executor) {
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
    await loadExecutors();
  } catch {
    message.error('操作失败');
  }
}

async function handleDelete(id: number) {
  try {
    await deleteExecutorApi(id);
    message.success('删除成功');
    await loadExecutors();
  } catch {
    message.error('删除失败');
  }
}

async function handleStatusChange(id: number, checked: boolean | string | number) {
  try {
    const status = checked ? 1 : 0;
    await updateExecutorStatusApi(id, status);
    message.success('状态更新成功');
    await loadExecutors();
  } catch {
    message.error('状态更新失败');
  }
}

function addLabel() {
  if (labelInput.value.key && labelInput.value.value) {
    formState.value.labels[labelInput.value.key] = labelInput.value.value;
    labelInput.value = { key: '', value: '' };
  }
}

function removeLabel(key: string) {
  delete formState.value.labels[key];
}

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
</script>

<template>
  <Page title="执行机管理" description="管理 workflow-engine 的执行机">
    <template #extra>
      <Space>
        <Button :loading="syncLoading" @click="handleSync">
          同步执行机
        </Button>
        <Button type="primary" @click="showAddModal">新增执行机</Button>
      </Space>
    </template>

    <Table
      :columns="columns"
      :data-source="executors"
      :loading="loading"
      :pagination="{
        current: page,
        pageSize: pageSize,
        total: total,
        showSizeChanger: true,
        showTotal: (t: number) => `共 ${t} 条`,
      }"
      row-key="id"
      @change="
        (p: any) => {
          page = p.current;
          pageSize = p.pageSize;
          loadExecutors();
        }
      "
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'type'">
          <Tag :color="getTypeColor(record.type)">
            {{ record.type }}
          </Tag>
        </template>
        <template v-if="column.key === 'state'">
          <Badge :status="getStateColor(record.state)" :text="record.state || 'offline'" />
        </template>
        <template v-if="column.key === 'load'">
          {{ record.load ? `${(record.load * 100).toFixed(0)}%` : '-' }}
        </template>
        <template v-if="column.key === 'status'">
          <Switch
            :checked="record.status === 1"
            size="small"
            @change="(checked: any) => handleStatusChange(record.id, checked)"
          />
        </template>
        <template v-if="column.key === 'action'">
          <Space>
            <Button type="link" size="small" @click="showEditModal(record)">
              编辑
            </Button>
            <Popconfirm
              title="确定删除此执行机？"
              @confirm="handleDelete(record.id)"
            >
              <Button type="link" size="small" danger>删除</Button>
            </Popconfirm>
          </Space>
        </template>
      </template>
    </Table>

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
