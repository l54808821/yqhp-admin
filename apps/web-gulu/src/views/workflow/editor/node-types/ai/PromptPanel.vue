<script setup lang="ts">
/**
 * 提示词面板：系统提示词 + 用户提示词
 */
import { Form, Input } from 'ant-design-vue';

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
    <Form.Item label="系统提示词">
      <Input.TextArea
        :value="config.system_prompt"
        :rows="4"
        placeholder="设置 AI 的角色和行为"
        @blur="(e: any) => emit('update', { system_prompt: e.target.value })"
      />
    </Form.Item>
    <Form.Item label="用户提示词" required>
      <Input.TextArea
        :value="config.prompt"
        :rows="6"
        placeholder="支持 ${variable} 格式引用变量"
        @blur="(e: any) => emit('update', { prompt: e.target.value })"
      />
    </Form.Item>
  </Form>
</template>

<style scoped>
.config-form {
  padding-top: 0;
}
</style>
