<script setup lang="ts">
/**
 * 控制台日志展示组件
 * 统一用于 HTTP 响应和脚本响应的控制台日志展示
 * 支持处理器日志、变量变更日志、变量快照
 */
import { reactive } from 'vue';

import { createIconifyIcon } from '@vben/icons';
import { Tooltip } from 'ant-design-vue';

import type { ConsoleLogEntry, VariableSnapshotInfo } from './types';

const CheckCircleIcon = createIconifyIcon('lucide:check-circle');
const XCircleIcon = createIconifyIcon('lucide:x-circle');
const VariableIcon = createIconifyIcon('lucide:variable');
const ChevronDownIcon = createIconifyIcon('lucide:chevron-down');
const ChevronRightIcon = createIconifyIcon('lucide:chevron-right');

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

// 获取变量来源名称
function getSourceName(source: string): string {
  const names: Record<string, string> = {
    'set_variable': '设置变量',
    'extract_param': '提取参数',
    'js_script': 'JS脚本',
    'loop': '循环',
  };
  return names[source] || source;
}

// 格式化处理器输出为 tooltip 内容
function formatProcessorOutput(output?: Record<string, unknown>): string {
  if (!output) return '';
  return JSON.stringify(output, null, 2);
}

// 格式化变量值（用于显示）
function formatValue(value: unknown): string {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (typeof value === 'string') {
    // 字符串超过 50 字符则截断
    if (value.length > 50) {
      return `"${value.slice(0, 50)}..."`;
    }
    return `"${value}"`;
  }
  if (typeof value === 'object') {
    const str = JSON.stringify(value);
    if (str.length > 50) {
      return str.slice(0, 50) + '...';
    }
    return str;
  }
  return String(value);
}

// 获取快照变量数量
function getSnapshotVarCount(snapshot: VariableSnapshotInfo): { env: number; temp: number } {
  return {
    env: Object.keys(snapshot.envVars || {}).length,
    temp: Object.keys(snapshot.tempVars || {}).length,
  };
}

// 展开状态管理
const expandedLogs = reactive<Set<number>>(new Set());
const expandedSnapshots = reactive<Set<number>>(new Set());

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

function isSnapshotExpanded(idx: number): boolean {
  return expandedSnapshots.has(idx);
}

