<script setup lang="ts">
/**
 * 文档管理 Tab — 文档列表 + 上传 + 分块预览
 */
import type { KnowledgeBase, KnowledgeDocument } from '#/api/knowledge-base';

import { onMounted, ref } from 'vue';

import {
  Button,
  Empty,
  message,
  Popconfirm,
  Spin,
  Tag,
} from 'ant-design-vue';
import { FileText, RefreshCw, Trash2 } from 'lucide-vue-next';

import {
  deleteKnowledgeDocumentApi,
  getKnowledgeDocumentListApi,
  reprocessKnowledgeDocumentApi,
} from '#/api/knowledge-base';

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

function handleOpenWizard() {
  wizardRef.value?.open();
}

function handleWizardDone() {
  loadDocuments();
  emit('change');
}

function getStatusTag(status: string) {
  const map: Record<string, { color: string; label: string }> = {
    pending: { color: 'default', label: '待处理' },
    processing: { color: 'processing', label: '处理中' },
    ready: { color: 'success', label: '就绪' },
    failed: { color: 'error', label: '失败' },
  };
  return map[status] || { color: 'default', label: status };
}

function formatSize(bytes: number): string {
  if (!bytes) return '-';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

function getFileTypeIcon(_type: string) {
  return FileText;
}

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
    await loadDocuments();
    emit('change');
  } catch {
    message.error('删除失败');
  }
}

async function handleReprocess(docId: number) {
  try {
    await reprocessKnowledgeDocumentApi(props.kb.id, docId);
    message.success('已提交重新处理');
    await loadDocuments();
  } catch {
    message.error('重新处理失败');
  }
}

onMounted(() => {
  loadDocuments();
});
</script>

<template>
  <!-- 分块详情视图 -->
  <DocumentChunkView
    v-if="selectedDoc"
    :kb="props.kb"
    :doc="selectedDoc"
    @back="selectedDoc = null"
  />

  <!-- 文档列表视图 -->
  <div v-else class="doc-tab">
    <!-- 操作栏 -->
    <div class="doc-tab-toolbar">
      <Button type="primary" @click="handleOpenWizard">+ 添加文件</Button>
      <span class="doc-tab-hint">
        支持 PDF、TXT、Markdown、Word、HTML、CSV、JSON 等格式
      </span>
      <div style="flex: 1" />
      <Button :loading="loading" @click="loadDocuments">
        <template #icon><RefreshCw :size="14" /></template>
        刷新
      </Button>
    </div>

    <!-- 文档列表 -->
    <Spin :spinning="loading">
      <div v-if="documents.length > 0" class="doc-list">
        <div
          v-for="doc in documents"
          :key="doc.id"
          class="doc-item"
          @click="doc.status === 'ready' ? (selectedDoc = doc) : undefined"
          :style="{ cursor: doc.status === 'ready' ? 'pointer' : 'default' }"
        >
          <div class="doc-item-main">
            <div class="doc-item-icon">
              <component :is="getFileTypeIcon(doc.file_type)" :size="18" />
            </div>
            <div class="doc-item-info">
              <div class="doc-item-name">{{ doc.name }}</div>
              <div class="doc-item-meta">
                <Tag size="small">{{ doc.file_type || '-' }}</Tag>
                <Tag :color="getStatusTag(doc.status).color" size="small">
                  {{ getStatusTag(doc.status).label }}
                </Tag>
                <span v-if="doc.chunk_count">{{ doc.chunk_count }} 分块</span>
                <span v-if="doc.token_count">{{ doc.token_count }} 字符</span>
                <span>{{ formatSize(doc.file_size) }}</span>
              </div>
              <div v-if="doc.status === 'failed' && doc.error_message" class="doc-item-error">
                {{ doc.error_message }}
              </div>
            </div>
            <div class="doc-item-actions" @click.stop>
              <Button
                v-if="doc.status === 'failed'"
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
        <Empty description="暂无文档，点击上方「上传文档」添加" />
      </div>
    </Spin>

    <!-- 上传向导 -->
    <DocumentUploadWizard ref="wizardRef" :kb="props.kb" @done="handleWizardDone" />
  </div>
</template>

<style scoped>
.doc-tab {
  padding: 20px 24px;
}

.doc-tab-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.doc-tab-hint {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.doc-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
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
