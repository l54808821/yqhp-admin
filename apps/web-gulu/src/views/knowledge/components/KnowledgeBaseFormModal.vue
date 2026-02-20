<script setup lang="ts">
import type { KnowledgeBase, CreateKnowledgeBaseParams, UpdateKnowledgeBaseParams } from '#/api/knowledge-base';

import { computed, ref } from 'vue';

import {
  Button,
  Drawer,
  Form,
  Input,
  InputNumber,
  message,
  Select,
  Switch,
  Tabs,
} from 'ant-design-vue';

import { getAiModelListApi } from '#/api/ai-model';
import { useModelFilter } from '#/composables/useModelFilter';
import {
  createKnowledgeBaseApi,
  updateKnowledgeBaseApi,
} from '#/api/knowledge-base';

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const visible = ref(false);
const loading = ref(false);
const activeTab = ref('basic');
const editingId = ref<number | null>(null);
const isEdit = computed(() => editingId.value !== null);

// 模型列表
const modelList = ref<any[]>([]);
const modelLoading = ref(false);


// 表单数据（不含维度字段，维度由索引时自动检测写入）
const form = ref<CreateKnowledgeBaseParams & UpdateKnowledgeBaseParams>({
  name: '',
  description: '',
  type: 'normal',
  embedding_model_id: undefined,
  embedding_model_name: '',
  multimodal_enabled: false,
  multimodal_model_id: undefined,
  multimodal_model_name: '',
  chunk_size: 500,
  chunk_overlap: 50,
  similarity_threshold: 0.7,
  top_k: 5,
  graph_extract_model_id: undefined,
});

function resetForm() {
  form.value = {
    name: '',
    description: '',
    type: 'normal',
    embedding_model_id: undefined,
    embedding_model_name: '',
    multimodal_enabled: false,
    multimodal_model_id: undefined,
    multimodal_model_name: '',
    chunk_size: 500,
    chunk_overlap: 50,
    similarity_threshold: 0.7,
    top_k: 5,
    graph_extract_model_id: undefined,
  };
}

const { embeddingModels, llmModels: llmModelList } = useModelFilter(modelList);

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

function open(record?: KnowledgeBase) {
  resetForm();
  if (record) {
    editingId.value = record.id;
    form.value = {
      name: record.name,
      description: record.description,
      type: record.type,
      embedding_model_id: record.embedding_model_id,
      embedding_model_name: '',
      multimodal_enabled: record.multimodal_enabled || false,
      multimodal_model_id: record.multimodal_model_id,
      multimodal_model_name: '',
      chunk_size: record.chunk_size || 500,
      chunk_overlap: record.chunk_overlap || 50,
      similarity_threshold: record.similarity_threshold || 0.7,
      top_k: record.top_k || 5,
      graph_extract_model_id: record.graph_extract_model_id,
    };
  } else {
    editingId.value = null;
  }
  activeTab.value = 'basic';
  visible.value = true;
  loadModels();
}

async function handleSubmit() {
  if (!form.value.name) {
    message.warning('请输入知识库名称');
    return;
  }

  loading.value = true;
  try {
    if (isEdit.value) {
      await updateKnowledgeBaseApi(editingId.value!, form.value);
      message.success('更新成功');
    } else {
      await createKnowledgeBaseApi(form.value);
      message.success('创建成功');
    }
    visible.value = false;
    emit('success');
  } catch (e: any) {
    message.error((isEdit.value ? '更新' : '创建') + '失败: ' + (e.message || '未知错误'));
  } finally {
    loading.value = false;
  }
}

function handleModelChange(modelId: any) {
  const model = modelList.value.find((m: any) => m.id === modelId);
  if (model) {
    form.value.embedding_model_name = model.display_name || model.model_id || model.name;
  }
}

defineExpose({ open });
</script>

