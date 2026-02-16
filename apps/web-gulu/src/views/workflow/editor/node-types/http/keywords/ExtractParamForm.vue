<script setup lang="ts">
import { ref, watch, computed } from 'vue';

import { createIconifyIcon } from '@vben/icons';
import { Input, InputNumber, Select, Tooltip } from 'ant-design-vue';

const SettingsIcon = createIconifyIcon('lucide:settings-2');

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

// 高级选项展开/折叠
const showAdvanced = ref(false);
</script>

<template>
  <div class="extract-param-form">
    <div class="inline-form">
      <Select
        :value="localConfig.extractType"
        :options="EXTRACT_TYPE_OPTIONS"
        placeholder="提取方式"
        size="small"
        class="field-type"
        @change="updateExtractType"
      />
      <Input
        :value="localConfig.expression"
        :placeholder="expressionPlaceholder"
        size="small"
        class="field-expr"
        @change="(e: any) => updateExpression(e.target.value)"
      />
      <Input
        :value="localConfig.variableName"
        placeholder="保存到变量"
        size="small"
        class="field-var"
        @change="(e: any) => updateVariableName(e.target.value)"
      />
      <Tooltip title="高级选项">
        <button
          class="advanced-btn"
          :class="{ active: showAdvanced }"
          @click="showAdvanced = !showAdvanced"
        >
          <SettingsIcon class="size-3.5" />
        </button>
      </Tooltip>
    </div>
    <div v-if="showAdvanced" class="advanced-row">
      <Tooltip title="-1 表示提取全部匹配结果">
        <InputNumber
          :value="localConfig.index"
          :min="-1"
          placeholder="索引: 0"
          size="small"
          class="field-index"
          @change="updateIndex"
        />
      </Tooltip>
      <Input
        :value="localConfig.defaultValue"
        placeholder="默认值（提取失败时使用）"
        size="small"
        class="field-default"
        @change="(e: any) => updateDefaultValue(e.target.value)"
      />
    </div>
  </div>
</template>

<style scoped>
.inline-form {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.field-type {
  min-width: 110px;
  flex-shrink: 0;
}

.field-expr {
  flex: 1;
  min-width: 120px;
}

.field-var {
  width: 130px;
  flex-shrink: 0;
}

.advanced-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 24px;
  border: 1px solid hsl(var(--border));
  border-radius: 4px;
  background: transparent;
  color: hsl(var(--foreground) / 50%);
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
}

.advanced-btn:hover {
  color: hsl(var(--foreground) / 80%);
  border-color: hsl(var(--primary) / 50%);
}

.advanced-btn.active {
  color: hsl(var(--primary));
  border-color: hsl(var(--primary) / 50%);
  background: hsl(var(--primary) / 8%);
}

.advanced-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
}

.field-index {
  width: 110px;
  flex-shrink: 0;
}

.field-default {
  flex: 1;
  min-width: 120px;
}
</style>
