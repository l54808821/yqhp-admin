<script setup lang="ts">
/**
 * 数据库节点属性面板
 * 参考 HttpPropertyPanel 的设计风格，提供丰富的数据库操作配置
 */
import { computed, ref, toRef, watch } from 'vue';
import { useDebounceFn } from '@vueuse/core';

import { createIconifyIcon } from '@vben/icons';
import {
  Button,
  Spin,
  Tabs,
} from 'ant-design-vue';

import type { DatabaseStepNode, ParamItem, KeywordConfig, DatabaseResponseData, DatabaseAction } from '../../types';
import { createDatabaseConfig } from '../../types';
import type { StepExecutionResult } from '#/api/debug';
import { useStepDebug } from '../../../components/execution/composables/useStepDebug';
import { useDebugContext } from '../../../components/execution/composables/useDebugContext';

// 子组件
import ParamTable from '../../components/ParamTable.vue';
import ProcessorPanel from '../http/ProcessorPanel.vue';
import DatabaseSettingsPanel from './DatabaseSettingsPanel.vue';
import DatabaseResponsePanel from './DatabaseResponsePanel.vue';
import DatasourceSelector from './DatasourceSelector.vue';
import { SqlEditor } from '#/components/code-editor';

// 图标
const PlayIcon = createIconifyIcon('lucide:play');
const GripHorizontalIcon = createIconifyIcon('lucide:grip-horizontal');

interface Props {
  node: DatabaseStepNode;
  envId?: number;
  workflowId?: number;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update', node: DatabaseStepNode): void;
}>();

// 调试上下文
const debugContext = useDebugContext();
const hasDebugCtx = computed(
  () => !!props.workflowId && debugContext.hasContext(props.workflowId),
);

// 本地数据
const localNode = ref<DatabaseStepNode | null>(null);
const activeTab = ref('sql');

// 单步调试
const { isDebugging, debugResponse, run: runStep } = useStepDebug<DatabaseResponseData | null>({
  workflowId: toRef(props, 'workflowId'),
  envId: toRef(props, 'envId'),
  stream: false,
  transformResult(step: StepExecutionResult) {
    const r = step.result as any;
    const inferredAction = r?.action || inferActionFromSql(localNode.value?.config?.sql || '');
    if (!r) {
      return {
        success: false,
        action: inferredAction,
        durationMs: step.durationMs ?? 0,
        error: step.error || '未获取到执行结果',
      };
    }
    return {
      success: r.success ?? step.success,
      action: inferredAction,
      driver: r.driver,
      durationMs: r.durationMs ?? step.durationMs ?? 0,
      data: r.data,
      columns: r.columns,
      rowCount: r.rowCount ?? r.data?.length,
      rowsAffected: r.rowsAffected ?? r.rows_affected,
      count: r.count,
      exists: r.exists,
      actualSql: r.actualSql ?? r.actual_sql,
      error: r.error ?? step.error,
      consoleLogs: r.consoleLogs,
      assertions: r.assertions,
    };
  },
  transformError(error: string) {
    return {
      success: false,
      action: inferActionFromSql(localNode.value?.config?.sql || ''),
      durationMs: 0,
      error,
    };
  },
});

// 分割面板相关
const containerRef = ref<HTMLElement | null>(null);
const isDragging = ref(false);
const requestPanelHeight = ref(60);

// 同步外部数据
watch(
  () => props.node,
  (newNode) => {
    if (newNode) {
      localNode.value = JSON.parse(JSON.stringify(newNode));
      if (!localNode.value!.config) {
        localNode.value!.config = createDatabaseConfig();
      }
      if (!localNode.value!.config.params) {
        localNode.value!.config.params = [];
      }
      if (!localNode.value!.preProcessors) {
        localNode.value!.preProcessors = [];
      }
      if (!localNode.value!.postProcessors) {
        localNode.value!.postProcessors = [];
      }
    }
  },
  { immediate: true, deep: true },
);

