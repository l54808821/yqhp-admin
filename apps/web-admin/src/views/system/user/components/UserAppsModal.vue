<script setup lang="ts">
import type { UserAppApi } from '#/api/system/user-app';

import { ref } from 'vue';

import { Modal, Table, Tag } from 'ant-design-vue';

import { getUserAppsApi, UserAppApi as UserAppApiNs } from '#/api';
import { Dict } from '#/components/dict';

// 弹框状态
const visible = ref(false);
const loading = ref(false);
const userId = ref(0);
const username = ref('');

// 表格数据
const tableData = ref<UserAppApi.UserApp[]>([]);

// 表格列定义
const columns = [
  { title: '应用名称', dataIndex: 'appName', key: 'appName', width: 150 },
  { title: '应用编码', dataIndex: 'appCode', key: 'appCode', width: 120 },
  { title: '注册来源', dataIndex: 'source', key: 'source', width: 100 },
  { title: '首次登录', dataIndex: 'firstLoginAt', key: 'firstLoginAt', width: 180 },
  { title: '最后登录', dataIndex: 'lastLoginAt', key: 'lastLoginAt', width: 180 },
  { title: '登录次数', dataIndex: 'loginCount', key: 'loginCount', width: 100 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 80 },
];

// 来源颜色映射
const sourceColorMap: Record<string, string> = {
  system: 'blue',
  oauth: 'purple',
  register: 'green',
  invite: 'orange',
};

// 加载数据
async function loadData() {
  loading.value = true;
  try {
    tableData.value = await getUserAppsApi(userId.value);
  } finally {
    loading.value = false;
  }
}

// 打开弹框
function open(id: number, name: string) {
  userId.value = id;
  username.value = name;
  visible.value = true;
  loadData();
}

// 暴露open方法
defineExpose({ open });
</script>

<template>
  <Modal
    v-model:open="visible"
    :title="`用户应用关联 - ${username}`"
    width="900px"
    :footer="null"
  >
    <Table
      :columns="columns"
      :data-source="tableData"
      :loading="loading"
      :pagination="false"
      row-key="id"
      size="middle"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'source'">
          <Tag :color="sourceColorMap[record.source] || 'default'">
            {{ UserAppApiNs.getSourceLabel(record.source) }}
          </Tag>
        </template>
        <template v-else-if="column.key === 'status'">
          <Dict code="sys_status" :value="record.status" />
        </template>
      </template>
    </Table>
  </Modal>
</template>
