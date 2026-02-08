<script setup lang="ts">
import type {
  AiModel,
  AiModelListParams,
  CreateAiModelParams,
  PresetModel,
  UpdateAiModelParams,
} from '#/api/ai-model';

import { computed, onMounted, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';

import { Page } from '#/components/page';

import {
  Button,
  Card,
  Col,
  Divider,
  Empty,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Pagination,
  Popconfirm,
  Row,
  Select,
  Space,
  Spin,
  Switch,
  Tag,
  Tooltip,
  Typography,
} from 'ant-design-vue';

import {
  CAPABILITY_TAG_OPTIONS,
  createAiModelApi,
  deleteAiModelApi,
  getAiModelListApi,
  getAiModelProvidersApi,
  PROVIDER_NAMES,
  PROVIDER_PRESETS,
  updateAiModelApi,
  updateAiModelStatusApi,
} from '#/api/ai-model';

const router = useRouter();
const route = useRoute();

// 搜索参数
const searchParams = ref<AiModelListParams>({
  page: 1,
  pageSize: 12,
  name: undefined,
  provider: undefined,
  status: undefined,
});

// 数据
const modelList = ref<AiModel[]>([]);
const total = ref(0);
const loading = ref(false);
const providers = ref<string[]>([]);

// 弹框
const modalVisible = ref(false);
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

// 当前选中的预置模型列表
const currentPresetModels = ref<PresetModel[]>([]);
// 当前选中的厂商是否需要 API Key
const currentRequireApiKey = ref(true);

// 厂商变更处理（仅新增时自动填充）
function handleProviderChange(providerName: string) {
  const preset = PROVIDER_PRESETS[providerName];
  if (!preset) return;

  // 更新预置模型列表
  currentPresetModels.value = preset.models;
  currentRequireApiKey.value = preset.require_api_key;

  // 仅在新增模式下自动填充 URL
  if (!editingId.value) {
    formState.value.api_base_url = preset.api_base_url;
    // 如果不需要 API Key，填充默认值
    if (!preset.require_api_key) {
      formState.value.api_key = 'ollama';
    } else {
      formState.value.api_key = '';
    }
    // 清空之前选的模型相关字段
    formState.value.model_id = '';
    formState.value.name = '';
    formState.value.context_length = undefined;
    formState.value.param_size = '';
    formState.value.capability_tags = [];
    formState.value.description = '';
  }
}

// 预置模型变更处理
function handlePresetModelChange(modelId: string) {
  const model = currentPresetModels.value.find((m) => m.model_id === modelId);
  if (!model) return;

  formState.value.model_id = model.model_id;
  formState.value.name = model.name;
  if (model.context_length) {
    formState.value.context_length = model.context_length;
  }
  if (model.param_size) {
    formState.value.param_size = model.param_size;
  }
  if (model.capability_tags) {
    formState.value.capability_tags = [...model.capability_tags];
  }
  if (model.description) {
    formState.value.description = model.description;
  }
}

// 加载数据
async function loadData() {
  loading.value = true;
  try {
    const res = await getAiModelListApi(searchParams.value);
    modelList.value = res.list || [];
    total.value = res.total || 0;
  } catch {
    message.error('加载模型列表失败');
  } finally {
    loading.value = false;
  }
}

// 加载厂商列表
async function loadProviders() {
  try {
    const res = await getAiModelProvidersApi();
    providers.value = res || [];
  } catch {
    // 忽略
  }
}

// 搜索
function handleSearch() {
  searchParams.value.page = 1;
  loadData();
}

// 重置
function handleReset() {
  searchParams.value = {
    page: 1,
    pageSize: 12,
    name: undefined,
    provider: undefined,
    status: undefined,
  };
  loadData();
}

// 分页
function handlePageChange(page: number, pageSize: number) {
  searchParams.value.page = page;
  searchParams.value.pageSize = pageSize;
  loadData();
}

// 新增
function handleAdd() {
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
  modalVisible.value = true;
}

// 编辑
function handleEdit(record: AiModel) {
  modalTitle.value = '编辑模型';
  editingId.value = record.id;
  // 设置当前厂商的预置模型
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
    api_key: '', // 编辑时不回显 API Key
    context_length: record.context_length,
    param_size: record.param_size || '',
    capability_tags: record.capability_tags || [],
    custom_tags: record.custom_tags || [],
    sort: record.sort || 0,
    status: record.status,
  };
  modalVisible.value = true;
}

