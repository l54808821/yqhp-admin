<script setup lang="ts">
import { ref, watch, computed } from 'vue';

import { Form, Input, Select } from 'ant-design-vue';

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
    <Form layout="vertical" size="small">
      <div class="form-row">
        <Form.Item label="断言类型" class="form-item">
          <Select
            :value="localConfig.assertType"
            :options="ASSERTION_TYPE_OPTIONS"
            @change="updateAssertType"
          />
        </Form.Item>
        <Form.Item label="比较方式" class="form-item">
          <Select
            :value="localConfig.operator"
            :options="COMPARISON_OPERATOR_OPTIONS"
            @change="updateOperator"
          />
        </Form.Item>
      </div>

      <Form.Item v-if="showExpression" label="表达式">
        <Input
          :value="localConfig.expression"
          :placeholder="expressionPlaceholder"
          @change="(e: any) => updateExpression(e.target.value)"
        />
      </Form.Item>

      <Form.Item v-if="showExpected" label="期望值">
        <Input
          :value="localConfig.expected"
          :placeholder="expectedPlaceholder"
          @change="(e: any) => updateExpected(e.target.value)"
        />
      </Form.Item>
    </Form>
  </div>
</template>

<style scoped>
.assertion-form {
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
