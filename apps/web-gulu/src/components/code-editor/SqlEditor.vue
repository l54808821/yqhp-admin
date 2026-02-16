<script setup lang="ts">
/**
 * SQL 编辑器组件
 * 基于 Monaco Editor 封装，支持 SQL 语法高亮、关键字/函数补全、
 * 动态表/字段联想、SQL 代码片段
 */
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { Button, Collapse, Tooltip, message } from 'ant-design-vue';
import { createIconifyIcon } from '@vben/icons';
import * as monaco from 'monaco-editor';
import { format as formatSQL } from 'sql-formatter';
import CodeEditor from './CodeEditor.vue';
import {
  registerSqlCompletionProvider,
  setTablesCache,
  setColumnsCache,
  clearSchemaCache,
} from './sql-completion';
import type { TableInfo, ColumnInfo } from './sql-completion';
import { getDatabaseTablesApi, getDatabaseColumnsApi } from '#/api/env';

// 图标
const FormatIcon = createIconifyIcon('lucide:file-code-2');
const ChevronRightIcon = createIconifyIcon('lucide:chevron-right');
const ChevronLeftIcon = createIconifyIcon('lucide:chevron-left');
const CopyIcon = createIconifyIcon('lucide:copy');
const CheckIcon = createIconifyIcon('lucide:check');
const RefreshIcon = createIconifyIcon('lucide:refresh-cw');
const DatabaseIcon = createIconifyIcon('lucide:database');
const TableIcon = createIconifyIcon('lucide:table-2');
const SearchIcon = createIconifyIcon('lucide:search');

interface Props {
  modelValue?: string;
  datasourceCode?: string;
  envId?: number;
  height?: string;
  readonly?: boolean;
  showSnippets?: boolean;
  showToolbar?: boolean;
  placeholder?: string;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  datasourceCode: '',
  envId: 0,
  height: '100%',
  readonly: false,
  showSnippets: true,
  showToolbar: true,
  placeholder: '',
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'change', value: string): void;
}>();

// 编辑器引用
const editorRef = ref<InstanceType<typeof CodeEditor> | null>(null);

// 补全 Provider 控制器
let completionController: ReturnType<typeof registerSqlCompletionProvider> | null = null;

// 代码片段面板
const snippetsPanelOpen = ref(false);
const snippetsPanelWidth = ref(200);
const activeCollapseKeys = ref<string[]>(['query']);
const copiedSnippet = ref<string | null>(null);

// Schema 面板
const schemaLoading = ref(false);
const schemaTables = ref<TableInfo[]>([]);
const schemaExpanded = ref<Set<string>>(new Set());
const schemaColumns = ref<Map<string, ColumnInfo[]>>(new Map());
const schemaFilter = ref('');

