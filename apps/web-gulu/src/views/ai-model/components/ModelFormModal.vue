<script setup lang="ts">
import type {
  AiModel,
  AiProvider,
  CreateAiModelParams,
  UpdateAiModelParams,
} from '#/api/ai-model';

import { ref } from 'vue';

import {
  Col,
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
  updateAiModelApi,
} from '#/api/ai-model';

const emit = defineEmits<{ success: [] }>();

const visible = ref(false);
const modalTitle = ref('新增模型');
const editingId = ref<number | null>(null);
const submitLoading = ref(false);
const currentProvider = ref<AiProvider | null>(null);

const formState = ref<CreateAiModelParams & { api_key: string }>({
  provider_id: undefined,
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

/**
 * 打开弹窗
 * @param provider 关联供应商（新增模型时必传）
 * @param record 编辑时的模型数据
 */
function open(provider?: AiProvider, record?: AiModel) {
  currentProvider.value = provider || null;

  if (record) {
    modalTitle.value = '编辑模型';
    editingId.value = record.id;
    formState.value = {
      provider_id: record.provider_id || provider?.id,
      name: record.name,
      provider: record.provider,
      model_id: record.model_id,
      version: record.version || '',
      description: record.description || '',
      api_base_url: '',
      api_key: '',
      context_length: record.context_length,
      param_size: record.param_size || '',
      capability_tags: record.capability_tags || [],
      custom_tags: record.custom_tags || [],
      sort: record.sort || 0,
      status: record.status,
    };
  } else {
    modalTitle.value = '新增模型';
    editingId.value = null;
    formState.value = {
      provider_id: provider?.id,
      name: '',
      provider: provider?.name || '',
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

async function handleSubmit() {
  if (!formState.value.name) return message.warning('请输入模型名称');
  if (!formState.value.model_id) return message.warning('请输入模型标识符');

  submitLoading.value = true;
  try {
    if (editingId.value) {
      const params: UpdateAiModelParams = { ...formState.value };
      if (!params.api_key) delete params.api_key;
      if (!params.api_base_url) delete params.api_base_url;
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
    width="640px"
    :confirm-loading="submitLoading"
    @ok="handleSubmit"
  >
    <Form :model="formState" layout="vertical">
      <div v-if="currentProvider" class="mb-3 rounded bg-gray-50 px-3 py-2 text-sm text-gray-500">
        供应商：<strong>{{ currentProvider.name }}</strong>
        （API Key 和 URL 从供应商配置中获取）
      </div>

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

      <Row :gutter="16">
        <Col :span="8">
          <Form.Item label="上下文长度">
            <InputNumber v-model:value="formState.context_length" :min="0" placeholder="131072" style="width: 100%" />
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
        </Space>
      </Form.Item>

      <Form.Item label="描述">
        <Input.TextArea v-model:value="formState.description" placeholder="模型描述" :rows="2" />
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