// 提交
async function handleSubmit() {
  if (!formState.value.name) {
    message.warning('请输入模型名称');
    return;
  }
  if (!formState.value.provider) {
    message.warning('请选择厂商');
    return;
  }
  if (!formState.value.model_id) {
    message.warning('请输入模型标识符');
    return;
  }
  if (!formState.value.api_base_url) {
    message.warning('请输入 API Base URL');
    return;
  }
  if (currentRequireApiKey.value && !editingId.value && !formState.value.api_key) {
    message.warning('请输入 API Key');
    return;
  }

  submitLoading.value = true;
  try {
    if (editingId.value) {
      const params: UpdateAiModelParams = { ...formState.value };
      if (!params.api_key) {
        delete params.api_key;
      }
      await updateAiModelApi(editingId.value, params);
      message.success('更新成功');
    } else {
      await createAiModelApi(formState.value);
      message.success('创建成功');
    }
    modalVisible.value = false;
    await loadData();
    await loadProviders();
  } catch {
    message.error('操作失败');
  } finally {
    submitLoading.value = false;
  }
}

// 删除
async function handleDelete(id: number) {
  try {
    await deleteAiModelApi(id);
    message.success('删除成功');
    await loadData();
  } catch {
    message.error('删除失败');
  }
}

// 状态变更
async function handleStatusChange(id: number, checked: boolean | string | number) {
  try {
    const status = checked ? 1 : 0;
    await updateAiModelStatusApi(id, status);
    message.success('状态更新成功');
    await loadData();
  } catch {
    message.error('状态更新失败');
  }
}

// 进入对话
function handleChat(record: AiModel) {
  const projectId = route.params.projectId;
  router.push(`/project/${projectId}/ai-model/${record.id}/chat`);
}

// 添加自定义标签
function addCustomTag() {
  const tag = customTagInput.value.trim();
  if (tag && !formState.value.custom_tags?.includes(tag)) {
    if (!formState.value.custom_tags) {
      formState.value.custom_tags = [];
    }
    formState.value.custom_tags.push(tag);
    customTagInput.value = '';
  }
}

// 移除自定义标签
function removeCustomTag(tag: string) {
  if (formState.value.custom_tags) {
    formState.value.custom_tags = formState.value.custom_tags.filter(
      (t) => t !== tag,
    );
  }
}

// 格式化上下文长度
function formatContextLength(length?: number): string {
  if (!length) return '';
  if (length >= 1024) {
    return `${Math.round(length / 1024)}K`;
  }
  return `${length}`;
}

// 获取能力标签颜色
function getCapabilityTagColor(tag: string): string {
  const colorMap: Record<string, string> = {
    '对话': 'blue',
    'FIM': 'purple',
    'Prefix': 'cyan',
    'Tools': 'green',
    '视觉': 'orange',
    'MoE': 'magenta',
    'Math': 'red',
    'Coder': 'geekblue',
    '推理': 'volcano',
    '语音': 'lime',
    '生图': 'gold',
    '视频': 'purple',
  };
  return colorMap[tag] || 'default';
}

// 搜索栏的厂商选项（合并预置 + 数据库已有的）
const searchProviderOptions = computed(() => {
  const all = new Set([...PROVIDER_NAMES.filter((n) => n !== '自定义'), ...providers.value]);
  return [...all].map((p) => ({ label: p, value: p }));
});

// 表单中的厂商选项（使用预置列表）
const formProviderOptions = computed(() =>
  PROVIDER_NAMES.map((p) => ({ label: p, value: p })),
);

// 表单中的预置模型选项
const presetModelOptions = computed(() =>
  currentPresetModels.value.map((m) => ({
    label: `${m.name} (${m.model_id})`,
    value: m.model_id,
  })),
);

// 初始化
onMounted(() => {
  loadData();
  loadProviders();
});
</script>