// SQL 代码片段定义
const snippetCategories = [
  {
    key: 'query',
    title: '基础查询',
    snippets: [
      {
        id: 'select-all',
        name: 'SELECT *',
        code: 'SELECT * FROM table_name\nWHERE 1 = 1\nLIMIT 10;',
      },
      {
        id: 'select-cols',
        name: 'SELECT 指定列',
        code: 'SELECT\n  col1,\n  col2,\n  col3\nFROM table_name\nWHERE condition\nLIMIT 10;',
      },
      {
        id: 'select-count',
        name: 'SELECT COUNT',
        code: 'SELECT COUNT(*) AS total\nFROM table_name\nWHERE condition;',
      },
      {
        id: 'select-distinct',
        name: 'SELECT DISTINCT',
        code: 'SELECT DISTINCT column_name\nFROM table_name;',
      },
      {
        id: 'insert',
        name: 'INSERT INTO',
        code: 'INSERT INTO table_name (col1, col2, col3)\nVALUES (val1, val2, val3);',
      },
      {
        id: 'update',
        name: 'UPDATE',
        code: "UPDATE table_name\nSET col1 = val1,\n    col2 = val2\nWHERE id = 1;",
      },
      {
        id: 'delete',
        name: 'DELETE',
        code: 'DELETE FROM table_name\nWHERE id = 1;',
      },
    ],
  },
  {
    key: 'join',
    title: 'JOIN & 条件',
    snippets: [
      {
        id: 'inner-join',
        name: 'INNER JOIN',
        code: 'SELECT a.*, b.*\nFROM table_a a\nINNER JOIN table_b b ON a.id = b.a_id\nWHERE 1 = 1;',
      },
      {
        id: 'left-join',
        name: 'LEFT JOIN',
        code: 'SELECT a.*, b.*\nFROM table_a a\nLEFT JOIN table_b b ON a.id = b.a_id\nWHERE 1 = 1;',
      },
      {
        id: 'group-by',
        name: 'GROUP BY',
        code: 'SELECT column, COUNT(*) AS cnt\nFROM table_name\nGROUP BY column\nHAVING cnt > 1\nORDER BY cnt DESC;',
      },
      {
        id: 'order-limit',
        name: 'ORDER BY + LIMIT',
        code: 'SELECT *\nFROM table_name\nORDER BY created_at DESC\nLIMIT 10 OFFSET 0;',
      },
      {
        id: 'in-clause',
        name: 'WHERE IN',
        code: "SELECT *\nFROM table_name\nWHERE id IN (1, 2, 3);",
      },
      {
        id: 'between',
        name: 'BETWEEN',
        code: "SELECT *\nFROM table_name\nWHERE created_at BETWEEN '2024-01-01' AND '2024-12-31';",
      },
      {
        id: 'like',
        name: 'LIKE 模糊查询',
        code: "SELECT *\nFROM table_name\nWHERE name LIKE '%keyword%';",
      },
    ],
  },
  {
    key: 'advanced',
    title: '高级查询',
    snippets: [
      {
        id: 'subquery',
        name: '子查询',
        code: 'SELECT *\nFROM table_name\nWHERE id IN (\n  SELECT foreign_id\n  FROM other_table\n  WHERE condition\n);',
      },
      {
        id: 'cte',
        name: 'CTE (WITH)',
        code: 'WITH cte AS (\n  SELECT *\n  FROM table_name\n  WHERE condition\n)\nSELECT * FROM cte;',
      },
      {
        id: 'case-when',
        name: 'CASE WHEN',
        code: "SELECT\n  id,\n  CASE\n    WHEN status = 1 THEN '启用'\n    WHEN status = 0 THEN '禁用'\n    ELSE '未知'\n  END AS status_text\nFROM table_name;",
      },
      {
        id: 'union',
        name: 'UNION ALL',
        code: 'SELECT col1, col2 FROM table_a\nUNION ALL\nSELECT col1, col2 FROM table_b;',
      },
      {
        id: 'exists',
        name: 'EXISTS',
        code: 'SELECT *\nFROM table_a a\nWHERE EXISTS (\n  SELECT 1 FROM table_b b\n  WHERE b.a_id = a.id\n);',
      },
      {
        id: 'transaction',
        name: '事务',
        code: 'BEGIN;\n\nUPDATE accounts SET balance = balance - 100 WHERE id = 1;\nUPDATE accounts SET balance = balance + 100 WHERE id = 2;\n\nCOMMIT;',
      },
    ],
  },
];

// 计算编辑器区域宽度
const editorWidth = computed(() => {
  if (!snippetsPanelOpen.value) return '100%';
  return `calc(100% - ${snippetsPanelWidth.value}px)`;
});

// 面板模式（snippets 或 schema）
const panelMode = ref<'snippets' | 'schema'>('schema');

// 过滤后的表列表
const filteredTables = computed(() => {
  if (!schemaFilter.value) return schemaTables.value;
  const kw = schemaFilter.value.toLowerCase();
  return schemaTables.value.filter(
    (t) => t.name.toLowerCase().includes(kw) || (t.comment && t.comment.toLowerCase().includes(kw)),
  );
});

// ==================== SQL 格式化 Provider ====================

let formatProviderDisposable: monaco.IDisposable | null = null;

function registerSqlFormatProvider() {
  if (formatProviderDisposable) return;
  formatProviderDisposable = monaco.languages.registerDocumentFormattingEditProvider('sql', {
    provideDocumentFormattingEdits(model) {
      const text = model.getValue();
      try {
        const formatted = formatSQL(text, {
          language: 'mysql',
          tabWidth: 2,
          keywordCase: 'upper',
          linesBetweenQueries: 2,
        });
        return [
          {
            range: model.getFullModelRange(),
            text: formatted,
          },
        ];
      } catch {
        return [];
      }
    },
  });
}

// ==================== 生命周期 ====================

onMounted(() => {
  registerSqlFormatProvider();
  completionController = registerSqlCompletionProvider(props.datasourceCode);
  if (props.datasourceCode && props.envId) {
    loadSchema();
  }
});

