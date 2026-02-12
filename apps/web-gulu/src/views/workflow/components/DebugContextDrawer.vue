<script setup lang="ts">
/**
 * 调试上下文抽屉
 * 展示缓存的执行结果 + 环境变量 / 临时变量
 * 与调试执行 Drawer 风格一致（右侧弹出）
 */
import { computed, ref } from 'vue';

import { createIconifyIcon } from '@vben/icons';
import {
  Button,
  Drawer,
  Empty,
  Input,
  message,
  Popconfirm,
  Space,
  Table,
  Tag,
  Tooltip,
} from 'ant-design-vue';

import type { StepResult } from '#/api/debug';
import { useDebugContext } from './execution/composables/useDebugContext';
import { useStepTree } from './execution/composables/useStepTree';
import StepTreePanel from './execution/StepTreePanel.vue';
import StepDetailPanel from './execution/StepDetailPanel.vue';

// 图标
const Trash2Icon = createIconifyIcon('lucide:trash-2');
const CopyIcon = createIconifyIcon('lucide:copy');
const ClockIcon = createIconifyIcon('lucide:clock');
const VariableIcon = createIconifyIcon('lucide:braces');
const SearchIcon = createIconifyIcon('lucide:search');

interface Props {
  open: boolean;
  workflowId: number;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
}>();

const debugContext = useDebugContext();
const searchText = ref('');
const activeTab = ref<'steps' | 'variables'>('steps');
const varTab = ref<'env' | 'temp'>('env');

// 数据
const context = computed(() => debugContext.getContext(props.workflowId));
const summary = computed(() => context.value?.summary);
const variables = computed(() => context.value?.variables || {});
const envVariables = computed(() => context.value?.envVariables || {});
const tempVariables = computed(() => debugContext.getTempVariables(props.workflowId) || {});

// 步骤结果
const cachedStepResults = computed<StepResult[]>(() => summary.value?.stepResults || []);

// generateNodeKey
function generateNodeKey(result: StepResult): string {
  if (result.parentId && result.iteration) {
    return `${result.parentId}_iter${result.iteration}_${result.stepId}`;
  }
  if (result.parentId) {
    return `${result.parentId}_${result.stepId}`;
  }
  return result.stepId;
}

// 步骤树
const stepTree = useStepTree({
  stepResults: cachedStepResults,
  generateNodeKey,
});

// 格式化耗时
function formatDuration(ms: number) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

const statusColor = computed(() => {
  if (!summary.value) return 'default';
  const s = summary.value.status;
  if (s === 'success' || s === 'completed') return 'success';
  if (s === 'failed') return 'error';
  if (s === 'timeout') return 'warning';
  return 'default';
});

const statusText = computed(() => {
  if (!summary.value) return '';
  const s = summary.value.status;
  if (s === 'success' || s === 'completed') return '通过';
  if (s === 'failed') return '失败';
  if (s === 'timeout') return '超时';
  if (s === 'stopped') return '已停止';
  return s;
});

// 变量数量
const envVarCount = computed(() => Object.keys(envVariables.value).length);
const tempVarCount = computed(() => Object.keys(tempVariables.value).length);
const totalVarCount = computed(() => Object.keys(variables.value).length);

// 变量表格
function buildVarTableData(vars: Record<string, unknown>) {
  return Object.entries(vars).map(([key, value]) => ({
    key,
    name: key,
    value: typeof value === 'object' ? JSON.stringify(value) : String(value ?? ''),
    type: typeof value,
    expression: `\${${key}}`,
  }));
}

// 当前 tab 对应的变量数据
const currentVarData = computed(() => {
  const vars = varTab.value === 'env' ? envVariables.value : tempVariables.value;
  const data = buildVarTableData(vars);
  if (!searchText.value) return data;
  const search = searchText.value.toLowerCase();
  return data.filter(
    (item) =>
      item.name.toLowerCase().includes(search) ||
      item.value.toLowerCase().includes(search),
  );
});

const variableColumns = [
  { title: '变量名', dataIndex: 'name', key: 'name', width: 200, ellipsis: true },
  { title: '值', dataIndex: 'value', key: 'value', ellipsis: true },
  { title: '表达式', dataIndex: 'expression', key: 'expression', width: 180 },
  { title: '操作', key: 'action', width: 80 },
];

function handleClose() {
  emit('update:open', false);
}

