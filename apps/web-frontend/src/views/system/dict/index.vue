<script setup lang="ts">
import type { DictApi } from '#/api/system/dict';

import { ref, watch } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  Empty,
  Input,
  message,
  Popconfirm,
  Space,
  Table,
  Tag,
} from 'ant-design-vue';

import {
  deleteDictDataApi,
  deleteDictTypeApi,
  getDictDataByTypeCodeApi,
  getDictTypeListApi,
} from '#/api';

import DictDataFormModal from './components/DictDataFormModal.vue';
import DictTypeFormModal from './components/DictTypeFormModal.vue';

// ==================== 左侧：字典类型 ====================
const typeSearchParams = ref<DictApi.ListTypesParams>({
  page: 1,
  pageSize: 10,
  name: '',
  code: '',
  status: undefined,
});

const typeTableData = ref<DictApi.DictType[]>([]);
const typeTotal = ref(0);
const typeLoading = ref(false);
const selectedType = ref<DictApi.DictType | null>(null);

// 弹框引用
const dictTypeFormModalRef = ref<InstanceType<typeof DictTypeFormModal>>();
const dictDataFormModalRef = ref<InstanceType<typeof DictDataFormModal>>();

const typeColumns = [
  { title: '字典名称', dataIndex: 'name', key: 'name', ellipsis: true },
  { title: '字典编码', dataIndex: 'code', key: 'code', ellipsis: true },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 70,
  },
  {
    title: '操作',
    key: 'action',
    width: 100,
    fixed: 'right' as const,
  },
];

// 加载字典类型
async function loadTypeData() {
  typeLoading.value = true;
  try {
    const res = await getDictTypeListApi(typeSearchParams.value);
    typeTableData.value = res.list;
    typeTotal.value = res.total;
    // 如果当前选中的类型不在列表中，清空选中
    if (selectedType.value && !res.list.find(item => item.id === selectedType.value?.id)) {
      selectedType.value = null;
    }
  } finally {
    typeLoading.value = false;
  }
}

function handleTypeSearch() {
  typeSearchParams.value.page = 1;
  loadTypeData();
}

function handleTypeReset() {
  typeSearchParams.value = {
    page: 1,
    pageSize: 10,
    name: '',
    code: '',
    status: undefined,
  };
  loadTypeData();
}

function handleTypePageChange(page: number, pageSize: number) {
  typeSearchParams.value.page = page;
  typeSearchParams.value.pageSize = pageSize;
  loadTypeData();
}

// 选中字典类型
function handleSelectType(record: DictApi.DictType) {
  selectedType.value = record;
}

// 新增字典类型
function handleAddType() {
  dictTypeFormModalRef.value?.open();
}

// 编辑字典类型
function handleEditType(record: DictApi.DictType) {
  dictTypeFormModalRef.value?.open(record.id);
}

// 删除字典类型
async function handleDeleteType(id: number) {
  await deleteDictTypeApi(id);
  message.success('删除成功');
  if (selectedType.value?.id === id) {
    selectedType.value = null;
  }
  loadTypeData();
}

// ==================== 右侧：字典数据 ====================
const dataTableData = ref<DictApi.DictData[]>([]);
const dataLoading = ref(false);

const dataColumns = [
  { title: '字典标签', dataIndex: 'label', key: 'label', width: 120 },
  { title: '字典值', dataIndex: 'value', key: 'value', width: 120 },
  { title: '排序', dataIndex: 'sort', key: 'sort', width: 70 },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 70,
  },
  {
    title: '默认',
    dataIndex: 'isDefault',
    key: 'isDefault',
    width: 70,
  },
  { title: '备注', dataIndex: 'remark', key: 'remark', ellipsis: true },
  {
    title: '操作',
    key: 'action',
    width: 100,
    fixed: 'right' as const,
  },
];

// 监听选中类型变化，加载字典数据
watch(selectedType, async (newType) => {
  if (newType) {
    await loadDataList();
  } else {
    dataTableData.value = [];
  }
});

async function loadDataList() {
  if (!selectedType.value) return;
  dataLoading.value = true;
  try {
    dataTableData.value = await getDictDataByTypeCodeApi(selectedType.value.code);
  } finally {
    dataLoading.value = false;
  }
}

// 新增字典数据
function handleAddData() {
  if (!selectedType.value) return;
  dictDataFormModalRef.value?.open(selectedType.value.code);
}

// 编辑字典数据
function handleEditData(record: DictApi.DictData) {
  if (!selectedType.value) return;
  dictDataFormModalRef.value?.open(selectedType.value.code, record);
}

