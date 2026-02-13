<script setup lang="ts">
/**
 * 执行模式面板：流式输出 + 人机交互配置
 */
import { ref, watch } from 'vue';

import { Collapse, Form, Input, InputNumber, Select, Switch } from 'ant-design-vue';

import type { AIConfig } from './types';

interface Props {
  config: AIConfig;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update', patch: Partial<AIConfig>): void;
}>();

const interactionTypeOptions = [
  { value: 'confirm', label: '确认' },
  { value: 'input', label: '输入' },
  { value: 'select', label: '选择' },
];

const interactionOptionsStr = ref('');

watch(
  () => props.config.interaction_options,
  (opts) => {
    interactionOptionsStr.value = Array.isArray(opts) ? opts.join('\n') : '';
  },
  { immediate: true },
);

function handleOptionsChange(val: string) {
  interactionOptionsStr.value = val;
  emit('update', {
    interaction_options: val
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s),
  });
}
</script>

<template>
  <Form layout="vertical" class="config-form">
    <Form.Item label="流式输出">
      <Switch
        :checked="config.streaming"
        @change="(val: any) => emit('update', { streaming: val })"
      />
      <div class="param-hint">启用后，AI 输出将实时流式显示。</div>
    </Form.Item>

    <Form.Item label="人机交互">
      <Switch
        :checked="config.interactive"
        @change="(val: any) => emit('update', { interactive: val })"
      />
      <div class="param-hint">启用后，AI 输出完成后会暂停等待用户确认或输入。</div>
    </Form.Item>

    <template v-if="config.interactive">
      <Collapse>
        <Collapse.Panel key="interaction" header="交互配置">
          <Form.Item label="交互类型">
            <Select
              :value="config.interaction_type"
              :options="interactionTypeOptions"
              @change="(val: any) => emit('update', { interaction_type: val })"
            />
          </Form.Item>

          <Form.Item label="交互提示">
            <Input
              :value="config.interaction_prompt"
              placeholder="请确认是否继续？"
              @blur="(e: any) => emit('update', { interaction_prompt: e.target.value })"
            />
          </Form.Item>

          <Form.Item
            v-if="config.interaction_type === 'select'"
            label="选项（每行一个）"
          >
            <Input.TextArea
              :value="interactionOptionsStr"
              :rows="4"
              placeholder="选项1&#10;选项2&#10;选项3"
              @blur="(e: any) => handleOptionsChange(e.target.value)"
            />
          </Form.Item>

          <Form.Item label="超时时间（秒）">
            <InputNumber
              :value="config.interaction_timeout"
              :min="0"
              :max="3600"
              style="width: 100%"
              @change="(val: any) => emit('update', { interaction_timeout: val })"
            />
            <div class="param-hint">0 表示不超时。超时后将使用默认值继续。</div>
          </Form.Item>

          <Form.Item label="默认值">
            <Input
              :value="config.interaction_default"
              placeholder="超时时使用的默认值"
              @blur="(e: any) => emit('update', { interaction_default: e.target.value })"
            />
          </Form.Item>
        </Collapse.Panel>
      </Collapse>
    </template>
  </Form>
</template>

<style scoped>
.config-form {
  padding-top: 0;
}

.param-hint {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}
</style>
