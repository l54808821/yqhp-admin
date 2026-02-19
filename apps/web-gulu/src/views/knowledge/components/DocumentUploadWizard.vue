<script setup lang="ts">
/**
 * 文档上传向导 — Dify 风格三步骤
 * Step 1: 选择数据源（上传文件）
 * Step 2: 文本分段与清洗（配置参数 + 实时预览分块）
 * Step 3: 处理完成
 */
import type { ChunkSetting, KnowledgeBase, KnowledgeDocument } from '#/api/knowledge-base';

import { ref } from 'vue';

import {
  Button,
  Drawer,
  message,
  Result,
  Spin,
  Steps,
  Tag,
  Upload,
} from 'ant-design-vue';
import { FileText, Upload as UploadIcon } from 'lucide-vue-next';

import {
  processDocumentApi,
  uploadKnowledgeDocumentApi,
} from '#/api/knowledge-base';

import ChunkSettingPanel from './ChunkSettingPanel.vue';

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
const chunkSettings = ref<ChunkSetting>({
  separator: '\\n\\n',
  chunk_size: props.kb.chunk_size || 1024,
  chunk_overlap: props.kb.chunk_overlap || 50,
  clean_whitespace: true,
  remove_urls: false,
});
const chunkPanelRef = ref<InstanceType<typeof ChunkSettingPanel>>();

// Step 3 - 处理
const processing = ref(false);
const processComplete = ref(false);

function open() {
  visible.value = true;
  currentStep.value = 0;
  uploadedDoc.value = null;
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

// Step 2: 确认并处理
async function handleProcess() {
  if (!uploadedDoc.value) return;

  processing.value = true;
  try {
    await processDocumentApi(props.kb.id, uploadedDoc.value.id, {
      chunk_setting: { ...chunkSettings.value },
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
      <ChunkSettingPanel
        ref="chunkPanelRef"
        v-model:settings="chunkSettings"
        :kb-id="props.kb.id"
        :document-id="uploadedDoc?.id ?? 0"
        :document-name="uploadedDoc?.name"
        :default-chunk-size="props.kb.chunk_size || 1024"
        :default-chunk-overlap="props.kb.chunk_overlap || 50"
      />
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
