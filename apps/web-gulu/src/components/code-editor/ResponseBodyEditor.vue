<script setup lang="ts">
import { ref, computed, watch } from 'vue';

import { createIconifyIcon } from '@vben/icons';
import { Dropdown, Menu, Tooltip, message } from 'ant-design-vue';

import CodeEditor from './CodeEditor.vue';

// 图标
const FormatIcon = createIconifyIcon('lucide:align-left');
const CopyIcon = createIconifyIcon('lucide:copy');
const DownloadIcon = createIconifyIcon('lucide:download');
const SearchIcon = createIconifyIcon('lucide:search');

interface Props {
  body: string;
  bodyType?: 'json' | 'xml' | 'html' | 'text' | 'binary';
  height?: string;
}

const props = withDefaults(defineProps<Props>(), {
  body: '',
  bodyType: 'text',
  height: '100%',
});

// 视图模式: pretty, raw
const viewMode = ref<'pretty' | 'raw'>('pretty');

// 格式类型
const formatType = ref<'json' | 'xml' | 'html' | 'text'>('json');

// 编码
const encoding = ref('utf8');

// CodeEditor ref
const codeEditorRef = ref<InstanceType<typeof CodeEditor>>();

// 同步外部 bodyType
watch(
  () => props.bodyType,
  (newType) => {
    if (newType && newType !== 'binary') {
      formatType.value = newType;
    }
  },
  { immediate: true }
);

// 编辑器语言
const editorLanguage = computed(() => {
  if (viewMode.value === 'raw') return 'plaintext';
  switch (formatType.value) {
    case 'json':
      return 'json';
    case 'xml':
      return 'xml';
    case 'html':
      return 'html';
    default:
      return 'plaintext';
  }
});

// 显示的内容
const displayContent = computed(() => {
  if (!props.body) return '';
  if (viewMode.value === 'raw') return props.body;

  // Pretty 模式下格式化
  if (formatType.value === 'json') {
    try {
      return JSON.stringify(JSON.parse(props.body), null, 2);
    } catch {
      return props.body;
    }
  }
  return props.body;
});

// 格式类型选项
const formatOptions = [
  { key: 'json', label: 'JSON' },
  { key: 'xml', label: 'XML' },
  { key: 'html', label: 'HTML' },
  { key: 'text', label: 'Text' },
];

// 编码选项
const encodingOptions = [
  { key: 'utf8', label: 'UTF-8' },
  { key: 'gbk', label: 'GBK' },
  { key: 'gb2312', label: 'GB2312' },
  { key: 'iso-8859-1', label: 'ISO-8859-1' },
];

// 格式化
function handleFormat() {
  codeEditorRef.value?.formatCode();
}

// 搜索
function handleSearch() {
  codeEditorRef.value?.openSearch();
}

// 复制
async function handleCopy() {
  try {
    await navigator.clipboard.writeText(displayContent.value);
    message.success('已复制到剪贴板');
  } catch {
    message.error('复制失败');
  }
}

