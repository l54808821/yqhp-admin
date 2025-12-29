<script setup lang="ts">
import type { TokenApi } from '#/api/system/token';

import { ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Space,
  Table,
} from 'ant-design-vue';

import {
  disableUserApi,
  enableUserApi,
  getTokenListApi,
  kickOutApi,
} from '#/api';

// 搜索参数
const searchParams = ref<TokenApi.ListTokensParams>({
  page: 1,
  pageSize: 10,
  username: '',
});

// 表格数据
const tableData = ref<TokenApi.Token[]>([]);
const total = ref(0);
const loading = ref(false);

// 禁用弹框
const disableVisible = ref(false);
const disableUserId = ref(0);
const disableTime = ref(86_400); // 默认1天

// 表格列定义
const columns = [
  { title: '用户ID', dataIndex: 'userId', key: 'userId', width: 100 },
  { title: '设备', dataIndex: 'device', key: 'device', width: 100 },
  { title: '平台', dataIndex: 'platform', key: 'platform', width: 100 },
  { title: 'IP地址', dataIndex: 'ip', key: 'ip', width: 130 },
  {
    title: 'User-Agent',
    dataIndex: 'userAgent',
    key: 'userAgent',
    ellipsis: true,
  },
  { title: '过期时间', dataIndex: 'expireAt', key: 'expireAt', width: 180 },
  {
    title: '最后活跃',
    dataIndex: 'lastActiveAt',
    key: 'lastActiveAt',
    width: 180,
  },
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
    const res = await getTokenListApi(searchParams.value);
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
    username: '',
  };
  loadData();
}

// 分页变化
function handlePageChange(page: number, pageSize: number) {
  searchParams.value.page = page;
  searchParams.value.pageSize = pageSize;
  loadData();
}

// 踢人下线（根据Token记录ID踢出单个会话）
async function handleKickOut(tokenId: number) {
  await kickOutApi(tokenId);
  message.success('踢出成功');
  loadData();
}

// 打开禁用弹框
function handleOpenDisable(userId: number) {
  disableUserId.value = userId;
  disableTime.value = 86_400;
  disableVisible.value = true;
}

// 禁用用户
async function handleDisable() {
  await disableUserApi(disableUserId.value, disableTime.value);
  message.success('禁用成功');
  disableVisible.value = false;
  loadData();
}

// 解禁用户
async function handleEnable(userId: number) {
  await enableUserApi(userId);
  message.success('解禁成功');
  loadData();
}

// 初始化
loadData();
</script>

<template>
  <Page>
    <Card>
      <!-- 搜索表单 -->
      <div class="mb-4 flex flex-wrap gap-4">
        <Input
          v-model:value="searchParams.username"
          placeholder="用户名"
          style="width: 160px"
          allow-clear
        />
        <Space>
          <Button type="primary" @click="handleSearch">搜索</Button>
          <Button @click="handleReset">重置</Button>
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
        :scroll="{ x: 1300 }"
        row-key="id"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'action'">
            <Space>
              <Popconfirm
                title="确定踢出该会话吗？"
                @confirm="handleKickOut(record.id)"
              >
                <Button type="link" size="small">踢出</Button>
              </Popconfirm>
              <Button
                type="link"
                size="small"
                @click="handleOpenDisable(record.userId)"
              >
                禁用
              </Button>
              <Popconfirm
                title="确定解禁该用户吗？"
                @confirm="handleEnable(record.userId)"
              >
                <Button type="link" size="small">解禁</Button>
              </Popconfirm>
            </Space>
          </template>
        </template>
      </Table>
    </Card>

    <!-- 禁用弹框 -->
    <Modal v-model:open="disableVisible" title="禁用用户" @ok="handleDisable">
      <div class="py-4">
        <p class="mb-4">请输入禁用时长（秒），-1 表示永久禁用：</p>
        <InputNumber
          v-model:value="disableTime"
          :min="-1"
          style="width: 100%"
        />
        <p class="mt-2 text-sm text-gray-500">
          常用时长：3600（1小时）、86400（1天）、604800（1周）、-1（永久）
        </p>
      </div>
    </Modal>
  </Page>
</template>
