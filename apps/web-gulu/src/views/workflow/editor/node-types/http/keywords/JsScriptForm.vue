<script setup lang="ts">
import { ref, watch } from 'vue';

import { Form, Input, Switch } from 'ant-design-vue';

import type { JsScriptConfig } from '../../../types';
import { createJsScriptConfig } from '../../../types';

interface Props {
  config: JsScriptConfig;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update', config: JsScriptConfig): void;
}>();

// 本地数据
const localConfig = ref<JsScriptConfig>(createJsScriptConfig());

// 同步外部数据
watch(
  () => props.config,
  (newConfig) => {
    if (newConfig) {
      localConfig.value = JSON.parse(JSON.stringify(newConfig));
    } else {
      localConfig.value = createJsScriptConfig();
    }
  },
  { immediate: true, deep: true }
);

// 触发更新
function emitUpdate() {
  emit('update', JSON.parse(JSON.stringify(localConfig.value)));
}

// 更新脚本
function updateScript(value: string) {
  localConfig.value.script = value;
  emitUpdate();
}

// 更新出错时停止
function updateStopOnError(value: boolean) {
  localConfig.value.stopOnError = value;
  emitUpdate();
}

// 示例脚本
const exampleScript = `// 可用对象:
// - request: 请求对象 (url, method, headers, body)
// - response: 响应对象 (statusCode, headers, body)
// - pm.variables: 临时变量 (get, set, has)
// - pm.environment: 环境变量 (get, set, has)
// - console: 控制台 (log, info, warn, error)

// 示例: 提取响应数据并设置变量
const data = JSON.parse(response.body);
pm.variables.set('userId', data.id);

// 示例: 断言
pm.test('状态码为 200', () => {
  pm.expect(response.statusCode).to.equal(200);
});`;
</script>

<template>
  <div class="js-script-form">
    <Form layout="vertical" size="small">
      <Form.Item label="JavaScript 脚本">
        <Input.TextArea
          :value="localConfig.script"
          :placeholder="exampleScript"
          :rows="12"
          class="script-editor"
          @change="(e: any) => updateScript(e.target.value)"
        />
      </Form.Item>

      <Form.Item class="switch-item">
        <div class="switch-row">
          <Switch
            :checked="localConfig.stopOnError"
            size="small"
            @change="updateStopOnError"
          />
          <span class="switch-label">脚本出错时停止执行</span>
        </div>
      </Form.Item>
    </Form>

    <div class="api-reference">
      <div class="reference-title">可用 API</div>
      <div class="reference-list">
        <div class="reference-item">
          <code>request</code>
          <span>请求对象 (url, method, headers, body)</span>
        </div>
        <div class="reference-item">
          <code>response</code>
          <span>响应对象 (statusCode, headers, body)</span>
        </div>
        <div class="reference-item">
          <code>pm.variables</code>
          <span>临时变量 (get, set, has)</span>
        </div>
        <div class="reference-item">
          <code>pm.environment</code>
          <span>环境变量 (get, set, has)</span>
        </div>
        <div class="reference-item">
          <code>pm.test(name, fn)</code>
          <span>定义测试用例</span>
        </div>
        <div class="reference-item">
          <code>pm.expect(value)</code>
          <span>断言 (to.equal, to.include, etc.)</span>
        </div>
        <div class="reference-item">
          <code>console</code>
          <span>控制台 (log, info, warn, error)</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.js-script-form {
  max-width: 600px;
}

.script-editor {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
}

.script-editor :deep(.ant-input) {
  border-radius: 6px;
}

.switch-item {
  margin-bottom: 0;
}

.switch-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.switch-label {
  font-size: 13px;
  color: hsl(var(--foreground) / 80%);
}

.api-reference {
  margin-top: 16px;
  padding: 12px;
  background: hsl(var(--accent) / 30%);
  border-radius: 6px;
}

.reference-title {
  font-size: 12px;
  font-weight: 500;
  color: hsl(var(--foreground) / 70%);
  margin-bottom: 8px;
}

.reference-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.reference-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.reference-item code {
  padding: 2px 6px;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 11px;
  background: hsl(var(--accent) / 50%);
  border-radius: 4px;
  color: hsl(var(--primary));
}

.reference-item span {
  color: hsl(var(--foreground) / 60%);
}

:deep(.ant-form-item) {
  margin-bottom: 12px;
}

:deep(.ant-form-item-label) {
  padding-bottom: 4px;
}

:deep(.ant-form-item-label > label) {
  font-size: 12px;
  color: hsl(var(--foreground) / 70%);
}
</style>