function copyExpression(expression: string) {
  navigator.clipboard.writeText(expression).then(() => message.success(`已复制: ${expression}`));
}

function copyAllVariables() {
  const allVars = { envVariables: envVariables.value, tempVariables: tempVariables.value };
  navigator.clipboard.writeText(JSON.stringify(allVars, null, 2)).then(() =>
    message.success('所有变量已复制到剪贴板'),
  );
}

function handleClear() {
  debugContext.clearContext(props.workflowId);
  emit('update:open', false);
  message.success('调试上下文已清空');
}
</script>

<template>
  <Drawer
    :open="open"
    title="调试结果"
    placement="right"
    :width="1100"
    :mask-closable="true"
    :body-style="{ padding: 0 }"
    :header-style="{ padding: '10px 16px' }"
    @close="handleClose"
  >
    <template #extra>
      <Space>
        <Tooltip title="复制所有变量">
          <Button size="small" @click.stop="copyAllVariables">
            <template #icon><CopyIcon class="size-4" /></template>
          </Button>
        </Tooltip>
        <Popconfirm
          title="确定清空调试上下文？"
          description="清空后将无法在单步调试中使用缓存变量"
          placement="topRight"
          :overlay-style="{ minWidth: '250px' }"
          @confirm="handleClear"
        >
          <Button size="small" danger>
            <template #icon><Trash2Icon class="size-4" /></template>
            清空
          </Button>
        </Popconfirm>
      </Space>
    </template>

    <div class="drawer-body">
      <!-- Tab 切换 -->
      <div class="drawer-tabs">
        <button
          class="drawer-tab"
          :class="{ active: activeTab === 'steps' }"
          @click="activeTab = 'steps'"
        >
          <ClockIcon class="size-4" />
          执行结果
          <span v-if="cachedStepResults.length > 0" class="tab-count">{{ cachedStepResults.length }}</span>
        </button>
        <button
          class="drawer-tab"
          :class="{ active: activeTab === 'variables' }"
          @click="activeTab = 'variables'"
        >
          <VariableIcon class="size-4" />
          缓存变量
          <span class="tab-count">{{ totalVarCount }}</span>
        </button>
        <div class="tab-spacer" />
        <Input
          v-if="activeTab === 'variables'"
          v-model:value="searchText"
          placeholder="搜索变量..."
          size="small"
          class="search-input"
          allow-clear
        >
          <template #prefix><SearchIcon class="size-3 text-gray-400" /></template>
        </Input>
      </div>

      <!-- 执行结果 -->
      <div v-show="activeTab === 'steps'" class="steps-container">
        <div v-if="summary" class="steps-summary">
          <Tag :color="statusColor">{{ statusText }}</Tag>
          <span>
            总步骤: {{ summary.totalSteps || cachedStepResults.length }}
            <span class="divider">|</span>
            <span class="text-green-600">成功: {{ summary.successSteps || cachedStepResults.filter(s => s.status === 'success').length }}</span>
            <span v-if="summary.failedSteps > 0" class="divider">|</span>
            <span v-if="summary.failedSteps > 0" class="text-red-500">失败: {{ summary.failedSteps }}</span>
            <span class="divider">|</span>
            耗时: {{ formatDuration(summary.totalDurationMs) }}
          </span>
        </div>
        <div v-if="cachedStepResults.length > 0" class="steps-content">
          <StepTreePanel
            :loading="false"
            :is-running="false"
            :tree-data="stepTree.treeData.value"
            :expanded-keys="stepTree.expandedKeys.value"
            :selected-step-key="stepTree.selectedStepKey.value"
            @select="stepTree.handleTreeSelect"
            @update:expanded-keys="stepTree.expandedKeys.value = $event"
          />
          <StepDetailPanel
            :selected-step="stepTree.selectedStep.value"
            :selected-tree-node="stepTree.selectedTreeNode.value"
            :is-iteration-selected="stepTree.isIterationSelected.value"
            :ai-content="null"
            :ai-tool-calls="null"
            :current-a-i-step-id="null"
          />
        </div>
        <Empty v-else description="暂无执行记录" class="empty-state" />
      </div>

      <!-- 缓存变量 -->
      <div v-show="activeTab === 'variables'" class="variables-container">
        <!-- 环境变量 / 临时变量 子 tab -->
        <div class="var-tabs">
          <button
            class="var-tab"
            :class="{ active: varTab === 'env' }"
            @click="varTab = 'env'"
          >
            环境变量
            <span class="var-tab-count">{{ envVarCount }}</span>
          </button>
          <button
            class="var-tab"
            :class="{ active: varTab === 'temp' }"
            @click="varTab = 'temp'"
          >
            临时变量
            <span class="var-tab-count">{{ tempVarCount }}</span>
          </button>
        </div>
        <Table
          v-if="currentVarData.length > 0"
          :columns="variableColumns"
          :data-source="currentVarData"
          :pagination="false"
          size="small"
          :scroll="{ y: 'calc(100vh - 280px)' }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'name'">
              <code class="var-name">{{ record.name }}</code>
            </template>
            <template v-else-if="column.key === 'value'">
              <Tooltip :title="record.value" placement="topLeft">
                <code class="var-value">{{ record.value }}</code>
              </Tooltip>
            </template>
            <template v-else-if="column.key === 'expression'">
              <code class="var-expr">{{ record.expression }}</code>
            </template>
            <template v-else-if="column.key === 'action'">
              <Tooltip title="复制变量表达式">
                <Button type="link" size="small" @click.stop="copyExpression(record.expression)">
                  <template #icon><CopyIcon class="size-3" /></template>
                </Button>
              </Tooltip>
            </template>
          </template>
        </Table>
        <Empty v-else :description="varTab === 'env' ? '暂无环境变量' : '暂无临时变量'" class="empty-state" />
      </div>
    </div>
  </Drawer>
