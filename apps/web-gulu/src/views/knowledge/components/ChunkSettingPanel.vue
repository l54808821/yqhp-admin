<script setup lang="ts">
import type { ChunkSetting, PreviewChunkItem } from '#/api/knowledge-base';

import { ref } from 'vue';

import {
  Button,
  Checkbox,
  Col,
  Form,
  Input,
  InputNumber,
  Row,
  Spin,
  Tag,
  message,
} from 'ant-design-vue';

import { previewDocumentChunksApi } from '#/api/knowledge-base';

interface Props {
  kbId: number;
  documentId: number;
  documentName?: string;
  defaultChunkSize?: number;
  defaultChunkOverlap?: number;
}

const props = withDefaults(defineProps<Props>(), {
  documentName: '',
  defaultChunkSize: 500,
  defaultChunkOverlap: 50,
});

const settings = defineModel<ChunkSetting>('settings', {
  default: () => ({
    separator: '\\n\\n',
    chunk_size: 500,
    chunk_overlap: 50,
    clean_whitespace: true,
    remove_urls: false,
  }),
});

const previewChunks = ref<PreviewChunkItem[]>([]);
const previewLoading = ref(false);
const hasPreview = ref(false);

async function handlePreview() {
  if (!props.documentId) {
    message.warning('请先上传文档');
    return;
  }

  previewLoading.value = true;
  try {
    const res = await previewDocumentChunksApi(props.kbId, {
      document_id: props.documentId,
      chunk_setting: { ...settings.value },
    });
    previewChunks.value = res || [];
    hasPreview.value = true;
  } catch (e: any) {
    message.error('预览失败: ' + (e.message || '未知错误'));
  } finally {
    previewLoading.value = false;
  }
}

function handleReset() {
  settings.value = {
    separator: '\\n\\n',
    chunk_size: props.defaultChunkSize,
    chunk_overlap: props.defaultChunkOverlap,
    clean_whitespace: true,
    remove_urls: false,
  };
  hasPreview.value = false;
  previewChunks.value = [];
}

function resetPreview() {
  hasPreview.value = false;
  previewChunks.value = [];
}

defineExpose({ resetPreview });
</script>

<template>
  <Row :gutter="20" class="chunk-panel">
    <!-- 左侧：分段设置 -->
    <Col :span="10">
      <div class="settings-section">
        <div class="settings-title">分段设置</div>
        <div class="settings-mode">
          <div class="mode-card active">
            <div class="mode-name">通用</div>
            <div class="mode-desc">通用文本分块模式，检索和召回的块是相同的</div>
          </div>
        </div>

        <Form layout="vertical" size="small">
          <Row :gutter="12">
            <Col :span="8">
              <Form.Item label="分段标识符">
                <Input v-model:value="settings.separator" />
              </Form.Item>
            </Col>
            <Col :span="8">
              <Form.Item label="分段最大长度">
                <InputNumber
                  v-model:value="settings.chunk_size"
                  :min="100"
                  :max="5000"
                  style="width: 100%"
                />
              </Form.Item>
            </Col>
            <Col :span="8">
              <Form.Item label="分段重叠长度">
                <InputNumber
                  v-model:value="settings.chunk_overlap"
                  :min="0"
                  :max="500"
                  style="width: 100%"
                />
              </Form.Item>
            </Col>
          </Row>

          <div class="preprocess-title">文本预处理规则</div>
          <div class="preprocess-options">
            <Checkbox v-model:checked="settings.clean_whitespace">
              替换连续的空格、换行符和制表符
            </Checkbox>
            <Checkbox v-model:checked="settings.remove_urls">
              删除所有 URL 和电子邮件地址
            </Checkbox>
          </div>
        </Form>

        <div class="preview-actions">
          <Button @click="handlePreview" :loading="previewLoading">
            预览块
          </Button>
          <Button @click="handleReset">
            重置
          </Button>
        </div>
      </div>
    </Col>

    <!-- 右侧：预览 -->
    <Col :span="14" class="preview-col">
      <div class="preview-section">
        <div class="preview-header">
          <span class="preview-title">预览</span>
          <Tag v-if="documentName" color="blue" size="small">
            {{ documentName }}
          </Tag>
          <span v-if="hasPreview" class="preview-count">
            {{ previewChunks.length }} 个分块
          </span>
        </div>

        <Spin :spinning="previewLoading">
          <div v-if="hasPreview && previewChunks.length > 0" class="preview-list">
            <div
              v-for="chunk in previewChunks"
              :key="chunk.index"
              class="preview-chunk"
            >
              <div class="preview-chunk-header">
                <span class="preview-chunk-label">
                  Chunk-{{ chunk.index + 1 }}
                </span>
                <span class="preview-chunk-chars">
                  {{ chunk.char_count }} characters
                </span>
              </div>
              <div class="preview-chunk-content">
                {{ chunk.content }}
              </div>
            </div>
          </div>
          <div v-else-if="!previewLoading" class="preview-empty">
            <p>点击左侧「预览块」按钮查看分块效果</p>
          </div>
        </Spin>
      </div>
    </Col>
  </Row>
</template>

<style scoped>
.chunk-panel {
  flex: 1;
  min-height: 0;
  align-items: stretch !important;
}

.settings-section {
  padding-right: 12px;
}

.settings-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  color: hsl(var(--foreground));
}

.mode-card {
  padding: 10px 14px;
  border: 2px solid hsl(var(--border));
  border-radius: 8px;
  margin-bottom: 16px;
}

.mode-card.active {
  border-color: hsl(var(--primary));
  background: hsl(var(--primary) / 4%);
}

.mode-name {
  font-size: 13px;
  font-weight: 500;
  color: hsl(var(--foreground));
  margin-bottom: 2px;
}

.mode-desc {
  font-size: 11px;
  color: hsl(var(--muted-foreground));
}

.preprocess-title {
  font-size: 13px;
  font-weight: 500;
  color: hsl(var(--foreground));
  margin-bottom: 8px;
}

.preprocess-options {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
  font-size: 12px;
}

.preview-actions {
  display: flex;
  gap: 8px;
}

.preview-col {
  position: relative;
}

/* 右侧预览 */
.preview-section {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.preview-section :deep(.ant-spin-nested-loading) {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.preview-section :deep(.ant-spin-container) {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.preview-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-bottom: 1px solid hsl(var(--border));
  flex-shrink: 0;
}

.preview-title {
  font-size: 13px;
  font-weight: 600;
  color: hsl(var(--foreground));
}

.preview-header :deep(.ant-tag) {
  margin: 0;
}

.preview-count {
  margin-left: auto;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.preview-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.preview-chunk {
  border-bottom: 1px solid hsl(var(--border));
  padding-bottom: 10px;
}

.preview-chunk:last-child {
  border-bottom: none;
}

.preview-chunk-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.preview-chunk-label {
  font-size: 12px;
  font-weight: 600;
  color: hsl(var(--foreground));
}

.preview-chunk-chars {
  font-size: 11px;
  color: hsl(var(--muted-foreground));
}

.preview-chunk-content {
  font-size: 12px;
  line-height: 1.6;
  color: hsl(var(--foreground));
  white-space: pre-wrap;
  word-break: break-word;
}

.preview-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  flex: 1;
  color: hsl(var(--muted-foreground));
  font-size: 13px;
}
</style>
