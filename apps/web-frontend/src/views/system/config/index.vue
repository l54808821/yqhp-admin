<script setup lang="ts">
import type { ConfigApi } from '#/api/system/config';

import { ref } from 'vue';

import { Page, UserDisplay } from '@vben/common-ui';

import {
  Button,
  Card,
  Input,
  message,
  Popconfirm,
  Space,
  Table,
  Tag,
} from 'ant-design-vue';

import { deleteConfigApi, getConfigListApi, refreshConfigApi } from '#/api';

import ConfigFormModal from './components/ConfigFormModal.vue';

// 搜索参数
const searchParams = ref<ConfigApi.ListParams>({
  page: 1,
  pageSize: 10,
  name: '',
  key: '',
});

// 表格数据
const tableData = ref<ConfigApi.Config[]>([]);
const total = ref(0);
const loading = ref(false);

// 弹框引用
const configFormModalRef = ref<InstanceType<typeof ConfigFormModal>>();

// 表格列定义
const columns = [
  { title: '参数名称', dataIndex: 'name', key: 'name', width: 150 },
  { title: '参数键', dataIndex: 'key', key: 'key', width: 180 },
  { title: '参数值', dataIndex: 'value', key: 'value', ellipsis: true },
  { title: '类型', dataIndex: 'type', key: 'type', width: 100 },
  {
    title: '内置',
    dataIndex: 'isBuilt',
    key: 'isBuilt',
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

// 加载数据
async function loadData() {
  loading.value = true;
  try {
    const res = await getConfigListApi(searchParams.value);
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
    key: '',
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
  configFormModalRef.value?.open({});
}

// 编辑
function handleEdit(record: ConfigApi.Config) {
  configFormModalRef.value?.open({ record });
}

// 删除
async function handleDelete(id: number) {
  await deleteConfigApi(id);
  message.success('删除成功');
  loadData();
}

// 刷新缓存
async function handleRefresh() {
  await refreshConfigApi();
  message.success('刷新成功');
}

// 初始化
loadData();
</script>

<template>
  <Page title="参数配置" description="管理系统参数配置">
    <Card>
      <!-- 搜索表单 -->
      <div class="mb-4 flex flex-wrap gap-4">
        <Input
          v-model:value="searchParams.name"
          placeholder="参数名称"
          style="width: 160px"
          allow-clear
        />
        <Input
          v-model:value="searchParams.key"
          placeholder="参数键"
          style="width: 160px"
          allow-clear
        />
        <Space>
          <Button type="primary" @click="handleSearch">搜索</Button>
          <Button @click="handleReset">重置</Button>
          <Button type="primary" @click="handleAdd">新增</Button>
          <Button @click="handleRefresh">刷新缓存</Button>
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
          <template v-if="column.key === 'isBuilt'">
            <Tag v-if="record.isBuilt" color="blue">是</Tag>
            <span v-else>否</span>
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
                v-if="!record.isBuilt"
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

    <!-- 配置表单弹框 -->
    <ConfigFormModal ref="configFormModalRef" @success="loadData" />
  </Page>
</template>
