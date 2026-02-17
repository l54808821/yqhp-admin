<script setup lang="ts">
/**
 * 文档分块详情视图 — Dify 风格
 * 左侧：分块列表（编号 + 字符数 + 内容）
 * 右侧：文档信息面板
 */
import type { DocumentChunk, KnowledgeBase, KnowledgeDocument } from '#/api/knowledge-base';

import { onMounted, ref } from 'vue';

import {
  Button,
  Card,
  Descriptions,
  Empty,
  Pagination,
  Spin,
  Tag,
  message,
} from 'ant-design-vue';
import { ArrowLeft, FileText } from 'lucide-vue-next';

import { getDocumentChunksApi } from '#/api/knowledge-base';

interface Props {
  kb: KnowledgeBase;
  doc: KnowledgeDocument;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'back'): void;
}>();

const chunks = ref<DocumentChunk[]>([]);
const loading = ref(false);

// 分页
const currentPage = ref(1);
const pageSize = ref(10);

const pagedChunks = ref<DocumentChunk[]>([]);

function updatePagedChunks() {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  pagedChunks.value = chunks.value.slice(start, end);
}

function handlePageChange(page: number, size: number) {
  currentPage.value = page;
  pageSize.value = size;
  updatePagedChunks();
}

function formatSize(bytes: number): string {
  if (!bytes) return '-';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('zh-CN');
}

// 计算平均分块长度
function avgChunkLength(): number {
  if (chunks.value.length === 0) return 0;
  const total = chunks.value.reduce((sum, c) => sum + c.char_count, 0);
  return Math.round(total / chunks.value.length);
}

async function loadChunks() {
  loading.value = true;
  try {
    const res = await getDocumentChunksApi(props.kb.id, props.doc.id);
    chunks.value = res || [];
    currentPage.value = 1;
    updatePagedChunks();
  } catch (e: any) {
    message.error('加载分块失败: ' + (e.message || '未知错误'));
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadChunks();
});
</script>

<template>
  <div class="chunk-view">
    <!-- 顶部 -->
    <div class="chunk-view-header">
      <Button type="text" @click="emit('back')">
        <ArrowLeft :size="16" />
      </Button>
      <FileText :size="18" class="chunk-view-icon" />
      <div class="chunk-view-title">
        <div class="chunk-view-name">{{ doc.name }}</div>
        <Tag size="small">{{ doc.file_type || '-' }}</Tag>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="chunk-view-body">
      <!-- 左侧：分块列表 -->
      <div class="chunk-list-panel">
        <div class="chunk-list-info">
          <strong>{{ chunks.length }} 分段</strong>
        </div>

        <Spin :spinning="loading">
          <div v-if="pagedChunks.length > 0" class="chunk-list">
            <div
              v-for="chunk in pagedChunks"
              :key="chunk.chunk_index"
              class="chunk-card"
            >
              <div class="chunk-card-header">
                <span class="chunk-label">
                  分段-{{ String(chunk.chunk_index + 1).padStart(2, '0') }}
                </span>
                <span class="chunk-chars">{{ chunk.char_count }} 字符</span>
                <Tag v-if="chunk.enabled" color="green" size="small">已启用</Tag>
              </div>
              <div class="chunk-card-content">
                {{ chunk.content }}
              </div>
            </div>
          </div>
          <Empty v-else-if="!loading" description="暂无分块数据" />
        </Spin>

        <!-- 分页 -->
        <div v-if="chunks.length > pageSize" class="chunk-pagination">
          <Pagination
            :current="currentPage"
            :page-size="pageSize"
            :total="chunks.length"
            size="small"
            :page-size-options="['10', '25', '50']"
            show-size-changer
            @change="handlePageChange"
          />
        </div>
      </div>

      <!-- 右侧：文档信息 -->
      <div class="chunk-info-panel">
        <Card size="small" class="info-card">
          <template #title>文档信息</template>
          <Descriptions :column="1" size="small" :labelStyle="{ width: '90px', color: '#999' }">
            <Descriptions.Item label="原始文件名称">
              {{ doc.name }}
            </Descriptions.Item>
            <Descriptions.Item label="文件大小">
              {{ formatSize(doc.file_size) }}
            </Descriptions.Item>
            <Descriptions.Item label="上传日期">
              {{ formatDate(doc.created_at) }}
            </Descriptions.Item>
            <Descriptions.Item label="最后更新">
              {{ formatDate(doc.updated_at) }}
            </Descriptions.Item>
            <Descriptions.Item label="来源">
              文件上传
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card size="small" class="info-card">
          <template #title>技术参数</template>
          <Descriptions :column="1" size="small" :labelStyle="{ width: '90px', color: '#999' }">
            <Descriptions.Item label="分段模式">
              通用
            </Descriptions.Item>
            <Descriptions.Item label="分段长度">
              {{ kb.chunk_size || 500 }}
            </Descriptions.Item>
            <Descriptions.Item label="平均段落长度">
              {{ avgChunkLength() }} characters
            </Descriptions.Item>
            <Descriptions.Item label="段落数量">
              {{ chunks.length }} paragraphs
            </Descriptions.Item>
          </Descriptions>
        </Card>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chunk-view {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.chunk-view-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 24px;
  border-bottom: 1px solid hsl(var(--border));
  flex-shrink: 0;
}

.chunk-view-icon {
  color: hsl(var(--primary));
}

.chunk-view-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.chunk-view-name {
  font-size: 15px;
  font-weight: 600;
  color: hsl(var(--foreground));
}

.chunk-view-title :deep(.ant-tag) {
  margin: 0;
}

.chunk-view-body {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* 左侧分块列表 */
.chunk-list-panel {
  flex: 1;
  min-width: 0;
  padding: 16px 24px;
  overflow-y: auto;
}

.chunk-list-info {
  margin-bottom: 14px;
  font-size: 14px;
  color: hsl(var(--foreground));
}

.chunk-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chunk-card {
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
  padding: 14px 16px;
  background: hsl(var(--card));
}

.chunk-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.chunk-label {
  font-size: 13px;
  font-weight: 600;
  color: hsl(var(--foreground));
}

.chunk-chars {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.chunk-card-header :deep(.ant-tag) {
  margin: 0;
  margin-left: auto;
}

.chunk-card-content {
  font-size: 13px;
  line-height: 1.7;
  color: hsl(var(--foreground));
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 200px;
  overflow-y: auto;
}

.chunk-pagination {
  display: flex;
  justify-content: center;
  padding: 16px 0;
}

/* 右侧信息面板 */
.chunk-info-panel {
  width: 280px;
  flex-shrink: 0;
  border-left: 1px solid hsl(var(--border));
  padding: 16px;
  overflow-y: auto;
  background: hsl(var(--muted) / 20%);
}

.info-card {
  margin-bottom: 12px;
}

.info-card :deep(.ant-card-head) {
  min-height: auto;
  padding: 8px 12px;
  font-size: 13px;
}

.info-card :deep(.ant-card-body) {
  padding: 8px 12px;
}

.info-card :deep(.ant-descriptions-item-label) {
  font-size: 12px;
}

.info-card :deep(.ant-descriptions-item-content) {
  font-size: 12px;
}
</style>
