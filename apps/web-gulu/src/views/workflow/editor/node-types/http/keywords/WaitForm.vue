<script setup lang="ts">
import { ref, watch } from 'vue';

import { InputNumber } from 'ant-design-vue';

import type { WaitConfig } from '../../../types';
import { createWaitConfig } from '../../../types';

interface Props {
  config: WaitConfig;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update', config: WaitConfig): void;
}>();

// 本地数据
const localConfig = ref<WaitConfig>(createWaitConfig());

// 同步外部数据
watch(
  () => props.config,
  (newConfig) => {
    if (newConfig) {
      localConfig.value = JSON.parse(JSON.stringify(newConfig));
    } else {
      localConfig.value = createWaitConfig();
    }
  },
  { immediate: true, deep: true }
);

// 触发更新
function emitUpdate() {
  emit('update', JSON.parse(JSON.stringify(localConfig.value)));
}

// 更新等待时间
function updateDuration(value: number | null) {
  localConfig.value.duration = value ?? 1000;
  emitUpdate();
}
</script>

<template>
  <div class="wait-form">
    <div class="inline-form">
      <span class="field-label">等待</span>
      <InputNumber
        :value="localConfig.duration"
        :min="0"
        :max="300000"
        :step="100"
        size="small"
        class="field-number"
        @change="updateDuration"
      />
      <span class="field-unit">ms ({{ (localConfig.duration / 1000).toFixed(1) }}s)</span>
    </div>
  </div>
</template>


<style scoped>
.inline-form {
  display: flex;
  align-items: center;
  gap: 8px;
}

.field-label {
  font-size: 13px;
  color: hsl(var(--foreground) / 70%);
  flex-shrink: 0;
}

.field-number {
  width: 120px;
}

.field-unit {
  font-size: 12px;
  color: hsl(var(--foreground) / 50%);
  flex-shrink: 0;
}
</style>
