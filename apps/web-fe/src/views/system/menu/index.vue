<script setup lang="ts">
import type { ApplicationApi } from '#/api/system/application';
import type { ResourceApi } from '#/api/system/resource';
import type { ColumnConfig } from '#/components/search-table';

import { ref } from 'vue';

import { Page } from '#/components/page';
import { IconifyIcon } from '@vben/icons';

import { Button, message, Popconfirm, Select, Space, Tag } from 'ant-design-vue';

import { deleteResourceApi, getResourceTreeApi } from '#/api';
import { getAllApplicationsApi } from '#/api/system/application';
import { Dict } from '#/components/dict';
import { SearchTable } from '#/components/search-table';

import MenuFormModal from './components/MenuFormModal.vue';

// 表格数据
const tableData = ref<ResourceApi.Resource[]>([]);
const loading = ref(false);

// 应用列表
const applications = ref<ApplicationApi.Application[]>([]);
// 当前选中的应用ID
const currentAppId = ref<number>();

// 弹框引用
const menuFormModalRef = ref<InstanceType<typeof MenuFormModal>>();

// 表格列配置
const columns: ColumnConfig[] = [
  { title: '菜单名称', dataIndex: 'name', key: 'name', width: 200 },
  { title: '权限标识', dataIndex: 'code', key: 'code', width: 180 },
  { title: '类型', dataIndex: 'type', key: 'type', width: 80 },
  { title: '路径', dataIndex: 'path', key: 'path', width: 180 },
  { title: '组件', dataIndex: 'component', key: 'component', width: 180, defaultShow: false },
  { title: '图标', dataIndex: 'icon', key: 'icon', width: 100 },
  { title: '排序', dataIndex: 'sort', key: 'sort', width: 80 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 80 },
  { title: '操作', key: 'action', width: 200, fixed: 'right' as const, fixedLock: true },
];

// 类型映射
const typeMap: Record<number, { color: string; text: string }> = {
  1: { text: '目录', color: 'blue' },
  2: { text: '菜单', color: 'green' },
  3: { text: '按钮', color: 'orange' },
};

// 加载应用列表
async function loadApplications() {
  applications.value = await getAllApplicationsApi();
  if (applications.value.length > 0 && !currentAppId.value) {
    currentAppId.value = applications.value[0]!.id;
    loadData();
  }
}

// 加载数据
async function loadData() {
  if (!currentAppId.value) return;
  loading.value = true;
  try {
    tableData.value = await getResourceTreeApi(currentAppId.value, true);
  } finally {
    loading.value = false;
  }
}

// 应用切换
function handleAppChange(appId: any) {
  currentAppId.value = appId;
  loadData();
}

// 新增
function handleAdd(parentId?: number) {
  if (!currentAppId.value) {
    message.warning('请先选择应用');
    return;
  }
  menuFormModalRef.value?.open({
    appId: currentAppId.value,
    resources: tableData.value,
    parentId,
  });
}

// 编辑
function handleEdit(record: ResourceApi.Resource) {
  menuFormModalRef.value?.open({
    appId: currentAppId.value!,
    resources: tableData.value,
    id: record.id,
  });
}

// 删除
async function handleDelete(id: number) {
  await deleteResourceApi(id);
  message.success('删除成功');
  loadData();
}

// 初始化
loadApplications();
</script>

<template>
  <Page auto-content-height>
    <SearchTable
      table-key="system-menu"
      :columns="columns"
      :data-source="tableData"
      :loading="loading"
      :show-pagination="false"
      :default-expand-all-rows="true"
      @add="handleAdd()"
    >
      <template #search="{ onChange }">
        <div class="flex items-center gap-2">
          <span class="text-gray-600 text-sm whitespace-nowrap">当前应用</span>
          <Select
            v-model:value="currentAppId"
            placeholder="请选择应用"
            style="width: 200px"
            @change="(val: any) => { handleAppChange(val); onChange?.(); }"
          >
            <Select.Option v-for="app in applications" :key="app.id" :value="app.id">
              {{ app.name }}
            </Select.Option>
          </Select>
        </div>
      </template>

      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'icon'">
          <IconifyIcon v-if="record.icon" :icon="record.icon" class="size-5" />
          <span v-else class="text-gray-400">-</span>
        </template>
        <template v-else-if="column.key === 'type'">
          <Tag :color="typeMap[record.type]?.color">
            {{ typeMap[record.type]?.text }}
          </Tag>
        </template>
        <template v-else-if="column.key === 'status'">
          <Dict code="sys_status" :value="record.status" />
        </template>
        <template v-else-if="column.key === 'action'">
          <Space>
            <Button v-if="record.type !== 3" type="link" size="small" @click="handleAdd(record.id)">
              新增
            </Button>
            <Button type="link" size="small" @click="handleEdit(record as ResourceApi.Resource)">
              编辑
            </Button>
            <Popconfirm title="确定删除吗？" @confirm="handleDelete(record.id)">
              <Button type="link" size="small" danger>删除</Button>
            </Popconfirm>
          </Space>
        </template>
      </template>
    </SearchTable>

    <MenuFormModal ref="menuFormModalRef" @success="loadData" />
  </Page>
</template>
