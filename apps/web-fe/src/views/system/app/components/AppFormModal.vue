<script setup lang="ts">
import type { ApplicationApi } from '#/api/system/application';

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
} from 'ant-design-vue';

import {
  createApplicationApi,
  getApplicationApi,
  updateApplicationApi,
} from '#/api/system/application';

const emit = defineEmits<{
  success: [];
}>();

// 弹框状态
const visible = ref(false);
const loading = ref(false);
const isEdit = ref(false);

// 表单数据
const formData = ref<
  Partial<ApplicationApi.CreateParams & { id?: number }>
>({});

// 重置表单数据
function resetFormData() {
  formData.value = {
    name: '',
    code: '',
    description: '',
    icon: '',
    sort: 0,
    status: 1,
  };
}

// 打开弹框
async function open(id?: number) {
  resetFormData();

  if (id) {
    isEdit.value = true;
    const record = await getApplicationApi(id);
    formData.value = {
      id: record.id,
      name: record.name,
      code: record.code,
      description: record.description,
      icon: record.icon,
      sort: record.sort,
      status: record.status,
    };
  } else {
    isEdit.value = false;
  }
  visible.value = true;
}

// 提交
async function handleSubmit() {
  if (!formData.value.name) {
    message.error('请输入应用名称');
    return;
  }
  if (!formData.value.code) {
    message.error('请输入应用编码');
    return;
  }

  loading.value = true;
  try {
    if (isEdit.value) {
      await updateApplicationApi(formData.value as ApplicationApi.UpdateParams);
      message.success('更新成功');
    } else {
      await createApplicationApi(formData.value as ApplicationApi.CreateParams);
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
    :title="isEdit ? '编辑应用' : '新增应用'"
    :confirm-loading="loading"
    width="500px"
    @ok="handleSubmit"
  >
    <Form :label-col="{ span: 5 }" :wrapper-col="{ span: 18 }">
      <FormItem label="应用名称" required>
        <Input v-model:value="formData.name" placeholder="请输入应用名称" />
      </FormItem>
      <FormItem label="应用编码" required>
        <Input
          v-model:value="formData.code"
          :disabled="isEdit"
          placeholder="请输入应用编码"
        />
      </FormItem>
      <FormItem label="图标">
        <Input v-model:value="formData.icon" placeholder="请输入图标" />
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
      <FormItem label="描述">
        <Input.TextArea
          v-model:value="formData.description"
          placeholder="请输入描述"
          :rows="3"
        />
      </FormItem>
    </Form>
  </Modal>
</template>
