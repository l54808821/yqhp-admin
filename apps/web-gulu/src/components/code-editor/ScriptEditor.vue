<script setup lang="ts">
import { ref, computed } from 'vue';
import { Button, Collapse, Tooltip } from 'ant-design-vue';
import { createIconifyIcon } from '@vben/icons';
import CodeEditor from './CodeEditor.vue';

// 图标
const SparklesIcon = createIconifyIcon('lucide:sparkles');
const FormatIcon = createIconifyIcon('lucide:file-code-2');
const ChevronRightIcon = createIconifyIcon('lucide:chevron-right');
const ChevronLeftIcon = createIconifyIcon('lucide:chevron-left');
const CopyIcon = createIconifyIcon('lucide:copy');
const CheckIcon = createIconifyIcon('lucide:check');

interface Props {
  modelValue?: string;
  language?: string;
  readonly?: boolean;
  height?: string;
  showSnippets?: boolean;
  showToolbar?: boolean;
}

withDefaults(defineProps<Props>(), {
  modelValue: '',
  language: 'javascript',
  readonly: false,
  height: '100%',
  showSnippets: true,
  showToolbar: true,
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'change', value: string): void;
}>();

// 代码编辑器引用
const editorRef = ref<InstanceType<typeof CodeEditor> | null>(null);

// 代码片段面板展开状态
const snippetsPanelOpen = ref(false);
const snippetsPanelWidth = ref(180);
const activeCollapseKeys = ref<string[]>(['basic']);
const copiedSnippet = ref<string | null>(null);

// 代码片段定义
const snippetCategories = [
  {
    key: 'basic',
    title: '基础操作',
    snippets: [
      {
        id: 'get-env-var',
        name: '获取环境变量',
        description: '从环境变量中获取值',
        code: `// 获取环境变量
const value = env.get("变量名");
console.log(value);`,
      },
      {
        id: 'set-env-var',
        name: '设置环境变量',
        description: '设置或更新环境变量',
        code: `// 设置环境变量
env.set("变量名", "变量值");`,
      },
      {
        id: 'get-temp-var',
        name: '获取临时变量',
        description: '获取当前执行上下文中的临时变量',
        code: `// 获取临时变量
const value = vars.get("变量名");
console.log(value);`,
      },
      {
        id: 'set-temp-var',
        name: '设置临时变量',
        description: '设置临时变量（仅在当前执行中有效）',
        code: `// 设置临时变量
vars.set("变量名", "变量值");`,
      },
    ],
  },
  {
    key: 'http',
    title: '网络请求',
    snippets: [
      {
        id: 'http-get',
        name: 'GET 请求',
        description: '发送 HTTP GET 请求',
        code: `// 发送 GET 请求
const response = await http.get("https://api.example.com/data");
console.log(response.body);`,
      },
      {
        id: 'http-post',
        name: 'POST 请求',
        description: '发送 HTTP POST 请求',
        code: `// 发送 POST 请求
const response = await http.post("https://api.example.com/data", {
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    key: "value"
  })
});
console.log(response.body);`,
      },
      {
        id: 'http-with-auth',
        name: '带认证的请求',
        description: '发送带 Bearer Token 认证的请求',
        code: `// 带认证的请求
const token = env.get("access_token");
const response = await http.get("https://api.example.com/user", {
  headers: {
    "Authorization": \`Bearer \${token}\`
  }
});
console.log(response.body);`,
      },
    ],
  },
  {
    key: 'advanced',
    title: '高级功能',
    snippets: [
      {
        id: 'parse-json',
        name: '解析 JSON',
        description: '安全地解析 JSON 字符串',
        code: `// 安全解析 JSON
function parseJSON(str) {
  try {
    return JSON.parse(str);
  } catch (e) {
    console.error("JSON 解析失败:", e.message);
    return null;
  }
}

const data = parseJSON('{"key": "value"}');
console.log(data);`,
      },
      {
        id: 'extract-regex',
        name: '正则提取',
        description: '使用正则表达式提取数据',
        code: `// 正则表达式提取
const text = "订单号: ORD-12345";
const match = text.match(/ORD-(\\d+)/);
if (match) {
  const orderId = match[1];
  console.log("订单ID:", orderId);
  vars.set("orderId", orderId);
}`,
      },
      {
        id: 'random-string',
        name: '生成随机字符串',
        description: '生成指定长度的随机字符串',
        code: `// 生成随机字符串
function randomString(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const random = randomString(16);
console.log("随机字符串:", random);
vars.set("randomStr", random);`,
      },
      {
        id: 'timestamp',
        name: '时间戳操作',
        description: '获取和格式化时间戳',
        code: `// 时间戳操作
const now = Date.now();
const timestamp = Math.floor(now / 1000);
const isoString = new Date(now).toISOString();

console.log("毫秒时间戳:", now);
console.log("秒时间戳:", timestamp);
console.log("ISO 格式:", isoString);

vars.set("timestamp", timestamp);`,
      },
      {
        id: 'base64',
        name: 'Base64 编解码',
        description: 'Base64 编码和解码',
        code: `// Base64 编解码
const original = "Hello, World!";

// 编码
const encoded = btoa(original);
console.log("编码:", encoded);

// 解码
const decoded = atob(encoded);
console.log("解码:", decoded);`,
      },
      {
        id: 'sleep',
        name: '延时等待',
        description: '暂停执行指定毫秒数',
        code: `// 延时等待
async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

console.log("开始等待...");
await sleep(1000); // 等待 1 秒
console.log("等待结束");`,
      },
    ],
  },
  {
    key: 'assertion',
    title: '断言验证',
    snippets: [
      {
        id: 'assert-equal',
        name: '相等断言',
        description: '验证两个值是否相等',
        code: `// 相等断言
const expected = "success";
const actual = response.status;

if (actual === expected) {
  console.log("✓ 断言通过: 值相等");
} else {
  throw new Error(\`断言失败: 期望 "\${expected}", 实际 "\${actual}"\`);
}`,
      },
      {
        id: 'assert-contains',
        name: '包含断言',
        description: '验证字符串是否包含子串',
        code: `// 包含断言
const text = response.body;
const keyword = "success";

if (text.includes(keyword)) {
  console.log(\`✓ 断言通过: 包含 "\${keyword}"\`);
} else {
  throw new Error(\`断言失败: 不包含 "\${keyword}"\`);
}`,
      },
      {
        id: 'assert-status',
        name: '状态码断言',
        description: '验证 HTTP 状态码',
        code: `// 状态码断言
const statusCode = response.status_code;
const expectedCodes = [200, 201];

if (expectedCodes.includes(statusCode)) {
  console.log(\`✓ 断言通过: 状态码 \${statusCode}\`);
} else {
  throw new Error(\`断言失败: 期望状态码 \${expectedCodes.join('/')}, 实际 \${statusCode}\`);
}`,
      },
    ],
  },
];

