<script setup lang="ts">
/**
 * 知识库面板：知识库选择 + 检索参数配置
 */
import { computed, onMounted, ref } from 'vue';

import {
  Button,
  Form,
  Input,
  Modal,
  Select,
  Slider,
  Tag,
} from 'ant-design-vue';

import type { KnowledgeBase } from '#/api/knowledge-base';
import { getKnowledgeBaseListApi } from '#/api/knowledge-base';

import type { AIConfig } from './types';

interface Props {
  config: AIConfig;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update', patch: Partial<AIConfig>): void;
}>();

// 知识库列表
const kbList = ref<KnowledgeBase[]>([]);
const kbLoading = ref(false);
const kbModalVisible = ref(false);
const kbSearchKeyword = ref('');
const kbFilterType = ref<string | undefined>(undefined);

// 已选中的知识库列表
const selectedKBs = computed(() => {
  const ids = props.config?.knowledge_base_ids || [];
  return kbList.value.filter((kb) => ids.includes(kb.id));
});

// 弹窗中可选的知识库（排除已选）
const availableKBs = computed(() => {
  const selectedIds = props.config?.knowledge_base_ids || [];
  const keyword = kbSearchKeyword.value.toLowerCase();
  const type = kbFilterType.value;
  return kbList.value.filter((kb) => {
    if (selectedIds.includes(kb.id)) return false;
    if (keyword && !kb.name.toLowerCase().includes(keyword) && !(kb.description || '').toLowerCase().includes(keyword)) return false;
    if (type && kb.type !== type) return false;
    return true;
  });
});

function addKB(kbId: number) {
  const ids = [...(props.config.knowledge_base_ids || [])];
  if (!ids.includes(kbId)) {
    ids.push(kbId);
  }
  emit('update', { knowledge_base_ids: ids });
}

function removeKB(kbId: number) {
  const ids = (props.config.knowledge_base_ids || []).filter((id: number) => id !== kbId);
  emit('update', { knowledge_base_ids: ids });
}

function getTypeColor(type: string): string {
  return type === 'graph' ? 'purple' : 'blue';
}

function getTypeLabel(type: string): string {
  return type === 'graph' ? '图知识库' : '普通知识库';
}

async function loadKBs() {
  kbLoading.value = true;
  try {
    const res = await getKnowledgeBaseListApi({ page: 1, pageSize: 100, status: 1 });
    kbList.value = res.list || [];
  } catch {
    // ignore
  } finally {
    kbLoading.value = false;
  }
}

function openKBModal() {
  kbSearchKeyword.value = '';
  kbFilterType.value = undefined;
  kbModalVisible.value = true;
}

onMounted(() => {
  loadKBs();
});
</script>

