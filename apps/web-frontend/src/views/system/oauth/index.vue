<script setup lang="ts">
import type { OAuthApi } from '#/api/system/oauth';

import { ref } from 'vue';

import { Page, UserDisplay } from '@vben/common-ui';

import {
  Button,
  Card,
  message,
  Popconfirm,
  Space,
  Table,
} from 'ant-design-vue';

import { deleteOAuthProviderApi, getOAuthProviderListApi } from '#/api';

import OauthFormModal from './components/OauthFormModal.vue';

// 搜索参数
const searchParams = ref({
  page: 1,
  pageSize: 10,
});

// 表格数据
const tableData = ref<OAuthApi.Provider[]>([]);
const total = ref(0);
const loading = ref(false);

// 弹框引用
const oauthFormModalRef = ref<InstanceType<typeof OauthFormModal>>();

// 表格列定义
const columns = [
  { title: '名称', dataIndex: 'name', key: 'name', width: 120 },
  { title: '编码', dataIndex: 'code', key: 'code', width: 100 },
  { title: '客户端ID', dataIndex: 'clientId', key: 'clientId', width: 200 },
  {
    title: '回调地址',
    dataIndex: 'redirectUri',
    key: 'redirectUri',
    ellipsis: true,
  },
  { title: '排序', dataIndex: 'sort', key: 'sort', width: 80 },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 80,
  },
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
    const res = await getOAuthProviderListApi(searchParams.value);
    tableData.value = res.list;
    total.value = res.total;
  } finally {
    loading.value = false;
  }
}

// 分页变化
function handlePageChange(page: number, pageSize: number) {
  searchParams.value.page = page;
  searchParams.value.pageSize = pageSize;
  loadData();
}

// 新增
function handleAdd() {
  oauthFormModalRef.value?.open();
}

// 编辑
function handleEdit(record: OAuthApi.Provider) {
  oauthFormModalRef.value?.open(record.code);
}

// 删除
async function handleDelete(id: number) {
  await deleteOAuthProviderApi(id);
  message.success('删除成功');
  loadData();
}

// 初始化
loadData();
</script>

<template>
  <Page>
    <Card>
      <!-- 操作按钮 -->
      <div class="mb-4">
        <Button type="primary" @click="handleAdd">新增</Button>
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

    <!-- OAuth表单弹框 -->
    <OauthFormModal ref="oauthFormModalRef" @success="loadData" />
  </Page>
</template>