// 计算编辑器区域宽度
const editorWidth = computed(() => {
  if (!snippetsPanelOpen.value) return '100%';
  return `calc(100% - ${snippetsPanelWidth.value}px)`;
});

// 更新代码
function updateCode(value: string) {
  emit('update:modelValue', value);
  emit('change', value);
}

// 格式化代码
function formatCode() {
  editorRef.value?.formatCode();
}

// 插入代码片段
function insertSnippet(snippet: { code: string }) {
  const editor = editorRef.value?.getEditor();
  if (!editor) return;

  const position = editor.getPosition();
  if (position) {
    // 在当前位置插入代码
    editor.executeEdits('snippet', [
      {
        range: {
          startLineNumber: position.lineNumber,
          startColumn: position.column,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        },
        text: snippet.code + '\n',
      },
    ]);
    // 聚焦编辑器
    editor.focus();
  }
}

// 复制代码片段
async function copySnippet(snippet: { id: string; code: string }) {
  try {
    await navigator.clipboard.writeText(snippet.code);
    copiedSnippet.value = snippet.id;
    setTimeout(() => {
      copiedSnippet.value = null;
    }, 2000);
  } catch (e) {
    console.error('复制失败:', e);
  }
}

// 切换代码片段面板
function toggleSnippetsPanel() {
  snippetsPanelOpen.value = !snippetsPanelOpen.value;
}

// 暴露方法
defineExpose({
  formatCode,
  getEditor: () => editorRef.value?.getEditor(),
  insertSnippet,
});
</script>

