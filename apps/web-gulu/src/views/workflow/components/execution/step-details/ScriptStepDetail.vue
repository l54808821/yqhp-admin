<script setup lang="ts">
import { computed } from 'vue';

import {
  Alert,
  Button,
  Space,
  Tabs,
  Tag,
} from 'ant-design-vue';

import type { StepResult } from '#/api/debug';
import { CodeEditor } from '#/components/code-editor';

// 脚本输出类型定义
interface ScriptOutput {
  script?: string;
  language?: string;
  result?: unknown;
  console_logs?: string[];
  error?: string;
  variables?: Record<string, unknown>;
  duration_ms?: number;
}

interface Props {
  stepResult: StepResult;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'debug-step'): void;
}>();

// 脚本输出数据
const scriptOutput = computed(() => {
  const output = props.stepResult.output as ScriptOutput | undefined;
  if (!output) return null;

  return {
    script: output.script || '',
    language: output.language || 'javascript',
    result: output.result,
    consoleLogs: output.console_logs || [],
    error: output.error || '',
    variables: output.variables || {},
    durationMs: output.duration_ms || props.stepResult.duration_ms || 0,
  };
});

// 执行状态
const executionStatus = computed(() => {
  const status = props.stepResult.status;
  if (status === 'success') return { text: '成功', color: 'success' };
  if (status === 'failed') return { text: '失败', color: 'error' };
  if (status === 'timeout') return { text: '超时', color: 'warning' };
  return { text: status, color: 'default' };
});

// 变量数量
const variablesCount = computed(() => {
  return Object.keys(scriptOutput.value?.variables || {}).length;
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
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

// 调试此步骤
function handleDebugStep() {
  emit('debug-step');
}
</script>

<template>
  <div class="script-step-detail">
    <!-- 状态栏 -->
    <div class="status-bar">
      <Space>
        <Tag :color="executionStatus.color" class="status-tag">
          {{ executionStatus.text }}
        </Tag>
        <span class="divider">|</span>
        <span class="metric">耗时: {{ formatDuration(scriptOutput?.durationMs || 0) }}</span>
        <span class="divider">|</span>
        <span class="metric">语言: {{ scriptOutput?.language || 'javascript' }}</span>
      </Space>
      <Button type="primary" size="small" @click="handleDebugStep">
        调试此步骤
      </Button>
    </div>

    <!-- 错误信息 -->
    <Alert
      v-if="stepResult.error || scriptOutput?.error"
      type="error"
      :message="stepResult.error || scriptOutput?.error"
      class="error-alert"
    />

    <!-- Tab 内容 -->
    <Tabs class="detail-tabs">
      <!-- 脚本代码 Tab -->
      <Tabs.TabPane key="script" tab="脚本代码">
        <div class="tab-content script-content">
          <CodeEditor
            v-if="scriptOutput?.script"
            :model-value="scriptOutput.script"
            language="javascript"
            :readonly="true"
            :minimap="false"
            :line-numbers="true"
            height="100%"
          />
          <div v-else class="empty-tip">无脚本代码</div>
        </div>
      </Tabs.TabPane>

      <!-- 执行结果 Tab -->
      <Tabs.TabPane key="result" tab="执行结果">
        <div class="tab-content">
          <div v-if="scriptOutput?.result !== undefined" class="result-section">
            <div class="section-title">返回值</div>
            <pre class="result-content">{{ formatResult(scriptOutput.result) }}</pre>
          </div>
          <div v-else class="empty-tip">无返回值</div>
        </div>
      </Tabs.TabPane>

      <!-- 控制台 Tab -->
      <Tabs.TabPane key="console">
        <template #tab>
          <span>控制台</span>
          <span v-if="scriptOutput?.consoleLogs?.length" class="tab-badge">
            {{ scriptOutput.consoleLogs.length }}
          </span>
        </template>
        <div class="tab-content">
          <div v-if="scriptOutput?.consoleLogs?.length" class="console-logs">
            <div
              v-for="(log, idx) in scriptOutput.consoleLogs"
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
          <div v-else class="empty-tip">无日志输出</div>
        </div>
      </Tabs.TabPane>

      <!-- 变量 Tab -->
      <Tabs.TabPane key="variables">
        <template #tab>
          <span>变量</span>
          <span v-if="variablesCount > 0" class="tab-badge">{{ variablesCount }}</span>
        </template>
        <div class="tab-content">
          <div v-if="variablesCount > 0" class="variables-list">
            <div
              v-for="(value, key) in scriptOutput?.variables"
              :key="key"
              class="variable-item"
            >
              <span class="variable-key">{{ key }}</span>
              <span class="variable-value">{{ formatResult(value) }}</span>
            </div>
          </div>
          <div v-else class="empty-tip">无变量设置</div>
        </div>
      </Tabs.TabPane>
    </Tabs>
  </div>
</template>

<style scoped>
.script-step-detail {
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 100%;
  min-height: 0;
}

.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: hsl(var(--accent) / 50%);
  border-radius: 4px;
}

.status-tag {
  font-size: 13px;
  font-weight: 500;
}

.divider {
  color: hsl(var(--border));
}

.metric {
  font-size: 12px;
  color: hsl(var(--foreground) / 65%);
}

.error-alert {
  margin: 0;
}

.detail-tabs {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.detail-tabs :deep(.ant-tabs-nav) {
  margin-bottom: 8px;
  flex-shrink: 0;
}

.detail-tabs :deep(.ant-tabs-content-holder) {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.detail-tabs :deep(.ant-tabs-content) {
  height: 100%;
}

.detail-tabs :deep(.ant-tabs-tabpane) {
  height: 100%;
  overflow: auto;
}

.detail-tabs :deep(.ant-tabs-tab) {
  padding: 6px 0;
  font-size: 13px;
}

.detail-tabs :deep(.ant-tabs-tab + .ant-tabs-tab) {
  margin-left: 20px;
}

.tab-content {
  height: 100%;
  padding: 0;
}

.tab-content.script-content {
  height: 100%;
  min-height: 200px;
}

.tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  margin-left: 6px;
  font-size: 11px;
  font-weight: 500;
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 12%);
  border-radius: 9px;
}

.section-title {
  font-size: 13px;
  font-weight: 500;
  color: hsl(var(--foreground) / 70%);
  margin-bottom: 8px;
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

.empty-tip {
  text-align: center;
  color: hsl(var(--foreground) / 45%);
  padding: 20px;
}
</style>
