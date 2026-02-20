<script setup lang="ts">
import type { KnowledgeBase, KnowledgeDocument, SegmentInfo } from '#/api/knowledge-base';

import { computed, onMounted, ref } from 'vue';

import {
  Button,
  Card,
  Checkbox,
  Descriptions,
  Empty,
  Input,
  message,
  Modal,
  Pagination,
  Select,
  Spin,
  Switch,
  Tooltip,
} from 'ant-design-vue';
import {
  ArrowDownUp,
  ArrowLeft,
  Edit3,
  FileText,
  Hash,
  Search,
} from 'lucide-vue-next';

import { getDocumentSegmentsApi, updateSegmentApi } from '#/api/knowledge-base';
import {
  formatDateTime,
  formatFileSize,
  renderChunkContent,
} from '#/utils/knowledge';

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

const statusFilter = ref<string>('all');
const searchKeyword = ref('');
const sortAsc = ref(true);

const selectedIds = ref<Set<number>>(new Set());

const filteredSegments = computed(() => {
  let list = [...segments.value];
  if (statusFilter.value === 'enabled') list = list.filter((s) => s.enabled);
  else if (statusFilter.value === 'disabled')
    list = list.filter((s) => !s.enabled);
  if (searchKeyword.value.trim()) {
    const kw = searchKeyword.value.trim().toLowerCase();
    list = list.filter((s) => s.content.toLowerCase().includes(kw));
  }
  if (!sortAsc.value) list.reverse();
  return list;
});

const allSelected = computed(
  () =>
    filteredSegments.value.length > 0 &&
    filteredSegments.value.every((s) => selectedIds.value.has(s.id)),
);

const indeterminate = computed(
  () =>
    filteredSegments.value.some((s) => selectedIds.value.has(s.id)) &&
    !allSelected.value,
);

const totalHitCount = computed(() =>
  segments.value.reduce((sum, s) => sum + s.hit_count, 0),
);

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
  selectedIds.value.clear();
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

async function handleBatchToggle(enabled: boolean) {
  const ids = [...selectedIds.value];
  if (ids.length === 0) return;
  try {
    await Promise.all(
      ids.map((id) => updateSegmentApi(props.kb.id, id, { enabled })),
    );
    segments.value.forEach((s) => {
      if (selectedIds.value.has(s.id)) {
        s.enabled = enabled;
        s.status = enabled ? 'active' : 'disabled';
      }
    });
    selectedIds.value.clear();
    message.success(`已批量${enabled ? '启用' : '禁用'} ${ids.length} 个分段`);
  } catch {
    message.error('批量操作失败');
  }
}

function toggleSelectAll(checked: boolean) {
  if (checked) {
    filteredSegments.value.forEach((s) => selectedIds.value.add(s.id));
  } else {
    selectedIds.value.clear();
  }
}

