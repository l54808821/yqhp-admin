<script setup lang="ts">
import type { RoleApi } from '#/api/system/role';

import { ref } from 'vue';

import { Page } from '@vben/common-ui';

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
} from 'ant-design-vue';

import { deleteRoleApi, getResourceTreeApi, getRoleListApi } from '#/api';

import RoleFormModal from './role-form-modal.vue';

// 搜索参数
const searchParams = ref<RoleApi.ListParams>({
  page: 1,
  pageSize: 10,
  name: '',
  code: '',
  status: undefined,
});

// 表格数据
const tableData = ref<RoleApi.Role[]>([]);
const total = ref(0);
const loading = ref(false);

// 资源树
const resources = ref<any[]>([]);

// 弹框引用
const roleFormModalRef = ref<InstanceType<typeof RoleFormModal>>();

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
  { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 180 },
  {
    title: '操作',
    key: 'action',
    width: 150,
    fixed: 'right' as const,
  },
];

// 加载数据
async function loadData() {
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
  resources.value = await getResourceTreeApi();
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
  roleFormModalRef.value?.open({ resources: resources.value });
}

// 编辑
function handleEdit(record: RoleApi.Role) {
  roleFormModalRef.value?.open({
    resources: resources.value,
    record,
  });
}

// 删除
async function handleDelete(id: number) {
  await deleteRoleApi(id);
  message.success('删除成功');
  loadData();
}

// 初始化
loadData();
loadResources();
</script>

<template>
  <Page title="角色管理" description="管理系统角色和权限">
    <Card>
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
          total: total,
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
            <Tag :color="record.status === 1 ? 'green' : 'red'">
              {{ record.status === 1 ? '启用' : '禁用' }}
            </Tag>
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

    <!-- 角色表单弹框 -->
    <RoleFormModal ref="roleFormModalRef" @success="loadData" />
  </Page>
</template>

