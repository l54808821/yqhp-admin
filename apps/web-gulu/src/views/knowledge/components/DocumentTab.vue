<script setup lang="ts">
/**
 * 文档管理 Tab — 文档列表 + 状态轮询 + 批量操作
 */
import type { KnowledgeBase, KnowledgeDocument } from '#/api/knowledge-base';

import { computed, onMounted, ref } from 'vue';

import {
  Button,
  Checkbox,
  Empty,
  message,
  Popconfirm,
  Spin,
  Tag,
} from 'ant-design-vue';
import { FileText, RefreshCw, Trash2 } from 'lucide-vue-next';

import {
  batchDeleteDocumentsApi,
  batchReprocessDocumentsApi,
  deleteKnowledgeDocumentApi,
  getKnowledgeDocumentListApi,
  reprocessKnowledgeDocumentApi,
} from '#/api/knowledge-base';

import { useDocumentPolling } from '#/composables/useDocumentPolling';
import {
  formatFileSize,
  getStatusInfo,
  isProcessingStatus,
} from '#/utils/knowledge';

import DocumentChunkView from './DocumentChunkView.vue';
import DocumentUploadWizard from './DocumentUploadWizard.vue';

interface Props {
  kb: KnowledgeBase;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'change'): void;
}>();

const documents = ref<KnowledgeDocument[]>([]);
const loading = ref(false);
const selectedDoc = ref<KnowledgeDocument | null>(null);
const wizardRef = ref<InstanceType<typeof DocumentUploadWizard>>();
const selectedIds = ref<Set<number>>(new Set());

const hasProcessing = computed(() =>
  documents.value.some((d) => isProcessingStatus(d.indexing_status)),
);

const { start: startPolling } = useDocumentPolling(
  async () => {
    const res = await getKnowledgeDocumentListApi(props.kb.id);
    documents.value = res || [];
    if (!hasProcessing.value) emit('change');
  },
  () => hasProcessing.value,
);

const allSelected = computed(() =>
  documents.value.length > 0 && selectedIds.value.size === documents.value.length,
);

function toggleSelectAll() {
  if (allSelected.value) {
    selectedIds.value.clear();
  } else {
    documents.value.forEach((d) => selectedIds.value.add(d.id));
  }
}

function toggleSelect(id: number) {
  if (selectedIds.value.has(id)) {
    selectedIds.value.delete(id);
  } else {
    selectedIds.value.add(id);
  }
}

function handleOpenWizard() {
  wizardRef.value?.open();
}

function handleWizardDone() {
  loadDocuments();
  emit('change');
}

// 使用公共工具替代本地重复定义
const getStatusTag = (status: string) => {
  const info = getStatusInfo(status);
  return { color: info.color, label: info.text };
};

async function loadDocuments() {
  loading.value = true;
  try {
    const res = await getKnowledgeDocumentListApi(props.kb.id);
    documents.value = res || [];
  } catch {
    message.error('加载文档列表失败');
  } finally {
    loading.value = false;
  }
}


async function handleDelete(docId: number) {
  try {
    await deleteKnowledgeDocumentApi(props.kb.id, docId);
    message.success('删除成功');
    selectedIds.value.delete(docId);
    await loadDocuments();
    emit('change');
  } catch {
    message.error('删除失败');
  }
}

async function handleBatchDelete() {
  const ids = Array.from(selectedIds.value);
  if (ids.length === 0) return;
  try {
    await batchDeleteDocumentsApi(props.kb.id, ids);
    message.success(`已删除 ${ids.length} 个文档`);
    selectedIds.value.clear();
    await loadDocuments();
    emit('change');
  } catch {
    message.error('批量删除失败');
  }
}

async function handleReprocess(docId: number) {
  try {
    await reprocessKnowledgeDocumentApi(props.kb.id, docId);
    message.success('已提交重新处理');
    await loadDocuments();
    startPolling();
  } catch {
    message.error('重新处理失败');
  }
}

async function handleBatchReprocess() {
  const ids = Array.from(selectedIds.value);
  if (ids.length === 0) return;
  try {
    await batchReprocessDocumentsApi(props.kb.id, ids);
    message.success(`已提交 ${ids.length} 个文档重处理`);
    selectedIds.value.clear();
    await loadDocuments();
    startPolling();
  } catch {
    message.error('批量重处理失败');
  }
}

onMounted(() => {
  loadDocuments().then(() => {
    if (hasProcessing.value) startPolling();
  });
});

// useDocumentPolling 在 onUnmounted 时自动停止轮询
</script>

