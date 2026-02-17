<script setup lang="ts">
/**
 * 设置 Tab — 分段设置 + 嵌入模型 + 检索参数
 */
import type { KnowledgeBase } from '#/api/knowledge-base';

import { onMounted, ref, watch } from 'vue';

import {
  Button,
  Card,
  Col,
  Form,
  InputNumber,
  message,
  Row,
  Select,
  Slider,
} from 'ant-design-vue';

import { getAiModelListApi } from '#/api/ai-model';
import { updateKnowledgeBaseApi } from '#/api/knowledge-base';

interface Props {
  kb: KnowledgeBase;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'updated'): void;
}>();

const saving = ref(false);
const modelList = ref<any[]>([]);
const modelLoading = ref(false);

const form = ref({
  chunk_size: 500,
  chunk_overlap: 50,
  embedding_model_id: undefined as number | undefined,
  embedding_model_name: '',
  embedding_dimension: 1536,
  top_k: 5,
  similarity_threshold: 0.7,
});

watch(
  () => props.kb,
  (kb) => {
    if (kb) {
      form.value = {
        chunk_size: kb.chunk_size || 500,
        chunk_overlap: kb.chunk_overlap || 50,
        embedding_model_id: kb.embedding_model_id,
        embedding_model_name: kb.embedding_model_name || '',
        embedding_dimension: kb.embedding_dimension || 1536,
        top_k: kb.top_k || 5,
        similarity_threshold: kb.similarity_threshold || 0.7,
      };
    }
  },
  { immediate: true },
);

async function loadModels() {
  modelLoading.value = true;
  try {
    const res = await getAiModelListApi({ status: 1, pageSize: 100 });
    modelList.value = (res.list || []).filter(
      (m: any) => m.capabilities?.includes('embedding') || m.model_id?.includes('embedding'),
    );
    if (modelList.value.length === 0) {
      modelList.value = res.list || [];
    }
  } catch {
    // ignore
  } finally {
    modelLoading.value = false;
  }
}

function handleModelChange(modelId: number) {
  const model = modelList.value.find((m: any) => m.id === modelId);
  if (model) {
    form.value.embedding_model_name = model.display_name || model.model_id || model.name;
  }
}

async function handleSave() {
  saving.value = true;
  try {
    await updateKnowledgeBaseApi(props.kb.id, {
      chunk_size: form.value.chunk_size,
      chunk_overlap: form.value.chunk_overlap,
      embedding_model_id: form.value.embedding_model_id,
      embedding_model_name: form.value.embedding_model_name,
      embedding_dimension: form.value.embedding_dimension,
      top_k: form.value.top_k,
      similarity_threshold: form.value.similarity_threshold,
    });
    message.success('设置已保存');
    emit('updated');
  } catch (e: any) {
    message.error('保存失败: ' + (e.message || '未知错误'));
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  loadModels();
});
</script>