<template>
  <Form layout="vertical" class="config-form">
    <!-- 知识库选择 -->
    <div class="section-title">
      知识库
      <Button
        type="primary"
        size="small"
        style="margin-left: auto"
        @click="openKBModal"
      >
        + 添加知识库
      </Button>
    </div>
    <div class="section-hint">
      AI 调用前会自动从选中的知识库检索相关内容注入到上下文中，同时也会注册检索工具供 AI 主动搜索。
    </div>

    <!-- 已选知识库列表 -->
    <div v-if="selectedKBs.length > 0" class="selected-list">
      <div
        v-for="kb in selectedKBs"
        :key="kb.id"
        class="selected-item"
      >
        <div class="selected-info">
          <div class="selected-header">
            <span class="selected-name">{{ kb.name }}</span>
            <Tag :color="getTypeColor(kb.type)" size="small">
              {{ getTypeLabel(kb.type) }}
            </Tag>
            <Tag size="small" color="default">
              {{ kb.document_count }} 文档
            </Tag>
          </div>
          <span class="selected-desc">{{ kb.description || '暂无描述' }}</span>
        </div>
        <Button type="text" size="small" danger @click="removeKB(kb.id)">
          移除
        </Button>
      </div>
    </div>
    <div v-else class="empty-hint">
      暂未添加知识库，点击上方按钮添加
    </div>

    <!-- 检索参数 -->
    <div v-if="selectedKBs.length > 0" class="params-section">
      <div class="section-title" style="margin-top: 20px">
        检索参数
      </div>
      <Form.Item label="检索数量 (Top-K)">
        <Slider
          :value="config.kb_top_k || 5"
          :min="1"
          :max="20"
          :marks="{ 1: '1', 5: '5', 10: '10', 20: '20' }"
          @change="(val: any) => emit('update', { kb_top_k: val })"
        />
        <div class="param-hint">
          每次检索返回的最大结果数量。
        </div>
      </Form.Item>
      <Form.Item label="相似度阈值">
        <Slider
          :value="config.kb_score_threshold || 0.7"
          :min="0"
          :max="1"
          :step="0.05"
          :marks="{ 0: '0', 0.5: '0.5', 0.7: '0.7', 1: '1' }"
          @change="(val: any) => emit('update', { kb_score_threshold: val })"
        />
        <div class="param-hint">
          低于此阈值的结果将被过滤，建议 0.6 ~ 0.8。
        </div>
      </Form.Item>
    </div>
  </Form>

  <!-- 知识库选择弹窗 -->
  <Modal
    v-model:open="kbModalVisible"
    title="添加知识库"
    :footer="null"
    :width="520"
    :destroyOnClose="true"
    @cancel="kbSearchKeyword = ''; kbFilterType = undefined"
  >
    <div class="modal-filters">
      <Input
        v-model:value="kbSearchKeyword"
        placeholder="搜索知识库名称或描述..."
        allowClear
        style="flex: 1"
      />
      <Select
        v-model:value="kbFilterType"
        placeholder="类型"
        allowClear
        style="width: 130px"
        :options="[
          { label: '普通知识库', value: 'normal' },
          { label: '图知识库', value: 'graph' },
        ]"
      />
    </div>
    <div class="modal-list">
      <div
        v-for="kb in availableKBs"
        :key="kb.id"
        class="modal-item"
        @click="addKB(kb.id)"
      >
        <div class="modal-info">
          <div class="modal-header">
            <span class="modal-name">{{ kb.name }}</span>
            <Tag :color="getTypeColor(kb.type)" size="small">
              {{ getTypeLabel(kb.type) }}
            </Tag>
            <Tag size="small" color="default">
              {{ kb.document_count }} 文档 · {{ kb.chunk_count }} 分块
            </Tag>
          </div>
          <span class="modal-desc">{{ kb.description || '暂无描述' }}</span>
        </div>
        <Button type="link" size="small">添加</Button>
      </div>
      <div v-if="availableKBs.length === 0" class="modal-empty">
        {{ kbSearchKeyword || kbFilterType ? '没有匹配的知识库' : '所有知识库已添加' }}
      </div>
    </div>
  </Modal>
</template>

<style scoped>
.config-form {
  padding-top: 0;
}

.section-title {
  font-size: 13px;
  font-weight: 500;
  color: hsl(var(--foreground));
  margin-bottom: 8px;
  display: flex;
  align-items: center;
}

.section-hint {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  margin-bottom: 10px;
}

.param-hint {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.selected-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.selected-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid hsl(var(--border));
  background: hsl(var(--card));
  transition: all 0.2s;
}

.selected-item:hover {
  border-color: hsl(var(--primary) / 40%);
  background: hsl(var(--primary) / 4%);
}

.selected-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.selected-header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.selected-header :deep(.ant-tag) {
  margin: 0;
  font-size: 10px;
  line-height: 16px;
  padding: 0 4px;
}

.selected-name {
  font-size: 13px;
  font-weight: 500;
  color: hsl(var(--foreground));
}

.selected-desc {
  font-size: 11px;
  color: hsl(var(--muted-foreground));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.empty-hint {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  padding: 16px 0;
  text-align: center;
}

/* Modal 样式 */
.modal-filters {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.modal-list {
  max-height: 400px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.modal-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid hsl(var(--border));
  cursor: pointer;
  transition: all 0.2s;
}

.modal-item:hover {
  border-color: hsl(var(--primary));
  background: hsl(var(--primary) / 6%);
}

.modal-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  flex: 1;
}

.modal-header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.modal-header :deep(.ant-tag) {
  margin: 0;
  font-size: 10px;
  line-height: 16px;
  padding: 0 4px;
}

.modal-name {
  font-size: 13px;
  font-weight: 500;
  color: hsl(var(--foreground));
}

.modal-desc {
  font-size: 11px;
  color: hsl(var(--muted-foreground));
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.modal-empty {
  text-align: center;
  padding: 24px 0;
  color: hsl(var(--muted-foreground));
  font-size: 13px;
}
</style>
