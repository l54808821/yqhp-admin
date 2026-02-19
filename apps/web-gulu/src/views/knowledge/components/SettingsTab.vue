<script setup lang="ts">
import type { KnowledgeBase, RetrievalMode } from '#/api/knowledge-base';

import { onMounted, ref, watch } from 'vue';

import {
  Button,
  Card,
  Divider,
  Form,
  InputNumber,
  message,
  Select,
  Switch,
} from 'ant-design-vue';

import { getAiModelListApi } from '#/api/ai-model';
import { updateKnowledgeBaseApi } from '#/api/knowledge-base';
import { useModelFilter } from '#/composables/useModelFilter';

import RetrievalSettingsPanel from './RetrievalSettingsPanel.vue';

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
    <div class="settings-scroll-area">

    <!-- 索引配置 -->
    <Card class="settings-card">
      <template #title>
        <span class="card-title">索引配置</span>
        <span class="card-title-desc">控制文档如何被切分并向量化存储</span>
      </template>

      <Form layout="vertical">
        <!-- 分段设置 -->
        <div class="section-label">分段设置</div>
        <div class="section-desc">设置文档文本的分段方式，影响检索的粒度和效果。</div>

        <div class="form-row">
          <Form.Item label="分段最大长度（字符）" class="form-item-half">
            <InputNumber
              v-model:value="form.chunk_size"
              :min="100"
              :max="5000"
              :step="100"
              style="width: 100%"
            />
            <div class="form-hint">每个文本分块的最大字符数。推荐 500 ~ 1024。</div>
          </Form.Item>

          <Form.Item label="分段重叠长度（字符）" class="form-item-half">
            <InputNumber
              v-model:value="form.chunk_overlap"
              :min="0"
              :max="500"
              :step="10"
              style="width: 100%"
            />
            <div class="form-hint">相邻分块的重叠字符数，避免信息在边界丢失。</div>
          </Form.Item>
        </div>

        <Divider />

        <!-- 嵌入模型 -->
        <div class="section-label">嵌入模型</div>

        <Form.Item label="Embedding 模型">
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

        <Divider />

        <!-- 多模态配置 -->
        <div class="feature-panel">
          <div class="feature-panel-header">
            <div>
              <div class="feature-panel-title">多模态配置</div>
              <div class="feature-panel-desc">开启后支持从文档中提取图片，并进行跨模态检索（以文搜图、以图搜文）</div>
            </div>
            <Switch v-model:checked="form.multimodal_enabled" />
          </div>
          <template v-if="form.multimodal_enabled">
            <div class="feature-panel-body">
              <Form.Item label="多模态嵌入模型" style="margin-bottom: 0">
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
                <div class="form-hint">推荐：Jina-CLIP-v2、CLIP 系列。</div>
              </Form.Item>
            </div>
          </template>
        </div>

        <!-- 图谱配置（仅 graph 类型） -->
        <template v-if="kb.type === 'graph'">
          <Divider />
          <div class="section-label">图谱配置</div>
          <div class="section-desc">图知识库使用 LLM 从文档中自动抽取实体和关系，构建知识图谱。</div>

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
            <div class="form-hint">推荐使用能力较强的模型（如 GPT-4、Qwen-Max）以获得更好的抽取效果。</div>
          </Form.Item>
        </template>
      </Form>
    </Card>

    <!-- 检索配置 -->
    <Card class="settings-card">
      <template #title>
        <span class="card-title">检索配置</span>
        <span class="card-title-desc">控制 AI 节点挂载知识库时的召回策略与效果</span>
      </template>

      <Form layout="vertical">
        <RetrievalSettingsPanel
          v-model:retrieval-mode="form.retrieval_mode"
          v-model:score-threshold="form.similarity_threshold"
          v-model:top-k="form.top_k"
          :show-graph-modes="kb.type === 'graph'"
        />

        <Divider />

        <!-- Rerank 重排序 -->
        <div class="feature-panel">
          <div class="feature-panel-header">
            <div>
              <div class="feature-panel-title">Rerank 重排序</div>
              <div class="feature-panel-desc">在初始检索后使用重排序模型对结果重新打分排序</div>
            </div>
            <Switch v-model:checked="form.rerank_enabled" />
          </div>
          <template v-if="form.rerank_enabled">
            <div class="feature-panel-body">
              <Form.Item label="重排序模型" style="margin-bottom: 0">
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
                <div v-if="rerankModels.length === 0" class="form-hint form-hint-warn">
                  暂无可用的 Rerank 模型，请先在 AI 模型管理中添加。
                </div>
              </Form.Item>
            </div>
          </template>
        </div>
      </Form>
    </Card>

    </div><!-- end settings-scroll-area -->

    <!-- 保存按钮（固定底部） -->
    <div class="settings-save">
      <Button type="primary" :loading="saving" @click="handleSave">
        保存设置
      </Button>
    </div>

  </div>
</template>

<style scoped>
.settings-tab {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.settings-scroll-area {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 16px 24px;
}

.settings-card {
  margin-bottom: 12px;
}

/* 卡片标题行 */
.card-title {
  font-size: 14px;
  font-weight: 600;
  color: hsl(var(--foreground));
  margin-right: 8px;
}

.card-title-desc {
  font-size: 12px;
  font-weight: 400;
  color: hsl(var(--muted-foreground));
}

/* 卡片内子分组标题 */
.section-label {
  font-size: 13px;
  font-weight: 500;
  color: hsl(var(--foreground));
  margin-bottom: 4px;
}

.section-desc {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  margin-bottom: 12px;
}

/* 两列并排的表单行 */
.form-row {
  display: flex;
  gap: 16px;
}

.form-item-half {
  flex: 1;
  min-width: 0;
}

.form-hint {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  margin-top: 4px;
}

.form-hint-warn {
  color: #faad14;
}

.model-provider {
  font-size: 11px;
  color: hsl(var(--muted-foreground));
  margin-left: 4px;
}

/* 功能面板（含 toggle header + 可展开 body） */
.feature-panel {
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  overflow: hidden;
}

.feature-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background: hsl(var(--muted) / 30%);
}

.feature-panel-title {
  font-size: 13px;
  font-weight: 500;
  color: hsl(var(--foreground));
  margin-bottom: 2px;
}

.feature-panel-desc {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  line-height: 1.4;
}

.feature-panel-body {
  padding: 14px;
  border-top: 1px solid hsl(var(--border));
  background: hsl(var(--background));
}

/* 保存按钮（固定底部） */
.settings-save {
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  padding: 12px 24px;
  border-top: 1px solid hsl(var(--border));
  background: hsl(var(--card));
}
</style>