<template>
  <div class="settings-tab">
    <Row :gutter="24">
      <!-- 左列：分段设置 -->
      <Col :span="12">
        <Card title="分段设置" size="small" class="settings-card">
          <div class="settings-card-desc">
            设置文档文本的分段方式，影响检索的粒度和效果。
          </div>

          <Form layout="vertical">
            <Form.Item label="分段最大长度（字符）">
              <InputNumber
                v-model:value="form.chunk_size"
                :min="100"
                :max="5000"
                :step="100"
                style="width: 100%"
              />
              <div class="form-hint">
                每个文本分块的最大字符数。推荐 500 ~ 1024。
              </div>
            </Form.Item>

            <Form.Item label="分段重叠长度（字符）">
              <InputNumber
                v-model:value="form.chunk_overlap"
                :min="0"
                :max="500"
                :step="10"
                style="width: 100%"
              />
              <div class="form-hint">
                相邻分块的重叠字符数，避免信息在边界丢失。
              </div>
            </Form.Item>
          </Form>
        </Card>

        <Card title="Embedding 模型" size="small" class="settings-card">
          <Form layout="vertical">
            <Form.Item label="嵌入模型">
              <Select
                v-model:value="form.embedding_model_id"
                placeholder="选择嵌入模型"
                allow-clear
                show-search
                :loading="modelLoading"
                :filter-option="(input: string, option: any) => (option?.label || '').toLowerCase().includes(input.toLowerCase())"
                @change="handleModelChange"
              >
                <Select.Option
                  v-for="model in modelList"
                  :key="model.id"
                  :value="model.id"
                  :label="model.display_name || model.model_id"
                >
                  {{ model.display_name || model.model_id }}
                  <span class="model-provider">({{ model.provider }})</span>
                </Select.Option>
              </Select>
            </Form.Item>

            <Form.Item label="向量维度">
              <InputNumber
                v-model:value="form.embedding_dimension"
                :min="64"
                :max="8192"
                style="width: 100%"
              />
              <div class="form-hint">
                必须与嵌入模型的输出维度一致。修改后已有文档需重新处理。
              </div>
            </Form.Item>
          </Form>
        </Card>
      </Col>

      <!-- 右列：检索设置 -->
      <Col :span="12">
        <Card title="检索设置" size="small" class="settings-card">
          <div class="settings-card-desc">
            设置检索相关参数，影响 AI 节点挂载知识库时的召回效果。
          </div>

          <Form layout="vertical">
            <Form.Item label="检索方式">
              <div class="retrieval-mode">
                <div class="retrieval-mode-item active">
                  <div class="retrieval-mode-icon">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/><rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1" opacity="0.3"/></svg>
                  </div>
                  <div>
                    <div class="retrieval-mode-title">向量检索</div>
                    <div class="retrieval-mode-desc">
                      通过嵌入模型将查询转为向量，搜索语义最相似的文本分块。
                    </div>
                  </div>
                </div>
              </div>
            </Form.Item>

            <Form.Item label="Top K">
              <div class="slider-with-input">
                <Slider
                  v-model:value="form.top_k"
                  :min="1"
                  :max="20"
                  style="flex: 1"
                />
                <InputNumber
                  v-model:value="form.top_k"
                  :min="1"
                  :max="20"
                  size="small"
                  style="width: 60px"
                />
              </div>
              <div class="form-hint">
                每次检索返回的最大结果数。
              </div>
            </Form.Item>

            <Form.Item label="Score 阈值">
              <div class="slider-with-input">
                <Slider
                  v-model:value="form.similarity_threshold"
                  :min="0"
                  :max="1"
                  :step="0.05"
                  style="flex: 1"
                />
                <InputNumber
                  v-model:value="form.similarity_threshold"
                  :min="0"
                  :max="1"
                  :step="0.05"
                  size="small"
                  style="width: 60px"
                />
              </div>
              <div class="form-hint">
                低于此分数的结果将被过滤。建议 0.5 ~ 0.8。
              </div>
            </Form.Item>
          </Form>
        </Card>

        <div class="settings-save">
          <Button type="primary" :loading="saving" @click="handleSave">
            保存设置
          </Button>
        </div>
      </Col>
    </Row>
  </div>
</template>

<style scoped>
.settings-tab {
  padding: 20px 24px;
}

.settings-card {
  margin-bottom: 16px;
}

.settings-card-desc {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  margin-bottom: 16px;
}

.form-hint {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.model-provider {
  font-size: 11px;
  color: #999;
  margin-left: 4px;
}

/* 检索方式卡片 */
.retrieval-mode {
  display: flex;
  gap: 10px;
}

.retrieval-mode-item {
  display: flex;
  gap: 10px;
  padding: 12px;
  border: 2px solid hsl(var(--border));
  border-radius: 10px;
  cursor: pointer;
  flex: 1;
  transition: all 0.15s;
}

.retrieval-mode-item.active {
  border-color: hsl(var(--primary));
  background: hsl(var(--primary) / 4%);
}

.retrieval-mode-icon {
  display: flex;
  align-items: flex-start;
  padding-top: 2px;
  color: hsl(var(--primary));
}

.retrieval-mode-title {
  font-size: 13px;
  font-weight: 500;
  color: hsl(var(--foreground));
  margin-bottom: 2px;
}

.retrieval-mode-desc {
  font-size: 11px;
  color: hsl(var(--muted-foreground));
  line-height: 1.5;
}

/* Slider + Input 组合 */
.slider-with-input {
  display: flex;
  align-items: center;
  gap: 12px;
}

.settings-save {
  display: flex;
  justify-content: flex-end;
  padding-top: 8px;
}
</style>