onBeforeUnmount(() => {
  completionController?.dispose();
  completionController = null;
  formatProviderDisposable?.dispose();
  formatProviderDisposable = null;
});

// ==================== 监听 ====================

watch(
  () => props.datasourceCode,
  (newCode) => {
    completionController?.updateDatasourceCode(newCode || '');
    if (newCode && props.envId) {
      loadSchema();
    } else {
      schemaTables.value = [];
      schemaColumns.value.clear();
    }
  },
);

watch(
  () => props.envId,
  () => {
    if (props.datasourceCode && props.envId) {
      loadSchema();
    }
  },
);

// ==================== Schema 加载 ====================

async function loadSchema() {
  if (!props.datasourceCode || !props.envId) return;

  schemaLoading.value = true;
  try {
    const tables = await getDatabaseTablesApi(props.datasourceCode, props.envId);
    schemaTables.value = tables || [];
    setTablesCache(props.datasourceCode, schemaTables.value);

    // 预加载所有表的字段信息（后台执行）
    for (const table of schemaTables.value) {
      loadTableColumns(table.name);
    }
  } catch (error: any) {
    // schema API 可能还未实现，静默失败
    console.debug('加载 schema 失败（API 可能未实现）:', error.message);
    schemaTables.value = [];
  } finally {
    schemaLoading.value = false;
  }
}

async function loadTableColumns(tableName: string) {
  if (!props.datasourceCode || !props.envId) return;

  try {
    const columns = await getDatabaseColumnsApi(
      props.datasourceCode,
      props.envId,
      tableName,
    );
    if (columns) {
      schemaColumns.value.set(tableName.toLowerCase(), columns);
      setColumnsCache(props.datasourceCode, tableName, columns);
    }
  } catch {
    // 静默失败
  }
}

function toggleSchemaTable(tableName: string) {
  if (schemaExpanded.value.has(tableName)) {
    schemaExpanded.value.delete(tableName);
  } else {
    schemaExpanded.value.add(tableName);
    if (!schemaColumns.value.has(tableName.toLowerCase())) {
      loadTableColumns(tableName);
    }
  }
}

function refreshSchema() {
  if (props.datasourceCode) {
    clearSchemaCache(props.datasourceCode);
  }
  schemaColumns.value.clear();
  schemaExpanded.value.clear();
  loadSchema();
  message.success('Schema 已刷新');
}

// ==================== 编辑器操作 ====================

function updateCode(value: string) {
  emit('update:modelValue', value);
  emit('change', value);
}

function formatCode() {
  editorRef.value?.formatCode();
}

function insertText(text: string) {
  const editor = editorRef.value?.getEditor();
  if (!editor) return;
  const position = editor.getPosition();
  if (position) {
    editor.pushUndoStop();
    editor.executeEdits('sql-insert', [
      {
        range: {
          startLineNumber: position.lineNumber,
          startColumn: position.column,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        },
        text,
      },
    ]);
    editor.pushUndoStop();
    editor.focus();
  }
}

function insertSnippet(snippet: { code: string }) {
  insertText(snippet.code + '\n');
}

function insertTableName(tableName: string) {
  insertText(tableName);
}

function insertColumnName(columnName: string) {
  insertText(columnName);
}

async function copySnippet(snippet: { id: string; code: string }) {
  try {
    await navigator.clipboard.writeText(snippet.code);
    copiedSnippet.value = snippet.id;
    setTimeout(() => {
      copiedSnippet.value = null;
    }, 2000);
  } catch {
    message.error('复制失败');
  }
}

function toggleSnippetsPanel() {
  snippetsPanelOpen.value = !snippetsPanelOpen.value;
}

// 暴露方法
defineExpose({
  formatCode,
  getEditor: () => editorRef.value?.getEditor(),
  insertText,
  refreshSchema,
});
</script>