// 从 SQL 语句推断操作类型（用于响应展示）
function inferActionFromSql(sql: string): DatabaseAction {
  const trimmed = sql.trim().toUpperCase();
  if (trimmed.startsWith('SELECT') || trimmed.startsWith('SHOW') || trimmed.startsWith('DESCRIBE') || trimmed.startsWith('EXPLAIN')) {
    return 'query';
  }
  if (trimmed.startsWith('INSERT') || trimmed.startsWith('UPDATE') || trimmed.startsWith('DELETE')
    || trimmed.startsWith('CREATE') || trimmed.startsWith('ALTER') || trimmed.startsWith('DROP') || trimmed.startsWith('TRUNCATE')) {
    return 'execute';
  }
  return 'query';
}

// 防抖更新
const debouncedEmit = useDebounceFn(() => {
  if (localNode.value) {
    emit('update', JSON.parse(JSON.stringify(localNode.value)));
  }
}, 300);

function emitUpdate() {
  debouncedEmit();
}

function updateDatasourceCode(code: string) {
  if (localNode.value?.config) {
    localNode.value.config.datasourceCode = code;
    emitUpdate();
  }
}

function updateSql(sql: string) {
  if (localNode.value?.config) {
    localNode.value.config.sql = sql;
    emitUpdate();
  }
}

function updateParams(params: ParamItem[]) {
  if (localNode.value?.config) {
    localNode.value.config.params = params;
    emitUpdate();
  }
}

function updateSettings(settings: any) {
  if (localNode.value?.config) {
    localNode.value.config.settings = settings;
    emitUpdate();
  }
}

function updatePreProcessors(processors: KeywordConfig[]) {
  if (localNode.value) {
    localNode.value.preProcessors = processors;
    emitUpdate();
  }
}

function updatePostProcessors(processors: KeywordConfig[]) {
  if (localNode.value) {
    localNode.value.postProcessors = processors;
    emitUpdate();
  }
}

function handleExecute() {
  if (!localNode.value) return;

  runStep({
    id: localNode.value.id,
    type: 'database',
    name: localNode.value.name || '数据库操作',
    config: localNode.value.config as any,
    preProcessors: localNode.value.preProcessors?.map((p: KeywordConfig) => ({
      id: p.id,
      type: p.type,
      enabled: p.enabled,
      name: p.name,
      config: p.config,
    })),
    postProcessors: localNode.value.postProcessors?.map((p: KeywordConfig) => ({
      id: p.id,
      type: p.type,
      enabled: p.enabled,
      name: p.name,
      config: p.config,
    })),
  });
}

// 拖拽分割条
function startDrag(e: MouseEvent) {
  isDragging.value = true;
  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', stopDrag);
  e.preventDefault();
}

function onDrag(e: MouseEvent) {
  if (!isDragging.value || !containerRef.value) return;
  const rect = containerRef.value.getBoundingClientRect();
  const offsetY = e.clientY - rect.top;
  const percentage = (offsetY / rect.height) * 100;
  requestPanelHeight.value = Math.min(80, Math.max(20, percentage));
}

function stopDrag() {
  isDragging.value = false;
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
}

// Tab 数量
const paramsCount = computed(() => {
  const params = localNode.value?.config?.params;
  return Array.isArray(params) ? params.filter((p) => p.enabled && p.key).length : 0;
});
const preProcessorsCount = computed(() => {
  const processors = localNode.value?.preProcessors;
  return Array.isArray(processors) ? processors.filter((p: KeywordConfig) => p.enabled).length : 0;
});
const postProcessorsCount = computed(() => {
  const processors = localNode.value?.postProcessors;
  return Array.isArray(processors) ? processors.filter((p: KeywordConfig) => p.enabled).length : 0;
});