// 下载
function handleDownload() {
  const blob = new Blob([displayContent.value], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `response.${formatType.value === 'json' ? 'json' : formatType.value === 'xml' ? 'xml' : 'txt'}`;
  a.click();
  URL.revokeObjectURL(url);
}

// 更新格式类型
function updateFormatType(info: { key: string | number }) {
  formatType.value = String(info.key) as typeof formatType.value;
}

// 更新编码
function updateEncoding(info: { key: string | number }) {
  encoding.value = String(info.key);
}
</script>

<template>
  <div class="response-body-editor">
    <!-- Apifox 风格工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <!-- 视图模式切换 -->
        <div class="view-mode-group">
          <button
            class="mode-btn"
            :class="{ active: viewMode === 'pretty' }"
            @click="viewMode = 'pretty'"
          >
            Pretty
          </button>
          <button
            class="mode-btn"
            :class="{ active: viewMode === 'raw' }"
            @click="viewMode = 'raw'"
          >
            Raw
          </button>
        </div>

        <!-- 格式类型下拉 -->
        <Dropdown :trigger="['click']">
          <button class="dropdown-btn">
            {{ formatOptions.find(o => o.key === formatType)?.label || 'JSON' }}
            <span class="dropdown-arrow">▾</span>
          </button>
          <template #overlay>
            <Menu @click="updateFormatType">
              <Menu.Item v-for="opt in formatOptions" :key="opt.key">
                {{ opt.label }}
              </Menu.Item>
            </Menu>
          </template>
        </Dropdown>

        <!-- 编码下拉 -->
        <Dropdown :trigger="['click']">
          <button class="dropdown-btn">
            {{ encodingOptions.find(o => o.key === encoding)?.label || 'UTF-8' }}
            <span class="dropdown-arrow">▾</span>
          </button>
          <template #overlay>
            <Menu @click="updateEncoding">
              <Menu.Item v-for="opt in encodingOptions" :key="opt.key">
                {{ opt.label }}
              </Menu.Item>
            </Menu>
          </template>
        </Dropdown>

        <!-- 格式化按钮 -->
        <Tooltip title="格式化">
          <button class="icon-btn" @click="handleFormat">
            <FormatIcon class="size-4" />
          </button>
        </Tooltip>
      </div>

      <div class="toolbar-right">
        <!-- 下载 -->
        <Tooltip title="下载">
          <button class="icon-btn" @click="handleDownload">
            <DownloadIcon class="size-4" />
          </button>
        </Tooltip>
        <!-- 复制 -->
        <Tooltip title="复制">
          <button class="icon-btn" @click="handleCopy">
            <CopyIcon class="size-4" />
          </button>
        </Tooltip>
        <!-- 搜索 -->
        <Tooltip title="搜索">
          <button class="icon-btn" @click="handleSearch">
            <SearchIcon class="size-4" />
          </button>
        </Tooltip>
      </div>
    </div>

    <!-- 编辑器 -->
    <div class="editor-wrapper">
      <CodeEditor
        ref="codeEditorRef"
        :model-value="displayContent"
        :language="editorLanguage"
        :readonly="true"
        :line-numbers="true"
        height="100%"
      />
    </div>
  </div>
</template>

<style scoped>
.response-body-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* Apifox 风格工具栏 */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px;
  border-bottom: 1px solid hsl(var(--border) / 50%);
  background: hsl(var(--background));
  flex-shrink: 0;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 视图模式按钮组 */
.view-mode-group {
  display: flex;
  align-items: center;
  border: 1px solid hsl(var(--border));
  border-radius: 4px;
  overflow: hidden;
}

.mode-btn {
  padding: 2px 10px;
  font-size: 12px;
  color: hsl(var(--foreground) / 65%);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.15s ease;
}

.mode-btn:not(:last-child) {
  border-right: 1px solid hsl(var(--border));
}

.mode-btn:hover {
  color: hsl(var(--foreground));
  background: hsl(var(--accent) / 50%);
}

.mode-btn.active {
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 10%);
  font-weight: 500;
}

/* 下拉按钮 */
.dropdown-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  font-size: 12px;
  color: hsl(var(--foreground) / 65%);
  background: transparent;
  border: 1px solid hsl(var(--border));
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.dropdown-btn:hover {
  color: hsl(var(--foreground));
  background: hsl(var(--accent) / 50%);
}

.dropdown-arrow {
  font-size: 10px;
  color: hsl(var(--foreground) / 45%);
}

/* 图标按钮 */
.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: hsl(var(--foreground) / 45%);
  cursor: pointer;
  transition: all 0.15s;
}

.icon-btn:hover {
  background: hsl(var(--accent));
  color: hsl(var(--foreground));
}

/* 编辑器容器 */
.editor-wrapper {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
</style>