<template>
  <div class="sql-editor" :style="{ height }">
    <!-- 编辑器区域 -->
    <div class="editor-area" :style="{ width: editorWidth }">
      <!-- 工具栏 -->
      <div v-if="showToolbar" class="editor-toolbar">
        <Tooltip title="格式化 SQL">
          <Button type="text" size="small" class="toolbar-btn" @click="formatCode">
            <FormatIcon class="btn-icon" />
            格式化
          </Button>
        </Tooltip>
        <div class="toolbar-spacer" />
        <Tooltip title="搜索">
          <Button type="text" size="small" class="toolbar-btn" @click="editorRef?.openSearch()">
            <SearchIcon class="btn-icon" />
          </Button>
        </Tooltip>
      </div>

      <!-- 代码编辑器 -->
      <div class="editor-content">
        <CodeEditor
          ref="editorRef"
          :model-value="modelValue"
          language="sql"
          :readonly="readonly"
          :placeholder="placeholder"
          height="100%"
          @update:model-value="updateCode"
        />
      </div>
    </div>

    <!-- 右侧面板（Schema + 代码片段） -->
    <div
      v-if="showSnippets"
      class="side-panel"
      :class="{ open: snippetsPanelOpen }"
      :style="{ width: snippetsPanelOpen ? `${snippetsPanelWidth}px` : '40px' }"
    >
      <!-- 折叠状态 -->
      <div v-if="!snippetsPanelOpen" class="panel-collapsed" @click="toggleSnippetsPanel">
        <ChevronLeftIcon class="collapsed-icon" />
        <span class="collapsed-text">Schema</span>
      </div>

      <!-- 展开状态内容 -->
      <div v-else class="panel-content">
        <!-- 面板头部 + 模式切换 -->
        <div class="panel-header">
          <div class="panel-tabs">
            <button
              class="panel-tab"
              :class="{ active: panelMode === 'schema' }"
              @click="panelMode = 'schema'"
            >
              <DatabaseIcon class="tab-icon" />
              Schema
            </button>
            <button
              class="panel-tab"
              :class="{ active: panelMode === 'snippets' }"
              @click="panelMode = 'snippets'"
            >
              SQL
            </button>
          </div>
          <button class="panel-close-btn" @click="toggleSnippetsPanel">
            <ChevronRightIcon class="close-icon" />
          </button>
        </div>

        <!-- Schema 视图 -->
        <div v-if="panelMode === 'schema'" class="panel-body schema-body">
          <div v-if="datasourceCode" class="schema-toolbar">
            <input
              v-model="schemaFilter"
              class="schema-search"
              placeholder="搜索表名..."
            />
            <Tooltip title="刷新 Schema">
              <button class="schema-refresh-btn" @click="refreshSchema">
                <RefreshIcon class="refresh-icon" :class="{ spinning: schemaLoading }" />
              </button>
            </Tooltip>
          </div>

          <div v-if="!datasourceCode" class="schema-empty">
            请先选择数据源
          </div>
          <div v-else-if="schemaLoading && schemaTables.length === 0" class="schema-empty">
            加载中...
          </div>
          <div v-else-if="schemaTables.length === 0" class="schema-empty">
            暂无表结构信息
            <span class="schema-empty-hint">后端 Schema API 可能未实现</span>
          </div>
          <div v-else class="schema-tree">
            <div
              v-for="table in filteredTables"
              :key="table.name"
              class="schema-table"
            >
              <div class="schema-table-header" @click="toggleSchemaTable(table.name)">
                <TableIcon class="table-icon" />
                <span
                  class="table-name"
                  @dblclick.stop="insertTableName(table.name)"
                  :title="`双击插入 ${table.name}`"
                >
                  {{ table.name }}
                </span>
                <span v-if="table.comment" class="table-comment">{{ table.comment }}</span>
              </div>
              <div v-if="schemaExpanded.has(table.name)" class="schema-columns">
                <div
                  v-for="col in schemaColumns.get(table.name.toLowerCase()) || []"
                  :key="col.name"
                  class="schema-column"
                  @dblclick="insertColumnName(col.name)"
                  :title="`双击插入 ${col.name}`"
                >
                  <span class="col-name">{{ col.name }}</span>
                  <span class="col-type">{{ col.type }}</span>
                </div>
                <div
                  v-if="!schemaColumns.has(table.name.toLowerCase())"
                  class="schema-column-loading"
                >
                  加载字段中...
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 代码片段视图 -->
        <div v-else class="panel-body">
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
                  <Tooltip title="复制">
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
.sql-editor {
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
  padding: 4px 8px;
  background: hsl(var(--accent) / 50%);
  border-bottom: 1px solid hsl(var(--border));
  flex-shrink: 0;
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

/* 右侧面板 */
.side-panel {
  display: flex;
  flex-shrink: 0;
  background: hsl(var(--card));
  border-left: 1px solid hsl(var(--border));
  transition: width 0.2s ease;
  overflow: hidden;
}

/* 折叠状态 */
.panel-collapsed {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  padding: 12px 0;
  cursor: pointer;
  transition: background 0.2s;
}

.panel-collapsed:hover {
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

/* 面板内容 */
.panel-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 6px;
  border-bottom: 1px solid hsl(var(--border));
  flex-shrink: 0;
}

.panel-tabs {
  display: flex;
  gap: 2px;
}

.panel-tab {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 3px 8px;
  font-size: 11px;
  font-weight: 500;
  color: hsl(var(--foreground) / 55%);
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
}

.panel-tab:hover {
  color: hsl(var(--foreground) / 80%);
  background: hsl(var(--accent) / 50%);
}

.panel-tab.active {
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 10%);
}

