<script setup lang="ts">
import type { DeptApi } from '#/api/system/dept';

import { ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  message,
  Popconfirm,
  Space,
  Table,
  Tag,
} from 'ant-design-vue';

import { deleteDeptApi, getDeptTreeApi } from '#/api';

import DeptFormModal from './components/DeptFormModal.vue';

// 表格数据
const tableData = ref<DeptApi.Dept[]>([]);
const loading = ref(false);

// 弹框引用
const deptFormModalRef = ref<InstanceType<typeof DeptFormModal>>();

// 表格列定义
const columns = [
  { title: '部门名称', dataIndex: 'name', key: 'name', width: 200 },
  { title: '部门编码', dataIndex: 'code', key: 'code', width: 120 },
  { title: '负责人', dataIndex: 'leader', key: 'leader', width: 100 },
  { title: '联系电话', dataIndex: 'phone', key: 'phone', width: 130 },
  { title: '邮箱', dataIndex: 'email', key: 'email', width: 180 },
  { title: '排序', dataIndex: 'sort', key: 'sort', width: 80 },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 80,
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
    tableData.value = await getDeptTreeApi();
  } finally {
    loading.value = false;
  }
}

// 新增
function handleAdd(parentId?: number) {
  deptFormModalRef.value?.open({
    depts: tableData.value,
    parentId,
  });
}

// 编辑
function handleEdit(record: DeptApi.Dept) {
  deptFormModalRef.value?.open({
    depts: tableData.value,
    record,
  });
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
  <Page title="部门管理" description="管理组织架构和部门">
    <Card>
      <!-- 操作按钮 -->
      <div class="mb-4">
        <Button type="primary" @click="handleAdd()">新增</Button>
      </div>

      <!-- 表格 -->
      <Table
        :columns="columns"
        :data-source="tableData"
        :loading="loading"
        :pagination="false"
        :scroll="{ x: 1200 }"
        row-key="id"
        size="middle"
        default-expand-all-rows
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <Tag :color="record.status === 1 ? 'green' : 'red'">
              {{ record.status === 1 ? '启用' : '禁用' }}
            </Tag>
          </template>
          <template v-else-if="column.key === 'action'">
            <Space>
              <Button type="link" size="small" @click="handleAdd(record.id)">
                新增
              </Button>
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

    <!-- 部门表单弹框 -->
    <DeptFormModal ref="deptFormModalRef" @success="loadData" />
  </Page>
</template>
