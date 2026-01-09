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

import type { Domain, DomainHeader } from '#/api/domain';

import {
  createDomainApi,
  deleteDomainApi,
  getDomainsByEnvApi,
  updateDomainApi,
} from '#/api/domain';
import { useProjectStore } from '#/store/project';

const projectStore = useProjectStore();

const loading = ref(false);
const domains = ref<Domain[]>([]);
const modalVisible = ref(false);
const modalTitle = ref('新增域名');
const editingId = ref<number | null>(null);

const formState = ref({
  name: '',
  code: '',
  base_url: '',
  headers: [] as DomainHeader[],
  description: '',
  status: 1,
});

const columns = [
  { title: '名称', dataIndex: 'name', key: 'name' },
  { title: '代码', dataIndex: 'code', key: 'code' },
  { title: 'Base URL', dataIndex: 'base_url', key: 'base_url' },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    customRender: ({ record }: { record: Domain }) => {
      return record.status === 1 ? '启用' : '禁用';
    },
  },
  { title: '操作', key: 'action', width: 150 },
];

const canLoad = computed(
  () => projectStore.currentProjectId > 0 && projectStore.currentEnvId > 0,
);

watch(
  () => projectStore.currentEnvId,
  async (envId) => {
    if (envId > 0) {
      await loadDomains();
    } else {
      domains.value = [];
    }
  },
  { immediate: true },
);

async function loadDomains() {
  if (!canLoad.value) return;
  try {
    loading.value = true;
    domains.value = await getDomainsByEnvApi(projectStore.currentEnvId);
  } catch {
    message.error('加载域名列表失败');
  } finally {
    loading.value = false;
  }
}

function showAddModal() {
  modalTitle.value = '新增域名';
  editingId.value = null;
  formState.value = {
    name: '',
    code: '',
    base_url: '',
    headers: [],
    description: '',
    status: 1,
  };
  modalVisible.value = true;
}

function showEditModal(record: Domain) {
  modalTitle.value = '编辑域名';
  editingId.value = record.id;
  formState.value = {
    name: record.name,
    code: record.code,
    base_url: record.base_url,
    headers: record.headers || [],
    description: record.description || '',
    status: record.status,
  };
  modalVisible.value = true;
}

async function handleSubmit() {
  try {
    if (editingId.value) {
      await updateDomainApi(editingId.value, {
        name: formState.value.name,
        base_url: formState.value.base_url,
        headers: formState.value.headers,
        description: formState.value.description,
        status: formState.value.status,
      });
      message.success('更新成功');
    } else {
      await createDomainApi({
        project_id: projectStore.currentProjectId,
        env_id: projectStore.currentEnvId,
        name: formState.value.name,
        code: formState.value.code,
        base_url: formState.value.base_url,
        headers: formState.value.headers,
        description: formState.value.description,
        status: formState.value.status,
      });
      message.success('创建成功');
    }
    modalVisible.value = false;
    await loadDomains();
  } catch {
    message.error('操作失败');
  }
}

async function handleDelete(id: number) {
  try {
    await deleteDomainApi(id);
    message.success('删除成功');
    await loadDomains();
  } catch {
    message.error('删除失败');
  }
}

function addHeader() {
  formState.value.headers.push({ key: '', value: '' });
}

function removeHeader(index: number) {
  formState.value.headers.splice(index, 1);
}
</script>

<template>
  <Page title="域名管理" description="管理当前环境的域名配置">
    <template #extra>
      <Button type="primary" :disabled="!canLoad" @click="showAddModal">
        新增域名
      </Button>
    </template>

    <div v-if="!canLoad" class="text-center py-8 text-gray-500">
      请先选择项目和环境
    </div>

    <Table
      v-else
      :columns="columns"
      :data-source="domains"
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
            <Popconfirm
              title="确定删除此域名？"
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
          <Input v-model:value="formState.name" placeholder="请输入域名名称" />
        </Form.Item>
        <Form.Item v-if="!editingId" label="代码" required>
          <Input
            v-model:value="formState.code"
            placeholder="请输入域名代码（用于工作流引用）"
          />
        </Form.Item>
        <Form.Item label="Base URL" required>
          <Input
            v-model:value="formState.base_url"
            placeholder="请输入 Base URL，如 https://api.example.com"
          />
        </Form.Item>
        <Form.Item label="公共请求头">
          <div
            v-for="(header, index) in formState.headers"
            :key="index"
            class="flex gap-2 mb-2"
          >
            <Input
              v-model:value="header.key"
              placeholder="Header Key"
              style="width: 40%"
            />
            <Input
              v-model:value="header.value"
              placeholder="Header Value"
              style="width: 40%"
            />
            <Button type="link" danger @click="removeHeader(index)">
              删除
            </Button>
          </div>
          <Button type="dashed" block @click="addHeader">添加请求头</Button>
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
