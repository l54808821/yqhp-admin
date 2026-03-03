<script setup lang="ts">
/**
 * Dify 风格统一模型选择器
 * 紧凑的一行显示：[供应商图标] 供应商/模型名 [CHAT] [⚙参数] [▼]
 * 下拉按供应商分组，支持全局搜索
 * 参数通过 Popover 内联调节
 */
import { computed, onMounted, ref } from 'vue';

import {
  Button,
  Empty,
  Form,
  Input,
  InputNumber,
  Popover,
  Slider,
  Tag,
  Tooltip,
  message,
} from 'ant-design-vue';

import {
  type AiModel,
  type AiProvider,
  getAiModelListApi,
  getAiProviderListApi,
} from '#/api/ai-model';

interface Props {
  modelId: number | null;
  modelName: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  showParams?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  temperature: 0.7,
  maxTokens: 4096,
  topP: 1,
  showParams: true,
});

const emit = defineEmits<{
  (e: 'update', value: Record<string, any>): void;
}>();

const providers = ref<AiProvider[]>([]);
const modelList = ref<AiModel[]>([]);
const loading = ref(false);
const dropdownVisible = ref(false);
const searchKeyword = ref('');

// 按供应商分组的模型
const groupedModels = computed(() => {
  const keyword = searchKeyword.value.toLowerCase();
  const groups: Record<string, { provider: AiProvider | null; models: AiModel[] }> = {};

  for (const model of modelList.value) {
    if (keyword) {
      const match =
        model.name.toLowerCase().includes(keyword) ||
        model.model_id.toLowerCase().includes(keyword) ||
        model.provider.toLowerCase().includes(keyword);
      if (!match) continue;
    }

    const key = model.provider || '未分类';
    if (!groups[key]) {
      const p = providers.value.find(
        (pv) => pv.name === model.provider || pv.id === model.provider_id,
      );
      groups[key] = { provider: p || null, models: [] };
    }
    groups[key].models.push(model);
  }

  return groups;
});

// 当前选中的模型
const selectedModel = computed(() =>
  modelList.value.find((m) => m.id === props.modelId),
);

async function loadData() {
  loading.value = true;
  try {
    const [provRes, modelRes] = await Promise.all([
      getAiProviderListApi({ pageSize: 100, status: 1 }),
      getAiModelListApi({ status: 1, pageSize: 500 }),
    ]);
    providers.value = provRes.list || [];
    modelList.value = modelRes.list || [];
  } catch (error: any) {
    message.error('加载模型数据失败');
  } finally {
    loading.value = false;
  }
}

function handleSelectModel(model: AiModel) {
  emit('update', { ai_model_id: model.id, ai_model_name: model.name });
  dropdownVisible.value = false;
  searchKeyword.value = '';
}

function getProviderInitial(name: string): string {
  return name ? name.charAt(0).toUpperCase() : '?';
}

onMounted(loadData);
</script>

<template>
  <Form.Item label="模型" required class="model-selector-item">
    <!-- 选择器主体 -->
    <Popover
      v-model:open="dropdownVisible"
      trigger="click"
      placement="bottomLeft"
      :overlay-style="{ width: '400px', maxWidth: '90vw' }"
      :destroy-tooltip-on-hide="false"
      @open-change="(open: boolean) => { if (open) loadData(); }"
    >
      <div class="selector-trigger" :class="{ active: dropdownVisible }">
        <template v-if="selectedModel">
          <div class="selector-icon">
            {{ getProviderInitial(selectedModel.provider) }}
          </div>
          <div class="selector-text">
            <span class="selector-provider">{{ selectedModel.provider }}</span>
            <span class="selector-sep">/</span>
            <span class="selector-model">{{ selectedModel.name }}</span>
          </div>
          <Tag v-if="selectedModel.capability_tags?.includes('对话')" color="blue" size="small" class="selector-tag">CHAT</Tag>
        </template>
        <template v-else>
          <span class="selector-placeholder">选择模型...</span>
        </template>
        <div class="selector-actions">
          <Popover
            v-if="showParams && selectedModel"
            trigger="click"
            placement="bottomRight"
            :overlay-style="{ width: '320px' }"
          >
            <Tooltip title="模型参数">
              <Button
                type="text"
                size="small"
                class="param-btn"
                @click.stop
              >
                ⚙
              </Button>
            </Tooltip>
            <template #content>
              <div class="params-panel">
                <div class="param-row">
                  <span class="param-label">Temperature</span>
                  <div class="param-control">
                    <Slider
                      :value="temperature"
                      :min="0"
                      :max="2"
                      :step="0.1"
                      class="param-slider"
                      @change="(val: any) => emit('update', { temperature: val })"
                    />
                    <InputNumber
                      :value="temperature"
                      :min="0"
                      :max="2"
                      :step="0.1"
                      :precision="1"
                      size="small"
                      class="param-input"
                      @change="(val: any) => emit('update', { temperature: val })"
                    />
                  </div>
                </div>
                <div class="param-row">
                  <span class="param-label">Max Tokens</span>
                  <InputNumber
                    :value="maxTokens"
                    :min="1"
                    :max="128000"
                    size="small"
                    style="width: 100%"
                    @change="(val: any) => emit('update', { max_tokens: val })"
                  />
                </div>
                <div class="param-row">
                  <span class="param-label">Top P</span>
                  <div class="param-control">
                    <Slider
                      :value="topP"
                      :min="0"
                      :max="1"
                      :step="0.05"
                      class="param-slider"
                      @change="(val: any) => emit('update', { top_p: val })"
                    />
                    <InputNumber
                      :value="topP"
                      :min="0"
                      :max="1"
                      :step="0.05"
                      :precision="2"
                      size="small"
                      class="param-input"
                      @change="(val: any) => emit('update', { top_p: val })"
                    />
                  </div>
                </div>
              </div>
            </template>
          </Popover>
          <span class="selector-arrow">▾</span>
        </div>
      </div>

      <!-- 下拉内容 -->
      <template #content>
        <div class="dropdown-panel">
          <div class="dropdown-search">
            <Input
              v-model:value="searchKeyword"
              placeholder="搜索模型..."
              allow-clear
              size="small"
            />
          </div>
          <div class="dropdown-list">
            <template v-if="loading">
              <div class="dropdown-loading">加载中...</div>
            </template>
            <template v-else-if="Object.keys(groupedModels).length === 0">
              <Empty :image="Empty.PRESENTED_IMAGE_SIMPLE" description="无匹配模型" />
            </template>
            <template v-else>
              <div
                v-for="(group, providerName) in groupedModels"
                :key="providerName"
                class="model-group"
              >
                <div class="group-header">
                  <div class="group-icon">
                    {{ getProviderInitial(String(providerName)) }}
                  </div>
                  <span class="group-name">{{ providerName }}</span>
                  <span class="group-count">{{ group.models.length }}</span>
                </div>
                <div
                  v-for="model in group.models"
                  :key="model.id"
                  class="model-item"
                  :class="{ selected: model.id === modelId }"
                  @click="handleSelectModel(model)"
                >
                  <div class="item-main">
                    <span class="item-name">{{ model.name }}</span>
                    <Tag v-if="model.capability_tags?.includes('对话')" color="blue" size="small" class="item-tag">CHAT</Tag>
                    <Tag v-if="model.capability_tags?.includes('推理')" color="orange" size="small" class="item-tag">推理</Tag>
                    <Tag v-if="model.capability_tags?.includes('视觉')" color="cyan" size="small" class="item-tag">视觉</Tag>
                  </div>
                  <div class="item-meta">
                    <span class="item-id">{{ model.model_id }}</span>
                    <span v-if="model.context_length" class="item-ctx">
                      {{ model.context_length >= 1024 ? `${Math.round(model.context_length / 1024)}K` : model.context_length }}
                    </span>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>
      </template>
    </Popover>
  </Form.Item>