function toggleSelect(id: number, checked: boolean) {
  if (checked) {
    selectedIds.value.add(id);
  } else {
    selectedIds.value.delete(id);
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

function toggleSort() {
  sortAsc.value = !sortAsc.value;
}

const totalPages = computed(() =>
  Math.max(1, Math.ceil(total.value / pageSize.value)),
);

onMounted(() => {
  loadSegments();
});
</script>

<template>
  <div class="chunk-view">
    <!-- Header -->
    <div class="chunk-view-header">
      <div class="chunk-view-header-left">
        <Button type="text" size="small" @click="emit('back')">
          <ArrowLeft :size="16" />
        </Button>
        <FileText :size="18" class="chunk-view-icon" />
        <div class="chunk-view-title">
          <span class="chunk-view-name">{{ doc.name }}</span>
        </div>
      </div>
      <div class="chunk-view-header-right">
        <!-- batch actions -->
        <template v-if="selectedIds.size > 0">
          <span class="batch-hint">已选 {{ selectedIds.size }} 项</span>
          <Button size="small" @click="handleBatchToggle(true)">批量启用</Button>
          <Button size="small" @click="handleBatchToggle(false)">批量禁用</Button>
        </template>
      </div>
    </div>

    <div class="chunk-view-body">
      <!-- left: chunk list -->
      <div class="chunk-list-panel">
        <!-- toolbar -->
        <div class="chunk-toolbar">
          <div class="chunk-toolbar-left">
            <Checkbox
              :checked="allSelected"
              :indeterminate="indeterminate"
              @change="(e: any) => toggleSelectAll(e.target.checked)"
            />
            <strong class="chunk-total">{{ total }} 分段</strong>
            <Select
              v-model:value="statusFilter"
              size="small"
              class="chunk-status-filter"
              :options="[
                { label: '全部', value: 'all' },
                { label: '已启用', value: 'enabled' },
                { label: '已禁用', value: 'disabled' },
              ]"
            />
          </div>
          <div class="chunk-toolbar-right">
            <Input
              v-model:value="searchKeyword"
              size="small"
              placeholder="搜索"
              allow-clear
              class="chunk-search"
            >
              <template #prefix>
                <Search :size="13" style="color: hsl(var(--muted-foreground))" />
              </template>
            </Input>
            <Tooltip :title="sortAsc ? '正序' : '倒序'">
              <Button
                type="text"
                size="small"
                class="chunk-sort-btn"
                @click="toggleSort"
              >
                <ArrowDownUp :size="14" />
              </Button>
            </Tooltip>
          </div>
        </div>

        <!-- segment list -->
        <div class="chunk-list-scroll">
          <Spin :spinning="loading">
            <div v-if="filteredSegments.length > 0" class="chunk-list">
              <div
                v-for="seg in filteredSegments"
                :key="seg.id"
                class="chunk-card"
                :class="{
                  'chunk-disabled': !seg.enabled,
                  'chunk-selected': selectedIds.has(seg.id),
                }"
              >
                <div class="chunk-card-header">
                  <Checkbox
                    :checked="selectedIds.has(seg.id)"
                    @change="(e: any) => toggleSelect(seg.id, e.target.checked)"
                  />
                  <Hash :size="13" class="chunk-hash-icon" />
                  <span class="chunk-label">
                    分段-{{ String(seg.position + 1).padStart(2, '0') }}
                  </span>
                  <span class="chunk-chars">{{ seg.word_count }} 字符</span>
                  <span class="chunk-hits">{{ seg.hit_count }} 召回次数</span>
                  <div class="chunk-actions">
                    <Tooltip title="编辑">
                      <Button
                        type="text"
                        size="small"
                        @click="openEditModal(seg)"
                      >
                        <Edit3 :size="13" />
                      </Button>
                    </Tooltip>
                    <Switch
                      :checked="seg.enabled"
                      size="small"
                      @change="handleToggleEnabled(seg)"
                    />
                    <span
                      class="chunk-status-text"
                      :class="seg.enabled ? 'status-enabled' : 'status-disabled'"
                    >
                      {{ seg.enabled ? '已启用' : '已禁用' }}
                    </span>
                  </div>
                </div>
                <div
                  class="chunk-card-content"
                  v-html="renderChunkContent(seg.content)"
                />
              </div>
            </div>
            <Empty v-else-if="!loading" description="暂无分块数据" />
          </Spin>
        </div>

        <!-- pagination (always visible) -->
        <div class="chunk-pagination">
          <div class="chunk-pagination-info">
            {{ currentPage }}/{{ totalPages }}
          </div>
          <Pagination
            :current="currentPage"
            :page-size="pageSize"
            :total="total"
            size="small"
            :page-size-options="['10', '20', '50']"
            show-size-changer
            simple
            @change="handlePageChange"
          />
        </div>
      </div>

      <!-- right: info panel -->
      <div class="chunk-info-panel">
        <Card size="small" class="info-card">
          <template #title>文档信息</template>
          <Descriptions
            :column="1"
            size="small"
            :labelStyle="{ width: '100px', color: '#999' }"
          >
            <Descriptions.Item label="原始文件名">
              {{ doc.name }}
            </Descriptions.Item>
            <Descriptions.Item label="原始文件大小">
              {{ formatFileSize(doc.file_size) }}
            </Descriptions.Item>
            <Descriptions.Item label="上传日期">
              {{ formatDateTime(doc.created_at) }}
            </Descriptions.Item>
            <Descriptions.Item label="最后更新日期">
              {{ formatDateTime(doc.updated_at) }}
            </Descriptions.Item>
            <Descriptions.Item label="来源">
              文件上传
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card size="small" class="info-card">
          <template #title>技术参数</template>
          <Descriptions
            :column="1"
            size="small"
            :labelStyle="{ width: '100px', color: '#999' }"
          >
            <Descriptions.Item label="分段规则">
              通用
            </Descriptions.Item>
            <Descriptions.Item label="段落上限">
              {{ kb.chunk_size || 500 }}
            </Descriptions.Item>
            <Descriptions.Item label="平均段落长度">
              {{ avgChunkLength() }} characters
            </Descriptions.Item>
            <Descriptions.Item label="段落数量">
              {{ total }} paragraphs
            </Descriptions.Item>
            <Descriptions.Item label="召回次数">
              {{ ((totalHitCount / total) * 100 || 0).toFixed(1) }}%
              ({{ totalHitCount }}/{{ total }})
            </Descriptions.Item>
            <Descriptions.Item label="嵌入模型">
              {{ kb.embedding_model_name || kb.embedding_model_id || '-' }}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      </div>
    </div>

    <!-- Edit Modal -->
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
/* ====== Layout ====== */
.chunk-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
}

