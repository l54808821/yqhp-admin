<script setup lang="ts">
import type { KnowledgeBase, KnowledgeDocument } from '#/api/knowledge-base';

import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

import {
  Button,
  Input,
  message,
  Popconfirm,
  Select,
  Table,
  Tag,
} from 'ant-design-vue';
import { Plus, Search, Settings2, Trash2 } from 'lucide-vue-next';

import {
  deleteKnowledgeDocumentApi,
  getKnowledgeDocumentListApi,
  reprocessKnowledgeDocumentApi,
} from '#/api/knowledge-base';

import { useDocumentPolling } from '#/composables/useDocumentPolling';
import {
  getStatusInfo,
  INDEXING_STATUS_MAP,
  isProcessingStatus,
} from '#/utils/knowledge';

import ChunkSettingModal from './ChunkSettingModal.vue';
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
const chunkSettingRef = ref<InstanceType<typeof ChunkSettingModal>>();
const searchKeyword = ref('');
const statusFilter = ref<string[]>([]);

const statusOptions = Object.entries(INDEXING_STATUS_MAP).map(
  ([value, { text }]) => ({ label: text, value }),
);

const hasProcessing = computed(() =>
  documents.value.some((d) => isProcessingStatus(d.indexing_status)),
);

const { start: startPolling } = useDocumentPolling(
  async () => {
    const res = await getKnowledgeDocumentListApi(props.kb.id, {
      keyword: searchKeyword.value.trim() || undefined,
      status: statusFilter.value.length > 0 ? statusFilter.value.join(',') : undefined,
    });
    documents.value = res || [];
    if (!hasProcessing.value) emit('change');
  },
  () => hasProcessing.value,
);

let debounceTimer: ReturnType<typeof setTimeout> | undefined;
watch([searchKeyword, statusFilter], () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    loadDocuments();
  }, 300);
}, { deep: true });
onUnmounted(() => clearTimeout(debounceTimer));

const columns = [
  {
    title: '#',
    dataIndex: 'index',
    key: 'index',
    width: 50,
    customRender: ({ index }: { index: number }) => index + 1,
  },
  {
    title: '名称',
    dataIndex: 'name',
    key: 'name',
    ellipsis: true,
  },
  {
    title: '字符数',
    dataIndex: 'word_count',
    key: 'word_count',
    width: 90,
    customRender: ({ text }: { text: number }) => text || '-',
  },
  {
    title: '分块数量',
    dataIndex: 'chunk_count',
    key: 'chunk_count',
    width: 90,
    customRender: ({ text }: { text: number }) => text || 0,
  },
  {
    title: '上传时间',
    dataIndex: 'created_at',
    key: 'created_at',
    width: 160,
    customRender: ({ text }: { text: string }) => formatDate(text),
  },
  {
    title: '状态',
    dataIndex: 'indexing_status',
    key: 'indexing_status',
    width: 90,
  },
  {
    title: '操作',
    key: 'actions',
    width: 120,
    align: 'center' as const,
  },
];

function handleOpenWizard() {
  wizardRef.value?.open();
}

function handleWizardDone() {
  loadDocuments();
  emit('change');
}

const getStatusTag = (status: string) => {
  const info = getStatusInfo(status);
  return { color: info.color, label: info.text };
};

