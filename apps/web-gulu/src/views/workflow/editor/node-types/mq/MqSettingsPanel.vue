<script setup lang="ts">
import { ref, watch } from 'vue';

import { Form, Input, InputNumber, Select } from 'ant-design-vue';

import type { MqSettings } from '../../types/mq';
import { createMqSettings } from '../../types/mq';

interface Props {
  settings?: MqSettings;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update', settings: MqSettings): void;
}>();

const localSettings = ref<MqSettings>(createMqSettings());

watch(
  () => props.settings,
  (v) => {
    localSettings.value = v ? JSON.parse(JSON.stringify(v)) : createMqSettings();
  },
  { immediate: true, deep: true },
);

function emitUpdate() {
  emit('update', JSON.parse(JSON.stringify(localSettings.value)));
}
</script>

<template>
  <div class="settings-panel">
    <Form layout="vertical" class="settings-form">
      <Form.Item class="settings-item">
        <template #label>
          <span class="item-label">超时时间</span>
        </template>
        <InputNumber
          v-model:value="localSettings.timeout"
          :min="0"
          :max="300000"
          :step="1000"
          addon-after="ms"
          placeholder="30000"
          class="settings-input"
          @change="emitUpdate"
        />
      </Form.Item>

      <Form.Item class="settings-item">
        <template #label>
          <span class="item-label">消费者组 ID</span>
        </template>
        <Input
          v-model:value="localSettings.groupId"
          placeholder="Consumer Group ID（可选）"
          class="settings-input"
          @change="emitUpdate"
        />
        <div class="settings-hint">Kafka 消费时的消费者组标识</div>
      </Form.Item>

      <Form.Item class="settings-item">
        <template #label>
          <span class="item-label">消息格式</span>
        </template>
        <Select
          v-model:value="localSettings.format"
          class="settings-input"
          @change="emitUpdate"
        >
          <Select.Option value="json">JSON</Select.Option>
          <Select.Option value="text">纯文本</Select.Option>
          <Select.Option value="protobuf">Protobuf</Select.Option>
        </Select>
      </Form.Item>

      <Form.Item class="settings-item">
        <template #label>
          <span class="item-label">消费数量</span>
        </template>
        <InputNumber
          v-model:value="localSettings.count"
          :min="1"
          :max="1000"
          :step="1"
          placeholder="1"
          class="settings-input"
          @change="emitUpdate"
        />
        <div class="settings-hint">接收操作时最多消费的消息条数</div>
      </Form.Item>
    </Form>
  </div>
</template>

<style scoped>
.settings-panel {
  padding: 8px 0 0;
}

.settings-form {
  max-width: 480px;
}

.settings-item {
  margin-bottom: 16px;
}

.item-label {
  font-size: 13px;
  font-weight: 500;
  color: hsl(var(--foreground) / 85%);
}

.settings-input {
  width: 100%;
}

.settings-hint {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.4;
  color: hsl(var(--foreground) / 45%);
}
</style>
