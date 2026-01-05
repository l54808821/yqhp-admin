<script setup lang="ts">
import type { DictApi } from '#/api/system/dict';

import { ref } from 'vue';

import {
  Form,
  FormItem,
  Input,
  InputNumber,
  message,
  Modal,
  Radio,
  RadioGroup,
  Switch,
} from 'ant-design-vue';

import { createDictDataApi, updateDictDataApi } from '#/api';

const emit = defineEmits<{
  success: [];
}>();

// 弹框状态
const visible = ref(false);
const loading = ref(false);
const isEdit = ref(false);

// 表单数据
const formData = ref<Partial<DictApi.CreateDataParams & { id?: number }>>({});

// 重置表单数据
function resetFormData(typeCode?: string) {
  formData.value = {
    typeCode,
    sort: 0,
    status: 1,
    isDefault: false,
  };
}

// 打开弹框 - 新增
function open(typeCode: string): void;
// 打开弹框 - 编辑
function open(typeCode: string, record: DictApi.DictData): void;
// 实现
function open(typeCode: string, record?: DictApi.DictData) {
  if (record) {
    isEdit.value = true;
    formData.value = {
      id: record.id,
      typeCode,
      label: record.label,
      value: record.value,
      sort: record.sort,
      status: record.status,
      isDefault: record.isDefault,
      cssClass: record.cssClass,
      listClass: record.listClass,
      remark: record.remark,
    };
  } else {
    isEdit.value = false;
    resetFormData(typeCode);
  }
  visible.value = true;
}

// 提交
async function handleSubmit() {
  if (!formData.value.label) {
    message.error('请输入字典标签');
    return;
  }
  if (!formData.value.value) {
    message.error('请输入字典值');
    return;
  }

  loading.value = true;
  try {
    if (isEdit.value) {
      await updateDictDataApi(formData.value as DictApi.UpdateDataParams);
      message.success('更新成功');
    } else {
      await createDictDataApi(formData.value as DictApi.CreateDataParams);
      message.success('创建成功');
    }
    visible.value = false;
    emit('success');
  } finally {
    loading.value = false;
  }
}

// 暴露open方法
defineExpose({ open });
</script>

<template>
  <Modal
    v-model:open="visible"
    :title="isEdit ? '编辑字典数据' : '新增字典数据'"
    :confirm-loading="loading"
    width="500px"
    @ok="handleSubmit"
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
