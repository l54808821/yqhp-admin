<script setup lang="ts">
/**
 * 文档上传向导 — Dify 风格三步骤
 * Step 1: 选择数据源（上传文件）
 * Step 2: 文本分段与清洗（配置参数 + 实时预览分块）
 * Step 3: 处理完成
 */
import type { KnowledgeBase, KnowledgeDocument, PreviewChunkItem } from '#/api/knowledge-base';

import { ref } from 'vue';

import {
  Button,
  Checkbox,
  Col,
  Drawer,
  Form,
  Input,
  InputNumber,
  message,
  Result,
  Row,
  Spin,
  Steps,
  Tag,
  Upload,
} from 'ant-design-vue';
import { FileText, Upload as UploadIcon } from 'lucide-vue-next';

import {
  previewDocumentChunksApi,
  processDocumentApi,
  uploadKnowledgeDocumentApi,
} from '#/api/knowledge-base';

interface Props {
  kb: KnowledgeBase;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'done'): void;
}>();

const visible = ref(false);
const currentStep = ref(0);

// Step 1 - 上传
const uploadLoading = ref(false);
const uploadedDoc = ref<KnowledgeDocument | null>(null);

// Step 2 - 分段设置
const chunkSettings = ref({
  separator: '\\n\\n',
  chunk_size: props.kb.chunk_size || 1024,
  chunk_overlap: props.kb.chunk_overlap || 50,
  clean_whitespace: true,
  remove_urls: false,
});
const previewChunks = ref<PreviewChunkItem[]>([]);
const previewLoading = ref(false);
const hasPreview = ref(false);

// Step 3 - 处理
const processing = ref(false);
const processComplete = ref(false);

function open() {
  visible.value = true;
  currentStep.value = 0;
  uploadedDoc.value = null;
  previewChunks.value = [];
  hasPreview.value = false;
  processComplete.value = false;
  chunkSettings.value = {
    separator: '\\n\\n',
    chunk_size: props.kb.chunk_size || 1024,
    chunk_overlap: props.kb.chunk_overlap || 50,
    clean_whitespace: true,
    remove_urls: false,
  };
}

// Step 1: 上传文件
async function handleUpload(info: any) {
  const file = info.file;
  if (!file) return;

  uploadLoading.value = true;
  try {
    // 上传到后端
    const doc = await uploadKnowledgeDocumentApi(props.kb.id, file);
    uploadedDoc.value = doc;
    message.success('文件上传成功');
    currentStep.value = 1;
  } catch (e: any) {
    message.error('上传失败: ' + (e.message || '未知错误'));
  } finally {
    uploadLoading.value = false;
  }
}

// Step 2: 预览分块
async function handlePreview() {
  if (!uploadedDoc.value) {
    message.warning('请先上传文档');
    return;
  }

  previewLoading.value = true;
  try {
    const res = await previewDocumentChunksApi(props.kb.id, {
      document_id: uploadedDoc.value.id,
      chunk_setting: {
        separator: chunkSettings.value.separator,
        chunk_size: chunkSettings.value.chunk_size,
        chunk_overlap: chunkSettings.value.chunk_overlap,
        clean_whitespace: chunkSettings.value.clean_whitespace,
        remove_urls: chunkSettings.value.remove_urls,
      },
    });
    previewChunks.value = res || [];
    hasPreview.value = true;
  } catch (e: any) {
    message.error('预览失败: ' + (e.message || '未知错误'));
  } finally {
    previewLoading.value = false;
  }
}

// Step 2: 确认并处理
async function handleProcess() {
  if (!uploadedDoc.value) return;

  processing.value = true;
  try {
    await processDocumentApi(props.kb.id, uploadedDoc.value.id, {
      chunk_setting: {
        separator: chunkSettings.value.separator,
        chunk_size: chunkSettings.value.chunk_size,
        chunk_overlap: chunkSettings.value.chunk_overlap,
        clean_whitespace: chunkSettings.value.clean_whitespace,
        remove_urls: chunkSettings.value.remove_urls,
      },
    });
    currentStep.value = 2;
    processComplete.value = true;
  } catch (e: any) {
    message.error('处理失败: ' + (e.message || '未知错误'));
  } finally {
    processing.value = false;
  }
}

function handleFinish() {
  visible.value = false;
  emit('done');
}

defineExpose({ open });
</script>

