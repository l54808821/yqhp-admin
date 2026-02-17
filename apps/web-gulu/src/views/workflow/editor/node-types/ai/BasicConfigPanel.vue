<script setup lang="ts">
/**
 * 基本配置面板：模型选择 + 超时 + 执行模式
 */
import { computed, onMounted, ref } from 'vue';

import { Empty, Form, InputNumber, Select, Switch, Tag, Tooltip, message } from 'ant-design-vue';

import { type AiModel, getAiModelListApi } from '#/api/ai-model';

import type { AIConfig } from './types';

interface Props {
  config: AIConfig;
}

defineProps<Props>();

const emit = defineEmits<{
  (e: 'update', patch: Partial<AIConfig>): void;
}>();

const modelList = ref<AiModel[]>([]);
const modelLoading = ref(false);

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
    <!-- 模型选择 -->
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
        @dropdownVisibleChange="(open: boolean) => open && loadModels()"
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
    </Form.Item>

    <!-- 开关选项 -->
    <div class="switch-row">
      <Tooltip title="启用后，AI 输出将实时流式显示">
        <label class="switch-item">
          <Switch
            size="small"
            :checked="config.streaming"
            @change="(val: any) => emit('update', { streaming: val })"
          />
          <span class="switch-label">流式输出</span>
        </label>
      </Tooltip>
      <Tooltip title="启用后，AI 可在需要时主动请求用户确认、输入或选择">
        <label class="switch-item">
          <Switch
            size="small"
            :checked="config.interactive"
            @change="(val: any) => emit('update', { interactive: val })"
          />
          <span class="switch-label">人机交互</span>
        </label>
      </Tooltip>
    </div>

    <!-- Agent 模式 -->
    <Form.Item label="Agent 模式">
      <Select
        :value="config.agent_mode || ''"
        @change="(val: any) => emit('update', { agent_mode: val || '' })"
      >
        <Select.Option value="">默认（无 Agent 模式）</Select.Option>
        <Select.Option value="react">
          <div class="agent-mode-option">
            <span class="agent-mode-name">ReAct 推理模式</span>
            <span class="agent-mode-desc">思考 → 行动 → 观察 循环推理</span>
          </div>
        </Select.Option>
      </Select>
      <div v-if="config.agent_mode === 'react'" class="agent-mode-tip">
        开启后，AI 将在每次工具调用前显式输出推理过程，并在结果中展示完整的思考链。
      </div>
    </Form.Item>

    <!-- 超时设置 -->
    <div class="timeout-row">
      <Tooltip title="AI 调用的最大等待时间，0 使用默认值（5 分钟）">
        <Form.Item label="超时（秒）" class="timeout-item">
          <InputNumber
            :value="config.timeout"
            :min="0"
            :max="3600"
            :step="30"
            placeholder="300"
            @change="(val: any) => emit('update', { timeout: val })"
          />
        </Form.Item>
      </Tooltip>
      <Tooltip v-if="config.interactive" title="用户未在超时时间内响应时自动跳过，0 表示不超时">
        <Form.Item label="交互超时（秒）" class="timeout-item">
          <InputNumber
            :value="config.interaction_timeout"
            :min="0"
            :max="3600"
            placeholder="300"
            @change="(val: any) => emit('update', { interaction_timeout: val })"
          />
        </Form.Item>
      </Tooltip>
    </div>
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

.switch-row {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 4px 0 16px;
}

.switch-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.switch-label {
  font-size: 13px;
  color: hsl(var(--foreground));
  user-select: none;
}

.agent-mode-option {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.agent-mode-name {
  font-weight: 500;
}

.agent-mode-desc {
  font-size: 11px;
  color: hsl(var(--muted-foreground));
}

.agent-mode-tip {
  margin-top: 6px;
  padding: 8px 10px;
  font-size: 12px;
  color: hsl(var(--foreground) / 60%);
  background: hsl(var(--primary) / 6%);
  border-radius: 6px;
  border: 1px solid hsl(var(--primary) / 12%);
  line-height: 1.5;
}

.timeout-row {
  display: flex;
  gap: 12px;
}

.timeout-item {
  flex: 1;
  min-width: 0;
}

.timeout-item :deep(.ant-input-number) {
  width: 100%;
}
</style>
