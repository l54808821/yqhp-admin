<script setup lang="ts">
import type { TokenApi } from '#/api/system/token';
import type { ColumnConfig, SearchFieldConfig } from '#/components/search-table';

import { ref } from 'vue';

import { Page } from '#/components/page';

import { Button, Card, message, Popconfirm, TabPane, Tabs, Tag } from 'ant-design-vue';

import { clearLoginLogsApi, clearOperationLogsApi, getLoginLogsApi, getOperationLogsApi } from '#/api';
import { SearchTable } from '#/components/search-table';

// 当前标签
const activeTab = ref('login');

// 登录日志
const loginParams = ref<TokenApi.ListLoginLogsParams>({
  page: 1,
  pageSize: 10,
  username: '',
  status: undefined,
});
const loginData = ref<TokenApi.LoginLog[]>([]);
const loginTotal = ref(0);
const loginLoading = ref(false);

// 登录日志搜索字段
const loginSearchFields: SearchFieldConfig[] = [
  { field: 'username', label: '用户名', type: 'input', defaultValue: '' },
  {
    field: 'status',
    label: '状态',
    type: 'select',
    width: 120,
    defaultValue: undefined,
    options: [
      { label: '成功', value: 1 },
      { label: '失败', value: 0 },
    ],
  },
];

// 登录日志列配置
const loginColumns: ColumnConfig[] = [
  { title: '用户名', dataIndex: 'username', key: 'username', width: 120 },
  { title: 'IP地址', dataIndex: 'ip', key: 'ip', width: 130 },
  { title: '地点', dataIndex: 'location', key: 'location', width: 150 },
  { title: '浏览器', dataIndex: 'browser', key: 'browser', width: 120 },
  { title: '操作系统', dataIndex: 'os', key: 'os', width: 120 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 80 },
  { title: '消息', dataIndex: 'message', key: 'message', ellipsis: true },
  { title: '登录类型', dataIndex: 'loginType', key: 'loginType', width: 100 },
  { title: '登录时间', dataIndex: 'createdAt', key: 'createdAt', width: 180 },
];

// 操作日志
const operationParams = ref<TokenApi.ListOperationLogsParams>({
  page: 1,
  pageSize: 10,
  username: '',
  module: '',
  status: undefined,
});
const operationData = ref<TokenApi.OperationLog[]>([]);
const operationTotal = ref(0);
const operationLoading = ref(false);

// 操作日志搜索字段
const operationSearchFields: SearchFieldConfig[] = [
  { field: 'username', label: '用户名', type: 'input', defaultValue: '' },
  { field: 'module', label: '模块', type: 'input', defaultValue: '' },
  {
    field: 'status',
    label: '状态',
    type: 'select',
    width: 120,
    defaultValue: undefined,
    options: [
      { label: '成功', value: 1 },
      { label: '失败', value: 0 },
    ],
  },
];

// 操作日志列配置
const operationColumns: ColumnConfig[] = [
  { title: '用户名', dataIndex: 'username', key: 'username', width: 120 },
  { title: '模块', dataIndex: 'module', key: 'module', width: 100 },
  { title: '操作', dataIndex: 'action', key: 'action', width: 100 },
  { title: '方法', dataIndex: 'method', key: 'method', width: 80 },
  { title: '路径', dataIndex: 'path', key: 'path', width: 200 },
  { title: 'IP地址', dataIndex: 'ip', key: 'ip', width: 130 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 80 },
  { title: '耗时(ms)', dataIndex: 'duration', key: 'duration', width: 100 },
  { title: '操作时间', dataIndex: 'createdAt', key: 'createdAt', width: 180 },
];

// 加载登录日志
async function loadLoginLogs() {
  loginLoading.value = true;
  try {
    const res = await getLoginLogsApi(loginParams.value);
    loginData.value = res.list;
    loginTotal.value = res.total;
  } finally {
    loginLoading.value = false;
  }
}

// 加载操作日志
async function loadOperationLogs() {
  operationLoading.value = true;
  try {
    const res = await getOperationLogsApi(operationParams.value);
    operationData.value = res.list;
    operationTotal.value = res.total;
  } finally {
    operationLoading.value = false;
  }
}

