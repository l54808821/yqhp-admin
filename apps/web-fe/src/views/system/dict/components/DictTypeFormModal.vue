<script setup lang="ts">
import type { DictApi } from '#/api/system/dict';

import { ref } from 'vue';

import {
  Form,
  FormItem,
  Input,
  message,
  Modal,
  Radio,
  RadioGroup,
} from 'ant-design-vue';

import { createDictTypeApi, getDictTypeApi, updateDictTypeApi } from '#/api';

const emit = defineEmits<{
  success: [];
}>();

// 弹框状态
const visible = ref(false);
const loading = ref(false);
const isEdit = ref(false);

// 表单数据
const formData = ref<Partial<DictApi.CreateTypeParams & { id?: number }>>({});

// 重置表单数据
function resetFormData() {
  formData.value = {
    name: '',
    code: '',
    status: 1,
    remark: '',
  };
}

// 打开弹框
async function open(id?: number) {
  resetFormData();

  if (id) {
    isEdit.value = true;
    const record = await getDictTypeApi(id);
    formData.value = {
      id: record.id,
      name: record.name,
      code: record.code,
      status: record.status,
      remark: record.remark,
    };
  } else {
    isEdit.value = false;
  }

  visible.value = true;
}

// 提交
async function handleSubmit() {
  if (!formData.value.name) {
    message.error('请输入字典名称');
    return;
  }
  if (!formData.value.code) {
    message.error('请输入字典编码');
    return;
  }

  loading.value = true;
  try {
    if (isEdit.value) {
      await updateDictTypeApi(formData.value as DictApi.UpdateTypeParams);
      message.success('更新成功');
    } else {
      await createDictTypeApi(formData.value as DictApi.CreateTypeParams);
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
    :title="isEdit ? '编辑字典类型' : '新增字典类型'"
    :confirm-loading="loading"
    width="500px"
    @ok="handleSubmit"
  >
    <Form :label-col="{ span: 5 }" :wrapper-col="{ span: 18 }">
      <FormItem label="字典名称" required>
        <Input v-model:value="formData.name" placeholder="请输入字典名称" />
      </FormItem>
      <FormItem label="字典编码" required>
        <Input
          v-model:value="formData.code"
          :disabled="isEdit"
          placeholder="请输入字典编码"
        />
      </FormItem>
      <FormItem label="状态">
        <RadioGroup v-model:value="formData.status">
          <Radio :value="1">启用</Radio>
          <Radio :value="0">禁用</Radio>
        </RadioGroup>
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