<template>
  <div class="script-editor" :style="{ height }">
    <!-- 编辑器区域 -->
    <div class="editor-area" :style="{ width: editorWidth }">
      <!-- 工具栏 -->
      <div v-if="showToolbar" class="editor-toolbar">
        <Tooltip title="插入动态值">
          <Button type="text" size="small" class="toolbar-btn">
            <SparklesIcon class="btn-icon" />
            动态值
          </Button>
        </Tooltip>
        <div class="toolbar-spacer" />
        <Tooltip title="格式化代码">
          <Button type="text" size="small" class="toolbar-btn" @click="formatCode">
            <FormatIcon class="btn-icon" />
            格式化
          </Button>
        </Tooltip>
      </div>

      <!-- 代码编辑器 -->
      <div class="editor-content">
        <CodeEditor
          ref="editorRef"
          :model-value="modelValue"
          :language="language"
          :readonly="readonly"
          height="100%"
          @update:model-value="updateCode"
        />
      </div>
    </div>

    <!-- 代码片段面板 -->
    <div
      v-if="showSnippets"
      class="snippets-panel"
      :class="{ open: snippetsPanelOpen }"
      :style="{ width: snippetsPanelOpen ? `${snippetsPanelWidth}px` : '40px' }"
    >
      <!-- 折叠状态 -->
      <div v-if="!snippetsPanelOpen" class="snippets-collapsed" @click="toggleSnippetsPanel">
        <ChevronLeftIcon class="collapsed-icon" />
        <span class="collapsed-text">代码片段</span>
      </div>

      <!-- 展开状态内容 -->
      <div v-else class="snippets-content">
        <div class="snippets-header">
          <span class="snippets-title">代码片段</span>
          <button class="snippets-close-btn" @click="toggleSnippetsPanel">
            <ChevronRightIcon class="close-icon" />
          </button>
        </div>

        <div class="snippets-body">
          <Collapse
            v-model:activeKey="activeCollapseKeys"
            :bordered="false"
            expand-icon-position="end"
            class="snippets-collapse"
          >
            <Collapse.Panel
              v-for="category in snippetCategories"
              :key="category.key"
              :header="category.title"
            >
              <div class="snippet-list">
                <div
                  v-for="snippet in category.snippets"
                  :key="snippet.id"
                  class="snippet-item"
                  @click="insertSnippet(snippet)"
                >
                  <span class="snippet-name">{{ snippet.name }}</span>
                  <Tooltip title="复制代码">
                    <button
                      class="snippet-copy-btn"
                      @click.stop="copySnippet(snippet)"
                    >
                      <CheckIcon v-if="copiedSnippet === snippet.id" class="copy-icon copied" />
                      <CopyIcon v-else class="copy-icon" />
                    </button>
                  </Tooltip>
                </div>
              </div>
            </Collapse.Panel>
          </Collapse>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.script-editor {
  display: flex;
  width: 100%;
  background: hsl(var(--background));
  overflow: hidden;
}

/* 编辑器区域 */
.editor-area {
  display: flex;
  flex-direction: column;
  min-width: 0;
  transition: width 0.2s ease;
}

.editor-toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  background: hsl(var(--accent) / 50%);
  border-bottom: 1px solid hsl(var(--border));
}

.toolbar-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: hsl(var(--primary));
}

.toolbar-btn:hover {
  background: hsl(var(--primary) / 10%);
}

.btn-icon {
  width: 14px;
  height: 14px;
}

.toolbar-spacer {
  flex: 1;
}

.editor-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.editor-content :deep(.code-editor-wrapper) {
  border: none;
  border-radius: 0;
}

/* 代码片段面板 */
.snippets-panel {
  display: flex;
  flex-shrink: 0;
  background: hsl(var(--card));
  border-left: 1px solid hsl(var(--border));
  transition: width 0.2s ease;
  overflow: hidden;
}

/* 折叠状态 */
.snippets-collapsed {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  padding: 12px 0;
  cursor: pointer;
  transition: background 0.2s;
}

.snippets-collapsed:hover {
  background: hsl(var(--accent));
}

.collapsed-icon {
  width: 16px;
  height: 16px;
  color: hsl(var(--foreground) / 50%);
  margin-bottom: 8px;
}

.collapsed-text {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  font-size: 12px;
  font-weight: 500;
  color: hsl(var(--foreground) / 70%);
}

/* 关闭按钮 */
.snippets-close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s;
}

.snippets-close-btn:hover {
  background: hsl(var(--accent));
}

.close-icon {
  width: 16px;
  height: 16px;
  color: hsl(var(--foreground) / 50%);
}

/* 代码片段内容 */
.snippets-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}

.snippets-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid hsl(var(--border));
}

.snippets-title {
  font-size: 13px;
  font-weight: 600;
  color: hsl(var(--foreground));
}

.snippets-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

/* 折叠面板样式 */
.snippets-collapse :deep(.ant-collapse-item) {
  border: none !important;
  margin-bottom: 4px;
}

.snippets-collapse :deep(.ant-collapse-header) {
  padding: 8px 10px !important;
  font-size: 12px;
  font-weight: 500;
  color: hsl(var(--foreground) / 80%);
  background: hsl(var(--accent) / 30%);
  border-radius: 4px !important;
}

.snippets-collapse :deep(.ant-collapse-content) {
  border: none !important;
}

.snippets-collapse :deep(.ant-collapse-content-box) {
  padding: 4px 0 !important;
}

/* 代码片段列表 */
.snippet-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.snippet-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  font-size: 12px;
  color: hsl(var(--primary));
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s;
}

.snippet-item:hover {
  background: hsl(var(--primary) / 8%);
}

.snippet-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.snippet-copy-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  margin-left: 4px;
  background: transparent;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s, background 0.15s;
}

.snippet-item:hover .snippet-copy-btn {
  opacity: 1;
}

.snippet-copy-btn:hover {
  background: hsl(var(--primary) / 15%);
}

.copy-icon {
  width: 12px;
  height: 12px;
  color: hsl(var(--foreground) / 50%);
}

.copy-icon.copied {
  color: #52c41a;
}
</style>
