<script setup lang="ts">
import type { ResourceApi } from '#/api/system/resource';

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

import { deleteResourceApi, getResourceTreeApi } from '#/api';

import MenuFormModal from './menu-form-modal.vue';

// 表格数据
const tableData = ref<ResourceApi.Resource[]>([]);
const loading = ref(false);

// 弹框引用
const menuFormModalRef = ref<InstanceType<typeof MenuFormModal>>();

// 表格列定义
const columns = [
  { title: '菜单名称', dataIndex: 'name', key: 'name', width: 200 },
  { title: '权限标识', dataIndex: 'code', key: 'code', width: 180 },
  {
    title: '类型',
    dataIndex: 'type',
    key: 'type',
    width: 80,
  },
  { title: '路径', dataIndex: 'path', key: 'path', width: 180 },
  { title: '组件', dataIndex: 'component', key: 'component', width: 180 },
  { title: '图标', dataIndex: 'icon', key: 'icon', width: 100 },
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

// 类型映射
const typeMap: Record<number, { color: string; text: string }> = {
  1: { text: '目录', color: 'blue' },
  2: { text: '菜单', color: 'green' },
  3: { text: '按钮', color: 'orange' },
};

// 加载数据
async function loadData() {
  loading.value = true;
  try {
    tableData.value = await getResourceTreeApi();
  } finally {
    loading.value = false;
  }
}

// 新增
function handleAdd(parentId?: number) {
  menuFormModalRef.value?.open({
    resources: tableData.value,
    parentId,
  });
}

// 编辑
function handleEdit(record: ResourceApi.Resource) {
  menuFormModalRef.value?.open({
    resources: tableData.value,
    record,
  });
}

// 删除
async function handleDelete(id: number) {
  await deleteResourceApi(id);
  message.success('删除成功');
  loadData();
}

// 初始化
loadData();
</script>

<template>
  <Page title="菜单管理" description="管理系统菜单和权限资源">
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
        :scroll="{ x: 1400 }"
        row-key="id"
        size="middle"
        default-expand-all-rows
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'type'">
            <Tag :color="typeMap[record.type]?.color">
              {{ typeMap[record.type]?.text }}
            </Tag>
          </template>
          <template v-else-if="column.key === 'status'">
            <Tag :color="record.status === 1 ? 'green' : 'red'">
              {{ record.status === 1 ? '启用' : '禁用' }}
            </Tag>
          </template>
          <template v-else-if="column.key === 'action'">
            <Space>
              <Button
                v-if="record.type !== 3"
                type="link"
                size="small"
                @click="handleAdd(record.id)"
              >
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

    <!-- 菜单表单弹框 -->
    <MenuFormModal ref="menuFormModalRef" @success="loadData" />
  </Page>
</template>
