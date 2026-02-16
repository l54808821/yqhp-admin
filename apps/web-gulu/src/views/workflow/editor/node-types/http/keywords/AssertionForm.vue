<script setup lang="ts">
import { ref, watch, computed } from 'vue';

import { Input, Select } from 'ant-design-vue';

import type { AssertionConfig } from '../../../types';
import {
  createAssertionConfig,
  ASSERTION_TYPE_OPTIONS,
  COMPARISON_OPERATOR_OPTIONS,
} from '../../../types';

interface Props {
  config: AssertionConfig;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update', config: AssertionConfig): void;
}>();

// 本地数据
const localConfig = ref<AssertionConfig>(createAssertionConfig());

// 同步外部数据
watch(
  () => props.config,
  (newConfig) => {
    if (newConfig) {
      localConfig.value = JSON.parse(JSON.stringify(newConfig));
    } else {
      localConfig.value = createAssertionConfig();
    }
  },
  { immediate: true, deep: true }
);

// 触发更新
function emitUpdate() {
  emit('update', JSON.parse(JSON.stringify(localConfig.value)));
}

// 是否需要显示表达式输入
const showExpression = computed(() => {
  return ['jsonpath', 'header'].includes(localConfig.value.assertType);
});

// 是否需要显示期望值输入
const showExpected = computed(() => {
  return !['empty', 'not_empty'].includes(localConfig.value.operator);
});

// 表达式占位符
const expressionPlaceholder = computed(() => {
  switch (localConfig.value.assertType) {
    case 'jsonpath':
      return '$.data.id';
    case 'header':
      return 'Content-Type';
    default:
      return '';
  }
});

// 期望值占位符
const expectedPlaceholder = computed(() => {
  switch (localConfig.value.assertType) {
    case 'status_code':
      return '200';
    case 'response_time':
      return '1000';
    case 'jsonpath':
      return '期望值，支持变量 ${var}';
    default:
      return '期望值';
  }
});

// 更新断言类型
function updateAssertType(value: string) {
  localConfig.value.assertType = value as any;
  // 重置表达式
  if (!showExpression.value) {
    localConfig.value.expression = undefined;
  }
  emitUpdate();
}

// 更新操作符
function updateOperator(value: string) {
  localConfig.value.operator = value as any;
  // 重置期望值
  if (!showExpected.value) {
    localConfig.value.expected = undefined;
  }
  emitUpdate();
}

// 更新表达式
function updateExpression(value: string) {
  localConfig.value.expression = value;
  emitUpdate();
}

// 更新期望值
function updateExpected(value: string) {
  localConfig.value.expected = value;
  emitUpdate();
}
</script>

<template>
  <div class="assertion-form">
    <div class="inline-form">
      <Select
        :value="localConfig.assertType"
        :options="ASSERTION_TYPE_OPTIONS"
        placeholder="断言类型"
        size="small"
        class="field-select"
        @change="updateAssertType"
      />
      <Select
        :value="localConfig.operator"
        :options="COMPARISON_OPERATOR_OPTIONS"
        placeholder="比较方式"
        size="small"
        class="field-select"
        @change="updateOperator"
      />
      <Input
        v-if="showExpression"
        :value="localConfig.expression"
        :placeholder="expressionPlaceholder"
        size="small"
        class="field-input"
        @change="(e: any) => updateExpression(e.target.value)"
      />
      <Input
        v-if="showExpected"
        :value="localConfig.expected"
        :placeholder="expectedPlaceholder"
        size="small"
        class="field-input"
        @change="(e: any) => updateExpected(e.target.value)"
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

.field-select {
  min-width: 120px;
  flex-shrink: 0;
}

.field-input {
  flex: 1;
  min-width: 100px;
}
</style>
