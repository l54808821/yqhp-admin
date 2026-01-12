<script setup lang="ts">
import { ref, watch } from 'vue';

import { Form, InputNumber, Slider } from 'ant-design-vue';

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
    <Form layout="vertical" size="small">
      <Form.Item label="等待时间 (毫秒)">
        <div class="duration-input">
          <Slider
            :value="localConfig.duration"
            :min="0"
            :max="30000"
            :step="100"
            class="duration-slider"
            @change="updateDuration"
          />
          <InputNumber
            :value="localConfig.duration"
            :min="0"
            :max="300000"
            :step="100"
            class="duration-number"
            @change="updateDuration"
          />
        </div>
        <div class="duration-hint">
          {{ (localConfig.duration / 1000).toFixed(1) }} 秒
        </div>
      </Form.Item>
    </Form>
  </div>
</template>


<style scoped>
.wait-form {
  max-width: 400px;
}

.duration-input {
  display: flex;
  align-items: center;
  gap: 16px;
}

.duration-slider {
  flex: 1;
}

.duration-number {
  width: 120px;
}

.duration-hint {
  margin-top: 8px;
  font-size: 12px;
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
