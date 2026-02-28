<script setup lang="ts">
/**
 * 共享的模型选择器组件
 */
import { computed, onMounted, ref } from 'vue';

import { Empty, Form, Select, Tag, message } from 'ant-design-vue';

import { type AiModel, getAiModelListApi } from '#/api/ai-model';

interface Props {
  modelId: number | null;
  modelName: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update', value: { ai_model_id: number | null; ai_model_name: string }): void;
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
  <Form.Item label="AI 模型" required>
    <Select
      :value="modelId ?? undefined"
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
</template>

<style scoped>
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
</style>
