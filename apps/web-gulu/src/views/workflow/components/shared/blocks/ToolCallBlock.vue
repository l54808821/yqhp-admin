<script setup lang="ts">
import { computed, ref } from 'vue';

import { createIconifyIcon } from '@vben/icons';

import type { ToolCallBlock } from '../types';
import { getToolParamsRenderer, getToolRenderer } from '../tool-renderers';

const WrenchIcon = createIconifyIcon('lucide:wrench');
const CheckIcon = createIconifyIcon('lucide:check');
const XIcon = createIconifyIcon('lucide:x');
const LoaderIcon = createIconifyIcon('lucide:loader-2');
const ChevronDown = createIconifyIcon('lucide:chevron-down');
const ChevronRight = createIconifyIcon('lucide:chevron-right');

const CodeIcon = createIconifyIcon('lucide:code-xml');
const GlobeIcon = createIconifyIcon('lucide:globe');
const TerminalIcon = createIconifyIcon('lucide:terminal');
const SearchIcon = createIconifyIcon('lucide:search');
const LinkIcon = createIconifyIcon('lucide:link');
const FileIcon = createIconifyIcon('lucide:file');
const VariableIcon = createIconifyIcon('lucide:variable');
const BracesIcon = createIconifyIcon('lucide:braces');

const props = defineProps<{
  block: ToolCallBlock;
  compact?: boolean;
}>();

const expanded = ref(false);
const paramsVisible = ref(false);

const rendererComponent = computed(() => getToolRenderer(props.block.name));
const paramsComponent = computed(() => getToolParamsRenderer(props.block.name));

const toolIconMap: Record<string, any> = {
  code_execute: CodeIcon,
  http_request: GlobeIcon,
  shell_exec: TerminalIcon,
  web_search: SearchIcon,
  web_read: LinkIcon,
  read_file: FileIcon,
  write_file: FileIcon,
  edit_file: FileIcon,
  append_file: FileIcon,
  list_dir: FileIcon,
  var_read: VariableIcon,
  var_write: VariableIcon,
  json_parse: BracesIcon,
};

const toolDisplayNames: Record<string, string> = {
  code_execute: '执行代码',
  http_request: 'HTTP 请求',
  shell_exec: 'Shell 命令',
  web_search: '联网搜索',
  web_read: '网页读取',
  read_file: '读取文件',
  write_file: '写入文件',
  edit_file: '编辑文件',
  append_file: '追加文件',
  list_dir: '列出目录',
  var_read: '读取变量',
  var_write: '写入变量',
  json_parse: 'JSON 解析',
};

const toolIcon = computed(() => toolIconMap[props.block.name] || WrenchIcon);
const toolDisplayName = computed(() => toolDisplayNames[props.block.name] || props.block.name);

const statusIcon = computed(() => {
  switch (props.block.status) {
    case 'running': return LoaderIcon;
    case 'completed': return CheckIcon;
    case 'error': return XIcon;
    default: return WrenchIcon;
  }
});

const statusColor = computed(() => {
  switch (props.block.status) {
    case 'running': return 'hsl(var(--primary))';
    case 'completed': return '#52c41a';
    case 'error': return '#ff4d4f';
    default: return 'hsl(var(--muted-foreground))';
  }
});

const durationText = computed(() => {
  if (!props.block.durationMs) return '';
  if (props.block.durationMs < 1000) return `${props.block.durationMs}ms`;
  return `${(props.block.durationMs / 1000).toFixed(1)}s`;
});
</script>

<template>
  <div class="tool-call-block" :class="{ compact, expanded }">
    <div class="tool-header" @click="expanded = !expanded">
      <component :is="toolIcon" class="tool-icon" />
      <span class="tool-name">{{ toolDisplayName }}</span>
      <component :is="statusIcon" class="status-icon" :style="{ color: statusColor }" :class="{ spinning: block.status === 'running' }" />
      <span v-if="durationText" class="duration">{{ durationText }}</span>
      <component :is="expanded ? ChevronDown : ChevronRight" class="chevron" />
    </div>
    <div v-if="expanded" class="tool-detail">
      <component
        :is="rendererComponent"
        :name="block.name"
        :arguments="block.arguments"
        :result="block.result"
        :is-error="block.isError"
        :status="block.status"
      />
      <div v-if="block.arguments" class="params-section">
        <button class="params-toggle" @click="paramsVisible = !paramsVisible">
          <span class="params-arrow">{{ paramsVisible ? '▾' : '▸' }}</span>
          <span>参数</span>
        </button>
        <div v-if="paramsVisible" class="params-content">
          <component
            :is="paramsComponent"
            :name="block.name"
            :arguments="block.arguments"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tool-call-block {
  border: 1px solid hsl(var(--border));
  border-radius: 6px;
  overflow: hidden;
  font-size: 12px;
}

.tool-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  cursor: pointer;
  background: hsl(var(--muted) / 20%);
  user-select: none;
}

.tool-header:hover {
  background: hsl(var(--muted) / 40%);
}

.tool-icon {
  width: 13px;
  height: 13px;
  color: hsl(var(--muted-foreground));
  flex-shrink: 0;
}

.tool-name {
  flex: 1;
  font-weight: 500;
  color: hsl(var(--foreground));
  font-size: 12px;
}

.status-icon {
  width: 13px;
  height: 13px;
  flex-shrink: 0;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.duration {
  font-size: 11px;
  color: hsl(var(--muted-foreground));
}

.chevron {
  width: 12px;
  height: 12px;
  color: hsl(var(--muted-foreground));
}

.tool-detail {
  border-top: 1px solid hsl(var(--border));
  padding: 8px 10px;
}

.params-section {
  margin-top: 8px;
  padding-top: 6px;
  border-top: 1px dashed hsl(var(--border));
}

.params-toggle {
  display: flex;
  align-items: center;
  gap: 3px;
  background: none;
  border: none;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  font-size: 10px;
  padding: 2px 4px;
  border-radius: 3px;
}

.params-toggle:hover {
  background: hsl(var(--muted) / 40%);
  color: hsl(var(--foreground));
}

.params-arrow {
  font-size: 10px;
  line-height: 1;
  width: 10px;
  text-align: center;
}

.params-content {
  margin-top: 6px;
}
</style>
