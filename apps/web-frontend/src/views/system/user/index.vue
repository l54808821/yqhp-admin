<script setup lang="ts">
import type { UserApi } from '#/api/system/user';

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
  Tag,
  Tooltip,
} from 'ant-design-vue';

import {
  deleteUserApi,
  getDeptTreeApi,
  getUserListApi,
  resetPasswordApi,
} from '#/api';
import { UserApi as UserApiNs } from '#/api/system/user';

import UserFormModal from './components/UserFormModal.vue';

// 搜索参数
const searchParams = ref<UserApi.ListParams>({
  page: 1,
  pageSize: 10,
  username: '',
  nickname: '',
  phone: '',
  status: undefined,
  deptId: undefined,
});

// 表格数据
const tableData = ref<UserApi.User[]>([]);
const total = ref(0);
const loading = ref(false);

// 角色和部门数据
const depts = ref<any[]>([]);

// 弹框引用
const userFormModalRef = ref<InstanceType<typeof UserFormModal>>();

// 表格列定义
const columns = [
  { title: '用户名', dataIndex: 'username', key: 'username', width: 120 },
  { title: '昵称', dataIndex: 'nickname', key: 'nickname', width: 120 },
  { title: '手机号', dataIndex: 'phone', key: 'phone', width: 130 },
  { title: '邮箱', dataIndex: 'email', key: 'email', width: 180 },
  {
    title: '来源平台',
    dataIndex: 'platform',
    key: 'platform',
    width: 100,
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 80,
  },
  {
    title: '角色',
    dataIndex: 'roles',
    key: 'roles',
    width: 200,
  },
  { title: '创建人', dataIndex: 'createdBy', key: 'createdBy', width: 120 },
  { title: '更新人', dataIndex: 'updatedBy', key: 'updatedBy', width: 120 },
  { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 180 },
  {
    title: '操作',
    key: 'action',
    width: 200,
    fixed: 'right' as const,
  },
];

// 加载数据
async function loadData() {
  loading.value = true;
  try {
    const res = await getUserListApi(searchParams.value);
    tableData.value = res.list;
    total.value = res.total;
  } finally {
    loading.value = false;
  }
}

// 加载部门
async function loadDepts() {
  const deptsRes = await getDeptTreeApi();
  depts.value = deptsRes;
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
    username: '',
    nickname: '',
    phone: '',
    status: undefined,
    deptId: undefined,
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
  userFormModalRef.value?.open({ depts: depts.value });
}

// 编辑
function handleEdit(record: UserApi.User) {
  userFormModalRef.value?.open({
    depts: depts.value,
    id: record.id,
  });
}

// 删除
async function handleDelete(id: number) {
  await deleteUserApi(id);
  message.success('删除成功');
  loadData();
}

// 重置密码
async function handleResetPassword(id: number) {
  await resetPasswordApi(id);
  message.success('密码重置成功，新密码为：123456');
}

// 初始化
loadData();
loadDepts();
</script>

<template>
  <Page title="用户管理" description="管理系统用户">
    <Card>
      <!-- 搜索表单 -->
      <div class="mb-4 flex flex-wrap gap-4">
        <Input
          v-model:value="searchParams.username"
          placeholder="用户名"
          style="width: 160px"
          allow-clear
        />
        <Input
          v-model:value="searchParams.nickname"
          placeholder="昵称"
          style="width: 160px"
          allow-clear
        />
        <Input
          v-model:value="searchParams.phone"
          placeholder="手机号"
          style="width: 160px"
          allow-clear
        />
        <Select
          v-model:value="searchParams.status"
          placeholder="状态"
          style="width: 120px"
          allow-clear
        >
          <Select.Option :value="1">启用</Select.Option>
          <Select.Option :value="0">禁用</Select.Option>
        </Select>
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
        :scroll="{ x: 1200 }"
        row-key="id"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'platform'">
            <Tooltip v-if="record.platformUid || record.platformShortId">
              <template #title>
                <div v-if="record.platformUid">UID: {{ record.platformUid }}</div>
                <div v-if="record.platformShortId">短码: {{ record.platformShortId }}</div>
              </template>
              <Tag color="purple">
                {{ UserApiNs.getPlatformLabel(record.platform) }}
              </Tag>
            </Tooltip>
            <Tag v-else color="purple">
              {{ UserApiNs.getPlatformLabel(record.platform) }}
            </Tag>
          </template>
          <template v-else-if="column.key === 'status'">
            <Tag :color="record.status === 1 ? 'green' : 'red'">
              {{ record.status === 1 ? '启用' : '禁用' }}
            </Tag>
          </template>
          <template v-else-if="column.key === 'roles'">
            <Space>
              <Tag v-for="role in record.roles" :key="role.id" color="blue">
                {{ role.name }}
              </Tag>
            </Space>
          </template>
          <template v-else-if="column.key === 'createdBy'">
            <UserDisplay :user-id="record.createdBy" />
          </template>
          <template v-else-if="column.key === 'updatedBy'">
            <UserDisplay :user-id="record.updatedBy" />
          </template>
          <template v-else-if="column.key === 'action'">
            <Space>
              <Button
                type="link"
                size="small"
                @click="handleEdit(record as UserApi.User)"
              >
                编辑
              </Button>
              <Popconfirm
                title="确定重置密码吗？"
                @confirm="handleResetPassword(record.id)"
              >
                <Button type="link" size="small">重置密码</Button>
              </Popconfirm>
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

    <!-- 用户表单弹框 -->
    <UserFormModal ref="userFormModalRef" @success="loadData" />
  </Page>
</template>
