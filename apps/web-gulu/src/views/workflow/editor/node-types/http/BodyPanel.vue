<script setup lang="ts">
import { ref, watch } from 'vue';

import { Input, Radio, RadioGroup } from 'ant-design-vue';

import type { BodyConfig, ParamItem } from '../../types';
import { createBodyConfig } from '../../types';
import ParamTable from '../../components/ParamTable.vue';

interface Props {
  body?: BodyConfig;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update', body: BodyConfig): void;
}>();

// 本地数据
const localBody = ref<BodyConfig>(createBodyConfig());

// 请求体类型选项
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
</script>

<template>
  <div class="body-panel">
    <!-- 类型选择器 -->
    <div class="body-type-selector">
      <RadioGroup
        :value="localBody.type"
        size="small"
        @change="(e: any) => updateType(e.target.value)"
      >
        <Radio
          v-for="opt in bodyTypeOptions"
          :key="opt.value"
          :value="opt.value"
          class="body-type-radio"
        >
          {{ opt.label }}
        </Radio>
      </RadioGroup>
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
      <div v-else-if="['json', 'xml', 'text'].includes(localBody.type)">
        <Input.TextArea
          :value="localBody.raw"
          :placeholder="getPlaceholder(localBody.type)"
          :rows="10"
          class="raw-editor"
          @change="(e: any) => updateRaw(e.target.value)"
        />
      </div>

      <!-- Binary -->
      <div v-else-if="localBody.type === 'binary'" class="body-binary">
        <span class="binary-text">二进制文件上传功能开发中...</span>
      </div>

      <!-- GraphQL -->
      <div v-else-if="localBody.type === 'graphql'" class="graphql-editor">
        <div class="graphql-section">
          <div class="section-label">Query</div>
          <Input.TextArea
            :value="localBody.graphql?.query"
            placeholder="输入 GraphQL 查询"
            :rows="6"
            @change="(e: any) => updateGraphqlQuery(e.target.value)"
          />
        </div>
        <div class="graphql-section">
          <div class="section-label">Variables (JSON)</div>
          <Input.TextArea
            :value="localBody.graphql?.variables"
            placeholder='{"key": "value"}'
            :rows="4"
            @change="(e: any) => updateGraphqlVariables(e.target.value)"
          />
        </div>
      </div>

      <!-- msgpack -->
      <div v-else-if="localBody.type === 'msgpack'" class="body-msgpack">
        <Input.TextArea
          :value="localBody.raw"
          placeholder="输入 JSON 格式数据，将自动转换为 msgpack"
          :rows="10"
          class="raw-editor"
          @change="(e: any) => updateRaw(e.target.value)"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
function getPlaceholder(type: string): string {
  switch (type) {
    case 'json':
      return '{\n  "key": "value"\n}';
    case 'xml':
      return '<?xml version="1.0" encoding="UTF-8"?>\n<root>\n  <element>value</element>\n</root>';
    case 'text':
      return '输入文本内容';
    default:
      return '';
  }
}
</script>

<style scoped>
.body-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.body-type-selector {
  padding: 8px 0;
  border-bottom: 1px solid hsl(var(--border) / 50%);
}

.body-type-radio {
  margin-right: 0;
  padding: 4px 12px;
  border-radius: 4px;
}

.body-type-radio:hover {
  background: hsl(var(--accent) / 30%);
}

:deep(.ant-radio-wrapper-checked) {
  background: hsl(var(--primary) / 10%);
  color: hsl(var(--primary));
}

.body-content {
  flex: 1;
  min-height: 200px;
}

.body-empty,
.body-binary {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: hsl(var(--foreground) / 50%);
}

.raw-editor {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
}

.raw-editor :deep(.ant-input) {
  border-radius: 6px;
}

.graphql-editor {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.graphql-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-label {
  font-size: 12px;
  font-weight: 500;
  color: hsl(var(--foreground) / 70%);
}
</style>
