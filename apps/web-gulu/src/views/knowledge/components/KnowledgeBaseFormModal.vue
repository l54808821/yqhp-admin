<script setup lang="ts">
import type { KnowledgeBase, CreateKnowledgeBaseParams, UpdateKnowledgeBaseParams } from '#/api/knowledge-base';

import { computed, ref, watch } from 'vue';

import {
  Drawer,
  Form,
  Input,
  InputNumber,
  message,
  Select,
  Slider,
  Tabs,
} from 'ant-design-vue';

import { getAiModelListApi } from '#/api/ai-model';
import {
  createKnowledgeBaseApi,
  updateKnowledgeBaseApi,
} from '#/api/knowledge-base';

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const visible = ref(false);
const loading = ref(false);
const editingId = ref<number | null>(null);
const isEdit = computed(() => editingId.value !== null);

// 模型列表
const modelList = ref<any[]>([]);
const modelLoading = ref(false);

// 表单数据
const form = ref<CreateKnowledgeBaseParams & UpdateKnowledgeBaseParams>({
  name: '',
  description: '',
  type: 'normal',
  embedding_model_id: undefined,
  embedding_model_name: '',
  embedding_dimension: 1536,
  chunk_size: 500,
  chunk_overlap: 50,
  similarity_threshold: 0.7,
  top_k: 5,
});

function resetForm() {
  form.value = {
    name: '',
    description: '',
    type: 'normal',
    embedding_model_id: undefined,
    embedding_model_name: '',
    embedding_dimension: 1536,
    chunk_size: 500,
    chunk_overlap: 50,
    similarity_threshold: 0.7,
    top_k: 5,
  };
}

async function loadModels() {
  modelLoading.value = true;
  try {
    const res = await getAiModelListApi({ status: 1, pageSize: 100 });
    modelList.value = (res.list || []).filter(
      (m: any) => m.capabilities?.includes('embedding') || m.model_id?.includes('embedding'),
    );
    // 如果没有专门的 embedding 模型，显示所有模型
    if (modelList.value.length === 0) {
      modelList.value = res.list || [];
    }
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
      embedding_model_name: record.embedding_model_name,
      embedding_dimension: record.embedding_dimension || 1536,
      chunk_size: record.chunk_size || 500,
      chunk_overlap: record.chunk_overlap || 50,
      similarity_threshold: record.similarity_threshold || 0.7,
      top_k: record.top_k || 5,
    };
  } else {
    editingId.value = null;
  }
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

function handleModelChange(modelId: number) {
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
    :width="520"
    :destroyOnClose="true"
    @close="visible = false"
  >
    <Tabs>
      <Tabs.TabPane key="basic" tab="基本信息">
        <Form layout="vertical">
          <Form.Item label="知识库名称" required>
            <Input v-model:value="form.name" placeholder="输入知识库名称" />
          </Form.Item>
          <Form.Item label="描述">
            <Input.TextArea
              v-model:value="form.description"
              :rows="3"
              placeholder="输入知识库描述"
            />
          </Form.Item>
          <Form.Item v-if="!isEdit" label="知识库类型">
            <Select
              v-model:value="form.type"
              :options="[
                { label: '普通知识库（向量检索）', value: 'normal' },
                { label: '图知识库（知识图谱）', value: 'graph', disabled: true },
              ]"
            />
            <div class="form-hint">图知识库功能开发中，敬请期待</div>
          </Form.Item>
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
            <div class="form-hint">
              选择用于将文本转换为向量的嵌入模型。推荐使用 text-embedding-3-small 或同类模型。
            </div>
          </Form.Item>
        </Form>
      </Tabs.TabPane>

      <Tabs.TabPane key="params" tab="检索参数">
        <Form layout="vertical">
          <Form.Item label="向量维度">
            <InputNumber
              v-model:value="form.embedding_dimension"
              :min="64"
              :max="8192"
              style="width: 100%"
            />
            <div class="form-hint">
              与嵌入模型的输出维度保持一致。text-embedding-3-small 默认 1536。
            </div>
          </Form.Item>
          <Form.Item label="分块大小（字符数）">
            <InputNumber
              v-model:value="form.chunk_size"
              :min="100"
              :max="5000"
              :step="100"
              style="width: 100%"
            />
            <div class="form-hint">
              每个文本分块的最大字符数。较小的值提高精确度，较大的值保留更多上下文。
            </div>
          </Form.Item>
          <Form.Item label="分块重叠（字符数）">
            <InputNumber
              v-model:value="form.chunk_overlap"
              :min="0"
              :max="500"
              :step="10"
              style="width: 100%"
            />
            <div class="form-hint">
              相邻分块之间的重叠字符数，避免信息在分块边界丢失。
            </div>
          </Form.Item>
          <Form.Item label="默认检索数量 (Top-K)">
            <Slider
              v-model:value="form.top_k"
              :min="1"
              :max="20"
              :marks="{ 1: '1', 5: '5', 10: '10', 20: '20' }"
            />
          </Form.Item>
          <Form.Item label="相似度阈值">
            <Slider
              v-model:value="form.similarity_threshold"
              :min="0"
              :max="1"
              :step="0.05"
              :marks="{ 0: '0', 0.5: '0.5', 0.7: '0.7', 1: '1' }"
            />
            <div class="form-hint">
              低于此阈值的检索结果将被过滤。建议值 0.6 ~ 0.8。
            </div>
          </Form.Item>
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
</style>
