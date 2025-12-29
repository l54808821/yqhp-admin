<script setup lang="ts">
import type { DeptApi } from '#/api/system/dept';
import type { ColumnConfig } from '#/components/search-table';

import { ref } from 'vue';

import { Page, UserDisplay } from '@vben/common-ui';

import { Button, message, Popconfirm, Space } from 'ant-design-vue';

import { deleteDeptApi, getDeptTreeApi } from '#/api';
import { Dict } from '#/components/dict';
import { SearchTable } from '#/components/search-table';

import DeptFormModal from './components/DeptFormModal.vue';

// 表格列配置
const columns: ColumnConfig[] = [
  { title: '部门名称', dataIndex: 'name', key: 'name', width: 200 },
  { title: '部门编码', dataIndex: 'code', key: 'code', width: 120 },
  { title: '负责人', dataIndex: 'leader', key: 'leader', width: 100 },
  { title: '联系电话', dataIndex: 'phone', key: 'phone', width: 130 },
  { title: '邮箱', dataIndex: 'email', key: 'email', width: 180, defaultShow: false },
  { title: '排序', dataIndex: 'sort', key: 'sort', width: 80 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 80 },
  { title: '创建人', dataIndex: 'createdBy', key: 'createdBy', width: 120 },
  { title: '更新人', dataIndex: 'updatedBy', key: 'updatedBy', width: 120, defaultShow: false },
  { title: '操作', key: 'action', width: 200, fixed: 'right' as const, fixedLock: true },
];

// 表格数据
const tableData = ref<DeptApi.Dept[]>([]);
const loading = ref(false);

// 弹框引用
const deptFormModalRef = ref<InstanceType<typeof DeptFormModal>>();

// 加载数据
async function loadData() {
  loading.value = true;
  try {
    tableData.value = await getDeptTreeApi();
  } finally {
    loading.value = false;
  }
}

// 新增
function handleAdd(parentId?: number) {
  deptFormModalRef.value?.open({ depts: tableData.value, parentId });
}

// 编辑
function handleEdit(record: DeptApi.Dept) {
  deptFormModalRef.value?.open({ depts: tableData.value, id: record.id });
}

// 删除
async function handleDelete(id: number) {
  await deleteDeptApi(id);
  message.success('删除成功');
  loadData();
}

// 初始化
loadData();
</script>

<template>
  <Page auto-content-height>
    <SearchTable
      table-key="system-dept"
      :columns="columns"
      :data-source="tableData"
      :loading="loading"
      :show-pagination="false"
      :default-expand-all-rows="true"
      @add="handleAdd()"
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
            <Button type="link" size="small" @click="handleAdd(record.id)">新增</Button>
            <Button type="link" size="small" @click="handleEdit(record as DeptApi.Dept)">编辑</Button>
            <Popconfirm title="确定删除吗？" @confirm="handleDelete(record.id)">
              <Button type="link" size="small" danger>删除</Button>
            </Popconfirm>
          </Space>
        </template>
      </template>
    </SearchTable>

    <DeptFormModal ref="deptFormModalRef" @success="loadData" />
  </Page>
</template>