<template>
  <Page auto-content-height>
    <div class="ai-model-page">
      <!-- 搜索栏 -->
      <Card class="mb-4" size="small">
        <Row :gutter="16" align="middle">
          <Col :span="6">
            <Input
              v-model:value="searchParams.name"
              placeholder="搜索模型名称"
              allow-clear
              @press-enter="handleSearch"
            />
          </Col>
          <Col :span="4">
            <Select
              v-model:value="searchParams.provider"
              placeholder="选择厂商"
              allow-clear
              :options="searchProviderOptions"
              style="width: 100%"
            />
          </Col>
          <Col :span="4">
            <Select
              v-model:value="searchParams.status"
              placeholder="状态"
              allow-clear
              style="width: 100%"
              :options="[
                { label: '启用', value: 1 },
                { label: '禁用', value: 0 },
              ]"
            />
          </Col>
          <Col :span="10" style="text-align: right">
            <Space>
              <Button @click="handleReset">重置</Button>
              <Button type="primary" @click="handleSearch">搜索</Button>
              <Button type="primary" @click="handleAdd">新增模型</Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <!-- 模型卡片列表 -->
      <Spin :spinning="loading">
        <div v-if="modelList.length > 0">
          <Row :gutter="[16, 16]">
            <Col
              v-for="model in modelList"
              :key="model.id"
              :xs="24"
              :sm="12"
              :md="8"
              :lg="8"
              :xl="6"
            >
              <Card
                hoverable
                class="model-card"
                :class="{ 'model-card--disabled': model.status === 0 }"
              >
                <!-- 卡片头部 -->
                <template #title>
                  <div class="model-card__header">
                    <div class="model-card__title-row">
                      <Typography.Text strong class="model-card__name" :ellipsis="{ tooltip: model.name }">
                        {{ model.name }}
                      </Typography.Text>
                      <Tag v-if="model.version" color="blue" class="model-card__version">
                        v{{ model.version }}
                      </Tag>
                    </div>
                    <Typography.Text type="secondary" class="model-card__provider">
                      {{ model.provider }}
                    </Typography.Text>
                  </div>
                </template>

                <!-- 卡片操作 -->
                <template #extra>
                  <Switch
                    :checked="model.status === 1"
                    size="small"
                    @click.stop
                    @change="(checked: any) => handleStatusChange(model.id, checked)"
                  />
                </template>

                <!-- 卡片内容 -->
                <div class="model-card__body" @click="handleChat(model)">
                  <!-- 描述 -->
                  <Typography.Paragraph
                    type="secondary"
                    :ellipsis="{ rows: 2, tooltip: model.description }"
                    class="model-card__desc"
                  >
                    {{ model.description || '暂无描述' }}
                  </Typography.Paragraph>

                  <!-- 模型信息 -->
                  <div class="model-card__info">
                    <span v-if="model.param_size" class="model-card__info-item">
                      <Tag>{{ model.param_size }}</Tag>
                    </span>
                    <span v-if="model.context_length" class="model-card__info-item">
                      <Tag>{{ formatContextLength(model.context_length) }}</Tag>
                    </span>
                    <span class="model-card__info-item">
                      <Tooltip :title="model.model_id">
                        <Tag color="processing">{{ model.model_id }}</Tag>
                      </Tooltip>
                    </span>
                  </div>

                  <!-- 能力标签 -->
                  <div class="model-card__tags">
                    <Tag
                      v-for="tag in model.capability_tags"
                      :key="tag"
                      :color="getCapabilityTagColor(tag)"
                      size="small"
                    >
                      {{ tag }}
                    </Tag>
                    <Tag
                      v-for="tag in model.custom_tags"
                      :key="'custom-' + tag"
                      size="small"
                    >
                      {{ tag }}
                    </Tag>
                  </div>
                </div>

                <!-- 卡片底部操作 -->
                <template #actions>
                  <Tooltip title="在线体验">
                    <span @click="handleChat(model)">对话</span>
                  </Tooltip>
                  <Tooltip title="编辑">
                    <span @click="handleEdit(model)">编辑</span>
                  </Tooltip>
                  <Popconfirm title="确定删除此模型？" @confirm="handleDelete(model.id)">
                    <span class="text-red-500">删除</span>
                  </Popconfirm>
                </template>
              </Card>
            </Col>
          </Row>

          <!-- 分页 -->
          <div class="mt-4 flex justify-end">
            <Pagination
              :current="searchParams.page"
              :page-size="searchParams.pageSize"
              :total="total"
              show-size-changer
              show-quick-jumper
              :show-total="(t: number) => `共 ${t} 个模型`"
              @change="handlePageChange"
            />
          </div>
        </div>

        <!-- 空状态 -->
        <div v-else-if="!loading" class="flex items-center justify-center" style="min-height: 400px">
          <Empty description="暂无模型，点击上方「新增模型」添加">
            <Button type="primary" @click="handleAdd">新增模型</Button>
          </Empty>
        </div>
      </Spin>
    </div>

    <!-- 新增/编辑弹框 -->
    <Modal
      v-model:open="modalVisible"
      :title="modalTitle"
      width="680px"
      :confirm-loading="submitLoading"
      @ok="handleSubmit"
    >
      <Form :model="formState" layout="vertical">
        <!-- 第一步：选择厂商 -->
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

        <!-- 第二步：选择预置模型（如果有） -->
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

        <!-- 模型基本信息 -->
        <Row :gutter="16">
          <Col :span="12">
            <Form.Item label="模型名称" required>
              <Input
                v-model:value="formState.name"
                placeholder="如 DeepSeek-V3"
              />
            </Form.Item>
          </Col>
          <Col :span="12">
            <Form.Item label="模型标识符 (Model ID)" required>
              <Input
                v-model:value="formState.model_id"
                placeholder="调用 API 时使用的 model 参数"
              />
            </Form.Item>
          </Col>
        </Row>

        <!-- API 配置 -->
        <Form.Item label="API Base URL" required>
          <Input
            v-model:value="formState.api_base_url"
            placeholder="如 https://api.deepseek.com/v1"
          />
        </Form.Item>

        <Form.Item
          v-if="currentRequireApiKey"
          :label="editingId ? 'API Key（留空则不修改）' : 'API Key'"
          :required="!editingId"
        >
          <Input.Password
            v-model:value="formState.api_key"
            placeholder="请输入 API Key"
          />
        </Form.Item>

        <!-- 模型参数 -->
        <Row :gutter="16">
          <Col :span="8">
            <Form.Item label="上下文长度">
              <InputNumber
                v-model:value="formState.context_length"
                :min="0"
                placeholder="如 131072"
                style="width: 100%"
              />
            </Form.Item>
          </Col>
          <Col :span="8">
            <Form.Item label="参数量">
              <Input
                v-model:value="formState.param_size"
                placeholder="如 671B"
              />
            </Form.Item>
          </Col>
          <Col :span="8">
            <Form.Item label="版本">
              <Input
                v-model:value="formState.version"
                placeholder="如 3.0"
              />
            </Form.Item>
          </Col>
        </Row>

        <!-- 标签 -->
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
            <Tag
              v-for="tag in formState.custom_tags"
              :key="tag"
              closable
              @close="removeCustomTag(tag)"
            >
              {{ tag }}
            </Tag>
          </div>
          <Space>
            <Input
              v-model:value="customTagInput"
              placeholder="输入标签"
              style="width: 200px"
              @press-enter="addCustomTag"
            />
            <Button type="dashed" @click="addCustomTag">添加</Button>
          </Space>
        </Form.Item>

        <Form.Item label="描述">
          <Input.TextArea
            v-model:value="formState.description"
            placeholder="请输入模型描述"
            :rows="3"
          />
        </Form.Item>

        <Row :gutter="16">
          <Col :span="12">
            <Form.Item label="排序">
              <InputNumber
                v-model:value="formState.sort"
                :min="0"
                style="width: 100%"
              />
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
  </Page>
</template>

<style scoped>
.ai-model-page {
  padding: 0;
}

.model-card {
  height: 100%;
  transition: all 0.3s;
  cursor: default;
}

.model-card:hover {
  box-shadow: 0 4px 12px rgb(0 0 0 / 15%);
}

.model-card--disabled {
  opacity: 0.6;
}

.model-card__header {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.model-card__title-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.model-card__name {
  max-width: 140px;
  font-size: 15px;
}

.model-card__version {
  flex-shrink: 0;
  margin: 0;
  font-size: 11px;
}

.model-card__provider {
  font-size: 12px;
}

.model-card__body {
  cursor: pointer;
}

.model-card__desc {
  min-height: 44px;
  margin-bottom: 8px;
  font-size: 13px;
}

.model-card__info {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 8px;
}

.model-card__info-item :deep(.ant-tag) {
  margin: 0;
  font-size: 11px;
}

.model-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  min-height: 24px;
}

.model-card__tags :deep(.ant-tag) {
  margin: 0;
}
</style>
