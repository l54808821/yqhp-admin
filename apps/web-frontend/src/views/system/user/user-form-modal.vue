<script setup lang="ts">
import type { UserApi } from '#/api/system/user';

import { ref } from 'vue';

import {
  Avatar,
  Form,
  FormItem,
  Input,
  message,
  Modal,
  Radio,
  RadioGroup,
  Select,
  Switch,
  TreeSelect,
} from 'ant-design-vue';

import { createUserApi, updateUserApi } from '#/api';

const emit = defineEmits<{
  success: [];
}>();

// 弹框状态
const visible = ref(false);
const loading = ref(false);
const isEdit = ref(false);

// 表单数据
const formData = ref<
  Partial<UserApi.CreateParams & UserApi.UpdateParams & { id?: number }>
>({});
const roles = ref<any[]>([]);
const depts = ref<any[]>([]);

// 打开弹框
interface OpenParams {
  roles: any[];
  depts: any[];
  record?: UserApi.User;
}

function open(params: OpenParams) {
  roles.value = params.roles;
  depts.value = params.depts;

  if (params.record) {
    isEdit.value = true;
    formData.value = {
      id: params.record.id,
      username: params.record.username,
      nickname: params.record.nickname,
      avatar: params.record.avatar,
      email: params.record.email,
      phone: params.record.phone,
      gender: params.record.gender,
      status: params.record.status,
      deptId: params.record.deptId,
      roleIds: params.record.roles?.map((r) => r.id) || [],
      remark: params.record.remark,
    };
  } else {
    isEdit.value = false;
    formData.value = {
      gender: 0,
      status: 1,
      roleIds: [],
      avatar: '',
    };
  }

  visible.value = true;
}

// 提交
async function handleSubmit() {
  if (!formData.value.username) {
    message.error('请输入用户名');
    return;
  }
  if (!isEdit.value && !formData.value.password) {
    message.error('请输入密码');
    return;
  }

  loading.value = true;
  try {
    if (isEdit.value) {
      await updateUserApi(formData.value as UserApi.UpdateParams);
      message.success('更新成功');
    } else {
      await createUserApi(formData.value as UserApi.CreateParams);
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
    :title="isEdit ? '编辑用户' : '新增用户'"
    :confirm-loading="loading"
    width="600px"
    @ok="handleSubmit"
  >
    <Form :label-col="{ span: 5 }" :wrapper-col="{ span: 18 }">
      <FormItem label="用户名" required>
        <Input
          v-model:value="formData.username"
          :disabled="isEdit"
          placeholder="请输入用户名"
        />
      </FormItem>
      <FormItem v-if="!isEdit" label="密码" required>
        <Input.Password
          v-model:value="formData.password"
          placeholder="请输入密码"
        />
      </FormItem>
      <FormItem label="昵称">
        <Input v-model:value="formData.nickname" placeholder="请输入昵称" />
      </FormItem>
      <FormItem label="头像">
        <div class="flex items-center gap-4">
          <Avatar :size="64" :src="formData.avatar">
            {{ formData.nickname?.charAt(0) || 'U' }}
          </Avatar>
          <Input
            v-model:value="formData.avatar"
            placeholder="请输入头像URL"
            class="flex-1"
          />
        </div>
      </FormItem>
      <FormItem label="手机号">
        <Input v-model:value="formData.phone" placeholder="请输入手机号" />
      </FormItem>
      <FormItem label="邮箱">
        <Input v-model:value="formData.email" placeholder="请输入邮箱" />
      </FormItem>
      <FormItem label="性别">
        <RadioGroup v-model:value="formData.gender">
          <Radio :value="0">未知</Radio>
          <Radio :value="1">男</Radio>
          <Radio :value="2">女</Radio>
        </RadioGroup>
      </FormItem>
      <FormItem label="部门">
        <TreeSelect
          v-model:value="formData.deptId"
          :tree-data="depts"
          :field-names="{ label: 'name', value: 'id', children: 'children' }"
          placeholder="请选择部门"
          allow-clear
          tree-default-expand-all
        />
      </FormItem>
      <FormItem label="角色">
        <Select
          v-model:value="formData.roleIds"
          mode="multiple"
          placeholder="请选择角色"
          allow-clear
        >
          <Select.Option v-for="role in roles" :key="role.id" :value="role.id">
            {{ role.name }}
          </Select.Option>
        </Select>
      </FormItem>
      <FormItem label="状态">
        <Switch
          v-model:checked="formData.status"
          :checked-value="1"
          :un-checked-value="0"
          checked-children="启用"
          un-checked-children="禁用"
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
