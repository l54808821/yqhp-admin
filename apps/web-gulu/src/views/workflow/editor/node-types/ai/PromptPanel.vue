<script setup lang="ts">
/**
 * 提示词面板：系统提示词 + 用户提示词
 * 使用本地 ref 缓冲输入，避免父组件重渲染导致编辑中的内容被重置
 */
import { ref, watch } from 'vue';

import { Form } from 'ant-design-vue';

import type { AIConfig } from './types';
import VariableTextarea from '../../components/VariableTextarea.vue';

interface Props {
  config: AIConfig;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update', patch: Partial<AIConfig>): void;
}>();

const localSystemPrompt = ref(props.config.system_prompt);
const localPrompt = ref(props.config.prompt);

watch(
  () => props.config.system_prompt,
  (val) => {
    localSystemPrompt.value = val;
  },
);

watch(
  () => props.config.prompt,
  (val) => {
    localPrompt.value = val;
  },
);
</script>

<template>
  <Form layout="vertical" class="config-form">
    <Form.Item label="系统提示词">
      <VariableTextarea
        v-model:value="localSystemPrompt"
        :rows="4"
        placeholder="设置 AI 的基础角色和行为（Skill 能力在「工具」标签页配置）"
        @blur="emit('update', { system_prompt: localSystemPrompt })"
      />
    </Form.Item>
    <Form.Item label="用户提示词" required>
      <VariableTextarea
        v-model:value="localPrompt"
        :rows="6"
        placeholder="支持 ${variable} 格式引用变量"
        @blur="emit('update', { prompt: localPrompt })"
      />
    </Form.Item>
  </Form>
</template>

<style scoped>
.config-form {
  padding-top: 0;
}
</style>
