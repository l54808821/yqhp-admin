<script setup lang="ts">
import type { OAuthApi } from '#/api/system/oauth';
import type { ApplicationApi } from '#/api/system/application';
import type { ColumnConfig, SearchFieldConfig } from '#/components/search-table';

import { onMounted, ref } from 'vue';

import { UserDisplay } from '@vben/common-ui';

import { Page } from '#/components/page';
import { Dict } from '#/components/dict';
import { SearchTable } from '#/components/search-table';

import {
  Button,
  message,
  Popconfirm,
  Space,
  Tag,
} from 'ant-design-vue';

import {
  deleteOAuthProviderApi,
  getAllApplicationsApi,
  getOAuthProviderListApi,
} from '#/api';

import OauthFormModal from './components/OauthFormModal.vue';

// 应用列表（用于下拉选项和名称映射）
const appList = ref<ApplicationApi.Application[]>([]);
const appMap = ref<Map<number, ApplicationApi.Application>>(new Map());

// 搜索参数
const searchParams = ref<OAuthApi.ListParams>({
  page: 1,
  pageSize: 10,
  name: '',
  status: undefined,
  appId: undefined,
});

// 搜索字段配置
const searchFields: SearchFieldConfig[] = [
  { field: 'name', label: '名称', type: 'input', defaultValue: '' },
  { field: 'status', label: '状态', type: 'dict', dictCode: 'sys_status', width: 120, defaultValue: undefined },
];

// 表格列配置
const columns: ColumnConfig[] = [
  { title: '名称', dataIndex: 'name', key: 'name', width: 120 },
  { title: '编码', dataIndex: 'code', key: 'code', width: 100 },
  { title: '所属应用', dataIndex: 'appId', key: 'appId', width: 120 },
  { title: '客户端ID', dataIndex: 'clientId', key: 'clientId', width: 200 },
  { title: '回调地址', dataIndex: 'redirectUri', key: 'redirectUri', ellipsis: true },
  { title: '排序', dataIndex: 'sort', key: 'sort', width: 80 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 80 },
  { title: '创建人', dataIndex: 'createdBy', key: 'createdBy', width: 120 },
  { title: '更新人', dataIndex: 'updatedBy', key: 'updatedBy', width: 120, defaultShow: false },
  { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 180 },
  { title: '操作', key: 'action', width: 150, fixed: 'right' as const, fixedLock: true },
];

// 表格数据
const tableData = ref<OAuthApi.Provider[]>([]);
const total = ref(0);
const loading = ref(false);

// 弹框引用
const oauthFormModalRef = ref<InstanceType<typeof OauthFormModal>>();

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
  <Page auto-content-height>
    <SearchTable
      table-key="system-oauth"
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
    </SearchTable>

    <!-- OAuth表单弹框 -->
    <OauthFormModal ref="oauthFormModalRef" @success="loadData" />
  </Page>
</template>
