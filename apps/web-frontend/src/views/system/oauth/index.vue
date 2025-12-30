<script setup lang="ts">
import type { OAuthApi } from '#/api/system/oauth';
import type { ApplicationApi } from '#/api/system/application';

import { onMounted, ref } from 'vue';

import { UserDisplay } from '@vben/common-ui';

import { Page } from '#/components/page';
import { Dict } from '#/components/dict';

import {
  Button,
  Card,
  message,
  Popconfirm,
  Select,
  SelectOption,
  Space,
  Table,
  Tag,
} from 'ant-design-vue';

import {
  deleteOAuthProviderApi,
  getAllApplicationsApi,
  getOAuthProviderListApi,
} from '#/api';

import OauthFormModal from './components/OauthFormModal.vue';

// 搜索参数
const searchParams = ref<OAuthApi.ListParams>({
  page: 1,
  pageSize: 10,
  appId: undefined,
});

// 应用列表
const appList = ref<ApplicationApi.Application[]>([]);
const appMap = ref<Map<number, ApplicationApi.Application>>(new Map());

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
  { title: '所属应用', dataIndex: 'appId', key: 'appId', width: 120 },
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

// 加载应用列表
async function loadAppList() {
  try {
    const apps = await getAllApplicationsApi();
    appList.value = apps;
    appMap.value = new Map(apps.map((app) => [app.id, app]));
  } catch {
    console.error('加载应用列表失败');
  }
}

// 获取应用名称
function getAppName(appId: number | null): string {
  if (appId === null || appId === 0) {
    return '全局配置';
  }
  return appMap.value.get(appId)?.name || `应用${appId}`;
}

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

// 应用筛选变化
function handleAppChange(appId: number | undefined) {
  searchParams.value.appId = appId;
  searchParams.value.page = 1;
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
onMounted(async () => {
  await loadAppList();
  loadData();
});
</script>

<template>
  <Page>
    <Card>
      <!-- 搜索区域 -->
      <div class="mb-4 flex items-center gap-4">
        <div class="flex items-center gap-2">
          <span class="text-gray-600">所属应用：</span>
          <Select
            v-model:value="searchParams.appId"
            placeholder="全部"
            allow-clear
            style="width: 200px"
            @change="handleAppChange"
          >
            <SelectOption :value="0">全局配置</SelectOption>
            <SelectOption
              v-for="app in appList"
              :key="app.id"
              :value="app.id"
            >
              {{ app.name }}
            </SelectOption>
          </Select>
        </div>
        <div class="flex-1"></div>
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
        :scroll="{ x: 1400 }"
        row-key="id"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'appId'">
            <Tag v-if="record.appId === null || record.appId === 0" color="blue">
              全局配置
            </Tag>
            <Tag v-else color="green">
              {{ getAppName(record.appId) }}
            </Tag>
          </template>
          <template v-else-if="column.key === 'status'">
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
              <Button type="link" size="small" @click="handleEdit(record as OAuthApi.Provider)">
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