</template>

<style scoped>
.model-selector-item {
  margin-bottom: 12px;
}

/* Trigger */
.selector-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 36px;
  background: #fff;
}

.selector-trigger:hover {
  border-color: #4096ff;
}

.selector-trigger.active {
  border-color: #4096ff;
  box-shadow: 0 0 0 2px rgba(64, 150, 255, 0.1);
}

.selector-icon {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 12px;
  flex-shrink: 0;
}

.selector-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
}

.selector-provider {
  color: #999;
}

.selector-sep {
  color: #ddd;
  margin: 0 2px;
}

.selector-model {
  font-weight: 500;
}

.selector-placeholder {
  color: #bbb;
  font-size: 13px;
  flex: 1;
}

.selector-tag {
  margin: 0 !important;
  font-size: 10px !important;
  line-height: 1 !important;
  padding: 0 4px !important;
}

.selector-actions {
  display: flex;
  gap: 2px;
  align-items: center;
  flex-shrink: 0;
}

.param-btn {
  width: 24px !important;
  height: 24px !important;
  font-size: 12px !important;
}

.selector-arrow {
  font-size: 10px;
  color: #999;
  transition: transform 0.2s;
}

.selector-trigger.active .selector-arrow {
  transform: rotate(180deg);
}

/* Params panel */
.params-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.param-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.param-label {
  font-size: 12px;
  font-weight: 500;
  color: #666;
}

.param-control {
  display: flex;
  gap: 8px;
  align-items: center;
}

.param-slider {
  flex: 1;
}

.param-input {
  width: 72px !important;
}

/* Dropdown */
.dropdown-panel {
  display: flex;
  flex-direction: column;
}

.dropdown-search {
  padding: 4px 0 8px;
}

.dropdown-list {
  max-height: 360px;
  overflow-y: auto;
}

.dropdown-loading {
  padding: 20px;
  text-align: center;
  color: #999;
}

.model-group {
  margin-bottom: 4px;
}

.group-header {
  display: flex;
  gap: 6px;
  align-items: center;
  padding: 6px 4px;
  font-size: 12px;
  color: #999;
  position: sticky;
  top: 0;
  background: #fff;
  z-index: 1;
}

.group-icon {
  width: 18px;
  height: 18px;
  border-radius: 3px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 10px;
}

.group-name {
  font-weight: 500;
  color: #666;
}

.group-count {
  font-size: 11px;
  color: #bbb;
}

.model-item {
  padding: 8px 8px 8px 28px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s;
}

.model-item:hover {
  background: #f5f5f5;
}

.model-item.selected {
  background: #e6f4ff;
}

.item-main {
  display: flex;
  gap: 6px;
  align-items: center;
}

.item-name {
  font-size: 13px;
  font-weight: 500;
}

.item-tag {
  margin: 0 !important;
  font-size: 10px !important;
  line-height: 1 !important;
  padding: 0 3px !important;
}

.item-meta {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 2px;
}

.item-id {
  font-size: 11px;
  color: #bbb;
  font-family: monospace;
}

.item-ctx {
  font-size: 11px;
  color: #bbb;
}
</style>