// SQL 占位符提示
const sqlPlaceholder = computed(() => {
  const action = localNode.value?.config?.action || 'query';
  switch (action) {
    case 'query':
      return 'SELECT * FROM users WHERE id = ? LIMIT 10;\n\n-- 支持变量: ${userId}\n-- 支持参数占位符: ?';
    case 'execute':
      return 'INSERT INTO users (name, email) VALUES (?, ?);\n\n-- 或 UPDATE / DELETE 语句';
    case 'count':
      return 'SELECT COUNT(*) FROM users WHERE status = ?';
    case 'exists':
      return 'SELECT 1 FROM users WHERE email = ?';
    default:
      return '输入 SQL 语句...';
  }
});
</script>

<template>
  <div class="db-panel" ref="containerRef" v-if="localNode">
    <!-- 请求区域 -->
    <div
      class="request-section"
      :style="{ height: debugResponse ? `${requestPanelHeight}%` : '100%' }"
    >
      <!-- 操作栏 -->
      <div class="action-bar">
        <!-- 数据源选择器 -->
        <DatasourceSelector
          :datasource-code="localNode.config?.datasourceCode || ''"
          @update:datasource-code="updateDatasourceCode"
        />

        <!-- 填充空间 -->
        <div class="action-bar-spacer" />

        <!-- 调试上下文指示器 -->
        <span v-if="hasDebugCtx" class="debug-ctx-dot" title="使用调试上下文变量" />

        <!-- 执行按钮 -->
        <Button
          type="primary"
          class="execute-btn"
          :loading="isDebugging"
          @click="handleExecute"
        >
          <template #icon><PlayIcon class="size-4" /></template>
          执 行
        </Button>
      </div>

      <!-- 配置 Tabs -->
      <Tabs v-model:activeKey="activeTab" class="config-tabs" size="small">
        <Tabs.TabPane key="sql">
          <template #tab>
            <span>SQL</span>
          </template>
          <div class="tab-content sql-tab">
            <SqlEditor
              :model-value="localNode.config?.sql || ''"
              :datasource-code="localNode.config?.datasourceCode || ''"
              :env-id="envId"
              :placeholder="sqlPlaceholder"
              height="100%"
              @update:model-value="updateSql"
            />
          </div>
        </Tabs.TabPane>

        <Tabs.TabPane key="params">
          <template #tab>
            <span>参数</span>
            <span v-if="paramsCount > 0" class="tab-badge">{{ paramsCount }}</span>
          </template>
          <div class="tab-content">
            <div class="params-hint">
              SQL 中使用 <code>?</code> 占位符，参数按顺序绑定。支持变量引用 <code>${'{'}变量名{'}'}</code>
            </div>
            <ParamTable
              :items="localNode.config?.params || []"
              :placeholder="{ key: '参数名（备注用）', value: '参数值' }"
              @update="updateParams"
            />
          </div>
        </Tabs.TabPane>

        <Tabs.TabPane key="pre">
          <template #tab>
            <span>前置操作</span>
            <span v-if="preProcessorsCount > 0" class="tab-badge">{{ preProcessorsCount }}</span>
          </template>
          <div class="tab-content">
            <ProcessorPanel
              mode="pre"
              :processors="localNode.preProcessors || []"
              @update="updatePreProcessors"
            />
          </div>
        </Tabs.TabPane>

        <Tabs.TabPane key="post">
          <template #tab>
            <span>后置操作</span>
            <span v-if="postProcessorsCount > 0" class="tab-badge">{{ postProcessorsCount }}</span>
          </template>
          <div class="tab-content">
            <ProcessorPanel
              mode="post"
              :processors="localNode.postProcessors || []"
              @update="updatePostProcessors"
            />
          </div>
        </Tabs.TabPane>

        <Tabs.TabPane key="settings" tab="设置">
          <div class="tab-content">
            <DatabaseSettingsPanel
              :settings="localNode.config?.settings"
              @update="updateSettings"
            />
          </div>
        </Tabs.TabPane>
      </Tabs>
    </div>

    <!-- 分割条 -->
    <div
      v-if="debugResponse || isDebugging"
      class="resize-bar"
      :class="{ dragging: isDragging }"
      @mousedown="startDrag"
    >
      <GripHorizontalIcon class="resize-icon" />
    </div>

    <!-- 响应区域 -->
    <div
      v-if="debugResponse || isDebugging"
      class="response-section"
      :style="{ height: `calc(${100 - requestPanelHeight}% - 4px)` }"
    >
      <Spin :spinning="isDebugging" tip="执行中...">
        <DatabaseResponsePanel v-if="debugResponse" :response="debugResponse" />
        <div v-else class="loading-placeholder" />
      </Spin>
    </div>
  </div>
