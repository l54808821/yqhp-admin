<script setup lang="ts">
/**
 * 模型参数面板：Temperature / Max Tokens / Top P
 */
import { Form, InputNumber, Slider } from 'ant-design-vue';

import type { AIConfig } from './types';

interface Props {
  config: AIConfig;
}

defineProps<Props>();

const emit = defineEmits<{
  (e: 'update', patch: Partial<AIConfig>): void;
}>();
</script>

<template>
  <Form layout="vertical" class="config-form">
    <Form.Item label="Temperature">
      <div class="slider-row">
        <Slider
          :value="config.temperature"
          :min="0"
          :max="2"
          :step="0.1"
          class="slider"
          @change="(val: any) => emit('update', { temperature: val })"
        />
        <InputNumber
          :value="config.temperature"
          :min="0"
          :max="2"
          :step="0.1"
          :precision="1"
          class="slider-input"
          @change="(val: any) => emit('update', { temperature: val })"
        />
      </div>
      <div class="param-hint">
        控制输出的随机性。较低的值使输出更确定，较高的值使输出更多样化。
      </div>
    </Form.Item>

    <Form.Item label="Max Tokens">
      <InputNumber
        :value="config.max_tokens"
        :min="1"
        :max="128000"
        style="width: 100%"
        @change="(val: any) => emit('update', { max_tokens: val })"
      />
      <div class="param-hint">生成的最大 token 数量。</div>
    </Form.Item>

    <Form.Item label="Top P">
      <div class="slider-row">
        <Slider
          :value="config.top_p"
          :min="0"
          :max="1"
          :step="0.05"
          class="slider"
          @change="(val: any) => emit('update', { top_p: val })"
        />
        <InputNumber
          :value="config.top_p"
          :min="0"
          :max="1"
          :step="0.05"
          :precision="2"
          class="slider-input"
          @change="(val: any) => emit('update', { top_p: val })"
        />
      </div>
    </Form.Item>
  </Form>
</template>

<style scoped>
.config-form {
  padding-top: 0;
}

.slider-row {
  display: flex;
  gap: 12px;
  align-items: center;
}

.slider {
  flex: 1;
}

.slider-input {
  width: 80px;
}

.param-hint {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}
</style>