.tab-icon {
  width: 12px;
  height: 12px;
}

.panel-close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s;
}

.panel-close-btn:hover {
  background: hsl(var(--accent));
}

.close-icon {
  width: 14px;
  height: 14px;
  color: hsl(var(--foreground) / 50%);
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 6px;
}

/* Schema 面板 */
.schema-body {
  padding: 0;
}

.schema-toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px;
  border-bottom: 1px solid hsl(var(--border) / 50%);
}

.schema-search {
  flex: 1;
  height: 24px;
  padding: 0 6px;
  font-size: 11px;
  border: 1px solid hsl(var(--border));
  border-radius: 4px;
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  outline: none;
}

.schema-search:focus {
  border-color: hsl(var(--primary) / 50%);
}

.schema-search::placeholder {
  color: hsl(var(--foreground) / 35%);
}

.schema-refresh-btn {
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

.schema-refresh-btn:hover {
  background: hsl(var(--accent));
}

.refresh-icon {
  width: 13px;
  height: 13px;
  color: hsl(var(--foreground) / 50%);
}

.refresh-icon.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.schema-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 12px;
  font-size: 12px;
  color: hsl(var(--foreground) / 40%);
  text-align: center;
  gap: 4px;
}

.schema-empty-hint {
  font-size: 11px;
  color: hsl(var(--foreground) / 30%);
}

.schema-tree {
  padding: 4px;
}

.schema-table {
  margin-bottom: 1px;
}

.schema-table-header {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 6px;
  font-size: 12px;
  border-radius: 3px;
  cursor: pointer;
  transition: background 0.15s;
}

.schema-table-header:hover {
  background: hsl(var(--accent) / 50%);
}

.table-icon {
  width: 13px;
  height: 13px;
  color: hsl(var(--primary) / 70%);
  flex-shrink: 0;
}

.table-name {
  font-weight: 500;
  color: hsl(var(--foreground) / 85%);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.table-comment {
  font-size: 10px;
  color: hsl(var(--foreground) / 40%);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-left: auto;
}

.schema-columns {
  padding-left: 20px;
}

.schema-column {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 6px;
  font-size: 11px;
  border-radius: 3px;
  cursor: pointer;
  transition: background 0.15s;
}

.schema-column:hover {
  background: hsl(var(--accent) / 40%);
}

.col-name {
  color: hsl(var(--foreground) / 75%);
  font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
}

.col-type {
  font-size: 10px;
  color: hsl(var(--foreground) / 35%);
  margin-left: auto;
}

.schema-column-loading {
  padding: 4px 6px;
  font-size: 11px;
  color: hsl(var(--foreground) / 35%);
}

/* 代码片段样式 */
.snippets-collapse :deep(.ant-collapse-item) {
  border: none !important;
  margin-bottom: 2px;
}

.snippets-collapse :deep(.ant-collapse-header) {
  padding: 6px 8px !important;
  font-size: 11px;
  font-weight: 500;
  color: hsl(var(--foreground) / 80%);
  background: hsl(var(--accent) / 30%);
  border-radius: 4px !important;
}

.snippets-collapse :deep(.ant-collapse-content) {
  border: none !important;
}

.snippets-collapse :deep(.ant-collapse-content-box) {
  padding: 2px 0 !important;
}

.snippet-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.snippet-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px;
  font-size: 11px;
  color: hsl(var(--primary));
  border-radius: 3px;
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
  width: 18px;
  height: 18px;
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
  width: 11px;
  height: 11px;
  color: hsl(var(--foreground) / 50%);
}

.copy-icon.copied {
  color: #52c41a;
}
</style>
