<script setup lang="ts">
import type { DictApi } from '#/api/system/dict';

import { ref } from 'vue';

import {
  Button,
  Form,
  FormItem,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Radio,
  RadioGroup,
  Space,
  Switch,
  Table,
  Tag,
} from 'ant-design-vue';

import {
  createDictDataApi,
  deleteDictDataApi,
  getDictDataByTypeCodeApi,
  updateDictDataApi,
} from '#/api';

// 弹框状态
const visible = ref(false);
const loading = ref(false);
const dictType = ref<DictApi.DictType | null>(null);

// 表格数据
const tableData = ref<DictApi.DictData[]>([]);

// 表单状态
const formVisible = ref(false);
const formLoading = ref(false);
const isEdit = ref(false);
const formData = ref<Partial<DictApi.CreateDataParams & { id?: number }>>({});

// 表格列定义
const columns = [
  { title: '字典标签', dataIndex: 'label', key: 'label', width: 120 },
  { title: '字典值', dataIndex: 'value', key: 'value', width: 120 },
  { title: '排序', dataIndex: 'sort', key: 'sort', width: 80 },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 80,
  },
  {
    title: '默认',
    dataIndex: 'isDefault',
    key: 'isDefault',
    width: 80,
  },
  { title: '备注', dataIndex: 'remark', key: 'remark', ellipsis: true },
  {
    title: '操作',
    key: 'action',
    width: 120,
    fixed: 'right' as const,
  },
];


// 打开弹框
interface OpenParams {
  dictType: DictApi.DictType;
}

async function open(params: OpenParams) {
  dictType.value = params.dictType;
  visible.value = true;
  await loadData();
}

// 加载数据
async function loadData() {
  if (!dictType.value) return;
  loading.value = true;
  try {
    tableData.value = await getDictDataByTypeCodeApi(dictType.value.code);
  } finally {
    loading.value = false;
  }
}

// 新增
function handleAdd() {
  isEdit.value = false;
  formData.value = {
    typeCode: dictType.value?.code,
    sort: 0,
    status: 1,
    isDefault: false,
  };
  formVisible.value = true;
}

// 编辑
function handleEdit(record: DictApi.DictData) {
  isEdit.value = true;
  formData.value = {
    id: record.id,
    label: record.label,
    value: record.value,
    sort: record.sort,
    status: record.status,
    isDefault: record.isDefault,
    cssClass: record.cssClass,
    listClass: record.listClass,
    remark: record.remark,
  };
  formVisible.value = true;
}

// 删除
async function handleDelete(id: number) {
  await deleteDictDataApi(id);
  message.success('删除成功');
  loadData();
}

// 提交表单
async function handleFormSubmit() {
  if (!formData.value.label) {
    message.error('请输入字典标签');
    return;
  }
  if (!formData.value.value) {
    message.error('请输入字典值');
    return;
  }

  formLoading.value = true;
  try {
    if (isEdit.value) {
      await updateDictDataApi(formData.value as DictApi.UpdateDataParams);
      message.success('更新成功');
    } else {
      await createDictDataApi(formData.value as DictApi.CreateDataParams);
      message.success('创建成功');
    }
    formVisible.value = false;
    loadData();
  } finally {
    formLoading.value = false;
  }
}

// 暴露open方法
defineExpose({ open });
</script>

<template>
  <Modal
    v-model:open="visible"
    :title="`字典数据 - ${dictType?.name || ''}`"
    width="900px"
    :footer="null"
  >
    <!-- 操作按钮 -->
    <div class="mb-4">
      <Button type="primary" @click="handleAdd">新增</Button>
    </div>

    <!-- 表格 -->
    <Table
      :columns="columns"
      :data-source="tableData"
      :loading="loading"
      :pagination="false"
      :scroll="{ x: 800 }"
      row-key="id"
      size="small"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'status'">
          <Tag :color="record.status === 1 ? 'green' : 'red'">
            {{ record.status === 1 ? '启用' : '禁用' }}
          </Tag>
        </template>
        <template v-else-if="column.key === 'isDefault'">
          <Tag v-if="record.isDefault" color="blue">是</Tag>
          <span v-else>否</span>
        </template>
        <template v-else-if="column.key === 'action'">
          <Space>
            <Button type="link" size="small" @click="handleEdit(record)">
              编辑
            </Button>
            <Popconfirm title="确定删除吗？" @confirm="handleDelete(record.id)">
              <Button type="link" size="small" danger>删除</Button>
            </Popconfirm>
          </Space>
        </template>
      </template>
    </Table>
  </Modal>

  <!-- 字典数据表单弹框 -->
  <Modal
    v-model:open="formVisible"
    :title="isEdit ? '编辑字典数据' : '新增字典数据'"
    :confirm-loading="formLoading"
    width="500px"
    @ok="handleFormSubmit"
  >
    <Form :label-col="{ span: 5 }" :wrapper-col="{ span: 18 }">
      <FormItem label="字典标签" required>
        <Input v-model:value="formData.label" placeholder="请输入字典标签" />
      </FormItem>
      <FormItem label="字典值" required>
        <Input v-model:value="formData.value" placeholder="请输入字典值" />
      </FormItem>
      <FormItem label="排序">
        <InputNumber
          v-model:value="formData.sort"
          :min="0"
          style="width: 100%"
        />
      </FormItem>
      <FormItem label="状态">
        <RadioGroup v-model:value="formData.status">
          <Radio :value="1">启用</Radio>
          <Radio :value="0">禁用</Radio>
        </RadioGroup>
      </FormItem>
      <FormItem label="是否默认">
        <Switch v-model:checked="formData.isDefault" />
      </FormItem>
      <FormItem label="样式类">
        <Input v-model:value="formData.cssClass" placeholder="请输入样式类" />
      </FormItem>
      <FormItem label="列表样式">
        <Input
          v-model:value="formData.listClass"
          placeholder="请输入列表样式"
        />
      </FormItem>
      <FormItem label="备注">
        <Input.TextArea
          v-model:value="formData.remark"
          placeholder="请输入备注"
          :rows="3"
        />
      </FormItem>
    </Form>
  </Modal>
</template>
