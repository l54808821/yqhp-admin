<script setup lang="ts">
import { ref, watch } from 'vue';

import { Form, InputNumber, Switch } from 'ant-design-vue';

import type { HttpSettings } from '../../types';
import { createHttpSettings } from '../../types';

interface Props {
  settings?: HttpSettings;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update', settings: HttpSettings): void;
}>();

// 本地数据
const localSettings = ref<HttpSettings>(createHttpSettings());

// 同步外部数据
watch(
  () => props.settings,
  (newSettings) => {
    if (newSettings) {
      localSettings.value = JSON.parse(JSON.stringify(newSettings));
    } else {
      localSettings.value = createHttpSettings();
    }
  },
  { immediate: true, deep: true }
);

// 触发更新
function emitUpdate() {
  emit('update', JSON.parse(JSON.stringify(localSettings.value)));
}

// 更新连接超时
function updateConnectTimeout(value: number | null) {
  localSettings.value.connectTimeout = value ?? 30000;
  emitUpdate();
}

// 更新读取超时
function updateReadTimeout(value: number | null) {
  localSettings.value.readTimeout = value ?? 30000;
  emitUpdate();
}

// 更新跟随重定向
function updateFollowRedirects(value: boolean) {
  localSettings.value.followRedirects = value;
  emitUpdate();
}

// 更新最大重定向次数
function updateMaxRedirects(value: number | null) {
  localSettings.value.maxRedirects = value ?? 10;
  emitUpdate();
}

// 更新 SSL 验证
function updateVerifySsl(value: boolean) {
  localSettings.value.verifySsl = value;
  emitUpdate();
}

// 更新保存 Cookie
function updateSaveCookies(value: boolean) {
  localSettings.value.saveCookies = value;
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
          <Form.Item label="连接超时 (ms)" class="settings-item">
            <InputNumber
              :value="localSettings.connectTimeout"
              :min="0"
              :max="300000"
              :step="1000"
              placeholder="30000"
              class="settings-input"
              @change="updateConnectTimeout"
            />
          </Form.Item>
          <Form.Item label="读取超时 (ms)" class="settings-item">
            <InputNumber
              :value="localSettings.readTimeout"
              :min="0"
              :max="300000"
              :step="1000"
              placeholder="30000"
              class="settings-input"
              @change="updateReadTimeout"
            />
          </Form.Item>
        </div>
      </div>

      <!-- 重定向设置 -->
      <div class="settings-section">
        <div class="section-title">重定向设置</div>
        <div class="settings-row">
          <Form.Item label="跟随重定向" class="settings-item switch-item">
            <Switch
              :checked="localSettings.followRedirects"
              @change="updateFollowRedirects"
            />
          </Form.Item>
          <Form.Item
            v-if="localSettings.followRedirects"
            label="最大重定向次数"
            class="settings-item"
          >
            <InputNumber
              :value="localSettings.maxRedirects"
              :min="1"
              :max="50"
              placeholder="10"
              class="settings-input"
              @change="updateMaxRedirects"
            />
          </Form.Item>
        </div>
      </div>

      <!-- 安全设置 -->
      <div class="settings-section">
        <div class="section-title">安全设置</div>
        <div class="settings-row">
          <Form.Item label="验证 SSL 证书" class="settings-item switch-item">
            <Switch
              :checked="localSettings.verifySsl"
              @change="updateVerifySsl"
            />
            <span class="switch-hint">关闭后将忽略 SSL 证书错误</span>
          </Form.Item>
        </div>
      </div>

      <!-- Cookie 设置 -->
      <div class="settings-section">
        <div class="section-title">Cookie 设置</div>
        <div class="settings-row">
          <Form.Item label="保存响应 Cookie" class="settings-item switch-item">
            <Switch
              :checked="localSettings.saveCookies"
              @change="updateSaveCookies"
            />
            <span class="switch-hint">开启后响应中的 Cookie 将被保存到环境中</span>
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

.switch-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.switch-item :deep(.ant-form-item-control-input-content) {
  display: flex;
  align-items: center;
  gap: 8px;
}

.switch-hint {
  font-size: 12px;
  color: hsl(var(--foreground) / 50%);
}
</style>
