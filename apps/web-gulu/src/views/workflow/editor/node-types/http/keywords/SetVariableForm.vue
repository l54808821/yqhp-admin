<script setup lang="ts">
import { ref, watch } from 'vue';

import { Form, Input, Select } from 'ant-design-vue';

import type { SetVariableConfig } from '../../../types';
import {
  createSetVariableConfig,
  VARIABLE_SCOPE_OPTIONS,
} from '../../../types';

interface Props {
  config: SetVariableConfig;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update', config: SetVariableConfig): void;
}>();

// 本地数据
const localConfig = ref<SetVariableConfig>(createSetVariableConfig());

// 同步外部数据
watch(
  () => props.config,
  (newConfig) => {
    if (newConfig) {
      localConfig.value = JSON.parse(JSON.stringify(newConfig));
    } else {
      localConfig.value = createSetVariableConfig();
    }
  },
  { immediate: true, deep: true }
);

// 触发更新
function emitUpdate() {
  emit('update', JSON.parse(JSON.stringify(localConfig.value)));
}

// 更新变量名
function updateVariableName(value: string) {
  localConfig.value.variableName = value;
  emitUpdate();
}

// 更新值
function updateValue(value: string) {
  localConfig.value.value = value;
  emitUpdate();
}

// 更新作用域
function updateScope(value: string) {
  localConfig.value.scope = value as 'temp' | 'env';
  emitUpdate();
}
</script>

<template>
  <div class="set-variable-form">
    <Form layout="vertical" size="small">
      <div class="form-row">
        <Form.Item label="变量名" class="form-item">
          <Input
            :value="localConfig.variableName"
            placeholder="输入变量名"
            @change="(e: any) => updateVariableName(e.target.value)"
          />
        </Form.Item>
        <Form.Item label="作用域" class="form-item-small">
          <Select
            :value="localConfig.scope"
            :options="VARIABLE_SCOPE_OPTIONS"
            @change="updateScope"
          />
        </Form.Item>
      </div>

      <Form.Item label="变量值">
        <Input.TextArea
          :value="localConfig.value"
          placeholder="输入变量值，支持变量 ${var}"
          :rows="3"
          @change="(e: any) => updateValue(e.target.value)"
        />
      </Form.Item>
    </Form>

    <div class="form-tips">
      <div class="tip-item">
        <span class="tip-label">临时变量：</span>
        <span class="tip-text">仅在当前执行中有效</span>
      </div>
      <div class="tip-item">
        <span class="tip-label">环境变量：</span>
        <span class="tip-text">保存到当前环境，后续执行可用</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.set-variable-form {
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

.form-item-small {
  width: 140px;
  flex-shrink: 0;
  margin-bottom: 12px;
}

.form-tips {
  margin-top: 12px;
  padding: 8px 12px;
  background: hsl(var(--accent) / 30%);
  border-radius: 6px;
}

.tip-item {
  font-size: 12px;
  line-height: 1.8;
}

.tip-label {
  color: hsl(var(--foreground) / 70%);
}

.tip-text {
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