<template>
  <Drawer
    v-model:open="visible"
    title="添加文档"
    :width="960"
    :destroyOnClose="true"
    :closable="currentStep < 2"
    :maskClosable="currentStep < 2"
  >
    <!-- Steps 导航 -->
    <Steps :current="currentStep" class="wizard-steps">
      <Steps.Step title="选择数据源" />
      <Steps.Step title="文本分段与清洗" />
      <Steps.Step title="处理并完成" />
    </Steps>

    <!-- Step 1: 上传 -->
    <div v-if="currentStep === 0" class="wizard-step">
      <div class="upload-area">
        <Upload.Dragger
          :showUploadList="false"
          :beforeUpload="() => false"
          accept=".pdf,.txt,.md,.docx,.doc,.html,.csv,.json"
          @change="handleUpload"
        >
          <Spin :spinning="uploadLoading">
            <div class="upload-content">
              <UploadIcon :size="40" class="upload-icon" />
              <p class="upload-title">拖放文件到此处，或点击上传</p>
              <p class="upload-hint">
                支持 PDF、TXT、Markdown、Word、HTML、CSV、JSON 格式
              </p>
            </div>
          </Spin>
        </Upload.Dragger>
      </div>
    </div>

    <!-- Step 2: 分段设置 + 预览 -->
    <div v-if="currentStep === 1" class="wizard-step">
      <Row :gutter="20" class="step2-layout">
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
                    <Input v-model:value="chunkSettings.separator" />
                  </Form.Item>
                </Col>
                <Col :span="8">
                  <Form.Item label="分段最大长度">
                    <InputNumber
                      v-model:value="chunkSettings.chunk_size"
                      :min="100"
                      :max="5000"
                      style="width: 100%"
                    />
                  </Form.Item>
                </Col>
                <Col :span="8">
                  <Form.Item label="分段重叠长度">
                    <InputNumber
                      v-model:value="chunkSettings.chunk_overlap"
                      :min="0"
                      :max="500"
                      style="width: 100%"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <div class="preprocess-title">文本预处理规则</div>
              <div class="preprocess-options">
                <Checkbox v-model:checked="chunkSettings.clean_whitespace">
                  替换连续的空格、换行符和制表符
                </Checkbox>
                <Checkbox v-model:checked="chunkSettings.remove_urls">
                  删除所有 URL 和电子邮件地址
                </Checkbox>
              </div>
            </Form>

            <div class="preview-actions">
              <Button @click="handlePreview" :loading="previewLoading">
                预览块
              </Button>
              <Button @click="chunkSettings = { separator: '\\n\\n', chunk_size: props.kb.chunk_size || 1024, chunk_overlap: props.kb.chunk_overlap || 50, clean_whitespace: true, remove_urls: false }; hasPreview = false">
                重置
              </Button>
            </div>
          </div>
        </Col>

        <!-- 右侧：预览 -->
        <Col :span="14">
          <div class="preview-section">
            <div class="preview-header">
              <span class="preview-title">预览</span>
              <Tag v-if="uploadedDoc" color="blue" size="small">
                {{ uploadedDoc.name }}
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
    </div>

    <!-- Step 3: 处理完成 -->
    <div v-if="currentStep === 2" class="wizard-step">
      <Result
        status="success"
        title="文档已上传"
        :sub-title="`文档已上传至知识库：${props.kb.name}，你可以在知识库的文档列表中找到它。`"
      >
        <template #extra>
          <div class="complete-info">
            <div class="complete-doc">
              <FileText :size="16" />
              <span>{{ uploadedDoc?.name }}</span>
              <Tag color="green" size="small">嵌入处理中</Tag>
            </div>
            <div class="complete-params">
              <div class="param-row">
                <span class="param-label">分段模式</span>
                <span>自定义</span>
              </div>
              <div class="param-row">
                <span class="param-label">最大分段长度</span>
                <span>{{ chunkSettings.chunk_size }}</span>
              </div>
              <div class="param-row">
                <span class="param-label">文本预处理规则</span>
                <span>{{ chunkSettings.clean_whitespace ? '替换连续空格/换行符/制表符' : '无' }}</span>
              </div>
            </div>
          </div>
          <Button type="primary" @click="handleFinish">
            前往文档
          </Button>
        </template>
      </Result>
    </div>

    <!-- Footer -->
    <template #footer>
      <div v-if="currentStep === 1" class="wizard-footer">
        <Button @click="currentStep = 0">上一步</Button>
        <Button
          type="primary"
          :loading="processing"
          @click="handleProcess"
        >
          保存并处理
        </Button>
      </div>
    </template>
  </Drawer>
</template>

<style scoped>
.wizard-steps {
  margin-bottom: 24px;
}

.wizard-step {
  min-height: 400px;
}

/* Step 1: 上传 */
.upload-area {
  max-width: 600px;
  margin: 40px auto;
}

.upload-content {
  padding: 40px 20px;
  text-align: center;
}

.upload-icon {
  color: hsl(var(--primary));
  margin-bottom: 12px;
}

.upload-title {
  font-size: 15px;
  font-weight: 500;
  color: hsl(var(--foreground));
  margin-bottom: 4px;
}

.upload-hint {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

/* Step 2: 分段设置 */
.step2-layout {
  height: 100%;
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

/* 右侧预览 */
.preview-section {
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
  height: 300px;
  color: hsl(var(--muted-foreground));
  font-size: 13px;
}

/* Step 3: 完成 */
.complete-info {
  text-align: left;
  max-width: 400px;
  margin: 0 auto 20px;
}

.complete-doc {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 13px;
}

.complete-doc :deep(.ant-tag) {
  margin: 0;
  margin-left: auto;
}

.complete-params {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.param-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
}

.param-label {
  color: hsl(var(--muted-foreground));
}

/* Footer */
.wizard-footer {
  display: flex;
  justify-content: space-between;
}
</style>
