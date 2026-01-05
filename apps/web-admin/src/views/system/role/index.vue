<script setup lang="ts">
/**
 * 使用 SearchTable 组件重构后的角色管理页面示例
 */
import type { ApplicationApi } from '#/api/system/application';
import type { RoleApi } from '#/api/system/role';

import { ref } from 'vue';

import { UserDisplay } from '@vben/common-ui';

import { Page } from '#/components/page';

import { Button, message, Popconfirm, Select, Space } from 'ant-design-vue';

import { deleteRoleApi, getResourceTreeApi, getRoleListApi } from '#/api';
import { getAllApplicationsApi } from '#/api/system/application';
import { Dict } from '#/components/dict';
import { SearchTable } from '#/components/search-table';
import type { ColumnConfig, SearchFieldConfig } from '#/components/search-table';

import RoleFormDrawer from './components/RoleFormDrawer.vue';

// 搜索参数
const searchParams = ref<RoleApi.ListParams>({
  page: 1,
  pageSize: 10,
  appId: undefined,
  name: '',
  code: '',
  status: undefined,
});

// 搜索字段配置
const searchFields: SearchFieldConfig[] = [
  { field: 'name', label: '角色名称', type: 'input', defaultValue: '' },
  { field: 'code', label: '角色编码', type: 'input', defaultValue: '' },
  {
    field: 'status',
    label: '状态',
    type: 'dict',
    dictCode: 'sys_status',
    width: 120,
    defaultValue: undefined,
  },
];

// 表格列配置
const columns: ColumnConfig[] = [
  { title: '角色名称', dataIndex: 'name', key: 'name', width: 150 },
  { title: '角色编码', dataIndex: 'code', key: 'code', width: 150 },
  { title: '排序', dataIndex: 'sort', key: 'sort', width: 80 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 80 },
  { title: '备注', dataIndex: 'remark', key: 'remark', ellipsis: true, defaultShow: false },
  { title: '创建人', dataIndex: 'createdBy', key: 'createdBy', width: 120 },
  { title: '更新人', dataIndex: 'updatedBy', key: 'updatedBy', width: 120, defaultShow: false },
  { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 180 },
  { title: '操作', key: 'action', width: 150, fixed: 'right' as const },
];

// 表格数据
const tableData = ref<RoleApi.Role[]>([]);
const total = ref(0);
const loading = ref(false);

// 应用列表
const applications = ref<ApplicationApi.Application[]>([]);
const currentAppId = ref<number>();

// 资源树
const resources = ref<any[]>([]);

// 抽屉引用
const roleFormDrawerRef = ref<InstanceType<typeof RoleFormDrawer>>();

// 加载应用列表
async function loadApplications() {
  applications.value = await getAllApplicationsApi();
  if (applications.value.length > 0 && !currentAppId.value) {
    currentAppId.value = applications.value[0]!.id;
    searchParams.value.appId = currentAppId.value;
    loadData();
    loadResources();
  }
}

// 加载数据
async function loadData() {
  if (!currentAppId.value) return;
  loading.value = true;
  try {
    const res = await getRoleListApi(searchParams.value);
    tableData.value = res.list;
    total.value = res.total;
  } finally {
    loading.value = false;
  }
}

// 加载资源树
async function loadResources() {
  if (!currentAppId.value) return;
  resources.value = await getResourceTreeApi(currentAppId.value);
}

// 应用切换
function handleAppChange(appId: any) {
  if (appId === undefined) return;
  currentAppId.value = appId;
  searchParams.value.appId = appId;
  searchParams.value.page = 1;
  loadData();
  loadResources();
}

// 搜索
function handleSearch() {
  searchParams.value.page = 1;
  loadData();
}

// 重置后加载数据
function handleReset() {
  searchParams.value.appId = currentAppId.value;
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
  if (!currentAppId.value) {
    message.warning('请先选择应用');
    return;
  }
  roleFormDrawerRef.value?.open({
    appId: currentAppId.value,
    resources: resources.value,
  });
}

// 编辑
function handleEdit(record: Record<string, any>) {
  roleFormDrawerRef.value?.open({
    appId: currentAppId.value!,
    resources: resources.value,
    id: record.id,
  });
}

// 删除
async function handleDelete(id: number) {
  await deleteRoleApi(id);
  message.success('删除成功');
  loadData();
}

// 初始化
loadApplications();
</script>

<template>
  <Page auto-content-height>
    <SearchTable
      table-key="system-role"
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
      <!-- 额外的搜索字段（应用选择） -->
      <template #search="{ onChange }">
        <div class="flex items-center gap-2">
          <span class="text-gray-600 text-sm whitespace-nowrap">当前应用</span>
          <Select
            v-model:value="currentAppId"
            placeholder="请选择应用"
            style="width: 200px"
            @change="(val: any) => { handleAppChange(val); onChange?.(); }"
          >
            <Select.Option
              v-for="app in applications"
              :key="app.id"
              :value="app.id"
            >
              {{ app.name }}
            </Select.Option>
          </Select>
        </div>
      </template>

      <!-- 表格单元格自定义渲染 -->
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
    </SearchTable>

    <!-- 角色表单抽屉 -->
    <RoleFormDrawer ref="roleFormDrawerRef" @success="loadData" />
  </Page>
</template>
