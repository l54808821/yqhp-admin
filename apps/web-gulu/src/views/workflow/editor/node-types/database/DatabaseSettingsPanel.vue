<script setup lang="ts">
import { ref, watch } from 'vue';

import { Form, InputNumber, Input } from 'ant-design-vue';

import type { DatabaseSettings } from '../../types';
import { createDatabaseSettings } from '../../types';

interface Props {
  settings?: DatabaseSettings;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update', settings: DatabaseSettings): void;
}>();

const localSettings = ref<DatabaseSettings>(createDatabaseSettings());

watch(
  () => props.settings,
  (newSettings) => {
    if (newSettings) {
      localSettings.value = JSON.parse(JSON.stringify(newSettings));
    } else {
      localSettings.value = createDatabaseSettings();
    }
  },
  { immediate: true, deep: true },
);

function emitUpdate() {
  emit('update', JSON.parse(JSON.stringify(localSettings.value)));
}

function updateTimeout(value: any) {
  localSettings.value.timeout = Number(value) || 30000;
  emitUpdate();
}

function updateMaxRows(value: any) {
  localSettings.value.maxRows = Number(value) || 1000;
  emitUpdate();
}

function updateSaveToVariable(value: string) {
  localSettings.value.saveToVariable = value;
  emitUpdate();
}
</script>

<template>
  <div class="settings-panel">
    <Form layout="vertical" class="settings-form">
      <Form.Item class="settings-item">
        <template #label>
          <span class="item-label">查询超时</span>
        </template>
        <InputNumber
          :value="localSettings.timeout"
          :min="0"
          :max="300000"
          :step="1000"
          :addon-after="'ms'"
          placeholder="30000"
          class="settings-input"
          @change="updateTimeout"
        />
      </Form.Item>

      <Form.Item class="settings-item">
        <template #label>
          <span class="item-label">最大返回行数</span>
        </template>
        <InputNumber
          :value="localSettings.maxRows"
          :min="1"
          :max="100000"
          :step="100"
          placeholder="1000"
          class="settings-input"
          @change="updateMaxRows"
        />
        <div class="settings-hint">限制返回行数，防止意外大查询</div>
      </Form.Item>

      <Form.Item class="settings-item">
        <template #label>
          <span class="item-label">保存结果到变量</span>
        </template>
        <Input
          :value="localSettings.saveToVariable"
          placeholder="变量名（可选），如 dbResult"
          class="settings-input"
          @change="(e: any) => updateSaveToVariable(e.target.value)"
        />
        <div class="settings-hint">
          后续步骤可通过
          <code class="hint-code">${'{'}变量名{'}'}</code>
          引用查询结果
        </div>
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

.hint-code {
  padding: 1px 4px;
  font-family: monospace;
  font-size: 11px;
  color: hsl(var(--foreground) / 60%);
  background: hsl(var(--foreground) / 6%);
  border-radius: 3px;
}
</style>
