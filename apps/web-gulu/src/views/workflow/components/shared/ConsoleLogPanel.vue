<script setup lang="ts">
/**
 * 控制台日志展示组件
 * 统一用于 HTTP 响应和脚本响应的控制台日志展示
 */
import { reactive } from 'vue';

import { createIconifyIcon } from '@vben/icons';
import { Tooltip } from 'ant-design-vue';

import type { ConsoleLogEntry } from './types';

const CheckCircleIcon = createIconifyIcon('lucide:check-circle');
const XCircleIcon = createIconifyIcon('lucide:x-circle');

interface Props {
  logs: ConsoleLogEntry[];
}

defineProps<Props>();

// 获取处理器类型名称
function getProcessorTypeName(type: string): string {
  const names: Record<string, string> = {
    'js_script': 'JS 脚本',
    'set_variable': '设置变量',
    'db_query': '数据库查询',
    'wait': '等待',
    'assertion': '断言',
    'extract_param': '提取参数',
  };
  return names[type] || type;
}

// 格式化处理器输出为 tooltip 内容
function formatProcessorOutput(output?: Record<string, unknown>): string {
  if (!output) return '';
  return JSON.stringify(output, null, 2);
}

// 展开状态管理
const expandedLogs = reactive<Set<number>>(new Set());

function isLogExpanded(idx: number): boolean {
  return expandedLogs.has(idx);
}

function toggleLogExpand(idx: number) {
  if (expandedLogs.has(idx)) {
    expandedLogs.delete(idx);
  } else {
    expandedLogs.add(idx);
  }
}

// 判断消息是否需要折叠（超过100个字符或包含换行）
function needsCollapse(message?: string): boolean {
  if (!message) return false;
  return message.length > 100 || message.includes('\n');
}

// 获取截断的消息
function getTruncatedMessage(message?: string): string {
  if (!message) return '';
  const firstLine = message.split('\n')[0] || '';
  if (firstLine.length > 100) {
    return firstLine.slice(0, 100) + '...';
  }
  if (message.includes('\n')) {
    return firstLine + '...';
  }
  return message;
}
</script>

<template>
  <div class="console-log-panel">
    <template v-if="logs && logs.length > 0">
      <div
        v-for="(entry, idx) in logs"
        :key="idx"
        class="console-entry"
        :class="[
          entry.type === 'processor' ? 'processor-entry' : 'log-entry',
          entry.type === 'processor' ? (entry.processor?.success ? 'success' : 'failed') : entry.type
        ]"
      >
        <!-- 处理器日志 -->
        <template v-if="entry.type === 'processor' && entry.processor">
          <span class="phase-tag" :class="entry.processor.phase">
            {{ entry.processor.phase === 'pre' ? '前置' : '后置' }}
          </span>
          <span class="processor-type">{{ getProcessorTypeName(entry.processor.procType) }}</span>
          <Tooltip v-if="entry.processor.output" placement="top">
            <template #title>
              <pre class="output-tooltip">{{ formatProcessorOutput(entry.processor.output) }}</pre>
            </template>
            <span class="processor-message clickable">{{ entry.processor.message }}</span>
          </Tooltip>
          <span v-else class="processor-message">{{ entry.processor.message }}</span>
          <component
            :is="entry.processor.success ? CheckCircleIcon : XCircleIcon"
            class="status-icon"
          />
        </template>

        <!-- 普通日志 -->
        <template v-else>
          <span class="log-prefix">[{{ entry.type.toUpperCase() }}]</span>
          <span class="log-message">
            <template v-if="needsCollapse(entry.message) && !isLogExpanded(idx)">
              {{ getTruncatedMessage(entry.message) }}
              <span class="expand-btn" @click="toggleLogExpand(idx)">展开</span>
            </template>
            <template v-else>
              {{ entry.message }}
              <span
                v-if="needsCollapse(entry.message)"
                class="expand-btn"
                @click="toggleLogExpand(idx)"
              >收起</span>
            </template>
          </span>
        </template>
      </div>
    </template>

    <div v-else class="empty-hint">无控制台输出</div>
  </div>
</template>

<style scoped>
.console-log-panel {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.console-entry {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border-radius: 3px;
  font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
  font-size: 12px;
}

.console-entry:hover {
  background: hsl(var(--accent) / 30%);
}

/* 阶段标签 */
.phase-tag {
  font-size: 10px;
  font-weight: 500;
  padding: 1px 4px;
  border-radius: 3px;
  flex-shrink: 0;
}

.phase-tag.pre {
  background: hsl(200 80% 50% / 20%);
  color: hsl(200 80% 50%);
}

.phase-tag.post {
  background: hsl(280 80% 50% / 20%);
  color: hsl(280 80% 50%);
}

/* 处理器类型 */
.processor-type {
  font-weight: 500;
  color: hsl(var(--foreground) / 80%);
  flex-shrink: 0;
}

/* 处理器消息 */
.processor-message {
  color: hsl(var(--foreground) / 60%);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.processor-message.clickable {
  cursor: pointer;
  text-decoration: underline;
  text-decoration-style: dashed;
  text-underline-offset: 2px;
}

.processor-message.clickable:hover {
  color: hsl(var(--primary));
}

/* 状态图标 */
.status-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.processor-entry.success .status-icon {
  color: #52c41a;
}

.processor-entry.failed .status-icon {
  color: #ff4d4f;
}

/* 输出 Tooltip */
.output-tooltip {
  margin: 0;
  font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
  font-size: 11px;
  white-space: pre-wrap;
  max-width: 400px;
  max-height: 300px;
  overflow: auto;
}

/* 普通日志条目 */
.log-prefix {
  font-size: 10px;
  font-weight: 500;
  padding: 1px 4px;
  border-radius: 3px;
  flex-shrink: 0;
}

.log-entry.log .log-prefix {
  background: hsl(var(--foreground) / 10%);
  color: hsl(var(--foreground) / 60%);
}

.log-entry.warn .log-prefix {
  background: hsl(45 100% 50% / 20%);
  color: hsl(45 100% 40%);
}

.log-entry.error .log-prefix {
  background: hsl(0 84% 60% / 20%);
  color: #ff4d4f;
}

.log-message {
  color: hsl(var(--foreground) / 75%);
  white-space: pre-wrap;
  word-break: break-all;
  line-height: 1.4;
  flex: 1;
}

.expand-btn {
  display: inline;
  margin-left: 8px;
  color: hsl(var(--primary));
  cursor: pointer;
  font-size: 11px;
  white-space: nowrap;
}

.expand-btn:hover {
  text-decoration: underline;
}

.empty-hint {
  text-align: center;
  color: hsl(var(--foreground) / 45%);
  padding: 20px;
  font-size: 12px;
}
</style>
