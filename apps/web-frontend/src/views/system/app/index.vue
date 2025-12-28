<script setup lang="ts">
import type { ApplicationApi } from '#/api/system/application';

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

import {
  deleteApplicationApi,
  getApplicationListApi,
} from '#/api/system/application';

import AppFormModal from './components/AppFormModal.vue';

// 搜索参数
const searchParams = ref<ApplicationApi.ListParams>({
  page: 1,
  pageSize: 10,
  name: '',
  code: '',
  status: undefined,
});

// 表格数据
const tableData = ref<ApplicationApi.Application[]>([]);
const total = ref(0);
const loading = ref(false);

// 弹框引用
const appFormModalRef = ref<InstanceType<typeof AppFormModal>>();

// 表格列定义
const columns = [
  { title: '应用名称', dataIndex: 'name', key: 'name', width: 150 },
  { title: '应用编码', dataIndex: 'code', key: 'code', width: 120 },
  { title: '图标', dataIndex: 'icon', key: 'icon', width: 100 },
  { title: '排序', dataIndex: 'sort', key: 'sort', width: 80 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 80 },
  {
    title: '描述',
    dataIndex: 'description',
    key: 'description',
    ellipsis: true,
  },
  { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 180 },
  { title: '操作', key: 'action', width: 150, fixed: 'right' as const },
];

// 加载数据
async function loadData() {
  loading.value = true;
  try {
    const res = await getApplicationListApi(searchParams.value);
    tableData.value = res.list;
    total.value = res.total;
  } finally {
    loading.value = false;
  }
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
  appFormModalRef.value?.open();
}

// 编辑
function handleEdit(record: ApplicationApi.Application) {
  appFormModalRef.value?.open(record);
}

// 删除
async function handleDelete(id: number) {
  await deleteApplicationApi(id);
  message.success('删除成功');
  loadData();
}

// 初始化
loadData();
</script>

<template>
  <Page title="应用管理" description="管理系统应用，角色和菜单按应用区分">
    <Card>
      <!-- 搜索表单 -->
      <div class="mb-4 flex flex-wrap gap-4">
        <Input
          v-model:value="searchParams.name"
          placeholder="应用名称"
          style="width: 160px"
          allow-clear
        />
        <Input
          v-model:value="searchParams.code"
          placeholder="应用编码"
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
              <Button
                type="link"
                size="small"
                @click="handleEdit(record as ApplicationApi.Application)"
              >
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

    <!-- 应用表单弹框 -->
    <AppFormModal ref="appFormModalRef" @success="loadData" />
  </Page>
</template>
