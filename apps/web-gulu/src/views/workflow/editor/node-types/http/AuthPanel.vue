<script setup lang="ts">
import { ref, watch } from 'vue';

import { Form, Input, Radio, RadioGroup, Select } from 'ant-design-vue';

import type { AuthConfig } from '../../types';
import { createAuthConfig } from '../../types';

interface Props {
  auth?: AuthConfig;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update', auth: AuthConfig): void;
}>();

// 本地数据
const localAuth = ref<AuthConfig>(createAuthConfig());

// 认证类型选项
const authTypeOptions = [
  { label: 'No Auth', value: 'none' },
  { label: 'Basic Auth', value: 'basic' },
  { label: 'Bearer Token', value: 'bearer' },
  { label: 'API Key', value: 'apikey' },
];

// API Key 添加位置选项
const addToOptions = [
  { label: 'Header', value: 'header' },
  { label: 'Query Params', value: 'query' },
];

// 同步外部数据
watch(
  () => props.auth,
  (newAuth) => {
    if (newAuth) {
      localAuth.value = JSON.parse(JSON.stringify(newAuth));
    } else {
      localAuth.value = createAuthConfig();
    }
    // 确保子对象存在
    if (!localAuth.value.basic) {
      localAuth.value.basic = { username: '', password: '' };
    }
    if (!localAuth.value.bearer) {
      localAuth.value.bearer = { token: '' };
    }
    if (!localAuth.value.apikey) {
      localAuth.value.apikey = { key: '', value: '', addTo: 'header' };
    }
  },
  { immediate: true, deep: true }
);

// 触发更新
function emitUpdate() {
  emit('update', JSON.parse(JSON.stringify(localAuth.value)));
}

// 更新认证类型
function updateType(type: string) {
  localAuth.value.type = type as any;
  emitUpdate();
}

// 更新 Basic Auth
function updateBasicUsername(value: string) {
  if (!localAuth.value.basic) {
    localAuth.value.basic = { username: '', password: '' };
  }
  localAuth.value.basic.username = value;
  emitUpdate();
}

function updateBasicPassword(value: string) {
  if (!localAuth.value.basic) {
    localAuth.value.basic = { username: '', password: '' };
  }
  localAuth.value.basic.password = value;
  emitUpdate();
}

// 更新 Bearer Token
function updateBearerToken(value: string) {
  if (!localAuth.value.bearer) {
    localAuth.value.bearer = { token: '' };
  }
  localAuth.value.bearer.token = value;
  emitUpdate();
}

// 更新 API Key
function updateApiKeyKey(value: string) {
  if (!localAuth.value.apikey) {
    localAuth.value.apikey = { key: '', value: '', addTo: 'header' };
  }
  localAuth.value.apikey.key = value;
  emitUpdate();
}

function updateApiKeyValue(value: string) {
  if (!localAuth.value.apikey) {
    localAuth.value.apikey = { key: '', value: '', addTo: 'header' };
  }
  localAuth.value.apikey.value = value;
  emitUpdate();
}

function updateApiKeyAddTo(value: string) {
  if (!localAuth.value.apikey) {
    localAuth.value.apikey = { key: '', value: '', addTo: 'header' };
  }
  localAuth.value.apikey.addTo = value as 'header' | 'query';
  emitUpdate();
}
</script>

<template>
  <div class="auth-panel">
    <!-- 认证类型选择 -->
    <div class="auth-type-selector">
      <RadioGroup
        :value="localAuth.type"
        @change="(e: any) => updateType(e.target.value)"
      >
        <Radio
          v-for="opt in authTypeOptions"
          :key="opt.value"
          :value="opt.value"
          class="auth-type-radio"
        >
          {{ opt.label }}
        </Radio>
      </RadioGroup>
    </div>

    <!-- 认证配置表单 -->
    <div class="auth-config">
      <!-- No Auth -->
      <div v-if="localAuth.type === 'none'" class="auth-empty">
        <span class="empty-text">该请求不需要认证</span>
      </div>

      <!-- Basic Auth -->
      <div v-else-if="localAuth.type === 'basic'" class="auth-form">
        <Form layout="vertical">
          <Form.Item label="用户名">
            <Input
              :value="localAuth.basic?.username"
              placeholder="输入用户名，支持变量 ${var}"
              @change="(e: any) => updateBasicUsername(e.target.value)"
            />
          </Form.Item>
          <Form.Item label="密码">
            <Input.Password
              :value="localAuth.basic?.password"
              placeholder="输入密码，支持变量 ${var}"
              @change="(e: any) => updateBasicPassword(e.target.value)"
            />
          </Form.Item>
        </Form>
      </div>

      <!-- Bearer Token -->
      <div v-else-if="localAuth.type === 'bearer'" class="auth-form">
        <Form layout="vertical">
          <Form.Item label="Token">
            <Input.TextArea
              :value="localAuth.bearer?.token"
              placeholder="输入 Bearer Token，支持变量 ${var}"
              :rows="3"
              @change="(e: any) => updateBearerToken(e.target.value)"
            />
          </Form.Item>
        </Form>
        <div class="auth-hint">
          Token 将以 <code>Authorization: Bearer &lt;token&gt;</code> 的形式添加到请求头
        </div>
      </div>

      <!-- API Key -->
      <div v-else-if="localAuth.type === 'apikey'" class="auth-form">
        <Form layout="vertical">
          <Form.Item label="Key">
            <Input
              :value="localAuth.apikey?.key"
              placeholder="输入 Key 名称，如 X-API-Key"
              @change="(e: any) => updateApiKeyKey(e.target.value)"
            />
          </Form.Item>
          <Form.Item label="Value">
            <Input
              :value="localAuth.apikey?.value"
              placeholder="输入 Key 值，支持变量 ${var}"
              @change="(e: any) => updateApiKeyValue(e.target.value)"
            />
          </Form.Item>
          <Form.Item label="添加到">
            <Select
              :value="localAuth.apikey?.addTo"
              :options="addToOptions"
              @change="updateApiKeyAddTo"
            />
          </Form.Item>
        </Form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.auth-type-selector {
  padding-bottom: 12px;
  border-bottom: 1px solid hsl(var(--border) / 50%);
}

.auth-type-radio {
  margin-right: 0;
  padding: 6px 16px;
  border-radius: 4px;
}

.auth-type-radio:hover {
  background: hsl(var(--accent) / 30%);
}

:deep(.ant-radio-wrapper-checked) {
  background: hsl(var(--primary) / 10%);
  color: hsl(var(--primary));
}

.auth-config {
  flex: 1;
}

.auth-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 150px;
  color: hsl(var(--foreground) / 50%);
}

.auth-form {
  max-width: 500px;
}

.auth-hint {
  margin-top: 12px;
  padding: 8px 12px;
  font-size: 12px;
  color: hsl(var(--foreground) / 60%);
  background: hsl(var(--accent) / 30%);
  border-radius: 6px;
}

.auth-hint code {
  padding: 2px 6px;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 11px;
  background: hsl(var(--accent) / 50%);
  border-radius: 4px;
}
</style>
