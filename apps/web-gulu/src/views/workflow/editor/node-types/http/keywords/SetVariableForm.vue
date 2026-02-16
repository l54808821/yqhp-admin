<script setup lang="ts">
import { ref, watch } from 'vue';

import { Input, Select, Tooltip } from 'ant-design-vue';

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
    <div class="inline-form">
      <Input
        :value="localConfig.variableName"
        placeholder="变量名"
        size="small"
        class="field-name"
        @change="(e: any) => updateVariableName(e.target.value)"
      />
      <Tooltip title="临时变量：仅在当前执行中有效；环境变量：保存到当前环境，后续执行可用">
        <Select
          :value="localConfig.scope"
          :options="VARIABLE_SCOPE_OPTIONS"
          size="small"
          class="field-scope"
          @change="updateScope"
        />
      </Tooltip>
      <Input
        :value="localConfig.value"
        placeholder="变量值，支持 ${var}"
        size="small"
        class="field-value"
        @change="(e: any) => updateValue(e.target.value)"
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

.field-name {
  width: 140px;
  flex-shrink: 0;
}

.field-scope {
  width: 110px;
  flex-shrink: 0;
}

.field-value {
  flex: 1;
  min-width: 120px;
}
</style>
