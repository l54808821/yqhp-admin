<script setup lang="ts">
import type { AiProvider, PresetModel } from '#/api/ai-model';

import { computed, ref } from 'vue';

import { Checkbox, message, Modal, Tag } from 'ant-design-vue';

import { batchCreateModelsApi, PROVIDER_PRESETS } from '#/api/ai-model';

const emit = defineEmits<{ success: [] }>();

const visible = ref(false);
const submitLoading = ref(false);
const currentProvider = ref<AiProvider | null>(null);
const presetModels = ref<PresetModel[]>([]);
const selectedModelIds = ref<string[]>([]);

function open(provider: AiProvider) {
  currentProvider.value = provider;

  const preset = Object.values(PROVIDER_PRESETS).find(
    (p) => p.provider_type === provider.provider_type || p.name === provider.name,
  );
  presetModels.value = preset?.models || [];
  selectedModelIds.value = presetModels.value.map((m) => m.model_id);
  visible.value = true;
}

const allSelected = computed({
  get: () => selectedModelIds.value.length === presetModels.value.length,
  set: (val: boolean) => {
    selectedModelIds.value = val ? presetModels.value.map((m) => m.model_id) : [];
  },
});

function getCapColor(tag: string): string {
  const map: Record<string, string> = { '对话': 'blue', Tools: 'green', Coder: 'purple', '推理': 'orange', '视觉': 'cyan', Math: 'red' };
  return map[tag] || 'default';
}

async function handleSubmit() {
  if (!currentProvider.value) return;
  const models = presetModels.value
    .filter((m) => selectedModelIds.value.includes(m.model_id))
    .map((m) => ({
      name: m.name,
      model_id: m.model_id,
      description: m.description || '',
      context_length: m.context_length || 0,
      param_size: m.param_size || '',
      capability_tags: m.capability_tags || [],
    }));

  if (models.length === 0) return message.warning('请至少选择一个模型');

  submitLoading.value = true;
  try {
    await batchCreateModelsApi(currentProvider.value.id, models);
    message.success(`成功添加 ${models.length} 个模型`);
    visible.value = false;
    emit('success');
  } catch {
    message.error('批量添加失败');
  } finally {
    submitLoading.value = false;
  }
}

defineExpose({ open });
</script>

<template>
  <Modal
    v-model:open="visible"
    title="批量添加模型"
    width="600px"
    :confirm-loading="submitLoading"
    ok-text="添加选中模型"
    @ok="handleSubmit"
  >
    <div v-if="presetModels.length === 0" class="py-8 text-center text-gray-400">
      该供应商没有预置模型列表，请使用「添加模型」手动添加
    </div>
    <template v-else>
      <div class="mb-3 flex items-center justify-between">
        <Checkbox v-model:checked="allSelected">
          全选（{{ selectedModelIds.length }}/{{ presetModels.length }}）
        </Checkbox>
      </div>
      <div class="batch-model-list">
        <Checkbox.Group v-model:value="selectedModelIds" class="w-full">
          <div
            v-for="m in presetModels"
            :key="m.model_id"
            class="batch-model-item"
          >
            <Checkbox :value="m.model_id" class="w-full">
              <div class="model-info">
                <div class="model-header">
                  <span class="model-name">{{ m.name }}</span>
                  <span v-if="m.param_size" class="model-meta">{{ m.param_size }}</span>
                  <span v-if="m.context_length" class="model-meta">{{ Math.round(m.context_length / 1024) }}K</span>
                </div>
                <div class="model-id">{{ m.model_id }}</div>
                <div v-if="m.capability_tags?.length" class="model-tags">
                  <Tag
                    v-for="tag in m.capability_tags"
                    :key="tag"
                    :color="getCapColor(tag)"
                    size="small"
                  >{{ tag }}</Tag>
                </div>
                <div v-if="m.description" class="model-desc">{{ m.description }}</div>
              </div>
            </Checkbox>
          </div>
        </Checkbox.Group>
      </div>
    </template>
  </Modal>
</template>

<style scoped>
.batch-model-list {
  max-height: 420px;
  overflow-y: auto;
}

.batch-model-item {
  padding: 10px 12px;
  border-bottom: 1px solid #f0f0f0;
  transition: background 0.2s;
}

.batch-model-item:hover {
  background: #fafafa;
}

.batch-model-item :deep(.ant-checkbox-wrapper) {
  align-items: flex-start;
  width: 100%;
}

.model-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-left: 4px;
}

.model-header {
  display: flex;
  gap: 8px;
  align-items: center;
}

.model-name {
  font-weight: 500;
  font-size: 14px;
}

.model-meta {
  font-size: 11px;
  color: #999;
  background: #f5f5f5;
  padding: 0 4px;
  border-radius: 3px;
}

.model-id {
  font-size: 12px;
  color: #999;
  font-family: monospace;
}

.model-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.model-tags :deep(.ant-tag) {
  margin: 0;
  font-size: 10px;
}

.model-desc {
  font-size: 12px;
  color: #aaa;
}
</style>