<template>
  <Drawer
    v-model:open="visible"
    :title="isEdit ? '编辑知识库' : '新建知识库'"
    :width="640"
    :destroyOnClose="true"
    :body-style="{ padding: '0', overflowY: 'auto' }"
    @close="visible = false"
  >
    <Tabs v-model:activeKey="activeTab" class="kb-tabs">
      <Tabs.TabPane key="basic" tab="基本信息">
        <Form layout="vertical" class="tab-content">
          <Form.Item label="知识库名称" required>
            <Input v-model:value="form.name" placeholder="输入知识库名称" />
          </Form.Item>
          <Form.Item label="描述">
            <Input.TextArea
              v-model:value="form.description"
              :rows="3"
              placeholder="输入知识库描述（可选）"
            />
          </Form.Item>
          <Form.Item v-if="!isEdit" label="知识库类型">
            <Select
              v-model:value="form.type"
              :options="[
                { label: '普通知识库（向量检索）', value: 'normal' },
                { label: '图知识库（知识图谱 + 向量检索）', value: 'graph' },
              ]"
            />
            <div v-if="form.type === 'graph'" class="form-hint">
              图知识库会自动通过 LLM 从文档中抽取实体和关系，构建知识图谱。同时保留向量检索能力。
            </div>
          </Form.Item>
        </Form>
      </Tabs.TabPane>

      <Tabs.TabPane key="advanced" tab="模型与检索">
        <Form layout="vertical" class="tab-content">

          <!-- 模型配置 -->
          <div class="section-card">
            <div class="section-header">模型配置</div>
            <div class="section-body">
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
                    v-for="model in embeddingModels"
                    :key="model.id"
                    :value="model.id"
                    :label="model.display_name || model.model_id"
                  >
                    {{ model.display_name || model.model_id }}
                    <span class="model-provider">({{ model.provider }})</span>
                  </Select.Option>
                </Select>
                <div class="form-hint">推荐使用 text-embedding-3-small 或同类模型。</div>
              </Form.Item>

              <!-- 多模态 -->
              <div class="feature-panel">
                <div class="feature-panel-header">
                  <div>
                    <div class="feature-panel-title">多模态</div>
                    <div class="feature-panel-desc">开启后支持从文档中提取图片，进行跨模态检索</div>
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
                        @change="(id: any) => {
                          const model = embeddingModels.find((m: any) => m.id === id);
                          if (model) form.multimodal_model_name = model.display_name || model.model_id;
                        }"
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
              <Form.Item v-if="form.type === 'graph'" label="实体抽取模型" style="margin-top: 12px; margin-bottom: 0">
                <Select
                  v-model:value="form.graph_extract_model_id"
                  placeholder="选择用于实体关系抽取的 LLM 模型"
                  allow-clear
                  show-search
                  :loading="modelLoading"
                  :filter-option="(input: string, option: any) => (option?.label || '').toLowerCase().includes(input.toLowerCase())"
                >
                  <Select.Option
                    v-for="model in llmModelList"
                    :key="model.id"
                    :value="model.id"
                    :label="model.display_name || model.model_id"
                  >
                    {{ model.display_name || model.model_id }}
                    <span class="model-provider">({{ model.provider }})</span>
                  </Select.Option>
                </Select>
                <div class="form-hint">推荐使用能力较强的模型（如 GPT-4、Qwen-Max）。</div>
              </Form.Item>
            </div>
          </div>

          <!-- 检索参数 -->
          <div class="section-card">
            <div class="section-header">检索参数</div>
            <div class="section-body">
              <div class="form-row">
                <Form.Item label="分块大小（字符）" class="form-item-half">
                  <InputNumber
                    v-model:value="form.chunk_size"
                    :min="100"
                    :max="5000"
                    :step="100"
                    style="width: 100%"
                  />
                  <div class="form-hint">推荐 500 ~ 1024</div>
                </Form.Item>
                <Form.Item label="分块重叠（字符）" class="form-item-half">
                  <InputNumber
                    v-model:value="form.chunk_overlap"
                    :min="0"
                    :max="500"
                    :step="10"
                    style="width: 100%"
                  />
                  <div class="form-hint">避免信息在分块边界丢失</div>
                </Form.Item>
              </div>
              <div class="form-row">
                <Form.Item label="默认检索数量 (Top-K)" class="form-item-half" style="margin-bottom: 0">
                  <InputNumber
                    v-model:value="form.top_k"
                    :min="1"
                    :max="20"
                    style="width: 100%"
                  />
                </Form.Item>
                <Form.Item label="相似度阈值" class="form-item-half" style="margin-bottom: 0">
                  <InputNumber
                    v-model:value="form.similarity_threshold"
                    :min="0"
                    :max="1"
                    :step="0.05"
                    style="width: 100%"
                  />
                  <div class="form-hint">建议 0.6 ~ 0.8</div>
                </Form.Item>
              </div>
            </div>
          </div>

        </Form>
      </Tabs.TabPane>
    </Tabs>

    <template #footer>
      <div style="text-align: right">
        <Button style="margin-right: 8px" @click="visible = false">取消</Button>
        <Button type="primary" :loading="loading" @click="handleSubmit">
          {{ isEdit ? '保存' : '创建' }}
        </Button>
      </div>
    </template>
  </Drawer>
</template>

<style scoped>
.kb-tabs {
  height: 100%;
}

.kb-tabs :deep(.ant-tabs-nav) {
  padding: 0 24px;
  margin-bottom: 0;
}

.kb-tabs :deep(.ant-tabs-content-holder) {
  overflow-y: auto;
}

.tab-content {
  padding: 20px 24px;
}

.section-card {
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 16px;
}

.section-card:last-child {
  margin-bottom: 0;
}

.section-header {
  font-size: 13px;
  font-weight: 600;
  color: hsl(var(--foreground));
  padding: 10px 16px;
  background: hsl(var(--muted) / 30%);
  border-bottom: 1px solid hsl(var(--border));
}

.section-body {
  padding: 16px;
}

.section-body :deep(.ant-form-item) {
  margin-bottom: 16px;
}

.section-body :deep(.ant-form-item:last-child) {
  margin-bottom: 0;
}

.form-row {
  display: flex;
  gap: 16px;
}

.form-row + .form-row {
  margin-top: 16px;
}

.form-item-half {
  flex: 1;
  min-width: 0;
}

.form-hint {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  margin-top: 4px;
  line-height: 1.4;
}

.model-provider {
  font-size: 11px;
  color: hsl(var(--muted-foreground));
  margin-left: 4px;
}

.feature-panel {
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  overflow: hidden;
}

.feature-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: hsl(var(--muted) / 20%);
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
</style>
