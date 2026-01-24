<script setup lang="ts">
/**
 * 统一的脚本响应面板组件
 * 同时用于单步调试和流程调试的脚本执行结果展示
 */
import { ref, computed } from 'vue';

import { Badge, Button, Tabs, Tag } from 'ant-design-vue';

import { CodeEditor } from '#/components/code-editor';

// 脚本响应数据结构
export interface ScriptResponseData {
  // 执行状态
  success: boolean;
  language?: string;
  durationMs: number;

  // 脚本内容
  script?: string;

  // 执行结果
  result?: unknown;
  error?: string;

  // 控制台日志
  consoleLogs?: string[];

  // 变量
  variables?: Record<string, unknown>;
}

interface Props {
  response: ScriptResponseData;
  showDebugButton?: boolean;
  showScriptTab?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showDebugButton: false,
  showScriptTab: true,
});

const emit = defineEmits<{
  (e: 'debug'): void;
}>();

const activeTab = ref(props.showScriptTab ? 'script' : 'result');

// 状态颜色
const statusColor = computed(() => {
  return props.response.success ? '#52c41a' : '#ff4d4f';
});

// 状态文本
const statusText = computed(() => {
  return props.response.success ? '执行成功' : '执行失败';
});

// 变量数量
const variablesCount = computed(() => {
  return Object.keys(props.response.variables || {}).length;
});

// 控制台日志数量
const consoleLogsCount = computed(() => {
  return props.response.consoleLogs?.length || 0;
});

// 格式化结果
function formatResult(result: unknown): string {
  if (result === undefined) return 'undefined';
  if (result === null) return 'null';
  if (typeof result === 'object') {
    return JSON.stringify(result, null, 2);
  }
  return String(result);
}

// 格式化时长
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function handleDebug() {
  emit('debug');
}
</script>

<template>
  <div class="script-response-panel">
    <!-- 状态栏 -->
    <div class="response-header" :class="{ success: response.success, error: !response.success }">
      <div class="status-info">
        <Tag :color="statusColor" class="status-tag">{{ statusText }}</Tag>
        <span class="divider">|</span>
        <span class="meta-item">耗时: {{ formatDuration(response.durationMs) }}</span>
        <span class="divider">|</span>
        <span class="meta-item">语言: {{ response.language || 'javascript' }}</span>
      </div>
      <Button
        v-if="showDebugButton"
        type="primary"
        size="small"
        @click="handleDebug"
      >
        调试此步骤
      </Button>
    </div>

    <!-- 错误信息 -->
    <div v-if="response.error" class="error-message">
      {{ response.error }}
    </div>

    <!-- Tab 内容 -->
    <Tabs v-model:activeKey="activeTab" size="small" class="response-tabs">
      <!-- 脚本代码 Tab -->
      <Tabs.TabPane v-if="showScriptTab && response.script" key="script" tab="脚本代码">
        <div class="tab-content script-content">
          <CodeEditor
            :model-value="response.script"
            language="javascript"
            :readonly="true"
            :minimap="false"
            :line-numbers="true"
            height="100%"
          />
        </div>
      </Tabs.TabPane>

      <!-- 执行结果 Tab -->
      <Tabs.TabPane key="result" tab="执行结果">
        <div class="tab-content">
          <div v-if="response.result !== undefined" class="result-section">
            <pre class="result-content">{{ formatResult(response.result) }}</pre>
          </div>
          <div v-else class="empty-hint">无返回值</div>
        </div>
      </Tabs.TabPane>

      <!-- 控制台 Tab -->
      <Tabs.TabPane key="console">
        <template #tab>
          <span>控制台</span>
          <Badge v-if="consoleLogsCount > 0" :count="consoleLogsCount" :number-style="{ fontSize: '10px' }" />
        </template>
        <div class="tab-content">
          <div v-if="consoleLogsCount > 0" class="console-logs">
            <div
              v-for="(log, idx) in response.consoleLogs"
              :key="idx"
              class="log-line"
              :class="{
                warn: log.startsWith('[WARN]'),
                error: log.startsWith('[ERROR]'),
              }"
            >
              {{ log }}
            </div>
          </div>
          <div v-else class="empty-hint">无日志输出</div>
        </div>
      </Tabs.TabPane>

      <!-- 变量 Tab -->
      <Tabs.TabPane key="variables">
        <template #tab>
          <span>变量</span>
          <Badge v-if="variablesCount > 0" :count="variablesCount" :number-style="{ fontSize: '10px' }" />
        </template>
        <div class="tab-content">
          <div v-if="variablesCount > 0" class="variables-list">
            <div
              v-for="(value, key) in response.variables"
              :key="key"
              class="variable-item"
            >
              <span class="variable-key">{{ key }}</span>
              <span class="variable-value">{{ formatResult(value) }}</span>
            </div>
          </div>
          <div v-else class="empty-hint">无变量设置</div>
        </div>
      </Tabs.TabPane>
    </Tabs>
  </div>