// 删除字典数据
async function handleDeleteData(id: number) {
  await deleteDictDataApi(id);
  message.success('删除成功');
  loadDataList();
}

// 初始化
loadTypeData();
</script>

<template>
  <Page title="字典管理" description="管理系统数据字典">
    <div class="flex gap-4 h-full">
      <!-- 左侧：字典类型 -->
      <Card title="字典类型" class="w-[480px] flex-shrink-0">
        <template #extra>
          <Button type="primary" size="small" @click="handleAddType">新增</Button>
        </template>

        <!-- 搜索 -->
        <div class="mb-3 flex flex-wrap gap-2">
          <Input
            v-model:value="typeSearchParams.name"
            placeholder="字典名称"
            style="width: 120px"
            size="small"
            allow-clear
          />
          <Input
            v-model:value="typeSearchParams.code"
            placeholder="字典编码"
            style="width: 120px"
            size="small"
            allow-clear
          />
          <Space size="small">
            <Button type="primary" size="small" @click="handleTypeSearch">搜索</Button>
            <Button size="small" @click="handleTypeReset">重置</Button>
          </Space>
        </div>

        <!-- 表格 -->
        <Table
          :columns="typeColumns"
          :data-source="typeTableData"
          :loading="typeLoading"
          :pagination="{
            current: typeSearchParams.page,
            pageSize: typeSearchParams.pageSize,
            total: typeTotal,
            showSizeChanger: true,
            showTotal: (t: number) => `共 ${t} 条`,
            onChange: handleTypePageChange,
            size: 'small',
          }"
          :row-class-name="(record) => (record as DictApi.DictType).id === selectedType?.id ? 'bg-blue-50' : 'cursor-pointer'"
          :custom-row="(record) => ({
            onClick: () => handleSelectType(record as DictApi.DictType),
          })"
          row-key="id"
          size="small"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'status'">
              <Dict code="sys_status" :value="record.status" />
            </template>
            <template v-else-if="column.key === 'action'">
              <Space size="small">
                <Button type="link" size="small" @click.stop="handleEditType(record as DictApi.DictType)">
                  编辑
                </Button>
                <Popconfirm
                  title="确定删除吗？"
                  @confirm="handleDeleteType(record.id)"
                >
                  <Button type="link" size="small" danger @click.stop>删除</Button>
                </Popconfirm>
              </Space>
            </template>
          </template>
        </Table>
      </Card>

      <!-- 右侧：字典数据 -->
      <Card class="flex-1 min-w-0">
        <template #title>
          <span>字典数据</span>
          <span v-if="selectedType" class="text-gray-400 text-sm ml-2">
            （{{ selectedType.name }} - {{ selectedType.code }}）
          </span>
        </template>
        <template #extra>
          <Button
            type="primary"
            size="small"
            :disabled="!selectedType"
            @click="handleAddData"
          >
            新增
          </Button>
        </template>

        <template v-if="selectedType">
          <Table
            :columns="dataColumns"
            :data-source="dataTableData"
            :loading="dataLoading"
            :pagination="false"
            :scroll="{ x: 700 }"
            row-key="id"
            size="small"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'status'">
                <Dict code="sys_status" :value="record.status" />
              </template>
              <template v-else-if="column.key === 'isDefault'">
                <Tag :color="record.isDefault ? 'blue' : 'default'">
                  {{ record.isDefault ? '是' : '否' }}
                </Tag>
              </template>
              <template v-else-if="column.key === 'action'">
                <Space size="small">
                  <Button type="link" size="small" @click="handleEditData(record as DictApi.DictData)">
                    编辑
                  </Button>
                  <Popconfirm title="确定删除吗？" @confirm="handleDeleteData(record.id)">
                    <Button type="link" size="small" danger>删除</Button>
                  </Popconfirm>
                </Space>
              </template>
            </template>
          </Table>
        </template>
        <template v-else>
          <Empty description="请在左侧选择一个字典类型" />
        </template>
      </Card>
    </div>
  </Page>

  <!-- 字典类型表单弹框 -->
  <DictTypeFormModal ref="dictTypeFormModalRef" @success="loadTypeData" />

  <!-- 字典数据表单弹框 -->
  <DictDataFormModal ref="dictDataFormModalRef" @success="loadDataList" />
</template>

<style scoped>
:deep(.ant-table-row.bg-blue-50) {
  background-color: #eff6ff !important;
}
:deep(.ant-table-row.cursor-pointer:hover) {
  cursor: pointer;
}
</style>
