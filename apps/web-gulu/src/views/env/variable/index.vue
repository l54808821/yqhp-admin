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

import type { Variable, VariableExportItem } from '#/api/variable';

import {
  createVariableApi,
  deleteVariableApi,
  exportVariablesApi,
  getVariablesByEnvApi,
  importVariablesApi,
  updateVariableApi,
} from '#/api/variable';
import { useProjectStore } from '#/store/project';

const projectStore = useProjectStore();

const loading = ref(false);
const variables = ref<Variable[]>([]);
const modalVisible = ref(false);
const modalTitle = ref('新增变量');
const editingId = ref<number | null>(null);
const importModalVisible = ref(false);
const importContent = ref('');

const formState = ref({
  name: '',
  key: '',
  value: '',
  type: 'string',
  is_sensitive: false,
  description: '',
});

const columns = [
  { title: '名称', dataIndex: 'name', key: 'name' },
  { title: 'Key', dataIndex: 'key', key: 'key' },
  { title: '值', dataIndex: 'value', key: 'value', ellipsis: true },
  { title: '类型', dataIndex: 'type', key: 'type', width: 100 },
  { title: '敏感', dataIndex: 'is_sensitive', key: 'is_sensitive', width: 80 },
  { title: '操作', key: 'action', width: 150 },
];

const typeOptions = [
  { label: '字符串', value: 'string' },
  { label: '数字', value: 'number' },
  { label: '布尔', value: 'boolean' },
  { label: 'JSON', value: 'json' },
];

const canLoad = computed(
  () => projectStore.currentProjectId > 0 && projectStore.currentEnvId > 0,
);

watch(
  () => projectStore.currentEnvId,
  async (envId) => {
    if (envId > 0) {
      await loadVariables();
    } else {
      variables.value = [];
    }
  },
  { immediate: true },
);

async function loadVariables() {
  if (!canLoad.value) return;
  try {
    loading.value = true;
    variables.value = await getVariablesByEnvApi(projectStore.currentEnvId);
  } catch {
    message.error('加载变量列表失败');
  } finally {
    loading.value = false;
  }
}

function showAddModal() {
  modalTitle.value = '新增变量';
  editingId.value = null;
  formState.value = {
    name: '',
    key: '',
    value: '',
    type: 'string',
    is_sensitive: false,
    description: '',
  };
  modalVisible.value = true;
}

function showEditModal(record: Variable) {
  modalTitle.value = '编辑变量';
  editingId.value = record.id;
  formState.value = {
    name: record.name,
    key: record.key,
    value: record.value,
    type: record.type,
    is_sensitive: record.is_sensitive || false,
    description: record.description || '',
  };
  modalVisible.value = true;
}

async function handleSubmit() {
  try {
    if (editingId.value) {
      await updateVariableApi(editingId.value, {
        name: formState.value.name,
        value: formState.value.value,
        type: formState.value.type,
        is_sensitive: formState.value.is_sensitive,
        description: formState.value.description,
      });
      message.success('更新成功');
    } else {
      await createVariableApi({
        project_id: projectStore.currentProjectId,
        env_id: projectStore.currentEnvId,
        name: formState.value.name,
        key: formState.value.key,
        value: formState.value.value,
        type: formState.value.type,
        is_sensitive: formState.value.is_sensitive,
        description: formState.value.description,
      });
      message.success('创建成功');
    }
    modalVisible.value = false;
    await loadVariables();
  } catch {
    message.error('操作失败');
  }
}

async function handleDelete(id: number) {
  try {
    await deleteVariableApi(id);
    message.success('删除成功');
    await loadVariables();
  } catch {
    message.error('删除失败');
  }
}

async function handleExport() {
  try {
    const data = await exportVariablesApi(projectStore.currentEnvId);
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `variables_${projectStore.currentEnv?.code || 'export'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    message.success('导出成功');
  } catch {
    message.error('导出失败');
  }
}

function showImportModal() {
  importContent.value = '';
  importModalVisible.value = true;
}

async function handleImport() {
  try {
    const items: VariableExportItem[] = JSON.parse(importContent.value);
    await importVariablesApi(
      projectStore.currentProjectId,
      projectStore.currentEnvId,
      items,
    );
    message.success('导入成功');
    importModalVisible.value = false;
    await loadVariables();
  } catch {
    message.error('导入失败，请检查 JSON 格式');
  }
}

function getDisplayValue(record: Variable) {
  if (record.is_sensitive) {
    return '******';
  }
  return record.value;
}
</script>

<template>
  <Page title="变量管理" description="管理当前环境的变量配置">
    <template #extra>
      <Space>
        <Button :disabled="!canLoad" @click="handleExport">导出</Button>
        <Button :disabled="!canLoad" @click="showImportModal">导入</Button>
        <Button type="primary" :disabled="!canLoad" @click="showAddModal">
          新增变量
        </Button>
      </Space>
    </template>

    <div v-if="!canLoad" class="text-center py-8 text-gray-500">
      请先选择项目和环境
    </div>

    <Table
      v-else
      :columns="columns"
      :data-source="variables"
      :loading="loading"
      row-key="id"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'value'">
          {{ getDisplayValue(record) }}
        </template>
        <template v-if="column.key === 'type'">
          <Tag>{{ record.type }}</Tag>
        </template>
        <template v-if="column.key === 'is_sensitive'">
          <Tag :color="record.is_sensitive ? 'red' : 'default'">
            {{ record.is_sensitive ? '是' : '否' }}
          </Tag>
        </template>
        <template v-if="column.key === 'action'">
          <Space>
            <Button type="link" size="small" @click="showEditModal(record)">
              编辑
            </Button>
            <Popconfirm
              title="确定删除此变量？"
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
          <Input v-model:value="formState.name" placeholder="请输入变量名称" />
        </Form.Item>
        <Form.Item v-if="!editingId" label="Key" required>
          <Input
            v-model:value="formState.key"
            placeholder="请输入变量 Key（用于工作流引用）"
          />
        </Form.Item>
        <Form.Item label="值" required>
          <Input.TextArea
            v-model:value="formState.value"
            placeholder="请输入变量值"
            :rows="3"
          />
        </Form.Item>
        <Form.Item label="类型">
          <Select v-model:value="formState.type" :options="typeOptions" />
        </Form.Item>
        <Form.Item label="敏感数据">
          <Switch v-model:checked="formState.is_sensitive" />
        </Form.Item>
        <Form.Item label="描述">
          <Input.TextArea
            v-model:value="formState.description"
            placeholder="请输入描述"
            :rows="2"
          />
        </Form.Item>
      </Form>
    </Modal>

    <Modal
      v-model:open="importModalVisible"
      title="导入变量"
      width="600px"
      @ok="handleImport"
    >
      <Form layout="vertical">
        <Form.Item label="JSON 内容">
          <Input.TextArea
            v-model:value="importContent"
            placeholder="请粘贴导出的 JSON 内容"
            :rows="10"
          />
        </Form.Item>
      </Form>
    </Modal>
  </Page>
</template>
