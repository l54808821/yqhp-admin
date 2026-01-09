<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

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

import type { Workflow } from '#/api/workflow';

import {
  copyWorkflowApi,
  createWorkflowApi,
  deleteWorkflowApi,
  getWorkflowsByProjectApi,
  updateWorkflowStatusApi,
} from '#/api/workflow';
import { useProjectStore } from '#/store/project';

const router = useRouter();
const projectStore = useProjectStore();

const loading = ref(false);
const workflows = ref<Workflow[]>([]);
const modalVisible = ref(false);
const copyModalVisible = ref(false);
const copyingId = ref<number | null>(null);

const formState = ref({
  name: '',
  code: '',
  description: '',
});

const copyFormState = ref({
  name: '',
  code: '',
});

const columns = [
  { title: '名称', dataIndex: 'name', key: 'name' },
  { title: '代码', dataIndex: 'code', key: 'code' },
  { title: '版本', dataIndex: 'version', key: 'version', width: 80 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 80 },
  { title: '更新时间', dataIndex: 'updated_at', key: 'updated_at', width: 180 },
  { title: '操作', key: 'action', width: 250 },
];

const canLoad = computed(() => projectStore.currentProjectId > 0);

watch(
  () => projectStore.currentProjectId,
  async (projectId) => {
    if (projectId > 0) {
      await loadWorkflows();
    } else {
      workflows.value = [];
    }
  },
  { immediate: true },
);

async function loadWorkflows() {
  if (!canLoad.value) return;
  try {
    loading.value = true;
    workflows.value = await getWorkflowsByProjectApi(
      projectStore.currentProjectId,
    );
  } catch {
    message.error('加载工作流列表失败');
  } finally {
    loading.value = false;
  }
}

function showAddModal() {
  formState.value = {
    name: '',
    code: '',
    description: '',
  };
  modalVisible.value = true;
}

async function handleCreate() {
  try {
    const defaultDefinition = JSON.stringify({
      name: formState.value.name,
      steps: [],
    });
    const workflow = await createWorkflowApi({
      project_id: projectStore.currentProjectId,
      name: formState.value.name,
      code: formState.value.code,
      description: formState.value.description,
      definition: defaultDefinition,
    });
    message.success('创建成功');
    modalVisible.value = false;
    // 跳转到编辑器
    router.push({ name: 'WorkflowEditor', params: { id: workflow.id } });
  } catch {
    message.error('创建失败');
  }
}

function goToEditor(id: number) {
  router.push({ name: 'WorkflowEditor', params: { id } });
}

function showCopyModal(record: Workflow) {
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
    await copyWorkflowApi(copyingId.value, {
      name: copyFormState.value.name,
      code: copyFormState.value.code,
    });
    message.success('复制成功');
    copyModalVisible.value = false;
    await loadWorkflows();
  } catch {
    message.error('复制失败');
  }
}

async function handleDelete(id: number) {
  try {
    await deleteWorkflowApi(id);
    message.success('删除成功');
    await loadWorkflows();
  } catch {
    message.error('删除失败');
  }
}

async function handleStatusChange(id: number, checked: boolean | string | number) {
  try {
    const status = checked ? 1 : 0;
    await updateWorkflowStatusApi(id, status);
    message.success('状态更新成功');
    await loadWorkflows();
  } catch {
    message.error('状态更新失败');
  }
}

function goToExecute(id: number) {
  router.push({ name: 'WorkflowExecute', params: { id } });
}
</script>

<template>
  <Page title="工作流管理" description="管理当前项目的工作流">
    <template #extra>
      <Button type="primary" :disabled="!canLoad" @click="showAddModal">
        新建工作流
      </Button>
    </template>

    <div v-if="!canLoad" class="text-center py-8 text-gray-500">
      请先选择项目
    </div>

    <Table
      v-else
      :columns="columns"
      :data-source="workflows"
      :loading="loading"
      row-key="id"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'version'">
          <Tag>v{{ record.version }}</Tag>
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
            <Button type="link" size="small" @click="goToEditor(record.id)">
              编辑
            </Button>
            <Button type="link" size="small" @click="goToExecute(record.id)">
              执行
            </Button>
            <Button type="link" size="small" @click="showCopyModal(record)">
              复制
            </Button>
            <Popconfirm
              title="确定删除此工作流？"
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
      title="新建工作流"
      width="500px"
      @ok="handleCreate"
    >
      <Form :model="formState" layout="vertical">
        <Form.Item label="名称" required>
          <Input
            v-model:value="formState.name"
            placeholder="请输入工作流名称"
          />
        </Form.Item>
        <Form.Item label="代码" required>
          <Input
            v-model:value="formState.code"
            placeholder="请输入工作流代码（唯一标识）"
          />
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
      v-model:open="copyModalVisible"
      title="复制工作流"
      width="500px"
      @ok="handleCopy"
    >
      <Form :model="copyFormState" layout="vertical">
        <Form.Item label="新名称" required>
          <Input
            v-model:value="copyFormState.name"
            placeholder="请输入新工作流名称"
          />
        </Form.Item>
        <Form.Item label="新代码" required>
          <Input
            v-model:value="copyFormState.code"
            placeholder="请输入新工作流代码"
          />
        </Form.Item>
      </Form>
    </Modal>
  </Page>
</template>
