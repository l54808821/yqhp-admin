<script setup lang="ts">
import type { UserApi } from '#/api/system/user';
import type { ColumnConfig, SearchFieldConfig } from '#/components/search-table';

import { ref } from 'vue';

import { UserDisplay } from '@vben/common-ui';

import { Page } from '#/components/page';

import {
  Button,
  message,
  Popconfirm,
  Space,
  Tag,
} from 'ant-design-vue';

import {
  deleteUserApi,
  getDeptTreeApi,
  getUserListApi,
  resetPasswordApi,
} from '#/api';
import { Dict } from '#/components/dict';
import { SearchTable } from '#/components/search-table';

import UserAppsModal from './components/UserAppsModal.vue';
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

// 搜索字段配置
const searchFields: SearchFieldConfig[] = [
  { field: 'username', label: '用户名', type: 'input', defaultValue: '' },
  { field: 'nickname', label: '昵称', type: 'input', defaultValue: '' },
  { field: 'phone', label: '手机号', type: 'input', defaultValue: '' },
  { field: 'status', label: '状态', type: 'dict', dictCode: 'sys_status', width: 120, defaultValue: undefined },
];

// 表格列配置
const columns: ColumnConfig[] = [
  { title: '用户名', dataIndex: 'username', key: 'username', width: 120 },
  { title: '昵称', dataIndex: 'nickname', key: 'nickname', width: 120 },
  { title: '手机号', dataIndex: 'phone', key: 'phone', width: 130 },
  { title: '邮箱', dataIndex: 'email', key: 'email', width: 180, defaultShow: false },
  { title: '状态', dataIndex: 'status', key: 'status', width: 80 },
  { title: '角色', dataIndex: 'roles', key: 'roles', width: 200 },
  { title: '创建人', dataIndex: 'createdBy', key: 'createdBy', width: 120 },
  { title: '更新人', dataIndex: 'updatedBy', key: 'updatedBy', width: 120, defaultShow: false },
  { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 180 },
  { title: '操作', key: 'action', width: 250, fixed: 'right' as const, fixedLock: true },
];

// 表格数据
const tableData = ref<UserApi.User[]>([]);
const total = ref(0);
const loading = ref(false);

// 部门数据
const depts = ref<any[]>([]);

// 弹框引用
const userFormModalRef = ref<InstanceType<typeof UserFormModal>>();
const userAppsModalRef = ref<InstanceType<typeof UserAppsModal>>();

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
  depts.value = await getDeptTreeApi();
}

// 搜索
function handleSearch() {
  searchParams.value.page = 1;
  loadData();
}

// 重置
function handleReset() {
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
  userFormModalRef.value?.open({ depts: depts.value, id: record.id });
}

// 查看应用关联
function handleViewApps(record: UserApi.User) {
  userAppsModalRef.value?.open(record.id, record.username);
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
  <Page auto-content-height>
    <SearchTable
      table-key="system-user"
      v-model:search-params="searchParams"
      :search-fields="searchFields"
      :columns="columns"
      :data-source="tableData"
      :loading="loading"
      :total="total"
      :page="searchParams.page"
      :page-size="searchParams.pageSize"
      @search="handleSearch"
      @reset="handleReset"
      @add="handleAdd"
      @page-change="handlePageChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'status'">
          <Dict code="sys_status" :value="record.status" />
        </template>
        <template v-else-if="column.key === 'roles'">
          <Space>
            <Tag v-for="role in record.roles" :key="role.id" color="blue">{{ role.name }}</Tag>
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
            <Button type="link" size="small" @click="handleEdit(record as UserApi.User)">编辑</Button>
            <Button type="link" size="small" @click="handleViewApps(record as UserApi.User)">应用</Button>
            <Popconfirm title="确定重置密码吗？" @confirm="handleResetPassword(record.id)">
              <Button type="link" size="small">重置密码</Button>
            </Popconfirm>
            <Popconfirm title="确定删除吗？" @confirm="handleDelete(record.id)">
              <Button type="link" size="small" danger>删除</Button>
            </Popconfirm>
          </Space>
        </template>
      </template>
    </SearchTable>

    <UserFormModal ref="userFormModalRef" @success="loadData" />
    <UserAppsModal ref="userAppsModalRef" />
  </Page>
</template>
