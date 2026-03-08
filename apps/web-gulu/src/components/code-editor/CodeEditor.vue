<script setup lang="ts">
import { ref, inject, onMounted, onBeforeUnmount, watch, computed } from 'vue';
import * as monaco from 'monaco-editor';
import { usePreferences } from '@vben/preferences';

import type { VariableInfo, VariableGroup } from '#/views/workflow/editor/utils/variable-collector';
import { collectAvailableVariables, VARIABLE_GROUP_LABELS } from '#/views/workflow/editor/utils/variable-collector';
import type { WorkflowParam } from '#/views/workflow/components/WorkflowParamsPanel.vue';
import type { StepNode } from '#/views/workflow/editor/WorkflowTreeEditor.vue';
import { useProjectStore } from '#/store/project';

// 配置 Monaco Editor Worker
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

// @ts-ignore
self.MonacoEnvironment = {
  getWorker(_: unknown, label: string) {
    if (label === 'json') {
      return new jsonWorker();
    }
    if (label === 'css' || label === 'scss' || label === 'less') {
      return new cssWorker();
    }
    if (label === 'html' || label === 'handlebars' || label === 'razor') {
      return new htmlWorker();
    }
    if (label === 'typescript' || label === 'javascript') {
      return new tsWorker();
    }
    return new editorWorker();
  },
};

interface Props {
  modelValue?: string;
  language?: string;
  readonly?: boolean;
  minimap?: boolean;
  lineNumbers?: boolean;
  height?: string;
  placeholder?: string;
  variables?: VariableInfo[];
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  language: 'json',
  readonly: false,
  minimap: false,
  lineNumbers: true,
  height: '200px',
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'change', value: string): void;
}>();

// 获取系统主题
const { isDark } = usePreferences();

// 计算编辑器主题
const editorTheme = computed(() => isDark.value ? 'vs-dark' : 'vs');

const editorContainer = ref<HTMLDivElement>();
let editor: monaco.editor.IStandaloneCodeEditor | null = null;
let completionDisposable: monaco.IDisposable | null = null;

// 是否显示占位符
const showPlaceholder = computed(() => !props.modelValue && props.placeholder);

// --- 变量自动补全 ---
const workflowDefinition = inject<any>('workflowDefinition', null);
const injectedNodeId = inject<any>('currentNodeId', null);
const projectStore = useProjectStore();

const allVariables = computed<VariableInfo[]>(() => {
  if (props.variables?.length) return props.variables;

  if (workflowDefinition?.value) {
    const def = workflowDefinition.value;
    const nodeId = injectedNodeId?.value ?? injectedNodeId;

    const envVariables = projectStore.variableConfigs.map((config) => ({
      name: config.name,
      type: config.extra?.var_type || 'string',
      description: config.description,
    }));

    return collectAvailableVariables({
      params: def.params as WorkflowParam[] | undefined,
      variables: def.variables as Record<string, any> | undefined,
      steps: def.steps as StepNode[] | undefined,
      currentNodeId: nodeId as string | undefined,
      envVariables,
    });
  }
  return [];
});

const GROUP_SORT: Record<VariableGroup, number> = { variable: 0, env: 1, sys: 2 };

function setupVariableCompletion(editorInstance: monaco.editor.IStandaloneCodeEditor) {
  completionDisposable?.dispose();

  const disposables: monaco.IDisposable[] = [];

  // 检测 $ 输入后主动触发建议（部分语言不会自动触发）
  disposables.push(
    editorInstance.onDidChangeModelContent((e) => {
      for (const change of e.changes) {
        if (change.text === '$') {
          setTimeout(() => {
            editorInstance.trigger('variable', 'editor.action.triggerSuggest', {});
          });
          break;
        }
      }
    }),
  );

  disposables.push(
    monaco.languages.registerCompletionItemProvider(props.language, {
      triggerCharacters: ['$'],
      provideCompletionItems(model, position) {
        if (editorInstance.getModel() !== model) return { suggestions: [] };

        const vars = allVariables.value;
        if (!vars.length) return { suggestions: [] };

        const lineContent = model.getLineContent(position.lineNumber);
        // 往回扫描找到 $ 符号
        let dollarCol = -1;
        for (let i = position.column - 2; i >= 0; i--) {
          const ch = lineContent[i];
          if (ch === '$') {
            dollarCol = i + 1; // Monaco column 是 1-based
            break;
          }
          if (!/[a-zA-Z0-9_.]/.test(ch!)) break;
        }
        if (dollarCol < 0) return { suggestions: [] };

        const word = {
          startLineNumber: position.lineNumber,
          startColumn: dollarCol,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        };

        const suggestions: monaco.languages.CompletionItem[] = vars.map((v, idx) => ({
          label: {
            label: `\${${v.name}}`,
            detail: `  ${v.type}`,
            description: VARIABLE_GROUP_LABELS[v.group],
          },
          kind: monaco.languages.CompletionItemKind.Variable,
          insertText: `\${${v.name}}`,
          filterText: `\$${v.name}`,
          range: word,
          sortText: `${GROUP_SORT[v.group]}-${String(idx).padStart(4, '0')}`,
          detail: v.description || `${VARIABLE_GROUP_LABELS[v.group]} · ${v.type}`,
          documentation: v.description,
        }));

        return { suggestions };
      },
    }),
  );

  completionDisposable = {
    dispose() {
      disposables.forEach((d) => d.dispose());
    },
  };
}