// 登录日志搜索
function handleLoginSearch() {
  loginParams.value.page = 1;
  loadLoginLogs();
}

// 登录日志重置
function handleLoginReset() {
  loadLoginLogs();
}

// 登录日志分页变化
function handleLoginPageChange(page: number, pageSize: number) {
  loginParams.value.page = page;
  loginParams.value.pageSize = pageSize;
  loadLoginLogs();
}

// 清空登录日志
async function handleClearLoginLogs() {
  await clearLoginLogsApi();
  message.success('清空成功');
  loadLoginLogs();
}

// 操作日志搜索
function handleOperationSearch() {
  operationParams.value.page = 1;
  loadOperationLogs();
}

// 操作日志重置
function handleOperationReset() {
  loadOperationLogs();
}

// 操作日志分页变化
function handleOperationPageChange(page: number, pageSize: number) {
  operationParams.value.page = page;
  operationParams.value.pageSize = pageSize;
  loadOperationLogs();
}

// 清空操作日志
async function handleClearOperationLogs() {
  await clearOperationLogsApi();
  message.success('清空成功');
  loadOperationLogs();
}

// 标签切换
function handleTabChange(key: string | number) {
  if (key === 'login') {
    loadLoginLogs();
  } else {
    loadOperationLogs();
  }
}

// 初始化
loadLoginLogs();
</script>

<template>
  <Page auto-content-height>
    <Card class="log-card" :body-style="{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '16px' }">
      <Tabs v-model:active-key="activeTab" class="log-tabs" @change="handleTabChange">
        <TabPane key="login" tab="登录日志" class="h-full">
          <SearchTable
            table-key="system-log-login"
            v-model:search-params="loginParams"
            :search-fields="loginSearchFields"
            :columns="loginColumns"
            :data-source="loginData"
            :loading="loginLoading"
            :total="loginTotal"
            :page="loginParams.page"
            :page-size="loginParams.pageSize"
            :show-add="false"
            :use-card="false"
            @search="handleLoginSearch"
            @reset="handleLoginReset"
            @page-change="handleLoginPageChange"
          >
            <template #toolbar>
              <Popconfirm title="确定清空所有登录日志吗？" @confirm="handleClearLoginLogs">
                <Button danger>清空</Button>
              </Popconfirm>
            </template>

            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'status'">
                <Tag :color="record.status === 1 ? 'green' : 'red'">
                  {{ record.status === 1 ? '成功' : '失败' }}
                </Tag>
              </template>
            </template>
          </SearchTable>
        </TabPane>

        <TabPane key="operation" tab="操作日志" class="h-full">
          <SearchTable
            table-key="system-log-operation"
            v-model:search-params="operationParams"
            :search-fields="operationSearchFields"
            :columns="operationColumns"
            :data-source="operationData"
            :loading="operationLoading"
            :total="operationTotal"
            :page="operationParams.page"
            :page-size="operationParams.pageSize"
            :show-add="false"
            :use-card="false"
            @search="handleOperationSearch"
            @reset="handleOperationReset"
            @page-change="handleOperationPageChange"
          >
            <template #toolbar>
              <Popconfirm title="确定清空所有操作日志吗？" @confirm="handleClearOperationLogs">
                <Button danger>清空</Button>
              </Popconfirm>
            </template>

            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'status'">
                <Tag :color="record.status === 1 ? 'green' : 'red'">
                  {{ record.status === 1 ? '成功' : '失败' }}
                </Tag>
              </template>
            </template>
          </SearchTable>
        </TabPane>
      </Tabs>
    </Card>
  </Page>
</template>


<style scoped>
.log-card {
  height: 100%;
}

.log-tabs {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.log-tabs :deep(.ant-tabs-content-holder) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.log-tabs :deep(.ant-tabs-content) {
  flex: 1;
  min-height: 0;
  height: 100%;
}

.log-tabs :deep(.ant-tabs-tabpane) {
  height: 100%;
}
</style>