function toggleSnapshotExpand(idx: number) {
  if (expandedSnapshots.has(idx)) {
    expandedSnapshots.delete(idx);
  } else {
    expandedSnapshots.add(idx);
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
          entry.type === 'processor' ? 'processor-entry' : '',
          entry.type === 'processor' ? (entry.processor?.success ? 'success' : 'failed') : '',
          entry.type === 'variable' ? 'variable-entry' : '',
          entry.type === 'snapshot' ? 'snapshot-entry' : '',
          ['log', 'warn', 'error'].includes(entry.type) ? 'log-entry' : '',
          ['log', 'warn', 'error'].includes(entry.type) ? entry.type : ''
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

        <!-- 变量变更日志 -->
        <template v-else-if="entry.type === 'variable' && entry.variable">
          <VariableIcon class="variable-icon" />
          <span class="scope-tag" :class="entry.variable.scope">
            {{ entry.variable.scope === 'env' ? '环境' : '临时' }}
          </span>
          <span class="variable-name">{{ entry.variable.name }}</span>
          <span class="variable-arrow">=</span>
          <Tooltip placement="top">
            <template #title>
              <div class="value-tooltip">
                <div v-if="entry.variable.oldValue !== undefined" class="old-value">
                  旧值: {{ JSON.stringify(entry.variable.oldValue) }}
                </div>
                <div class="new-value">新值: {{ JSON.stringify(entry.variable.newValue) }}</div>
              </div>
            </template>
            <span class="variable-value">{{ formatValue(entry.variable.newValue) }}</span>
          </Tooltip>
          <span class="source-tag">{{ getSourceName(entry.variable.source) }}</span>
        </template>

        <!-- 变量快照 -->
        <template v-else-if="entry.type === 'snapshot' && entry.snapshot">
          <div class="snapshot-container">
            <div class="snapshot-header" @click="toggleSnapshotExpand(idx)">
              <component
                :is="isSnapshotExpanded(idx) ? ChevronDownIcon : ChevronRightIcon"
                class="chevron-icon"
              />
              <span class="snapshot-title">变量快照</span>
              <span class="snapshot-count">
                环境: {{ getSnapshotVarCount(entry.snapshot).env }} |
                临时: {{ getSnapshotVarCount(entry.snapshot).temp }}
              </span>
            </div>
            <div v-if="isSnapshotExpanded(idx)" class="snapshot-content">
              <!-- 环境变量 -->
              <div
                v-if="Object.keys(entry.snapshot.envVars || {}).length > 0"
                class="var-section"
              >
                <div class="section-title">环境变量</div>
                <div
                  v-for="(val, key) in entry.snapshot.envVars"
                  :key="String(key)"
                  class="var-item"
                >
                  <span class="var-key">{{ key }}:</span>
                  <span class="var-value">{{ formatValue(val) }}</span>
                </div>
              </div>
              <!-- 临时变量 -->
              <div
                v-if="Object.keys(entry.snapshot.tempVars || {}).length > 0"
                class="var-section"
              >
                <div class="section-title">临时变量</div>
                <div
                  v-for="(val, key) in entry.snapshot.tempVars"
                  :key="String(key)"
                  class="var-item"
                >
                  <span class="var-key">{{ key }}:</span>
                  <span class="var-value">{{ formatValue(val) }}</span>
                </div>
              </div>
              <!-- 无变量 -->
              <div
                v-if="
                  Object.keys(entry.snapshot.envVars || {}).length === 0 &&
                  Object.keys(entry.snapshot.tempVars || {}).length === 0
                "
                class="no-vars"
              >
                暂无变量
              </div>
            </div>
          </div>
        </template>

        <!-- 普通日志 -->
        <template v-else-if="['log', 'warn', 'error'].includes(entry.type)">
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

/* ========== 变量变更日志样式 ========== */
.variable-entry {
  background: hsl(150 60% 50% / 8%);
}

.variable-icon {
  width: 14px;
  height: 14px;
  color: hsl(150 60% 45%);
  flex-shrink: 0;
}

.scope-tag {
  font-size: 10px;
  font-weight: 500;
  padding: 1px 4px;
  border-radius: 3px;
  flex-shrink: 0;
}

.scope-tag.env {
  background: hsl(200 80% 50% / 20%);
  color: hsl(200 80% 45%);
}

.scope-tag.temp {
  background: hsl(40 80% 50% / 20%);
  color: hsl(40 80% 40%);
}

.variable-name {
  font-weight: 600;
  color: hsl(var(--foreground) / 90%);
}

.variable-arrow {
  color: hsl(var(--foreground) / 50%);
  margin: 0 2px;
}

.variable-value {
  color: hsl(150 60% 40%);
  cursor: pointer;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.variable-value:hover {
  color: hsl(150 60% 35%);
  text-decoration: underline;
  text-decoration-style: dashed;
}

.source-tag {
  font-size: 10px;
  color: hsl(var(--foreground) / 40%);
  margin-left: auto;
  flex-shrink: 0;
}

.value-tooltip {
  font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
  font-size: 11px;
}

.value-tooltip .old-value {
  color: hsl(0 70% 65%);
  margin-bottom: 4px;
}

.value-tooltip .new-value {
  color: hsl(150 70% 60%);
}

/* ========== 变量快照样式 ========== */
.snapshot-entry {
  display: block !important;
  background: hsl(220 60% 50% / 8%);
  padding: 0 !important;
}

.snapshot-container {
  width: 100%;
}

.snapshot-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  cursor: pointer;
  user-select: none;
}

.snapshot-header:hover {
  background: hsl(var(--accent) / 30%);
}

.chevron-icon {
  width: 14px;
  height: 14px;
  color: hsl(var(--foreground) / 60%);
  flex-shrink: 0;
}

.snapshot-title {
  font-weight: 500;
  color: hsl(220 60% 50%);
}

.snapshot-count {
  font-size: 11px;
  color: hsl(var(--foreground) / 50%);
  margin-left: auto;
}

.snapshot-content {
  padding: 0 8px 8px 28px;
  border-top: 1px solid hsl(var(--border) / 50%);
}

.var-section {
  margin-top: 8px;
}

.section-title {
  font-size: 11px;
  font-weight: 500;
  color: hsl(var(--foreground) / 60%);
  margin-bottom: 4px;
}

.var-item {
  display: flex;
  gap: 8px;
  padding: 2px 0;
  font-size: 11px;
}

.var-key {
  color: hsl(var(--foreground) / 70%);
  font-weight: 500;
}

.var-value {
  color: hsl(150 60% 40%);
  word-break: break-all;
}

.no-vars {
  color: hsl(var(--foreground) / 40%);
  font-size: 11px;
  padding: 8px 0;
}
</style>
