<script setup lang="ts">
import { ref, watch, computed } from 'vue';

import { createIconifyIcon } from '@vben/icons';

import type { BodyConfig, ParamItem } from '../../types';
import { createBodyConfig } from '../../types';
import ParamTable from '../../components/ParamTable.vue';
import { CodeEditor } from '#/components/code-editor';

// 图标
const FormatIcon = createIconifyIcon('lucide:align-left');

interface Props {
  body?: BodyConfig;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update', body: BodyConfig): void;
}>();

// 本地数据
const localBody = ref<BodyConfig>(createBodyConfig());

// 请求体类型选项 - 参考 Apifox 样式
const bodyTypeOptions = [
  { label: 'none', value: 'none' },
  { label: 'form-data', value: 'form-data' },
  { label: 'x-www-form-urlencoded', value: 'x-www-form-urlencoded' },
  { label: 'JSON', value: 'json' },
  { label: 'XML', value: 'xml' },
  { label: 'Text', value: 'text' },
  { label: 'Binary', value: 'binary' },
  { label: 'GraphQL', value: 'graphql' },
  { label: 'msgpack', value: 'msgpack' },
];

// 编辑器语言映射
const editorLanguage = computed(() => {
  switch (localBody.value.type) {
    case 'json':
    case 'msgpack':
      return 'json';
    case 'xml':
      return 'xml';
    case 'graphql':
      return 'graphql';
    default:
      return 'plaintext';
  }
});

// CodeEditor ref
const codeEditorRef = ref<InstanceType<typeof CodeEditor>>();

// 同步外部数据
watch(
  () => props.body,
  (newBody) => {
    if (newBody) {
      localBody.value = JSON.parse(JSON.stringify(newBody));
    } else {
      localBody.value = createBodyConfig();
    }
  },
  { immediate: true, deep: true }
);

// 触发更新
function emitUpdate() {
  emit('update', JSON.parse(JSON.stringify(localBody.value)));
}

// 更新类型
function updateType(type: string) {
  localBody.value.type = type as any;
  emitUpdate();
}

// 更新 form-data
function updateFormData(items: ParamItem[]) {
  localBody.value.formData = items;
  emitUpdate();
}

// 更新 urlencoded
function updateUrlencoded(items: ParamItem[]) {
  localBody.value.urlencoded = items;
  emitUpdate();
}

// 更新 raw 内容
function updateRaw(value: string) {
  localBody.value.raw = value;
  emitUpdate();
}

// 更新 GraphQL query
function updateGraphqlQuery(value: string) {
  if (!localBody.value.graphql) {
    localBody.value.graphql = { query: '', variables: '' };
  }
  localBody.value.graphql.query = value;
  emitUpdate();
}

// 更新 GraphQL variables
function updateGraphqlVariables(value: string) {
  if (!localBody.value.graphql) {
    localBody.value.graphql = { query: '', variables: '' };
  }
  localBody.value.graphql.variables = value;
  emitUpdate();
}

// 格式化代码
function handleFormat() {
  codeEditorRef.value?.formatCode();
}

function getPlaceholder(type: string): string {
  switch (type) {
    case 'json':
      return '{\n  "key": "value"\n}';
    case 'xml':
      return '<?xml version="1.0"?>\n<root></root>';
    case 'text':
      return '输入文本内容';
    default:
      return '';
  }
}
</script>

