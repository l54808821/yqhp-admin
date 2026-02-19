<script setup lang="ts">
/**
 * 设置 Tab — 分段设置 + 嵌入模型 + 检索参数 + 检索方式 + Rerank
 */
import type { KnowledgeBase, RetrievalMode } from '#/api/knowledge-base';

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
  Switch,
} from 'ant-design-vue';

import { getAiModelListApi } from '#/api/ai-model';
import { updateKnowledgeBaseApi } from '#/api/knowledge-base';
import { useModelFilter } from '#/composables/useModelFilter';

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
  multimodal_enabled: false,
  multimodal_model_id: undefined as number | undefined,
  multimodal_model_name: '',
  top_k: 5,
  similarity_threshold: 0.7,
  retrieval_mode: 'vector' as RetrievalMode,
  rerank_model_id: undefined as number | undefined,
  rerank_enabled: false,
  graph_extract_model_id: undefined as number | undefined,
});


watch(
  () => props.kb,
  (kb) => {
    if (kb) {
      form.value = {
        chunk_size: kb.chunk_size || 500,
        chunk_overlap: kb.chunk_overlap || 50,
        embedding_model_id: kb.embedding_model_id,
        embedding_model_name: '',
        multimodal_enabled: kb.multimodal_enabled || false,
        multimodal_model_id: kb.multimodal_model_id,
        multimodal_model_name: '',
        top_k: kb.top_k || 5,
        similarity_threshold: kb.similarity_threshold || 0.7,
        retrieval_mode: kb.retrieval_mode || 'vector',
        rerank_model_id: kb.rerank_model_id,
        rerank_enabled: kb.rerank_enabled || false,
        graph_extract_model_id: kb.graph_extract_model_id,
      };
    }
  },
  { immediate: true },
);

async function loadModels() {
  modelLoading.value = true;
  try {
    const res = await getAiModelListApi({ status: 1, pageSize: 100 });
    modelList.value = res.list || [];
  } catch {
    // ignore
  } finally {
    modelLoading.value = false;
  }
}

const { embeddingModels, rerankModels, llmModels } = useModelFilter(modelList);

function handleEmbeddingModelChange(modelId: any) {
  const model = modelList.value.find((m: any) => m.id === modelId);
  if (model) {
    form.value.embedding_model_name = model.display_name || model.model_id || model.name;
  }
}

function handleMultimodalModelChange(modelId: any) {
  const model = modelList.value.find((m: any) => m.id === modelId);
  if (model) {
    form.value.multimodal_model_name = model.display_name || model.model_id || model.name;
  }
}

