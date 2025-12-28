<script setup lang="ts">
import type { ConfigApi } from '#/api/system/config';

import { ref } from 'vue';

import { Form, FormItem, Input, message, Modal, Select } from 'ant-design-vue';

import { createConfigApi, updateConfigApi } from '#/api';

const emit = defineEmits<{
  success: [];
}>();

// 弹框状态
const visible = ref(false);
const loading = ref(false);
const isEdit = ref(false);

// 表单数据
const formData = ref<Partial<ConfigApi.CreateParams & { id?: number }>>({});

// 类型选项
const typeOptions = [
  { value: 'string', label: '字符串' },
  { value: 'number', label: '数字' },
  { value: 'boolean', label: '布尔值' },
  { value: 'json', label: 'JSON' },
];

// 打开弹框
interface OpenParams {
  record?: ConfigApi.Config;
}

function open(params: OpenParams) {
  if (params.record) {
    isEdit.value = true;
    formData.value = {
      id: params.record.id,
      name: params.record.name,
      key: params.record.key,
      value: params.record.value,
      type: params.record.type,
      remark: params.record.remark,
    };
  } else {
    isEdit.value = false;
    formData.value = {
      type: 'string',
    };
  }

  visible.value = true;
}

// 提交
async function handleSubmit() {
  if (!formData.value.name) {
    message.error('请输入参数名称');
    return;
  }
  if (!formData.value.key) {
    message.error('请输入参数键');
    return;
  }

  loading.value = true;
  try {
    if (isEdit.value) {
      await updateConfigApi(formData.value as ConfigApi.UpdateParams);
      message.success('更新成功');
    } else {
      await createConfigApi(formData.value as ConfigApi.CreateParams);
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
    :title="isEdit ? '编辑配置' : '新增配置'"
    :confirm-loading="loading"
    width="550px"
    @ok="handleSubmit"
  >
    <Form :label-col="{ span: 5 }" :wrapper-col="{ span: 18 }">
      <FormItem label="参数名称" required>
        <Input v-model:value="formData.name" placeholder="请输入参数名称" />
      </FormItem>
      <FormItem label="参数键" required>
        <Input
          v-model:value="formData.key"
          :disabled="isEdit"
          placeholder="请输入参数键"
        />
      </FormItem>
      <FormItem label="参数值">
        <Input.TextArea
          v-model:value="formData.value"
          placeholder="请输入参数值"
          :rows="4"
        />
      </FormItem>
      <FormItem label="参数类型">
        <Select
          v-model:value="formData.type"
          :options="typeOptions"
          placeholder="请选择参数类型"
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
