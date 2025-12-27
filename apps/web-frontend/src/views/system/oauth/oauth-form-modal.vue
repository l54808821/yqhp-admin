<script setup lang="ts">
import type { OAuthApi } from '#/api/system/oauth';

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

import { createOAuthProviderApi, updateOAuthProviderApi } from '#/api';

const emit = defineEmits<{
  success: [];
}>();

// 弹框状态
const visible = ref(false);
const loading = ref(false);
const isEdit = ref(false);

// 表单数据
const formData = ref<Partial<OAuthApi.CreateParams & { id?: number }>>({});

// 打开弹框
interface OpenParams {
  record?: OAuthApi.Provider;
}

function open(params: OpenParams) {
  if (params.record) {
    isEdit.value = true;
    formData.value = {
      id: params.record.id,
      name: params.record.name,
      code: params.record.code,
      clientId: params.record.clientId,
      redirectUri: params.record.redirectUri,
      authUrl: params.record.authUrl,
      tokenUrl: params.record.tokenUrl,
      userInfoUrl: params.record.userInfoUrl,
      scope: params.record.scope,
      status: params.record.status,
      sort: params.record.sort,
      icon: params.record.icon,
      remark: params.record.remark,
    };
  } else {
    isEdit.value = false;
    formData.value = {
      status: 1,
      sort: 0,
    };
  }

  visible.value = true;
}

// 提交
async function handleSubmit() {
  if (!formData.value.name) {
    message.error('请输入名称');
    return;
  }
  if (!formData.value.code) {
    message.error('请输入编码');
    return;
  }

  loading.value = true;
  try {
    if (isEdit.value) {
      await updateOAuthProviderApi(formData.value as OAuthApi.UpdateParams);
      message.success('更新成功');
    } else {
      await createOAuthProviderApi(formData.value as OAuthApi.CreateParams);
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
    :title="isEdit ? '编辑OAuth配置' : '新增OAuth配置'"
    :confirm-loading="loading"
    width="650px"
    @ok="handleSubmit"
  >
    <Form :label-col="{ span: 5 }" :wrapper-col="{ span: 18 }">
      <FormItem label="名称" required>
        <Input v-model:value="formData.name" placeholder="请输入名称" />
      </FormItem>
      <FormItem label="编码" required>
        <Input
          v-model:value="formData.code"
          :disabled="isEdit"
          placeholder="请输入编码，如：github、wechat"
        />
      </FormItem>
      <FormItem label="客户端ID">
        <Input
          v-model:value="formData.clientId"
          placeholder="请输入Client ID"
        />
      </FormItem>
      <FormItem label="客户端密钥">
        <Input.Password
          v-model:value="formData.clientSecret"
          placeholder="请输入Client Secret"
        />
      </FormItem>
      <FormItem label="回调地址">
        <Input
          v-model:value="formData.redirectUri"
          placeholder="请输入回调地址"
        />
      </FormItem>
      <FormItem label="授权URL">
        <Input v-model:value="formData.authUrl" placeholder="请输入授权URL" />
      </FormItem>
      <FormItem label="Token URL">
        <Input
          v-model:value="formData.tokenUrl"
          placeholder="请输入Token URL"
        />
      </FormItem>
      <FormItem label="用户信息URL">
        <Input
          v-model:value="formData.userInfoUrl"
          placeholder="请输入用户信息URL"
        />
      </FormItem>
      <FormItem label="Scope">
        <Input v-model:value="formData.scope" placeholder="请输入Scope" />
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