<template>
  <div class="body-panel">
    <!-- 类型选择器 - Apifox 风格单行布局 -->
    <div class="body-type-bar">
      <div class="body-type-selector">
        <button
          v-for="opt in bodyTypeOptions"
          :key="opt.value"
          class="type-btn"
          :class="{ active: localBody.type === opt.value }"
          @click="updateType(opt.value)"
        >
          {{ opt.label }}
        </button>
      </div>

      <!-- 格式化按钮 -->
      <div v-if="['json', 'xml', 'graphql'].includes(localBody.type)" class="body-actions">
        <button class="action-btn" title="格式化" @click="handleFormat">
          <FormatIcon class="size-4" />
          <span>格式化</span>
        </button>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="body-content">
      <!-- none -->
      <div v-if="localBody.type === 'none'" class="body-empty">
        <span class="empty-text">该请求没有请求体</span>
      </div>

      <!-- form-data -->
      <div v-else-if="localBody.type === 'form-data'">
        <ParamTable
          :items="localBody.formData || []"
          :show-type="true"
          :placeholder="{ key: '参数名', value: '参数值' }"
          @update="updateFormData"
        />
      </div>

      <!-- x-www-form-urlencoded -->
      <div v-else-if="localBody.type === 'x-www-form-urlencoded'">
        <ParamTable
          :items="localBody.urlencoded || []"
          :placeholder="{ key: '参数名', value: '参数值' }"
          @update="updateUrlencoded"
        />
      </div>

      <!-- JSON / XML / Text -->
      <div v-else-if="['json', 'xml', 'text'].includes(localBody.type)" class="raw-editor-wrapper">
        <CodeEditor
          ref="codeEditorRef"
          :model-value="localBody.raw || ''"
          :language="editorLanguage"
          :placeholder="getPlaceholder(localBody.type)"
          height="100%"
          @update:model-value="updateRaw"
        />
      </div>

      <!-- Binary -->
      <div v-else-if="localBody.type === 'binary'" class="body-binary">
        <span class="binary-text">二进制文件上传功能开发中...</span>
      </div>

      <!-- GraphQL - 左右并排布局 -->
      <div v-else-if="localBody.type === 'graphql'" class="graphql-editor">
        <div class="graphql-section">
          <div class="section-header">
            <span class="section-label">Query</span>
          </div>
          <div class="section-content">
            <CodeEditor
              :model-value="localBody.graphql?.query || ''"
              language="graphql"
              placeholder="输入 GraphQL 查询"
              height="100%"
              @update:model-value="updateGraphqlQuery"
            />
          </div>
        </div>
        <div class="graphql-divider" />
        <div class="graphql-section">
          <div class="section-header">
            <span class="section-label">Variables</span>
          </div>
          <div class="section-content">
            <CodeEditor
              :model-value="localBody.graphql?.variables || ''"
              language="json"
              placeholder='{"key": "value"}'
              height="100%"
              @update:model-value="updateGraphqlVariables"
            />
          </div>
        </div>
      </div>

      <!-- msgpack -->
      <div v-else-if="localBody.type === 'msgpack'" class="raw-editor-wrapper">
        <CodeEditor
          :model-value="localBody.raw || ''"
          language="json"
          placeholder="输入 JSON 格式数据"
          height="100%"
          @update:model-value="updateRaw"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.body-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 8px;
}

/* Apifox 风格的类型选择器 */
.body-type-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 0;
  border-bottom: 1px solid hsl(var(--border) / 50%);
  flex-shrink: 0;
}

.body-type-selector {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-wrap: wrap;
}

.type-btn {
  padding: 2px 8px;
  font-size: 12px;
  color: hsl(var(--foreground) / 65%);
  background: transparent;
  border: 1px solid transparent;
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
  line-height: 1.4;
}

.type-btn:hover {
  color: hsl(var(--foreground));
  background: hsl(var(--accent) / 50%);
}

.type-btn.active {
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 10%);
  border-color: hsl(var(--primary) / 30%);
  font-weight: 500;
}

.body-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  font-size: 12px;
  color: hsl(var(--foreground) / 60%);
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.action-btn:hover {
  color: hsl(var(--primary));
  background: hsl(var(--accent) / 50%);
}

.body-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.body-empty,
.body-binary {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 120px;
  color: hsl(var(--foreground) / 40%);
  font-size: 13px;
}

.raw-editor-wrapper {
  height: 100%;
}

/* GraphQL 左右并排布局 */
.graphql-editor {
  display: flex;
  flex-direction: row;
  height: 100%;
  gap: 0;
}

.graphql-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.graphql-divider {
  width: 1px;
  background: hsl(var(--border));
  flex-shrink: 0;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid hsl(var(--border) / 50%);
  flex-shrink: 0;
}

.section-content {
  flex: 1;
  min-height: 0;
}

.section-label {
  font-size: 12px;
  font-weight: 500;
  color: hsl(var(--foreground) / 70%);
}
</style>