</template>

<style scoped>
.drawer-body {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.drawer-tabs {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  border-bottom: 1px solid hsl(var(--border));
  background: hsl(var(--card));
  flex-shrink: 0;
}

.drawer-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  font-size: 13px;
  color: hsl(var(--foreground) / 70%);
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.drawer-tab:hover {
  background: hsl(var(--accent));
  color: hsl(var(--foreground));
}

.drawer-tab.active {
  background: hsl(var(--primary) / 10%);
  color: hsl(var(--primary));
  border-color: hsl(var(--primary) / 30%);
}

.tab-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  font-size: 11px;
  font-weight: 500;
  background: hsl(var(--accent));
  border-radius: 9px;
}

.drawer-tab.active .tab-count {
  background: hsl(var(--primary) / 15%);
  color: hsl(var(--primary));
}

.tab-spacer {
  flex: 1;
}

.search-input {
  width: 200px;
}

/* 执行结果 */
.steps-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.steps-summary {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  background: hsl(var(--accent) / 50%);
  font-size: 13px;
  flex-shrink: 0;
}

.divider {
  margin: 0 4px;
  color: hsl(var(--foreground) / 30%);
}

.steps-content {
  flex: 1;
  display: flex;
  gap: 12px;
  padding: 12px;
  min-height: 0;
  overflow: hidden;
}

.steps-content :deep(.tree-panel) {
  width: 360px;
  flex-shrink: 0;
}

.steps-content :deep(.detail-panel) {
  flex: 1;
  min-width: 0;
}

/* 变量 */
.variables-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.var-tabs {
  display: flex;
  gap: 0;
  border-bottom: 1px solid hsl(var(--border));
  flex-shrink: 0;
}

.var-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  font-size: 13px;
  color: hsl(var(--foreground) / 60%);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
}

.var-tab:hover {
  color: hsl(var(--foreground));
  background: hsl(var(--accent) / 50%);
}

.var-tab.active {
  color: hsl(var(--primary));
  border-bottom-color: hsl(var(--primary));
}

.var-tab-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  font-size: 11px;
  font-weight: 500;
  background: hsl(var(--accent));
  border-radius: 9px;
}

.var-tab.active .var-tab-count {
  background: hsl(var(--primary) / 15%);
  color: hsl(var(--primary));
}

.var-name {
  font-size: 12px;
  font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 8%);
  padding: 1px 4px;
  border-radius: 3px;
}

.var-value {
  font-size: 12px;
  font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
  color: hsl(var(--foreground) / 80%);
  max-width: 400px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: inline-block;
}

.var-expr {
  font-size: 12px;
  font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
  color: #d4380d;
  background: #fff2e8;
  padding: 1px 6px;
  border-radius: 3px;
}

.empty-state {
  padding: 60px 0;
}
</style>
