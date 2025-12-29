<script setup lang="ts">
import type { ApplicationApi } from '#/api/system/application';
import type { RoleApi } from '#/api/system/role';

import { ref } from 'vue';

import { Page, UserDisplay } from '@vben/common-ui';

import {
  Button,
  Card,
  Input,
  message,
  Popconfirm,
  Select,
  Space,
  Table,
} from 'ant-design-vue';

import { deleteRoleApi, getResourceTreeApi, getRoleListApi } from '#/api';
import { getAllApplicationsApi } from '#/api/system/application';

import RoleFormDrawer from './components/RoleFormDrawer.vue';

// 搜索参数
const searchParams = ref<RoleApi.ListParams>({
  page: 1,
  pageSize: 10,
  appId: undefined,
  name: '',
  code: '',
  status: undefined,
});

// 表格数据
const tableData = ref<RoleApi.Role[]>([]);
const total = ref(0);
const loading = ref(false);

// 应用列表
const applications = ref<ApplicationApi.Application[]>([]);
// 当前选中的应用ID
const currentAppId = ref<number>();

// 资源树
const resources = ref<any[]>([]);

// 抽屉引用
const roleFormDrawerRef = ref<InstanceType<typeof RoleFormDrawer>>();

// 表格列定义
const columns = [
  { title: '角色名称', dataIndex: 'name', key: 'name', width: 150 },
  { title: '角色编码', dataIndex: 'code', key: 'code', width: 150 },
  { title: '排序', dataIndex: 'sort', key: 'sort', width: 80 },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 80,
  },
  { title: '备注', dataIndex: 'remark', key: 'remark', ellipsis: true },
  { title: '创建人', dataIndex: 'createdBy', key: 'createdBy', width: 120 },
  { title: '更新人', dataIndex: 'updatedBy', key: 'updatedBy', width: 120 },
  { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 180 },
  {
    title: '操作',
    key: 'action',
    width: 150,
    fixed: 'right' as const,
  },
];

// 加载应用列表
async function loadApplications() {
  applications.value = await getAllApplicationsApi();
  // 默认选中第一个应用
  if (applications.value.length > 0 && !currentAppId.value) {
    currentAppId.value = applications.value[0]!.id;
    searchParams.value.appId = currentAppId.value;
    loadData();
    loadResources();
  }
}

// 加载数据
async function loadData() {
  if (!currentAppId.value) return;
  loading.value = true;
  try {
    const res = await getRoleListApi(searchParams.value);
    tableData.value = res.list;
    total.value = res.total;
  } finally {
    loading.value = false;
  }
}

// 加载资源树
async function loadResources() {
  if (!currentAppId.value) return;
  resources.value = await getResourceTreeApi(currentAppId.value);
}

// 应用切换
function handleAppChange(appId: number) {
  currentAppId.value = appId;
  searchParams.value.appId = appId;
  searchParams.value.page = 1;
  loadData();
  loadResources();
}

// 搜索
function handleSearch() {
  searchParams.value.page = 1;
  loadData();
}

// 重置
function handleReset() {
  searchParams.value = {
    page: 1,
    pageSize: 10,
    appId: currentAppId.value,
    name: '',
    code: '',
    status: undefined,
  };
  loadData();
}

// 分页变化
function handlePageChange(page: number, pageSize: number) {
  searchParams.value.page = page;
  searchParams.value.pageSize = pageSize;
  loadData();
}

// 新增
function handleAdd() {
  if (!currentAppId.value) {
    message.warning('请先选择应用');
    return;
  }
  roleFormDrawerRef.value?.open({
    appId: currentAppId.value,
    resources: resources.value,
  });
}

// 编辑
function handleEdit(record: RoleApi.Role) {
  roleFormDrawerRef.value?.open({
    appId: currentAppId.value!,
    resources: resources.value,
    id: record.id,
  });
}

// 删除
async function handleDelete(id: number) {
  await deleteRoleApi(id);
  message.success('删除成功');
  loadData();
}

// 初始化
loadApplications();
</script>

<template>
  <Page>
    <Card>
      <!-- 应用选择 -->
      <div class="mb-4">
        <span class="mr-2">当前应用：</span>
        <Select
          v-model:value="currentAppId"
          placeholder="请选择应用"
          style="width: 200px"
          @change="handleAppChange"
        >
          <Select.Option
            v-for="app in applications"
            :key="app.id"
            :value="app.id"
          >
            {{ app.name }}
          </Select.Option>
        </Select>
      </div>

      <!-- 搜索表单 -->
      <div class="mb-4 flex flex-wrap gap-4">
        <Input
          v-model:value="searchParams.name"
          placeholder="角色名称"
          style="width: 160px"
          allow-clear
        />
        <Input
          v-model:value="searchParams.code"
          placeholder="角色编码"
          style="width: 160px"
          allow-clear
        />
        <Dict
          type="select"
          v-model:value="searchParams.status"
          code="sys_status"
          placeholder="状态"
          style="width: 120px"
        />
        <Space>
          <Button type="primary" @click="handleSearch">搜索</Button>
          <Button @click="handleReset">重置</Button>
          <Button type="primary" @click="handleAdd">新增</Button>
        </Space>
      </div>

      <!-- 表格 -->
      <Table
        :columns="columns"
        :data-source="tableData"
        :loading="loading"
        :pagination="{
          current: searchParams.page,
          pageSize: searchParams.pageSize,
          total,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (t: number) => `共 ${t} 条`,
          onChange: handlePageChange,
        }"
        :scroll="{ x: 1000 }"
        row-key="id"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <Dict code="sys_status" :value="record.status" />
          </template>
          <template v-else-if="column.key === 'createdBy'">
            <UserDisplay :user-id="record.createdBy" />
          </template>
          <template v-else-if="column.key === 'updatedBy'">
            <UserDisplay :user-id="record.updatedBy" />
          </template>
          <template v-else-if="column.key === 'action'">
            <Space>
              <Button type="link" size="small" @click="handleEdit(record)">
                编辑
              </Button>
              <Popconfirm
                title="确定删除吗？"
                @confirm="handleDelete(record.id)"
              >
                <Button type="link" size="small" danger>删除</Button>
              </Popconfirm>
            </Space>
          </template>
        </template>
      </Table>
    </Card>

    <!-- 角色表单抽屉 -->
    <RoleFormDrawer ref="roleFormDrawerRef" @success="loadData" />
  </Page>
</template>
