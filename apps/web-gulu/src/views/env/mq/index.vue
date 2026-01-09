<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
} from 'ant-design-vue';

import type { MQConfig } from '#/api/mq-config';

import {
  createMQConfigApi,
  deleteMQConfigApi,
  getMQConfigsByEnvApi,
  updateMQConfigApi,
} from '#/api/mq-config';
import { useProjectStore } from '#/store/project';

const projectStore = useProjectStore();

const loading = ref(false);
const configs = ref<MQConfig[]>([]);
const modalVisible = ref(false);
const modalTitle = ref('新增MQ配置');
const editingId = ref<number | null>(null);

const mqTypes = [
  { label: 'Kafka', value: 'kafka' },
  { label: 'RabbitMQ', value: 'rabbitmq' },
  { label: 'RocketMQ', value: 'rocketmq' },
];

const formState = ref({
  name: '',
  code: '',
  type: 'kafka' as string,
  brokers: '',
  topic: '',
  group_id: '',
  username: '',
  password: '',
  options: '',
  description: '',
  status: 1,
});

const columns = [
  { title: '名称', dataIndex: 'name', key: 'name' },
  { title: '代码', dataIndex: 'code', key: 'code' },
  { title: '类型', dataIndex: 'type', key: 'type' },
  { title: 'Brokers', dataIndex: 'brokers', key: 'brokers', ellipsis: true },
  { title: 'Topic', dataIndex: 'topic', key: 'topic' },
  { title: '状态', dataIndex: 'status', key: 'status' },
  { title: '操作', key: 'action', width: 150 },
];

const canLoad = computed(
  () => projectStore.currentProjectId > 0 && projectStore.currentEnvId > 0,
);

watch(
  () => projectStore.currentEnvId,
  async (envId) => {
    if (envId > 0) {
      await loadConfigs();
    } else {
      configs.value = [];
    }
  },
  { immediate: true },
);

async function loadConfigs() {
  if (!canLoad.value) return;
  try {
    loading.value = true;
    configs.value = await getMQConfigsByEnvApi(projectStore.currentEnvId);
  } catch {
    message.error('加载MQ配置列表失败');
  } finally {
    loading.value = false;
  }
}

function showAddModal() {
  modalTitle.value = '新增MQ配置';
  editingId.value = null;
  formState.value = {
    name: '',
    code: '',
    type: 'kafka',
    brokers: '',
    topic: '',
    group_id: '',
    username: '',
    password: '',
    options: '',
    description: '',
    status: 1,
  };
  modalVisible.value = true;
}

function showEditModal(record: MQConfig) {
  modalTitle.value = '编辑MQ配置';
  editingId.value = record.id;
  formState.value = {
    name: record.name,
    code: record.code,
    type: record.type,
    brokers: record.brokers,
    topic: record.topic || '',
    group_id: record.group_id || '',
    username: record.username || '',
    password: '',
    options: record.options || '',
    description: record.description || '',
    status: record.status,
  };
  modalVisible.value = true;
}

async function handleSubmit() {
  try {
    if (editingId.value) {
      await updateMQConfigApi(editingId.value, {
        name: formState.value.name,
        type: formState.value.type,
        brokers: formState.value.brokers,
        topic: formState.value.topic,
        group_id: formState.value.group_id,
        username: formState.value.username,
        password: formState.value.password || undefined,
        options: formState.value.options,
        description: formState.value.description,
        status: formState.value.status,
      });
      message.success('更新成功');
    } else {
      await createMQConfigApi({
        project_id: projectStore.currentProjectId,
        env_id: projectStore.currentEnvId,
        name: formState.value.name,
        code: formState.value.code,
        type: formState.value.type,
        brokers: formState.value.brokers,
        topic: formState.value.topic,
        group_id: formState.value.group_id,
        username: formState.value.username,
        password: formState.value.password,
        options: formState.value.options,
        description: formState.value.description,
        status: formState.value.status,
      });
      message.success('创建成功');
    }
    modalVisible.value = false;
    await loadConfigs();
  } catch {
    message.error('操作失败');
  }
}

async function handleDelete(id: number) {
  try {
    await deleteMQConfigApi(id);
    message.success('删除成功');
    await loadConfigs();
  } catch {
    message.error('删除失败');
  }
}
</script>

<template>
  <Page title="MQ配置" description="管理当前环境的消息队列配置">
    <template #extra>
      <Button type="primary" :disabled="!canLoad" @click="showAddModal">
        新增配置
      </Button>
    </template>

    <div v-if="!canLoad" class="text-center py-8 text-gray-500">
      请先选择项目和环境
    </div>

    <Table
      v-else
      :columns="columns"
      :data-source="configs"
      :loading="loading"
      row-key="id"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'type'">
          <Tag color="purple">{{ record.type.toUpperCase() }}</Tag>
        </template>
        <template v-if="column.key === 'status'">
          <Tag :color="record.status === 1 ? 'green' : 'red'">
            {{ record.status === 1 ? '启用' : '禁用' }}
          </Tag>
        </template>
        <template v-if="column.key === 'action'">
          <Space>
            <Button type="link" size="small" @click="showEditModal(record)">
              编辑
            </Button>
            <Popconfirm
              title="确定删除此配置？"
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
        <Form.Item label="名称" required>
          <Input v-model:value="formState.name" placeholder="请输入配置名称" />
        </Form.Item>
        <Form.Item v-if="!editingId" label="代码" required>
          <Input v-model:value="formState.code" placeholder="请输入配置代码（用于工作流引用）" />
        </Form.Item>
        <Form.Item label="类型" required>
          <Select
            v-model:value="formState.type"
            :options="mqTypes"
            placeholder="请选择MQ类型"
          />
        </Form.Item>
        <Form.Item label="Brokers" required>
          <Input v-model:value="formState.brokers" placeholder="如: localhost:9092,localhost:9093" />
        </Form.Item>
        <div class="flex gap-4">
          <Form.Item label="Topic" class="flex-1">
            <Input v-model:value="formState.topic" placeholder="请输入Topic" />
          </Form.Item>
          <Form.Item label="Group ID" class="flex-1">
            <Input v-model:value="formState.group_id" placeholder="请输入消费组ID" />
          </Form.Item>
        </div>
        <div class="flex gap-4">
          <Form.Item label="用户名" class="flex-1">
            <Input v-model:value="formState.username" placeholder="请输入用户名" />
          </Form.Item>
          <Form.Item label="密码" class="flex-1">
            <Input.Password v-model:value="formState.password" placeholder="请输入密码" />
          </Form.Item>
        </div>
        <Form.Item label="其他选项">
          <Input v-model:value="formState.options" placeholder="JSON格式的其他配置选项" />
        </Form.Item>
        <Form.Item label="描述">
          <Input.TextArea v-model:value="formState.description" placeholder="请输入描述" :rows="2" />
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
