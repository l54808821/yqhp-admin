<script setup lang="ts">
import type {
  AiModel,
  CreateAiModelParams,
  PresetModel,
  UpdateAiModelParams,
} from '#/api/ai-model';

import { computed, ref } from 'vue';

import {
  Button,
  Col,
  Divider,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Row,
  Select,
  Space,
  Switch,
  Tag,
} from 'ant-design-vue';

import {
  CAPABILITY_TAG_OPTIONS,
  createAiModelApi,
  PROVIDER_NAMES,
  PROVIDER_PRESETS,
  updateAiModelApi,
} from '#/api/ai-model';

const emit = defineEmits<{
  success: [];
}>();

// 弹框状态
const visible = ref(false);
const modalTitle = ref('新增模型');
const editingId = ref<number | null>(null);
const submitLoading = ref(false);

const formState = ref<CreateAiModelParams & { api_key: string }>({
  name: '',
  provider: '',
  model_id: '',
  version: '',
  description: '',
  api_base_url: '',
  api_key: '',
  context_length: undefined,
  param_size: '',
  capability_tags: [],
  custom_tags: [],
  sort: 0,
  status: 1,
});

const customTagInput = ref('');
const currentPresetModels = ref<PresetModel[]>([]);
const currentRequireApiKey = ref(true);

// 厂商选项
const formProviderOptions = computed(() =>
  PROVIDER_NAMES.map((p) => ({ label: p, value: p })),
);

// 预置模型选项
const presetModelOptions = computed(() =>
  currentPresetModels.value.map((m) => ({
    label: `${m.name} (${m.model_id})`,
    value: m.model_id,
  })),
);

// 暴露 open 方法
function open(record?: AiModel) {
  if (record) {
    // 编辑模式
    modalTitle.value = '编辑模型';
    editingId.value = record.id;
    const preset = PROVIDER_PRESETS[record.provider];
    if (preset) {
      currentPresetModels.value = preset.models;
      currentRequireApiKey.value = preset.require_api_key;
    } else {
      currentPresetModels.value = [];
      currentRequireApiKey.value = true;
    }
    formState.value = {
      name: record.name,
      provider: record.provider,
      model_id: record.model_id,
      version: record.version || '',
      description: record.description || '',
      api_base_url: record.api_base_url,
      api_key: '',
      context_length: record.context_length,
      param_size: record.param_size || '',
      capability_tags: record.capability_tags || [],
      custom_tags: record.custom_tags || [],
      sort: record.sort || 0,
      status: record.status,
    };
  } else {
    // 新增模式
    modalTitle.value = '新增模型';
    editingId.value = null;
    currentPresetModels.value = [];
    currentRequireApiKey.value = true;
    formState.value = {
      name: '',
      provider: '',
      model_id: '',
      version: '',
      description: '',
      api_base_url: '',
      api_key: '',
      context_length: undefined,
      param_size: '',
      capability_tags: [],
      custom_tags: [],
      sort: 0,
      status: 1,
    };
  }
  visible.value = true;
}

// 厂商变更
function handleProviderChange(providerName: string) {
  const preset = PROVIDER_PRESETS[providerName];
  if (!preset) return;

  currentPresetModels.value = preset.models;
  currentRequireApiKey.value = preset.require_api_key;

  if (!editingId.value) {
    formState.value.api_base_url = preset.api_base_url;
    formState.value.api_key = preset.require_api_key ? '' : 'ollama';
    formState.value.model_id = '';
    formState.value.name = '';
    formState.value.context_length = undefined;
    formState.value.param_size = '';
    formState.value.capability_tags = [];
    formState.value.description = '';
  }
}

// 预置模型变更
function handlePresetModelChange(modelId: string) {
  const model = currentPresetModels.value.find((m) => m.model_id === modelId);
  if (!model) return;

  formState.value.model_id = model.model_id;
  formState.value.name = model.name;
  if (model.context_length) formState.value.context_length = model.context_length;
  if (model.param_size) formState.value.param_size = model.param_size;
  if (model.capability_tags) formState.value.capability_tags = [...model.capability_tags];
  if (model.description) formState.value.description = model.description;
}

// 提交
async function handleSubmit() {
  if (!formState.value.name) return message.warning('请输入模型名称');
  if (!formState.value.provider) return message.warning('请选择厂商');
  if (!formState.value.model_id) return message.warning('请输入模型标识符');
  if (!formState.value.api_base_url) return message.warning('请输入 API Base URL');
  if (currentRequireApiKey.value && !editingId.value && !formState.value.api_key) {
    return message.warning('请输入 API Key');
  }

  submitLoading.value = true;
  try {
    if (editingId.value) {
      const params: UpdateAiModelParams = { ...formState.value };
      if (!params.api_key) delete params.api_key;
      await updateAiModelApi(editingId.value, params);
      message.success('更新成功');
    } else {
      await createAiModelApi(formState.value);
      message.success('创建成功');
    }
    visible.value = false;
    emit('success');
  } catch {
    message.error('操作失败');
  } finally {
    submitLoading.value = false;
  }
}

