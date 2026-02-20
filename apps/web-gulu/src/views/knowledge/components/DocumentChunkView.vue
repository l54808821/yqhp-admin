<script setup lang="ts">
/**
 * 文档分块详情视图 — 服务端分页 + 启用/禁用 + 内联编辑
 */
import type { KnowledgeBase, KnowledgeDocument, SegmentInfo } from '#/api/knowledge-base';

import { onMounted, ref } from 'vue';

import {
  Button,
  Card,
  Descriptions,
  Empty,
  Input,
  message,
  Modal,
  Pagination,
  Spin,
  Switch,
  Tag,
} from 'ant-design-vue';
import { ArrowLeft, Edit3, FileText } from 'lucide-vue-next';

import { getDocumentSegmentsApi, updateSegmentApi } from '#/api/knowledge-base';
import { formatDate, formatFileSize, renderChunkContent } from '#/utils/knowledge';

interface Props {
  kb: KnowledgeBase;
  doc: KnowledgeDocument;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'back'): void;
}>();

const segments = ref<SegmentInfo[]>([]);
const total = ref(0);
const loading = ref(false);
const currentPage = ref(1);
const pageSize = ref(20);

const editingSegment = ref<SegmentInfo | null>(null);
const editContent = ref('');
const editVisible = ref(false);
const editSaving = ref(false);


function avgChunkLength(): number {
  if (segments.value.length === 0) return 0;
  const sum = segments.value.reduce((s, c) => s + c.word_count, 0);
  return Math.round(sum / segments.value.length);
}

async function loadSegments() {
  loading.value = true;
  try {
    const res = await getDocumentSegmentsApi(
      props.kb.id,
      props.doc.id,
      currentPage.value,
      pageSize.value,
    );
    segments.value = res?.list || [];
    total.value = res?.total || 0;
  } catch (e: any) {
    message.error('加载分块失败: ' + (e.message || '未知错误'));
  } finally {
    loading.value = false;
  }
}

function handlePageChange(page: number, size: number) {
  currentPage.value = page;
  pageSize.value = size;
  loadSegments();
}

async function handleToggleEnabled(seg: SegmentInfo) {
  try {
    await updateSegmentApi(props.kb.id, seg.id, { enabled: !seg.enabled });
    seg.enabled = !seg.enabled;
    seg.status = seg.enabled ? 'active' : 'disabled';
    message.success(seg.enabled ? '已启用' : '已禁用');
  } catch {
    message.error('操作失败');
  }
}

function openEditModal(seg: SegmentInfo) {
  editingSegment.value = seg;
  editContent.value = seg.content;
  editVisible.value = true;
}

async function handleEditSave() {
  if (!editingSegment.value) return;
  editSaving.value = true;
  try {
    await updateSegmentApi(props.kb.id, editingSegment.value.id, {
      content: editContent.value,
    });
    message.success('分块内容已更新，向量将自动重新生成');
    editVisible.value = false;
    await loadSegments();
  } catch {
    message.error('更新失败');
  } finally {
    editSaving.value = false;
  }
}

onMounted(() => {
  loadSegments();
});
</script>

<template>
  <div class="chunk-view">
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

    <div class="chunk-view-body">
      <div class="chunk-list-panel">
        <div class="chunk-list-info">
          <strong>{{ total }} 分段</strong>
        </div>

        <Spin :spinning="loading">
          <div v-if="segments.length > 0" class="chunk-list">
            <div
              v-for="seg in segments"
              :key="seg.id"
              class="chunk-card"
              :class="{ 'chunk-disabled': !seg.enabled }"
            >
              <div class="chunk-card-header">
                <span class="chunk-label">
                  分段-{{ String(seg.position + 1).padStart(2, '0') }}
                </span>
                <span class="chunk-chars">{{ seg.word_count }} 字</span>
                <span v-if="seg.hit_count" class="chunk-hits">命中 {{ seg.hit_count }} 次</span>
                <div class="chunk-actions">
                  <Button type="text" size="small" @click="openEditModal(seg)">
                    <Edit3 :size="12" />
                  </Button>
                  <Switch
                    :checked="seg.enabled"
                    size="small"
                    @change="handleToggleEnabled(seg)"
                  />
                </div>
              </div>
              <div class="chunk-card-content" v-html="renderChunkContent(seg.content)" />
            </div>
          </div>
          <Empty v-else-if="!loading" description="暂无分块数据" />
        </Spin>

        <div v-if="total > pageSize" class="chunk-pagination">
          <Pagination
            :current="currentPage"
            :page-size="pageSize"
            :total="total"
            size="small"
            :page-size-options="['10', '20', '50']"
            show-size-changer
            @change="handlePageChange"
          />
        </div>
      </div>

      <div class="chunk-info-panel">
        <Card size="small" class="info-card">
          <template #title>文档信息</template>
          <Descriptions :column="1" size="small" :labelStyle="{ width: '90px', color: '#999' }">
            <Descriptions.Item label="文件名称">
              {{ doc.name }}
            </Descriptions.Item>
            <Descriptions.Item label="文件大小">
              {{ formatFileSize(doc.file_size) }}
            </Descriptions.Item>
            <Descriptions.Item label="字数">
              {{ doc.word_count || '-' }}
            </Descriptions.Item>
            <Descriptions.Item label="上传日期">
              {{ formatDate(doc.created_at) }}
            </Descriptions.Item>
            <Descriptions.Item label="索引状态">
              {{ doc.indexing_status }}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card size="small" class="info-card">
          <template #title>技术参数</template>
          <Descriptions :column="1" size="small" :labelStyle="{ width: '90px', color: '#999' }">
            <Descriptions.Item label="分段长度">
              {{ kb.chunk_size || 500 }}
            </Descriptions.Item>
            <Descriptions.Item label="平均段落长度">
              {{ avgChunkLength() }} 字
            </Descriptions.Item>
            <Descriptions.Item label="段落数量">
              {{ total }}
            </Descriptions.Item>
            <Descriptions.Item label="嵌入模型 ID">
              {{ kb.embedding_model_id || '-' }}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      </div>
    </div>

    <Modal
      v-model:open="editVisible"
      title="编辑分块内容"
      :width="640"
      @ok="handleEditSave"
      :confirm-loading="editSaving"
      ok-text="保存"
      cancel-text="取消"
    >
      <div style="margin-bottom: 8px; font-size: 12px; color: #999">
        修改内容后向量将自动重新生成。
      </div>
      <Input.TextArea
        v-model:value="editContent"
        :rows="10"
        :maxlength="5000"
        show-count
      />
    </Modal>
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
  transition: opacity 0.2s;
}

.chunk-card.chunk-disabled {
  opacity: 0.5;
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

.chunk-hits {
  font-size: 11px;
  color: hsl(var(--primary));
}

.chunk-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 6px;
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

.chunk-card-content :deep(img) {
  max-width: 100%;
  border-radius: 6px;
  margin: 4px 0;
}

.chunk-pagination {
  display: flex;
  justify-content: center;
  padding: 16px 0;
}

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