async function handleSave() {
  if (form.value.chunk_overlap >= form.value.chunk_size) {
    message.warning('分段重叠长度必须小于分段最大长度');
    return;
  }

  saving.value = true;
  try {
    await updateKnowledgeBaseApi(props.kb.id, {
      chunk_size: form.value.chunk_size,
      chunk_overlap: form.value.chunk_overlap,
      embedding_model_id: form.value.embedding_model_id,
      embedding_model_name: form.value.embedding_model_name,
      // 维度由索引时自动写入，此处不手动传（与 Dify 一致）
      multimodal_enabled: form.value.multimodal_enabled,
      multimodal_model_id: form.value.multimodal_model_id,
      multimodal_model_name: form.value.multimodal_model_name,
      top_k: form.value.top_k,
      similarity_threshold: form.value.similarity_threshold,
      retrieval_mode: form.value.retrieval_mode,
      rerank_model_id: form.value.rerank_model_id,
      rerank_enabled: form.value.rerank_enabled,
      graph_extract_model_id: form.value.graph_extract_model_id,
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
                @change="handleEmbeddingModelChange"
              >
                <Select.Option
                  v-for="model in embeddingModels"
                  :key="model.id"
                  :value="model.id"
                  :label="model.display_name || model.model_id"
                >
                  {{ model.display_name || model.model_id }}
                  <span class="model-provider">({{ model.provider }})</span>
                </Select.Option>
              </Select>
            </Form.Item>

          </Form>
        </Card>

        <Card title="多模态配置" size="small" class="settings-card">
          <div class="settings-card-desc">
            开启后支持从文档中提取图片，并进行跨模态检索（以文搜图、以图搜文）。
          </div>
          <Form layout="vertical">
            <Form.Item>
              <div class="rerank-toggle">
                <span>启用多模态</span>
                <Switch v-model:checked="form.multimodal_enabled" />
              </div>
            </Form.Item>
            <template v-if="form.multimodal_enabled">
              <Form.Item label="多模态嵌入模型">
                <Select
                  v-model:value="form.multimodal_model_id"
                  placeholder="选择多模态嵌入模型（如 CLIP、Jina-CLIP-v2）"
                  allow-clear
                  show-search
                  :loading="modelLoading"
                  :filter-option="(input: string, option: any) => (option?.label || '').toLowerCase().includes(input.toLowerCase())"
                  @change="handleMultimodalModelChange"
                >
                  <Select.Option
                    v-for="model in embeddingModels"
                    :key="model.id"
                    :value="model.id"
                    :label="model.display_name || model.model_id"
                  >
                    {{ model.display_name || model.model_id }}
                    <span class="model-provider">({{ model.provider }})</span>
                  </Select.Option>
                </Select>
                <div class="form-hint">
                  选择将图片和文本映射到同一向量空间的多模态嵌入模型。推荐：Jina-CLIP-v2、CLIP 系列。
                </div>
              </Form.Item>
            </template>
          </Form>
        </Card>

        <Card v-if="kb.type === 'graph'" title="图谱配置" size="small" class="settings-card">
          <div class="settings-card-desc">
            图知识库使用 LLM 从文档中自动抽取实体和关系，构建知识图谱。
          </div>
          <Form layout="vertical">
            <Form.Item label="实体抽取模型">
              <Select
                v-model:value="form.graph_extract_model_id"
                placeholder="选择用于实体关系抽取的 LLM 模型"
                allow-clear
                show-search
                :loading="modelLoading"
                :filter-option="(input: string, option: any) => (option?.label || '').toLowerCase().includes(input.toLowerCase())"
              >
                <Select.Option
                  v-for="model in llmModels"
                  :key="model.id"
                  :value="model.id"
                  :label="model.display_name || model.model_id"
                >
                  {{ model.display_name || model.model_id }}
                  <span class="model-provider">({{ model.provider }})</span>
                </Select.Option>
              </Select>
              <div class="form-hint">
                推荐使用能力较强的模型（如 GPT-4、Qwen-Max）以获得更好的抽取效果。
              </div>
            </Form.Item>
          </Form>
        </Card>
      </Col>

      <Col :span="12">
        <Card title="检索设置" size="small" class="settings-card">
          <div class="settings-card-desc">
            设置检索相关参数，影响 AI 节点挂载知识库时的召回效果。
          </div>

          <Form layout="vertical">
            <Form.Item label="检索方式">
              <div class="retrieval-modes">
                <div
                  class="retrieval-mode-item"
                  :class="{ active: form.retrieval_mode === 'vector' }"
                  @click="form.retrieval_mode = 'vector'"
                >
                  <div class="retrieval-mode-title">向量检索</div>
                  <div class="retrieval-mode-desc">通过嵌入模型搜索语义最相似的文本分块</div>
                </div>
                <div
                  class="retrieval-mode-item"
                  :class="{ active: form.retrieval_mode === 'keyword' }"
                  @click="form.retrieval_mode = 'keyword'"
                >
                  <div class="retrieval-mode-title">关键词检索</div>
                  <div class="retrieval-mode-desc">基于全文索引匹配包含关键词的文本分块</div>
                </div>
                <div
                  class="retrieval-mode-item"
                  :class="{ active: form.retrieval_mode === 'hybrid' }"
                  @click="form.retrieval_mode = 'hybrid'"
                >
                  <div class="retrieval-mode-title">混合检索</div>
                  <div class="retrieval-mode-desc">同时使用向量和关键词检索，合并结果</div>
                </div>
                <template v-if="kb.type === 'graph'">
                  <div
                    class="retrieval-mode-item"
                    :class="{ active: form.retrieval_mode === 'graph' }"
                    @click="form.retrieval_mode = 'graph'"
                  >
                    <div class="retrieval-mode-title">图谱检索</div>
                    <div class="retrieval-mode-desc">通过知识图谱的实体和关系进行检索</div>
                  </div>
                  <div
                    class="retrieval-mode-item"
                    :class="{ active: form.retrieval_mode === 'hybrid_graph' }"
                    @click="form.retrieval_mode = 'hybrid_graph'"
                  >
                    <div class="retrieval-mode-title">混合图谱</div>
                    <div class="retrieval-mode-desc">同时使用向量检索和图谱检索，合并结果</div>
                  </div>
                </template>
              </div>
            </Form.Item>

            <Form.Item label="Top K">
              <div class="slider-with-input">
                <Slider v-model:value="form.top_k" :min="1" :max="20" style="flex: 1" />
                <InputNumber v-model:value="form.top_k" :min="1" :max="20" size="small" style="width: 60px" />
              </div>
            </Form.Item>

            <Form.Item label="Score 阈值">
              <div class="slider-with-input">
                <Slider v-model:value="form.similarity_threshold" :min="0" :max="1" :step="0.05" style="flex: 1" />
                <InputNumber v-model:value="form.similarity_threshold" :min="0" :max="1" :step="0.05" size="small" style="width: 60px" />
              </div>
              <div class="form-hint">低于此分数的结果将被过滤。建议 0.5 ~ 0.8。</div>
            </Form.Item>
          </Form>
        </Card>

        <Card title="Rerank 重排序" size="small" class="settings-card">
          <div class="settings-card-desc">
            在初始检索后使用重排序模型提升结果质量。
          </div>
          <Form layout="vertical">
            <Form.Item>
              <div class="rerank-toggle">
                <span>启用 Rerank</span>
                <Switch v-model:checked="form.rerank_enabled" />
              </div>
            </Form.Item>
            <Form.Item v-if="form.rerank_enabled" label="重排序模型">
              <Select
                v-model:value="form.rerank_model_id"
                placeholder="选择重排序模型"
                allow-clear
                :loading="modelLoading"
              >
                <Select.Option
                  v-for="model in rerankModels"
                  :key="model.id"
                  :value="model.id"
                >
                  {{ model.display_name || model.model_id }}
                </Select.Option>
              </Select>
              <div v-if="rerankModels.length === 0" class="form-hint" style="color: #faad14">
                暂无可用的 Rerank 模型，请先在 AI 模型管理中添加。
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


.retrieval-modes {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.retrieval-mode-item {
  padding: 10px 12px;
  border: 2px solid hsl(var(--border));
  border-radius: 8px;
  cursor: pointer;
  flex: 1;
  transition: all 0.15s;
}

.retrieval-mode-item.active {
  border-color: hsl(var(--primary));
  background: hsl(var(--primary) / 4%);
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
  line-height: 1.4;
}

.slider-with-input {
  display: flex;
  align-items: center;
  gap: 12px;
}

.rerank-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.settings-save {
  display: flex;
  justify-content: flex-end;
  padding-top: 8px;
}
</style>