// 自定义标签
function addCustomTag() {
  const tag = customTagInput.value.trim();
  if (tag && !formState.value.custom_tags?.includes(tag)) {
    if (!formState.value.custom_tags) formState.value.custom_tags = [];
    formState.value.custom_tags.push(tag);
    customTagInput.value = '';
  }
}

function removeCustomTag(tag: string) {
  if (formState.value.custom_tags) {
    formState.value.custom_tags = formState.value.custom_tags.filter((t) => t !== tag);
  }
}

defineExpose({ open });
</script>

<template>
  <Modal
    v-model:open="visible"
    :title="modalTitle"
    width="680px"
    :confirm-loading="submitLoading"
    @ok="handleSubmit"
  >
    <Form :model="formState" layout="vertical">
      <Form.Item label="厂商" required>
        <Select
          v-model:value="formState.provider"
          placeholder="请选择厂商"
          :options="formProviderOptions"
          show-search
          style="width: 100%"
          @change="handleProviderChange"
        />
      </Form.Item>

      <Form.Item v-if="currentPresetModels.length > 0" label="快速选择模型">
        <Select
          :value="formState.model_id || undefined"
          placeholder="选择预置模型自动填充信息，或手动填写"
          :options="presetModelOptions"
          allow-clear
          style="width: 100%"
          @change="handlePresetModelChange"
        />
      </Form.Item>

      <Divider style="margin: 12px 0" />

      <Row :gutter="16">
        <Col :span="12">
          <Form.Item label="模型名称" required>
            <Input v-model:value="formState.name" placeholder="如 DeepSeek-V3" />
          </Form.Item>
        </Col>
        <Col :span="12">
          <Form.Item label="模型标识符 (Model ID)" required>
            <Input v-model:value="formState.model_id" placeholder="调用 API 时使用的 model 参数" />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item label="API Base URL" required>
        <Input v-model:value="formState.api_base_url" placeholder="如 https://api.deepseek.com/v1" />
      </Form.Item>

      <Form.Item
        v-if="currentRequireApiKey"
        :label="editingId ? 'API Key（留空则不修改）' : 'API Key'"
        :required="!editingId"
      >
        <Input.Password v-model:value="formState.api_key" placeholder="请输入 API Key" />
      </Form.Item>

      <Row :gutter="16">
        <Col :span="8">
          <Form.Item label="上下文长度">
            <InputNumber v-model:value="formState.context_length" :min="0" placeholder="如 131072" style="width: 100%" />
          </Form.Item>
        </Col>
        <Col :span="8">
          <Form.Item label="参数量">
            <Input v-model:value="formState.param_size" placeholder="如 671B" />
          </Form.Item>
        </Col>
        <Col :span="8">
          <Form.Item label="版本">
            <Input v-model:value="formState.version" placeholder="如 3.0" />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item label="能力标签">
        <Select
          v-model:value="formState.capability_tags"
          mode="multiple"
          placeholder="选择模型能力标签"
          :options="CAPABILITY_TAG_OPTIONS.map((t) => ({ label: t, value: t }))"
        />
      </Form.Item>

      <Form.Item label="自定义标签">
        <div class="mb-2">
          <Tag v-for="tag in formState.custom_tags" :key="tag" closable @close="removeCustomTag(tag)">
            {{ tag }}
          </Tag>
        </div>
        <Space>
          <Input v-model:value="customTagInput" placeholder="输入标签" style="width: 200px" @press-enter="addCustomTag" />
          <Button type="dashed" @click="addCustomTag">添加</Button>
        </Space>
      </Form.Item>

      <Form.Item label="描述">
        <Input.TextArea v-model:value="formState.description" placeholder="请输入模型描述" :rows="3" />
      </Form.Item>

      <Row :gutter="16">
        <Col :span="12">
          <Form.Item label="排序">
            <InputNumber v-model:value="formState.sort" :min="0" style="width: 100%" />
          </Form.Item>
        </Col>
        <Col :span="12">
          <Form.Item label="状态">
            <Switch
              v-model:checked="formState.status"
              :checked-value="1"
              :un-checked-value="0"
              checked-children="启用"
              un-checked-children="禁用"
            />
          </Form.Item>
        </Col>
      </Row>
    </Form>
  </Modal>
</template>