</template>

<style scoped>
.script-response-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.response-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: 4px;
  flex-shrink: 0;
}

.response-header.success {
  background: hsl(142 76% 36% / 10%);
}

.response-header.error {
  background: hsl(0 84% 60% / 10%);
}

.status-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-tag {
  font-size: 12px;
  font-weight: 600;
  margin: 0;
}

.divider {
  color: hsl(var(--border));
}

.meta-item {
  font-size: 12px;
  color: hsl(var(--foreground) / 65%);
}

.error-message {
  margin: 8px 0;
  padding: 12px;
  background: hsl(0 84% 60% / 10%);
  border: 1px solid hsl(0 84% 60% / 30%);
  border-radius: 6px;
  color: #ff4d4f;
  font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
  font-size: 13px;
  white-space: pre-wrap;
  flex-shrink: 0;
}

.response-tabs {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.response-tabs :deep(.ant-tabs-nav) {
  margin-bottom: 0;
  padding: 0 8px;
  flex-shrink: 0;
}

.response-tabs :deep(.ant-tabs-nav::before) {
  display: none;
}

.response-tabs :deep(.ant-tabs-tab) {
  padding: 8px 4px;
  font-size: 13px;
}

.response-tabs :deep(.ant-tabs-tab + .ant-tabs-tab) {
  margin-left: 16px;
}

.response-tabs :deep(.ant-tabs-content-holder) {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.response-tabs :deep(.ant-tabs-content) {
  height: 100%;
}

.response-tabs :deep(.ant-tabs-tabpane) {
  height: 100%;
  overflow: auto;
}

.tab-content {
  height: 100%;
  padding: 12px;
}

.tab-content.script-content {
  padding: 0;
}

.result-content {
  margin: 0;
  padding: 12px;
  background: hsl(var(--accent) / 50%);
  border-radius: 6px;
  font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
  font-size: 13px;
  white-space: pre-wrap;
  word-break: break-all;
  color: hsl(var(--foreground) / 85%);
}

.console-logs {
  background: hsl(var(--accent) / 50%);
  border-radius: 6px;
  padding: 8px 12px;
  font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
  font-size: 12px;
}

.log-line {
  padding: 4px 0;
  color: hsl(var(--foreground) / 75%);
  white-space: pre-wrap;
  word-break: break-all;
}

.log-line.warn {
  color: #faad14;
}

.log-line.error {
  color: #ff4d4f;
}

.variables-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.variable-item {
  display: flex;
  gap: 12px;
  padding: 8px 12px;
  background: hsl(var(--accent) / 50%);
  border-radius: 6px;
  font-size: 13px;
}

.variable-key {
  min-width: 100px;
  font-weight: 500;
  color: hsl(var(--primary));
  font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
}

.variable-value {
  flex: 1;
  color: hsl(var(--foreground) / 75%);
  font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
  word-break: break-all;
}

.empty-hint {
  text-align: center;
  color: hsl(var(--foreground) / 45%);
  padding: 20px;
}
</style>
