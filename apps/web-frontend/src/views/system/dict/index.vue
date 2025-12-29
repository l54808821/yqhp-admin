<script setup lang="ts">
import type { DictApi } from '#/api/system/dict';

import { ref } from 'vue';

import { Page, UserDisplay } from '@vben/common-ui';

import {
  Button,
  Card,
  Input,
  message,
  Popconfirm,
  Space,
  Table,
} from 'ant-design-vue';

import { deleteDictTypeApi, getDictTypeListApi } from '#/api';

import DictDataModal from './components/DictDataModal.vue';
import DictTypeFormModal from './components/DictTypeFormModal.vue';

// 搜索参数
const searchParams = ref<DictApi.ListTypesParams>({
  page: 1,
  pageSize: 10,
  name: '',
  code: '',
  status: undefined,
});

// 表格数据
const tableData = ref<DictApi.DictType[]>([]);
const total = ref(0);
const loading = ref(false);

// 弹框引用
const dictTypeFormModalRef = ref<InstanceType<typeof DictTypeFormModal>>();
const dictDataModalRef = ref<InstanceType<typeof DictDataModal>>();

// 表格列定义
const columns = [
  { title: '字典名称', dataIndex: 'name', key: 'name', width: 150 },
  { title: '字典编码', dataIndex: 'code', key: 'code', width: 150 },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 80,
  },
  { title: '备注', dataIndex: 'remark', key: 'remark', ellipsis: true },
  { title: '创建人', dataIndex: 'createdBy', key: 'createdBy', width: 120 },
  { title: '更新人', dataIndex: 'updatedBy', key: 'updatedBy', width: 120 },
  { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 180 },
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
    const res = await getDictTypeListApi(searchParams.value);
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
    name: '',
    code: '',
    status: undefined,
  };
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
  dictTypeFormModalRef.value?.open();
}

// 编辑
function handleEdit(record: DictApi.DictType) {
  dictTypeFormModalRef.value?.open(record.id);
}

// 查看字典数据
function handleViewData(record: DictApi.DictType) {
  dictDataModalRef.value?.open({ dictType: record });
}

// 删除
async function handleDelete(id: number) {
  await deleteDictTypeApi(id);
  message.success('删除成功');
  loadData();
}

// 初始化
loadData();
</script>

<template>
  <Page title="字典管理" description="管理系统数据字典">
    <Card>
      <!-- 搜索表单 -->
      <div class="mb-4 flex flex-wrap gap-4">
        <Input
          v-model:value="searchParams.name"
          placeholder="字典名称"
          style="width: 160px"
          allow-clear
        />
        <Input
          v-model:value="searchParams.code"
          placeholder="字典编码"
          style="width: 160px"
          allow-clear
        />
        <Dict
          type="select"
          v-model:value="searchParams.status"
          code="sys_status"
          placeholder="状态"
          style="width: 120px"
        />
        <Space>
          <Button type="primary" @click="handleSearch">搜索</Button>
          <Button @click="handleReset">重置</Button>
          <Button type="primary" @click="handleAdd">新增</Button>
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
        :scroll="{ x: 1000 }"
        row-key="id"
        size="middle"
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
              <Button type="link" size="small" @click="handleViewData(record)">
                字典数据
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

    <!-- 字典类型表单弹框 -->
    <DictTypeFormModal ref="dictTypeFormModalRef" @success="loadData" />

    <!-- 字典数据弹框 -->
    <DictDataModal ref="dictDataModalRef" />
  </Page>
</template>