</template>

<style scoped>
.db-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: hsl(var(--background));
  overflow: hidden;
}

/* 请求区域 */
.request-section {
  display: flex;
  flex-direction: column;
  min-height: 200px;
  overflow: hidden;
}

/* 操作栏 */
.action-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: hsl(var(--card));
  border-bottom: 1px solid hsl(var(--border));
}

.action-bar-spacer {
  flex: 1;
}

.debug-ctx-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #52c41a;
  box-shadow: 0 0 4px #52c41a80;
  flex-shrink: 0;
}

.execute-btn {
  height: 32px;
  padding: 0 20px;
  font-weight: 500;
  border-radius: 6px;
}

/* 配置 Tabs */
.config-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.config-tabs :deep(.ant-tabs-nav) {
  margin: 0;
  padding: 0 16px;
  background: hsl(var(--card));
  border-bottom: 1px solid hsl(var(--border));
}

.config-tabs :deep(.ant-tabs-nav::before) {
  display: none;
}

.config-tabs :deep(.ant-tabs-tab) {
  padding: 8px 4px;
  font-size: 13px;
}

.config-tabs :deep(.ant-tabs-tab + .ant-tabs-tab) {
  margin-left: 20px;
}

.config-tabs :deep(.ant-tabs-tab-active .ant-tabs-tab-btn) {
  color: hsl(var(--primary));
  font-weight: 500;
}

.config-tabs :deep(.ant-tabs-ink-bar) {
  background: hsl(var(--primary));
}

.config-tabs :deep(.ant-tabs-content-holder) {
  flex: 1;
  overflow: hidden;
}

.config-tabs :deep(.ant-tabs-content) {
  height: 100%;
}

.config-tabs :deep(.ant-tabs-tabpane) {
  height: 100%;
  overflow: hidden;
}

.tab-content {
  height: 100%;
  padding: 12px 16px;
  overflow-y: auto;
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

/* SQL 编辑器 Tab */
.sql-tab {
  padding: 0;
  overflow: hidden;
}

/* 参数提示 */
.params-hint {
  margin-bottom: 12px;
  padding: 8px 12px;
  font-size: 12px;
  color: hsl(var(--foreground) / 55%);
  background: hsl(var(--accent) / 40%);
  border-radius: 6px;
  line-height: 1.6;
}

.params-hint code {
  padding: 1px 4px;
  font-size: 11px;
  font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
  background: hsl(var(--accent));
  border-radius: 3px;
  color: hsl(var(--primary));
}

/* 分割条 */
.resize-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 4px;
  background: hsl(var(--border));
  cursor: row-resize;
  transition: background 0.2s;
  flex-shrink: 0;
}

.resize-bar:hover,
.resize-bar.dragging {
  background: hsl(var(--primary) / 40%);
}

.resize-icon {
  width: 20px;
  height: 8px;
  color: hsl(var(--foreground) / 25%);
}

.resize-bar:hover .resize-icon,
.resize-bar.dragging .resize-icon {
  color: hsl(var(--primary));
}

/* 响应区域 */
.response-section {
  display: flex;
  flex-direction: column;
  min-height: 150px;
  overflow: hidden;
  background: hsl(var(--card));
}

.response-section :deep(.ant-spin-nested-loading),
.response-section :deep(.ant-spin-container) {
  height: 100%;
}

.loading-placeholder {
  height: 100%;
  min-height: 150px;
}
</style>
