<script setup lang="ts">
/**
 * 执行模式面板：流式输出 + 人机交互开关 + 交互超时配置
 */
import { Form, InputNumber, Switch } from 'ant-design-vue';

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
      <div class="param-hint">
        启用后，AI 可在需要时主动请求用户确认、输入或选择，交互时机和内容由
        AI 根据上下文自行决定。
      </div>
    </Form.Item>

    <template v-if="config.interactive">
      <Form.Item label="交互超时时间（秒）">
        <InputNumber
          :value="config.interaction_timeout"
          :min="0"
          :max="3600"
          :placeholder="'默认 300 秒'"
          style="width: 100%"
          @change="(val: any) => emit('update', { interaction_timeout: val })"
        />
        <div class="param-hint">
          用户未在超时时间内响应时将自动跳过。0 表示不超时。
        </div>
      </Form.Item>
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