async function loadDocuments() {
  loading.value = true;
  try {
    const res = await getKnowledgeDocumentListApi(props.kb.id, {
      keyword: searchKeyword.value.trim() || undefined,
      status: statusFilter.value.length > 0 ? statusFilter.value.join(',') : undefined,
    });
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
    startPolling();
  } catch {
    message.error('重新处理失败');
  }
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function handleOpenChunkSetting(record: KnowledgeDocument) {
  chunkSettingRef.value?.open(record);
}

function handleChunkSettingSuccess() {
  loadDocuments();
  startPolling();
}

function handleRowClick(record: KnowledgeDocument) {
  if (record.indexing_status === 'completed') {
    selectedDoc.value = record;
  }
}

onMounted(() => {
  loadDocuments().then(() => {
    if (hasProcessing.value) startPolling();
  });
});
</script>

<template>
  <DocumentChunkView
    v-if="selectedDoc"
    :kb="props.kb"
    :doc="selectedDoc"
    @back="selectedDoc = null"
  />

  <div v-else class="doc-tab">
    <!-- 工具栏 -->
    <div class="doc-header">
      <div class="doc-toolbar">
        <div class="doc-toolbar-left">
          <Input
            v-model:value="searchKeyword"
            placeholder="搜索文档名称"
            allow-clear
            class="doc-search-input"
          >
            <template #prefix><Search :size="14" style="color: hsl(var(--muted-foreground))" /></template>
          </Input>
          <Select
            v-model:value="statusFilter"
            mode="multiple"
            placeholder="全部状态"
            allow-clear
            :max-tag-count="1"
            :options="statusOptions"
            class="doc-status-select"
          />
        </div>
        <div class="doc-toolbar-right">
          <Button type="primary" @click="handleOpenWizard">
            <template #icon><Plus :size="14" /></template>
            添加文件
          </Button>
        </div>
      </div>
    </div>

    <!-- Ant Design Table -->
    <div class="doc-table-area">
      <Table
        :columns="columns"
        :data-source="documents"
        :loading="loading"
        :pagination="{
          showSizeChanger: true,
          pageSizeOptions: ['10', '25', '50'],
          defaultPageSize: 10,
          showTotal: (total: number) => `共 ${total} 条`,
          size: 'small',
        }"
        :row-key="(record: KnowledgeDocument) => record.id"
        :scroll="{ y: 'calc(100% - 56px)' }"
        size="middle"
        
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <a
              v-if="record.indexing_status === 'completed'"
              class="doc-name-link"
              @click="handleRowClick(record as KnowledgeDocument)"
            >{{ record.name }}</a>
            <span v-else>{{ record.name }}</span>
          </template>
          <template v-else-if="column.key === 'indexing_status'">
            <Tag
              :color="getStatusTag(record.indexing_status).color"
              size="small"
            >
              {{ getStatusTag(record.indexing_status).label }}
            </Tag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <div class="doc-actions" @click.stop>
              <Button
                v-if="record.indexing_status === 'error'"
                type="link"
                size="small"
                @click="handleReprocess(record.id)"
              >
                重试
              </Button>
              <Button
                v-if="record.indexing_status === 'completed'"
                type="text"
                size="small"
                title="分段设置"
                @click="handleOpenChunkSetting(record as KnowledgeDocument)"
              >
                <Settings2 :size="14" />
              </Button>
              <Popconfirm
                title="确定删除该文档？"
                @confirm="handleDelete(record.id)"
              >
                <Button type="text" size="small" danger>
                  <Trash2 :size="14" />
                </Button>
              </Popconfirm>
            </div>
          </template>
        </template>
      </Table>
    </div>

    <DocumentUploadWizard ref="wizardRef" :kb="props.kb" @done="handleWizardDone" />
    <ChunkSettingModal ref="chunkSettingRef" :kb="props.kb" @success="handleChunkSettingSuccess" />
  </div>
</template>

<style scoped>
.doc-tab {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.doc-header {
  flex-shrink: 0;
  padding: 12px 24px;
  background: hsl(var(--card));
  border-bottom: 1px solid hsl(var(--border));
}

.doc-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.doc-toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.doc-toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.doc-search-input {
  width: 220px;
}

.doc-status-select {
  min-width: 140px;
  max-width: 280px;
}

.doc-table-area {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding: 0 24px;
  background: hsl(var(--card));
}

.doc-table-area :deep(.ant-table-wrapper) {
  height: 100%;
}

.doc-table-area :deep(.ant-spin-nested-loading) {
  height: 100%;
}

.doc-table-area :deep(.ant-spin-container) {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.doc-table-area :deep(.ant-table) {
  flex: 1;
  min-height: 0;
}

.doc-table-area :deep(.ant-table-container) {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.doc-table-area :deep(.ant-table-body) {
  flex: 1;
  min-height: 0;
  overflow-y: auto !important;
}

.doc-table-area :deep(.ant-table-pagination) {
  margin: 12px 0 !important;
  flex-shrink: 0;
}

.doc-name-link {
  color: hsl(var(--primary));
  cursor: pointer;
}

.doc-name-link:hover {
  text-decoration: underline;
}

.doc-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
}
</style>
