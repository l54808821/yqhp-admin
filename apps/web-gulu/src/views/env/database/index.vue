<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { Page } from '@vben/common-ui';

import {
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

import type { DatabaseConfig } from '#/api/database-config';

import {
  createDatabaseConfigApi,
  deleteDatabaseConfigApi,
  getDatabaseConfigsByEnvApi,
  updateDatabaseConfigApi,
} from '#/api/database-config';
import { useProjectStore } from '#/store/project';

const projectStore = useProjectStore();

const loading = ref(false);
const configs = ref<DatabaseConfig[]>([]);
const modalVisible = ref(false);
const modalTitle = ref('新增数据库配置');
const editingId = ref<number | null>(null);

const dbTypes = [
  { label: 'MySQL', value: 'mysql' },
  { label: 'Redis', value: 'redis' },
  { label: 'MongoDB', value: 'mongodb' },
];

const formState = ref({
  name: '',
  code: '',
  type: 'mysql' as string,
  host: '',
  port: 3306,
  database: '',
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
  { title: '主机', dataIndex: 'host', key: 'host' },
  { title: '端口', dataIndex: 'port', key: 'port' },
  { title: '数据库', dataIndex: 'database', key: 'database' },
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
    configs.value = await getDatabaseConfigsByEnvApi(projectStore.currentEnvId);
  } catch {
    message.error('加载数据库配置列表失败');
  } finally {
    loading.value = false;
  }
}

function getDefaultPort(type: string): number {
  switch (type) {
    case 'mysql': return 3306;
    case 'redis': return 6379;
    case 'mongodb': return 27017;
    default: return 3306;
  }
}

function showAddModal() {
  modalTitle.value = '新增数据库配置';
  editingId.value = null;
  formState.value = {
    name: '',
    code: '',
    type: 'mysql',
    host: '',
    port: 3306,
    database: '',
    username: '',
    password: '',
    options: '',
    description: '',
    status: 1,
  };
  modalVisible.value = true;
}

function showEditModal(record: DatabaseConfig) {
  modalTitle.value = '编辑数据库配置';
  editingId.value = record.id;
  formState.value = {
    name: record.name,
    code: record.code,
    type: record.type,
    host: record.host,
    port: record.port,
    database: record.database || '',
    username: record.username || '',
    password: '',
    options: record.options || '',
    description: record.description || '',
    status: record.status,
  };
  modalVisible.value = true;
}

function onTypeChange(type: string) {
  formState.value.port = getDefaultPort(type);
}

async function handleSubmit() {
  try {
    if (editingId.value) {
      await updateDatabaseConfigApi(editingId.value, {
        name: formState.value.name,
        type: formState.value.type,
        host: formState.value.host,
        port: formState.value.port,
        database: formState.value.database,
        username: formState.value.username,
        password: formState.value.password || undefined,
        options: formState.value.options,
        description: formState.value.description,
        status: formState.value.status,
      });
      message.success('更新成功');
    } else {
      await createDatabaseConfigApi({
        project_id: projectStore.currentProjectId,
        env_id: projectStore.currentEnvId,
        name: formState.value.name,
        code: formState.value.code,
        type: formState.value.type,
        host: formState.value.host,
        port: formState.value.port,
        database: formState.value.database,
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
    await deleteDatabaseConfigApi(id);
    message.success('删除成功');
    await loadConfigs();
  } catch {
    message.error('删除失败');
  }
}
</script>

<template>
  <Page title="数据库配置" description="管理当前环境的数据库连接配置">
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
          <Tag color="blue">{{ record.type.toUpperCase() }}</Tag>
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
            :options="dbTypes"
            placeholder="请选择数据库类型"
            @change="onTypeChange"
          />
        </Form.Item>
        <div class="flex gap-4">
          <Form.Item label="主机" required class="flex-1">
            <Input v-model:value="formState.host" placeholder="请输入主机地址" />
          </Form.Item>
          <Form.Item label="端口" required style="width: 120px">
            <InputNumber v-model:value="formState.port" :min="1" :max="65535" style="width: 100%" />
          </Form.Item>
        </div>
        <Form.Item v-if="formState.type !== 'redis'" label="数据库名">
          <Input v-model:value="formState.database" placeholder="请输入数据库名" />
        </Form.Item>
        <div class="flex gap-4">
          <Form.Item label="用户名" class="flex-1">
            <Input v-model:value="formState.username" placeholder="请输入用户名" />
          </Form.Item>
          <Form.Item label="密码" class="flex-1">
            <Input.Password v-model:value="formState.password" placeholder="请输入密码" />
          </Form.Item>
        </div>
        <Form.Item label="连接选项">
          <Input v-model:value="formState.options" placeholder="如: charset=utf8mb4&parseTime=true" />
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
