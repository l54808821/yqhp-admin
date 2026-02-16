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
      <!-- 超时设置 -->
      <div class="settings-section">
        <div class="section-title">超时设置</div>
        <div class="settings-row">
          <Form.Item label="查询超时 (ms)" class="settings-item">
            <InputNumber
              :value="localSettings.timeout"
              :min="0"
              :max="300000"
              :step="1000"
              placeholder="30000"
              class="settings-input"
              @change="updateTimeout"
            />
          </Form.Item>
        </div>
      </div>

      <!-- 结果限制 -->
      <div class="settings-section">
        <div class="section-title">结果限制</div>
        <div class="settings-row">
          <Form.Item label="最大返回行数" class="settings-item">
            <InputNumber
              :value="localSettings.maxRows"
              :min="1"
              :max="100000"
              :step="100"
              placeholder="1000"
              class="settings-input"
              @change="updateMaxRows"
            />
            <span class="settings-hint">限制查询返回的最大行数，防止意外大查询</span>
          </Form.Item>
        </div>
      </div>

      <!-- 变量设置 -->
      <div class="settings-section">
        <div class="section-title">变量设置</div>
        <div class="settings-row">
          <Form.Item label="保存结果到变量" class="settings-item">
            <Input
              :value="localSettings.saveToVariable"
              placeholder="变量名（可选），如 dbResult"
              class="settings-input"
              @change="(e: any) => updateSaveToVariable(e.target.value)"
            />
            <span class="settings-hint">将查询结果保存到变量中，后续步骤可通过 ${'{'}变量名{'}'} 引用</span>
          </Form.Item>
        </div>
      </div>
    </Form>
  </div>
</template>

<style scoped>
.settings-panel {
  padding: 4px 0;
}

.settings-form {
  max-width: 600px;
}

.settings-section {
  margin-bottom: 24px;
}

.section-title {
  margin-bottom: 12px;
  font-size: 13px;
  font-weight: 500;
  color: hsl(var(--foreground) / 80%);
}

.settings-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.settings-item {
  min-width: 200px;
  margin-bottom: 0;
}

.settings-input {
  width: 100%;
}

.settings-hint {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: hsl(var(--foreground) / 50%);
}
</style>