/* ====== Header ====== */
.chunk-view-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 20px;
  border-bottom: 1px solid hsl(var(--border));
  flex-shrink: 0;
}

.chunk-view-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.chunk-view-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.batch-hint {
  font-size: 12px;
  color: hsl(var(--primary));
  font-weight: 500;
}

.chunk-view-icon {
  color: hsl(var(--primary));
  flex-shrink: 0;
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

/* ====== Body ====== */
.chunk-view-body {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* ====== Left: Chunk List Panel ====== */
.chunk-list-panel {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ====== Toolbar ====== */
.chunk-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-bottom: 1px solid hsl(var(--border) / 50%);
  flex-shrink: 0;
  gap: 12px;
}

.chunk-toolbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.chunk-total {
  font-size: 14px;
  color: hsl(var(--foreground));
  white-space: nowrap;
}

.chunk-status-filter {
  width: 96px;
}

.chunk-toolbar-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.chunk-search {
  width: 160px;
}

.chunk-sort-btn {
  color: hsl(var(--muted-foreground));
}

.chunk-sort-btn:hover {
  color: hsl(var(--foreground));
}

/* ====== Chunk List ====== */
.chunk-list-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 16px 20px;
}

.chunk-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* ====== Chunk Card ====== */
.chunk-card {
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  padding: 12px 14px;
  background: hsl(var(--card));
  transition: all 0.15s ease;
}

.chunk-card:hover {
  border-color: hsl(var(--primary) / 30%);
  box-shadow: 0 1px 4px hsl(var(--primary) / 6%);
}

.chunk-card.chunk-disabled {
  opacity: 0.55;
}

.chunk-card.chunk-selected {
  border-color: hsl(var(--primary) / 50%);
  background: hsl(var(--primary) / 3%);
}

.chunk-card-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.chunk-hash-icon {
  color: hsl(var(--muted-foreground));
  flex-shrink: 0;
}

.chunk-label {
  font-size: 13px;
  font-weight: 600;
  color: hsl(var(--foreground));
  white-space: nowrap;
}

.chunk-chars {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  white-space: nowrap;
}

.chunk-hits {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  white-space: nowrap;
}

.chunk-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.chunk-status-text {
  font-size: 12px;
  white-space: nowrap;
}

.status-enabled {
  color: hsl(var(--primary));
}

.status-disabled {
  color: hsl(var(--muted-foreground));
}

.chunk-card-content {
  font-size: 13px;
  line-height: 1.7;
  color: hsl(var(--foreground));
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 160px;
  overflow-y: auto;
}

.chunk-card-content :deep(img) {
  max-width: 100%;
  max-height: 300px;
  border-radius: 6px;
  border: 1px solid hsl(var(--border));
  margin: 4px 0;
  display: block;
}

/* ====== Pagination ====== */
.chunk-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 10px 20px;
  border-top: 1px solid hsl(var(--border) / 50%);
  flex-shrink: 0;
  background: hsl(var(--card));
}

.chunk-pagination-info {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  white-space: nowrap;
}

/* ====== Right: Info Panel ====== */
.chunk-info-panel {
  width: 280px;
  flex-shrink: 0;
  border-left: 1px solid hsl(var(--border));
  padding: 16px;
  overflow-y: auto;
  background: hsl(var(--muted) / 15%);
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
  color: hsl(var(--foreground));
}
</style>
