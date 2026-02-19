<script setup lang="ts">
import type { KnowledgeBase, KnowledgeDocument } from '#/api/knowledge-base';

import { ref } from 'vue';

import {
  Button,
  Drawer,
  Empty,
  message,
  Modal,
  Popconfirm,
  Space,
  Spin,
  Table,
  Tag,
  Upload,
} from 'ant-design-vue';

import {
  deleteKnowledgeDocumentApi,
  getKnowledgeDocumentListApi,
  reprocessKnowledgeDocumentApi,
  uploadKnowledgeDocumentApi,
} from '#/api/knowledge-base';

const emit = defineEmits<{
  (e: 'change'): void;
}>();

const visible = ref(false);
const loading = ref(false);
const uploadLoading = ref(false);
const currentKB = ref<KnowledgeBase | null>(null);
const documents = ref<KnowledgeDocument[]>([]);

const columns = [
  { title: '文档名称', dataIndex: 'name', key: 'name', ellipsis: true },
  { title: '类型', dataIndex: 'file_type', key: 'file_type', width: 80 },
  { title: '状态', dataIndex: 'indexing_status', key: 'indexing_status', width: 90 },
  { title: '分块数', dataIndex: 'chunk_count', key: 'chunk_count', width: 80 },
  { title: '大小', dataIndex: 'file_size', key: 'file_size', width: 80 },
  { title: '操作', key: 'action', width: 140, fixed: 'right' as const },
];

function formatSize(bytes: number): string {
  if (!bytes) return '-';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

function getStatusTag(status: string) {
  const map: Record<string, { color: string; label: string }> = {
    waiting: { color: 'default', label: '等待中' },
    parsing: { color: 'processing', label: '解析中' },
    cleaning: { color: 'processing', label: '清洗中' },
    splitting: { color: 'processing', label: '分块中' },
    indexing: { color: 'processing', label: '索引中' },
    completed: { color: 'success', label: '已完成' },
    error: { color: 'error', label: '失败' },
    paused: { color: 'warning', label: '已暂停' },
  };
  return map[status] || { color: 'default', label: status };
}

async function loadDocuments() {
  if (!currentKB.value) return;
  loading.value = true;
  try {
    const res = await getKnowledgeDocumentListApi(currentKB.value.id);
    documents.value = res || [];
  } catch {
    message.error('加载文档列表失败');
  } finally {
    loading.value = false;
  }
}

async function handleUpload(info: any) {
  const file = info.file;
  if (!file || !currentKB.value) return;

  uploadLoading.value = true;
  try {
    await uploadKnowledgeDocumentApi(currentKB.value.id, file);
    message.success('上传成功，文档正在处理中');
    await loadDocuments();
    emit('change');
  } catch (e: any) {
    message.error('上传失败: ' + (e.message || '未知错误'));
  } finally {
    uploadLoading.value = false;
  }
}

async function handleDelete(docId: number) {
  if (!currentKB.value) return;
  try {
    await deleteKnowledgeDocumentApi(currentKB.value.id, docId);
    message.success('删除成功');
    await loadDocuments();
    emit('change');
  } catch {
    message.error('删除失败');
  }
}

async function handleReprocess(docId: number) {
  if (!currentKB.value) return;
  try {
    await reprocessKnowledgeDocumentApi(currentKB.value.id, docId);
    message.success('已提交重新处理');
    await loadDocuments();
  } catch {
    message.error('重新处理失败');
  }
}

function open(kb: KnowledgeBase) {
  currentKB.value = kb;
  visible.value = true;
  loadDocuments();
}

defineExpose({ open });
</script>

<template>
  <Drawer
    v-model:open="visible"
    :title="`文档管理 - ${currentKB?.name || ''}`"
    :width="680"
    :destroyOnClose="true"
  >
    <div class="doc-drawer-header">
      <Upload
        :showUploadList="false"
        :beforeUpload="() => false"
        accept=".pdf,.txt,.md,.docx,.doc,.html,.csv,.json,.png,.jpg,.jpeg,.gif,.mp3,.wav,.mp4"
        :multiple="true"
        @change="handleUpload"
      >
        <Button type="primary" :loading="uploadLoading">上传文档</Button>
      </Upload>
      <Button @click="loadDocuments" :loading="loading">刷新</Button>
    </div>

    <div class="doc-drawer-hint">
      支持上传 PDF、TXT、Markdown、Word、HTML、CSV、JSON 等文本文件，以及图片、音频、视频文件。
    </div>

    <Spin :spinning="loading">
      <Table
        v-if="documents.length > 0"
        :columns="columns"
        :data-source="documents"
        :pagination="false"
        row-key="id"
        size="small"
        :scroll="{ y: 'calc(100vh - 280px)' }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'file_type'">
            <Tag size="small">{{ record.file_type || '-' }}</Tag>
          </template>
          <template v-if="column.key === 'indexing_status'">
            <Tag :color="getStatusTag(record.indexing_status).color" size="small">
              {{ getStatusTag(record.indexing_status).label }}
            </Tag>
          </template>
          <template v-if="column.key === 'file_size'">
            {{ formatSize(record.file_size) }}
          </template>
          <template v-if="column.key === 'action'">
            <Space>
              <Button
                v-if="record.indexing_status === 'error'"
                type="link"
                size="small"
                @click="handleReprocess(record.id)"
              >
                重试
              </Button>
              <Popconfirm
                title="确定删除该文档？"
                @confirm="handleDelete(record.id)"
              >
                <Button type="link" size="small" danger>删除</Button>
              </Popconfirm>
            </Space>
          </template>
        </template>
      </Table>
      <Empty
        v-else-if="!loading"
        description="暂无文档，点击上方「上传文档」添加"
      />
    </Spin>
  </Drawer>
</template>

<style scoped>
.doc-drawer-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
}

.doc-drawer-hint {
  font-size: 12px;
  color: #999;
  margin-bottom: 16px;
}
</style>
