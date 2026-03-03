<script setup lang="ts">
import type { AiProvider, CreateAiProviderParams, UpdateAiProviderParams } from '#/api/ai-model';

import { computed, ref } from 'vue';

import { Form, Input, message, Modal, Select, Switch } from 'ant-design-vue';

import {
  createAiProviderApi,
  PROVIDER_PRESETS,
  updateAiProviderApi,
} from '#/api/ai-model';

const emit = defineEmits<{ success: [] }>();

const visible = ref(false);
const modalTitle = ref('添加供应商');
const editingId = ref<number | null>(null);
const submitLoading = ref(false);

const formState = ref<CreateAiProviderParams & { api_key: string }>({
  name: '',
  provider_type: '',
  api_base_url: '',
  api_key: '',
  icon: '',
  description: '',
  sort: 0,
  status: 1,
});

const presetOptions = computed(() =>
  Object.entries(PROVIDER_PRESETS).map(([key, p]) => ({
    label: p.name,
    value: key,
  })),
);

function open(record?: AiProvider) {
  if (record) {
    modalTitle.value = '编辑供应商';
    editingId.value = record.id;
    formState.value = {
      name: record.name,
      provider_type: record.provider_type,
      api_base_url: record.api_base_url,
      api_key: '',
      icon: record.icon || '',
      description: record.description || '',
      sort: record.sort || 0,
      status: record.status,
    };
  } else {
    modalTitle.value = '添加供应商';
    editingId.value = null;
    formState.value = {
      name: '',
      provider_type: '',
      api_base_url: '',
      api_key: '',
      icon: '',
      description: '',
      sort: 0,
      status: 1,
    };
  }
  visible.value = true;
}

function handlePresetSelect(key: string) {
  const preset = PROVIDER_PRESETS[key];
  if (!preset) return;
  formState.value.name = preset.name;
  formState.value.provider_type = preset.provider_type;
  formState.value.api_base_url = preset.api_base_url;
  formState.value.icon = preset.icon || '';
  if (!preset.require_api_key) {
    formState.value.api_key = 'ollama';
  }
}

async function handleSubmit() {
  if (!formState.value.name) return message.warning('请输入供应商名称');
  if (!formState.value.provider_type) return message.warning('请输入供应商类型');
  if (!formState.value.api_base_url) return message.warning('请输入 API Base URL');

  submitLoading.value = true;
  try {
    if (editingId.value) {
      const params: UpdateAiProviderParams = { ...formState.value };
      if (!params.api_key) delete params.api_key;
      await updateAiProviderApi(editingId.value, params);
      message.success('更新成功');
    } else {
      await createAiProviderApi(formState.value);
      message.success('添加成功');
    }
    visible.value = false;
    emit('success');
  } catch {
    message.error('操作失败');
  } finally {
    submitLoading.value = false;
  }
}

defineExpose({ open });
</script>

<template>
  <Modal
    v-model:open="visible"
    :title="modalTitle"
    width="520px"
    :confirm-loading="submitLoading"
    @ok="handleSubmit"
  >
    <Form :model="formState" layout="vertical">
      <Form.Item v-if="!editingId" label="从预置选择">
        <Select
          placeholder="选择预置供应商自动填充，或手动填写"
          :options="presetOptions"
          allow-clear
          show-search
          style="width: 100%"
          @change="(val: any) => handlePresetSelect(val)"
        />
      </Form.Item>

      <Form.Item label="供应商名称" required>
        <Input v-model:value="formState.name" placeholder="如 硅基流动" />
      </Form.Item>

      <Form.Item label="类型标识" required>
        <Input v-model:value="formState.provider_type" placeholder="如 siliconflow" />
      </Form.Item>

      <Form.Item label="API Base URL" required>
        <Input v-model:value="formState.api_base_url" placeholder="如 https://api.siliconflow.cn/v1" />
      </Form.Item>

      <Form.Item :label="editingId ? 'API Key（留空不修改）' : 'API Key'">
        <Input.Password v-model:value="formState.api_key" placeholder="请输入 API Key" />
      </Form.Item>

      <Form.Item label="描述">
        <Input.TextArea v-model:value="formState.description" placeholder="供应商描述" :rows="2" />
      </Form.Item>

      <Form.Item label="状态">
        <Switch
          v-model:checked="formState.status"
          :checked-value="1"
          :un-checked-value="0"
          checked-children="启用"
          un-checked-children="禁用"
        />
      </Form.Item>
    </Form>
  </Modal>
</template>
