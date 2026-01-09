<script setup lang="ts">
import { onMounted, ref } from 'vue';

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
} from 'ant-design-vue';

import type { Project } from '#/api/project';

import {
  createProjectApi,
  deleteProjectApi,
  getProjectListApi,
  updateProjectApi,
  updateProjectStatusApi,
} from '#/api/project';
import { useProjectStore } from '#/store/project';

const projectStore = useProjectStore();

const loading = ref(false);
const projects = ref<Project[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const modalVisible = ref(false);
const modalTitle = ref('新增项目');
const editingId = ref<number | null>(null);

const formState = ref({
  name: '',
  code: '',
  description: '',
  icon: '',
  sort: 0,
  status: 1,
});

const columns = [
  { title: '名称', dataIndex: 'name', key: 'name' },
  { title: '代码', dataIndex: 'code', key: 'code' },
  { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
  { title: '排序', dataIndex: 'sort', key: 'sort', width: 80 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 100 },
  { title: '操作', key: 'action', width: 180 },
];

onMounted(async () => {
  await loadProjects();
});

async function loadProjects() {
  try {
    loading.value = true;
    const result = await getProjectListApi({
      page: page.value,
      pageSize: pageSize.value,
    });
    projects.value = result.list;
    total.value = result.total;
  } catch {
    message.error('加载项目列表失败');
  } finally {
    loading.value = false;
  }
}

function showAddModal() {
  modalTitle.value = '新增项目';
  editingId.value = null;
  formState.value = {
    name: '',
    code: '',
    description: '',
    icon: '',
    sort: 0,
    status: 1,
  };
  modalVisible.value = true;
}

function showEditModal(record: Record<string, any>) {
  modalTitle.value = '编辑项目';
  editingId.value = record.id;
  formState.value = {
    name: record.name,
    code: record.code,
    description: record.description || '',
    icon: record.icon || '',
    sort: record.sort || 0,
    status: record.status,
  };
  modalVisible.value = true;
}

async function handleSubmit() {
  try {
    if (editingId.value) {
      await updateProjectApi(editingId.value, {
        name: formState.value.name,
        description: formState.value.description,
        icon: formState.value.icon,
        sort: formState.value.sort,
        status: formState.value.status,
      });
      message.success('更新成功');
    } else {
      await createProjectApi({
        name: formState.value.name,
        code: formState.value.code,
        description: formState.value.description,
        icon: formState.value.icon,
        sort: formState.value.sort,
        status: formState.value.status,
      });
      message.success('创建成功');
    }
    modalVisible.value = false;
    await loadProjects();
    // 刷新顶部项目选择器
    await projectStore.refreshProjects();
  } catch {
    message.error('操作失败');
  }
}

async function handleDelete(id: number) {
  try {
    await deleteProjectApi(id);
    message.success('删除成功');
    await loadProjects();
    await projectStore.refreshProjects();
  } catch {
    message.error('删除失败');
  }
}

async function handleStatusChange(id: number, checked: any) {
  try {
    const status = checked ? 1 : 0;
    await updateProjectStatusApi(id, status);
    message.success('状态更新成功');
    await loadProjects();
    await projectStore.refreshProjects();
  } catch {
    message.error('状态更新失败');
  }
}
</script>

<template>
  <Page title="项目管理" description="管理测试项目">
    <template #extra>
      <Button type="primary" @click="showAddModal">新增项目</Button>
    </template>

    <Table
      :columns="columns"
      :data-source="projects"
      :loading="loading"
      :pagination="{
        current: page,
        pageSize: pageSize,
        total: total,
        showSizeChanger: true,
        showTotal: (t: number) => `共 ${t} 条`,
      }"
      row-key="id"
      @change="(p: any) => { page = p.current; pageSize = p.pageSize; loadProjects(); }"
    >
      <template #bodyCell="{ column, record }">
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
              title="确定删除此项目？删除后相关数据也会被删除"
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
          <Input v-model:value="formState.name" placeholder="请输入项目名称" />
        </Form.Item>
        <Form.Item v-if="!editingId" label="代码" required>
          <Input v-model:value="formState.code" placeholder="请输入项目代码（唯一标识）" />
        </Form.Item>
        <Form.Item label="描述">
          <Input.TextArea v-model:value="formState.description" placeholder="请输入描述" :rows="2" />
        </Form.Item>
        <Form.Item label="图标">
          <Input v-model:value="formState.icon" placeholder="请输入图标（可选）" />
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
  </Page>
</template>
