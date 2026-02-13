<script setup lang="ts">
/**
 * 基本配置面板：模型选择 + 超时时间
 */
import { computed, onMounted, ref } from 'vue';

import { Button, Empty, Form, InputNumber, Select, Tag, message } from 'ant-design-vue';

import { type AiModel, getAiModelListApi } from '#/api/ai-model';

import type { AIConfig } from './types';

interface Props {
  config: AIConfig;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update', patch: Partial<AIConfig>): void;
}>();

const modelList = ref<AiModel[]>([]);
const modelLoading = ref(false);

const selectedModel = computed(() => {
  if (!props.config.ai_model_id) return null;
  return modelList.value.find((m) => m.id === props.config.ai_model_id) || null;
});

const filteredModelOptions = computed(() => {
  return modelList.value.map((m) => ({
    value: m.id,
    label: m.name,
    model: m,
  }));
});

function filterModelOption(input: string, option: any) {
  const model = option.model as AiModel;
  const keyword = input.toLowerCase();
  return (
    model.name.toLowerCase().includes(keyword) ||
    model.provider.toLowerCase().includes(keyword) ||
    model.model_id.toLowerCase().includes(keyword)
  );
}

function getCapabilityColor(tag: string): string {
  const colorMap: Record<string, string> = {
    '对话': 'blue',
    'Tools': 'green',
    'Coder': 'purple',
    '推理': 'orange',
    '视觉': 'cyan',
    'Math': 'red',
    'FIM': 'geekblue',
    'MoE': 'volcano',
  };
  return colorMap[tag] || 'default';
}

async function loadModels() {
  modelLoading.value = true;
  try {
    const res = await getAiModelListApi({ status: 1, pageSize: 100 });
    modelList.value = res.list || [];
  } catch (error: any) {
    message.error('加载模型列表失败: ' + (error.message || '未知错误'));
  } finally {
    modelLoading.value = false;
  }
}

function handleModelSelect(modelId: number) {
  const model = modelList.value.find((m) => m.id === modelId);
  if (model) {
    emit('update', { ai_model_id: model.id, ai_model_name: model.name });
  }
}

function handleModelClear() {
  emit('update', { ai_model_id: null, ai_model_name: '' });
}

onMounted(() => {
  loadModels();
});
</script>

<template>
  <Form layout="vertical" class="config-form">
    <Form.Item label="AI 模型" required>
      <Select
        :value="config.ai_model_id ?? undefined"
        placeholder="搜索并选择模型..."
        show-search
        allow-clear
        :loading="modelLoading"
        :filter-option="filterModelOption"
        :options="filteredModelOptions"
        :not-found-content="modelLoading ? undefined : null"
        @change="(val: any) => val ? handleModelSelect(val) : handleModelClear()"
        @clear="handleModelClear"
      >
        <template #notFoundContent>
          <Empty
            :image="Empty.PRESENTED_IMAGE_SIMPLE"
            description="暂无可用模型，请先在 AI 模型管理中添加"
          />
        </template>
        <template #option="{ model: m }">
          <div class="model-option">
            <div class="model-option-main">
              <span class="model-option-name">{{ m.name }}</span>
              <span class="model-option-provider">{{ m.provider }}</span>
            </div>
            <div class="model-option-info">
              <span class="model-option-id">{{ m.model_id }}</span>
              <Tag
                v-for="tag in (m.capability_tags || []).slice(0, 3)"
                :key="tag"
                :color="getCapabilityColor(tag)"
                size="small"
                class="model-option-tag"
              >
                {{ tag }}
              </Tag>
            </div>
          </div>
        </template>
      </Select>
      <Button
        type="link"
        size="small"
        :loading="modelLoading"
        style="padding: 0; margin-top: 4px"
        @click="loadModels"
      >
        刷新模型列表
      </Button>
    </Form.Item>

    <!-- 已选模型信息 -->
    <div v-if="selectedModel" class="selected-model-info">
      <div class="model-info-row">
        <span class="model-info-label">提供商</span>
        <span class="model-info-value">{{ selectedModel.provider }}</span>
      </div>
      <div class="model-info-row">
        <span class="model-info-label">模型 ID</span>
        <span class="model-info-value">{{ selectedModel.model_id }}</span>
      </div>
      <div v-if="selectedModel.context_length" class="model-info-row">
        <span class="model-info-label">上下文</span>
        <span class="model-info-value">{{ (selectedModel.context_length / 1024).toFixed(0) }}K</span>
      </div>
      <div v-if="selectedModel.capability_tags?.length" class="model-info-row">
        <span class="model-info-label">能力</span>
        <span class="model-info-value">
          <Tag
            v-for="tag in selectedModel.capability_tags"
            :key="tag"
            :color="getCapabilityColor(tag)"
            size="small"
          >
            {{ tag }}
          </Tag>
        </span>
      </div>
      <div v-if="selectedModel.description" class="model-info-row">
        <span class="model-info-label">描述</span>
        <span class="model-info-value model-desc">{{ selectedModel.description }}</span>
      </div>
    </div>

    <!-- 超时时间 -->
    <Form.Item label="超时时间（秒）" style="margin-top: 16px">
      <InputNumber
        :value="config.timeout"
        :min="0"
        :max="3600"
        :step="30"
        placeholder="默认 300 秒"
        style="width: 100%"
        @change="(val: any) => emit('update', { timeout: val })"
      />
      <div class="param-hint">
        AI 调用的最大等待时间。设为 0 则使用系统默认值（5 分钟）。
      </div>
    </Form.Item>
  </Form>
</template>

<style scoped>
.config-form {
  padding-top: 0;
}

.model-option {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px 0;
}

.model-option-main {
  display: flex;
  align-items: center;
  gap: 8px;
}

.model-option-name {
  font-weight: 500;
}

.model-option-provider {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.model-option-info {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.model-option-id {
  font-size: 11px;
  color: hsl(var(--muted-foreground));
  font-family: monospace;
}

.model-option-tag {
  font-size: 10px;
  line-height: 1;
  padding: 0 4px;
  margin: 0;
}

.selected-model-info {
  background: hsl(var(--muted) / 30%);
  border-radius: 8px;
  padding: 12px;
  margin-top: 8px;
}

.model-info-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 6px;
}

.model-info-row:last-child {
  margin-bottom: 0;
}

.model-info-label {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  width: 56px;
  flex-shrink: 0;
}

.model-info-value {
  font-size: 12px;
  color: hsl(var(--foreground));
  word-break: break-all;
}

.model-desc {
  color: hsl(var(--muted-foreground));
}

.param-hint {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}
</style>
