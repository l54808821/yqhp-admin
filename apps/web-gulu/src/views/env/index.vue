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
  Space,
  Switch,
  Table,
  Tag,
} from 'ant-design-vue';

import type { Env } from '#/api/env';

import {
  copyEnvApi,
  createEnvApi,
  deleteEnvApi,
  getEnvsByProjectApi,
  updateEnvApi,
} from '#/api/env';
import { useProjectStore } from '#/store/project';

const projectStore = useProjectStore();

const loading = ref(false);
const envs = ref<Env[]>([]);
const modalVisible = ref(false);
const modalTitle = ref('新增环境');
const editingId = ref<number | null>(null);
const copyModalVisible = ref(false);
const copyingId = ref<number | null>(null);

const formState = ref({
  name: '',
  code: '',
  description: '',
  sort: 0,
  status: 1,
});

const copyFormState = ref({
  name: '',
  code: '',
});

const columns = [
  { title: '名称', dataIndex: 'name', key: 'name' },
  { title: '代码', dataIndex: 'code', key: 'code' },
  { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
  { title: '排序', dataIndex: 'sort', key: 'sort', width: 80 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 100 },
  { title: '操作', key: 'action', width: 220 },
];

const canLoad = computed(() => projectStore.currentProjectId > 0);

watch(
  () => projectStore.currentProjectId,
  async (projectId) => {
    if (projectId > 0) {
      await loadEnvs();
    } else {
      envs.value = [];
    }
  },
  { immediate: true },
);

async function loadEnvs() {
  if (!canLoad.value) return;
  try {
    loading.value = true;
    envs.value = await getEnvsByProjectApi(projectStore.currentProjectId);
  } catch {
    message.error('加载环境列表失败');
  } finally {
    loading.value = false;
  }
}

function showAddModal() {
  modalTitle.value = '新增环境';
  editingId.value = null;
  formState.value = {
    name: '',
    code: '',
    description: '',
    sort: 0,
    status: 1,
  };
  modalVisible.value = true;
}

function showEditModal(record: Record<string, any>) {
  modalTitle.value = '编辑环境';
  editingId.value = record.id;
  formState.value = {
    name: record.name,
    code: record.code,
    description: record.description || '',
    sort: record.sort || 0,
    status: record.status,
  };
  modalVisible.value = true;
}

async function handleSubmit() {
  try {
    if (editingId.value) {
      await updateEnvApi(editingId.value, {
        name: formState.value.name,
        description: formState.value.description,
        sort: formState.value.sort,
        status: formState.value.status,
      });
      message.success('更新成功');
    } else {
      await createEnvApi({
        project_id: projectStore.currentProjectId,
        name: formState.value.name,
        code: formState.value.code,
        description: formState.value.description,
        sort: formState.value.sort,
        status: formState.value.status,
      });
      message.success('创建成功');
    }
    modalVisible.value = false;
    await loadEnvs();
    // 刷新顶部环境选择器
    await projectStore.refreshEnvs();
  } catch {
    message.error('操作失败');
  }
}

async function handleDelete(id: number) {
  try {
    await deleteEnvApi(id);
    message.success('删除成功');
    await loadEnvs();
    await projectStore.refreshEnvs();
  } catch {
    message.error('删除失败');
  }
}

function showCopyModal(record: Record<string, any>) {
  copyingId.value = record.id;
  copyFormState.value = {
    name: `${record.name}_copy`,
    code: `${record.code}_copy`,
  };
  copyModalVisible.value = true;
}

async function handleCopy() {
  if (!copyingId.value) return;
  try {
    await copyEnvApi(copyingId.value, {
      name: copyFormState.value.name,
      code: copyFormState.value.code,
    });
    message.success('复制成功，包括域名、变量、数据库配置、MQ配置');
    copyModalVisible.value = false;
    await loadEnvs();
    await projectStore.refreshEnvs();
  } catch {
    message.error('复制失败');
  }
}
</script>

<template>
  <Page title="环境管理" description="管理当前项目的环境配置">
    <template #extra>
      <Button type="primary" :disabled="!canLoad" @click="showAddModal">
        新增环境
      </Button>
    </template>

    <div v-if="!canLoad" class="text-center py-8 text-gray-500">
      请先选择项目
    </div>

    <Table
      v-else
      :columns="columns"
      :data-source="envs"
      :loading="loading"
      row-key="id"
    >
      <template #bodyCell="{ column, record }">
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
            <Button type="link" size="small" @click="showCopyModal(record)">
              复制
            </Button>
            <Popconfirm
              title="确定删除此环境？删除后相关配置也会被删除"
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
      width="500px"
      @ok="handleSubmit"
    >
      <Form :model="formState" layout="vertical">
        <Form.Item label="名称" required>
          <Input v-model:value="formState.name" placeholder="请输入环境名称，如：开发环境" />
        </Form.Item>
        <Form.Item v-if="!editingId" label="代码" required>
          <Input v-model:value="formState.code" placeholder="请输入环境代码，如：dev" />
        </Form.Item>
        <Form.Item label="描述">
          <Input.TextArea v-model:value="formState.description" placeholder="请输入描述" :rows="2" />
        </Form.Item>
        <Form.Item label="排序">
          <Input v-model:value="formState.sort" type="number" placeholder="数字越小越靠前" />
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

    <Modal
      v-model:open="copyModalVisible"
      title="复制环境"
      width="500px"
      @ok="handleCopy"
    >
      <p class="mb-4 text-gray-500">复制环境将同时复制该环境下的所有域名、变量、数据库配置和MQ配置</p>
      <Form :model="copyFormState" layout="vertical">
        <Form.Item label="新环境名称" required>
          <Input v-model:value="copyFormState.name" placeholder="请输入新环境名称" />
        </Form.Item>
        <Form.Item label="新环境代码" required>
          <Input v-model:value="copyFormState.code" placeholder="请输入新环境代码" />
        </Form.Item>
      </Form>
    </Modal>
  </Page>
</template>
