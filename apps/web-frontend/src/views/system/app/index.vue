<script setup lang="ts">
import type { ApplicationApi } from '#/api/system/application';
import type { ColumnConfig, SearchFieldConfig } from '#/components/search-table';

import { ref } from 'vue';

import { Page, UserDisplay } from '@vben/common-ui';

import { Button, message, Popconfirm, Space } from 'ant-design-vue';

import { deleteApplicationApi, getApplicationListApi } from '#/api/system/application';
import { Dict } from '#/components/dict';
import { SearchTable } from '#/components/search-table';

import AppFormModal from './components/AppFormModal.vue';

// 搜索参数
const searchParams = ref<ApplicationApi.ListParams>({
  page: 1,
  pageSize: 10,
  name: '',
  code: '',
  status: undefined,
});

// 搜索字段配置
const searchFields: SearchFieldConfig[] = [
  { field: 'name', label: '应用名称', type: 'input', defaultValue: '' },
  { field: 'code', label: '应用编码', type: 'input', defaultValue: '' },
  { field: 'status', label: '状态', type: 'dict', dictCode: 'sys_status', width: 120, defaultValue: undefined },
];

// 表格列配置
const columns: ColumnConfig[] = [
  { title: '应用名称', dataIndex: 'name', key: 'name', width: 150 },
  { title: '应用编码', dataIndex: 'code', key: 'code', width: 120 },
  { title: '图标', dataIndex: 'icon', key: 'icon', width: 100 },
  { title: '排序', dataIndex: 'sort', key: 'sort', width: 80 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 80 },
  { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
  { title: '创建人', dataIndex: 'createdBy', key: 'createdBy', width: 120 },
  { title: '更新人', dataIndex: 'updatedBy', key: 'updatedBy', width: 120, defaultShow: false },
  { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 180 },
  { title: '操作', key: 'action', width: 150, fixed: 'right' as const, fixedLock: true },
];

// 表格数据
const tableData = ref<ApplicationApi.Application[]>([]);
const total = ref(0);
const loading = ref(false);

// 弹框引用
const appFormModalRef = ref<InstanceType<typeof AppFormModal>>();

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
  appFormModalRef.value?.open(record.id);
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
  <Page auto-content-height>
    <SearchTable
      table-key="system-app"
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
            <Button type="link" size="small" @click="handleEdit(record as ApplicationApi.Application)">编辑</Button>
            <Popconfirm title="确定删除吗？" @confirm="handleDelete(record.id)">
              <Button type="link" size="small" danger>删除</Button>
            </Popconfirm>
          </Space>
        </template>
      </template>
    </SearchTable>

    <AppFormModal ref="appFormModalRef" @success="loadData" />
  </Page>
</template>
