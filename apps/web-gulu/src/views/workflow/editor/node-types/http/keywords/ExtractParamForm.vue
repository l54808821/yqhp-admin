<script setup lang="ts">
import { ref, watch, computed } from 'vue';

import { Form, Input, InputNumber, Select } from 'ant-design-vue';

import type { ExtractParamConfig } from '../../../types';
import {
  createExtractParamConfig,
  EXTRACT_TYPE_OPTIONS,
} from '../../../types';

interface Props {
  config: ExtractParamConfig;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update', config: ExtractParamConfig): void;
}>();

// 本地数据
const localConfig = ref<ExtractParamConfig>(createExtractParamConfig());

// 同步外部数据
watch(
  () => props.config,
  (newConfig) => {
    if (newConfig) {
      localConfig.value = JSON.parse(JSON.stringify(newConfig));
    } else {
      localConfig.value = createExtractParamConfig();
    }
  },
  { immediate: true, deep: true }
);

// 触发更新
function emitUpdate() {
  emit('update', JSON.parse(JSON.stringify(localConfig.value)));
}

// 表达式占位符
const expressionPlaceholder = computed(() => {
  switch (localConfig.value.extractType) {
    case 'jsonpath':
      return '$.data.id';
    case 'xpath':
      return '//div[@class="content"]/text()';
    case 'regex':
      return '"id":\\s*"([^"]+)"';
    case 'header':
      return 'Content-Type';
    case 'cookie':
      return 'session_id';
    default:
      return '';
  }
});

// 表达式标签
const expressionLabel = computed(() => {
  switch (localConfig.value.extractType) {
    case 'jsonpath':
      return 'JSONPath 表达式';
    case 'xpath':
      return 'XPath 表达式';
    case 'regex':
      return '正则表达式';
    case 'header':
      return '响应头名称';
    case 'cookie':
      return 'Cookie 名称';
    default:
      return '表达式';
  }
});

// 更新提取类型
function updateExtractType(value: string) {
  localConfig.value.extractType = value as any;
  emitUpdate();
}

// 更新表达式
function updateExpression(value: string) {
  localConfig.value.expression = value;
  emitUpdate();
}

// 更新变量名
function updateVariableName(value: string) {
  localConfig.value.variableName = value;
  emitUpdate();
}

// 更新索引
function updateIndex(value: number | null) {
  localConfig.value.index = value ?? 0;
  emitUpdate();
}

// 更新默认值
function updateDefaultValue(value: string) {
  localConfig.value.defaultValue = value;
  emitUpdate();
}
</script>

<template>
  <div class="extract-param-form">
    <Form layout="vertical" size="small">
      <div class="form-row">
        <Form.Item label="提取方式" class="form-item">
          <Select
            :value="localConfig.extractType"
            :options="EXTRACT_TYPE_OPTIONS"
            @change="updateExtractType"
          />
        </Form.Item>
        <Form.Item label="保存到变量" class="form-item">
          <Input
            :value="localConfig.variableName"
            placeholder="变量名"
            @change="(e: any) => updateVariableName(e.target.value)"
          />
        </Form.Item>
      </div>

      <Form.Item :label="expressionLabel">
        <Input
          :value="localConfig.expression"
          :placeholder="expressionPlaceholder"
          @change="(e: any) => updateExpression(e.target.value)"
        />
      </Form.Item>

      <div class="form-row">
        <Form.Item label="匹配索引" class="form-item">
          <InputNumber
            :value="localConfig.index"
            :min="-1"
            placeholder="0"
            class="full-width"
            @change="updateIndex"
          />
          <div class="form-hint">-1 表示提取全部匹配结果</div>
        </Form.Item>
        <Form.Item label="默认值" class="form-item">
          <Input
            :value="localConfig.defaultValue"
            placeholder="提取失败时使用的默认值"
            @change="(e: any) => updateDefaultValue(e.target.value)"
          />
        </Form.Item>
      </div>
    </Form>
  </div>
</template>

<style scoped>
.extract-param-form {
  max-width: 500px;
}

.form-row {
  display: flex;
  gap: 12px;
}

.form-item {
  flex: 1;
  margin-bottom: 12px;
}

.full-width {
  width: 100%;
}

.form-hint {
  margin-top: 4px;
  font-size: 11px;
  color: hsl(var(--foreground) / 50%);
}

:deep(.ant-form-item) {
  margin-bottom: 12px;
}

:deep(.ant-form-item-label) {
  padding-bottom: 4px;
}

:deep(.ant-form-item-label > label) {
  font-size: 12px;
  color: hsl(var(--foreground) / 70%);
}
</style>