onMounted(() => {
  if (!editorContainer.value) return;

  editor = monaco.editor.create(editorContainer.value, {
    value: props.modelValue,
    language: props.language,
    theme: editorTheme.value,
    readOnly: props.readonly,
    minimap: { enabled: props.minimap },
    lineNumbers: props.lineNumbers ? 'on' : 'off',
    scrollBeyondLastLine: false,
    automaticLayout: true,
    fontSize: 12,
    fontFamily: "'SF Mono', 'Monaco', 'Menlo', 'Consolas', monospace",
    tabSize: 2,
    wordWrap: 'on',
    folding: true,
    renderLineHighlight: 'none',
    scrollbar: {
      verticalScrollbarSize: 6,
      horizontalScrollbarSize: 6,
    },
    padding: { top: 8, bottom: 8 },
    lineDecorationsWidth: 0,
    lineNumbersMinChars: 3,
    glyphMargin: false,
    overviewRulerBorder: false,
    hideCursorInOverviewRuler: true,
    overviewRulerLanes: 0,
    quickSuggestions: {
      other: true,
      comments: false,
      strings: true,
    },
  });

  // 监听内容变化
  editor.onDidChangeModelContent(() => {
    const value = editor?.getValue() || '';
    emit('update:modelValue', value);
    emit('change', value);
  });

  setupVariableCompletion(editor);
});

onBeforeUnmount(() => {
  completionDisposable?.dispose();
  editor?.dispose();
});

// 监听外部值变化
watch(() => props.modelValue, (newValue) => {
  if (editor && editor.getValue() !== newValue) {
    editor.setValue(newValue || '');
  }
});

// 监听语言变化
watch(() => props.language, (newLang) => {
  if (editor) {
    const model = editor.getModel();
    if (model) {
      monaco.editor.setModelLanguage(model, newLang);
    }
    if (editor) setupVariableCompletion(editor);
  }
});

// 监听只读状态变化
watch(() => props.readonly, (newReadonly) => {
  editor?.updateOptions({ readOnly: newReadonly });
});

// 监听系统主题变化，自动切换编辑器主题
watch(editorTheme, (newTheme) => {
  monaco.editor.setTheme(newTheme);
});

// 格式化代码
function formatCode() {
  editor?.getAction('editor.action.formatDocument')?.run();
}

// 打开搜索框
function openSearch() {
  editor?.getAction('actions.find')?.run();
}

// 关闭搜索框
function closeSearch() {
  editor?.getAction('closeFindWidget')?.run();
}

// 暴露方法
defineExpose({
  formatCode,
  openSearch,
  closeSearch,
  getEditor: () => editor,
});
</script>

<template>
  <div class="code-editor-wrapper" :style="{ height }">
    <div ref="editorContainer" class="code-editor" />
    <div v-if="showPlaceholder" class="editor-placeholder">
      {{ placeholder }}
    </div>
  </div>
</template>

<style scoped>
.code-editor-wrapper {
  position: relative;
  border: 1px solid hsl(var(--border));
  border-radius: 6px;
  background: hsl(var(--background));
  overflow: hidden;
}

.code-editor {
  width: 100%;
  height: 100%;
}

.editor-placeholder {
  position: absolute;
  top: 12px;
  left: 40px;
  color: hsl(var(--foreground) / 35%);
  font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
  font-size: 12px;
  pointer-events: none;
}
</style>