<template>
  <DocumentChunkView
    v-if="selectedDoc"
    :kb="props.kb"
    :doc="selectedDoc"
    @back="selectedDoc = null"
  />

  <div v-else class="doc-tab">
    <div class="doc-tab-toolbar">
      <div class="doc-tab-toolbar-left">
        <Button type="primary" @click="handleOpenWizard">+ 添加文件</Button>
        <span class="doc-tab-hint">
          支持 PDF、TXT、Markdown、Word、HTML、CSV、JSON 等格式
        </span>
      </div>
      <div class="doc-tab-toolbar-right">
        <template v-if="selectedIds.size > 0">
          <Popconfirm
            :title="`确定批量删除 ${selectedIds.size} 个文档？`"
            @confirm="handleBatchDelete"
          >
            <Button danger size="small">批量删除 ({{ selectedIds.size }})</Button>
          </Popconfirm>
          <Button size="small" @click="handleBatchReprocess">
            批量重处理 ({{ selectedIds.size }})
          </Button>
        </template>
        <Button :loading="loading" @click="loadDocuments">
          <template #icon><RefreshCw :size="14" /></template>
          刷新
        </Button>
      </div>
    </div>

    <Spin :spinning="loading" class="doc-tab-content">
      <div class="doc-list-wrap">
      <div v-if="documents.length > 0" class="doc-list">
        <div class="doc-list-header">
          <Checkbox :checked="allSelected" @change="toggleSelectAll" />
          <span class="doc-list-header-text">共 {{ documents.length }} 个文档</span>
        </div>
        <div
          v-for="doc in documents"
          :key="doc.id"
          class="doc-item"
          @click="doc.indexing_status === 'completed' ? (selectedDoc = doc) : undefined"
          :style="{ cursor: doc.indexing_status === 'completed' ? 'pointer' : 'default' }"
        >
          <div class="doc-item-main">
            <div class="doc-item-check" @click.stop>
              <Checkbox
                :checked="selectedIds.has(doc.id)"
                @change="toggleSelect(doc.id)"
              />
            </div>
            <div class="doc-item-icon">
              <FileText :size="18" />
            </div>
            <div class="doc-item-info">
              <div class="doc-item-name">{{ doc.name }}</div>
              <div class="doc-item-meta">
                <Tag size="small">{{ doc.file_type || '-' }}</Tag>
                <Tag :color="getStatusTag(doc.indexing_status).color" size="small">
                  {{ getStatusTag(doc.indexing_status).label }}
                </Tag>
                <span v-if="doc.word_count">{{ doc.word_count }} 字</span>
                <span v-if="doc.chunk_count">{{ doc.chunk_count }} 分块</span>
                <span>{{ formatFileSize(doc.file_size) }}</span>
              </div>
              <div v-if="doc.indexing_status === 'error' && doc.error_message" class="doc-item-error">
                {{ doc.error_message }}
              </div>
            </div>
            <div class="doc-item-actions" @click.stop>
              <Button
                v-if="doc.indexing_status === 'error'"
                type="link"
                size="small"
                @click="handleReprocess(doc.id)"
              >
                <RefreshCw :size="14" />
                重试
              </Button>
              <Popconfirm
                title="确定删除该文档？"
                :overlay-style="{ minWidth: '200px' }"
                @confirm="handleDelete(doc.id)"
              >
                <Button type="text" size="small" danger>
                  <Trash2 :size="14" />
                </Button>
              </Popconfirm>
            </div>
          </div>
        </div>
      </div>
      <div v-else-if="!loading" class="doc-empty">
        <Empty description="暂无文档，点击上方「添加文件」上传" />
      </div>
      </div><!-- end doc-list-wrap -->
    </Spin>

    <DocumentUploadWizard ref="wizardRef" :kb="props.kb" @done="handleWizardDone" />
  </div>
</template>

<style scoped>
.doc-tab {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.doc-tab-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 24px;
  background: hsl(var(--card));
  border-bottom: 1px solid hsl(var(--border));
  flex-shrink: 0;
}

.doc-tab-toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.doc-tab-toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.doc-tab-hint {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.doc-list-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0 10px;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.doc-list-header-text {
  font-size: 12px;
}

.doc-tab-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.doc-tab-content :deep(.ant-spin-container) {
  height: 100%;
}

.doc-list-wrap {
  padding: 16px 24px;
}

.doc-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.doc-item {
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
  background: hsl(var(--card));
  transition: all 0.15s;
}

.doc-item:hover {
  border-color: hsl(var(--primary) / 30%);
  box-shadow: 0 1px 4px hsl(var(--primary) / 6%);
}

.doc-item-main {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  gap: 12px;
}

.doc-item-check {
  flex-shrink: 0;
}

.doc-item-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: hsl(var(--muted) / 50%);
  color: hsl(var(--muted-foreground));
  flex-shrink: 0;
}

.doc-item-info {
  flex: 1;
  min-width: 0;
}

.doc-item-name {
  font-size: 14px;
  font-weight: 500;
  color: hsl(var(--foreground));
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.doc-item-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.doc-item-meta :deep(.ant-tag) {
  margin: 0;
  font-size: 10px;
}

.doc-item-error {
  font-size: 12px;
  color: #ff4d4f;
  margin-top: 4px;
  max-width: 500px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.doc-item-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.doc-empty {
  padding: 60px 0;
}
</style>
