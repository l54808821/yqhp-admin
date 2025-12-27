<script setup lang="ts">
import type { DeptApi } from '#/api/system/dept';

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
  TreeSelect,
} from 'ant-design-vue';

import { createDeptApi, updateDeptApi } from '#/api';

const emit = defineEmits<{
  success: [];
}>();

// 弹框状态
const visible = ref(false);
const loading = ref(false);
const isEdit = ref(false);

// 表单数据
const formData = ref<Partial<DeptApi.CreateParams & { id?: number }>>({});
const depts = ref<any[]>([]);

// 打开弹框
interface OpenParams {
  depts: any[];
  parentId?: number;
  record?: DeptApi.Dept;
}

function open(params: OpenParams) {
  depts.value = params.depts;

  if (params.record) {
    isEdit.value = true;
    formData.value = {
      id: params.record.id,
      parentId: params.record.parentId || undefined,
      name: params.record.name,
      code: params.record.code,
      leader: params.record.leader,
      phone: params.record.phone,
      email: params.record.email,
      sort: params.record.sort,
      status: params.record.status,
      remark: params.record.remark,
    };
  } else {
    isEdit.value = false;
    formData.value = {
      parentId: params.parentId,
      sort: 0,
      status: 1,
    };
  }

  visible.value = true;
}

// 提交
async function handleSubmit() {
  if (!formData.value.name) {
    message.error('请输入部门名称');
    return;
  }

  loading.value = true;
  try {
    if (isEdit.value) {
      await updateDeptApi(formData.value as DeptApi.UpdateParams);
      message.success('更新成功');
    } else {
      await createDeptApi(formData.value as DeptApi.CreateParams);
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
    :title="isEdit ? '编辑部门' : '新增部门'"
    :confirm-loading="loading"
    width="600px"
    @ok="handleSubmit"
  >
    <Form :label-col="{ span: 5 }" :wrapper-col="{ span: 18 }">
      <FormItem label="上级部门">
        <TreeSelect
          v-model:value="formData.parentId"
          :tree-data="depts"
          :field-names="{ label: 'name', value: 'id', children: 'children' }"
          placeholder="请选择上级部门"
          allow-clear
          tree-default-expand-all
        />
      </FormItem>
      <FormItem label="部门名称" required>
        <Input v-model:value="formData.name" placeholder="请输入部门名称" />
      </FormItem>
      <FormItem label="部门编码">
        <Input v-model:value="formData.code" placeholder="请输入部门编码" />
      </FormItem>
      <FormItem label="负责人">
        <Input v-model:value="formData.leader" placeholder="请输入负责人" />
      </FormItem>
      <FormItem label="联系电话">
        <Input v-model:value="formData.phone" placeholder="请输入联系电话" />
      </FormItem>
      <FormItem label="邮箱">
        <Input v-model:value="formData.email" placeholder="请输入邮箱" />
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
