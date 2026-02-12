<script setup lang="ts">
import { computed, ref } from 'vue';

import { createIconifyIcon } from '@vben/icons';
import {
  Badge,
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
const BugIcon = createIconifyIcon('lucide:bug');
const Trash2Icon = createIconifyIcon('lucide:trash-2');
const CopyIcon = createIconifyIcon('lucide:copy');
const ClockIcon = createIconifyIcon('lucide:clock');
const VariableIcon = createIconifyIcon('lucide:braces');
const ChevronUpIcon = createIconifyIcon('lucide:chevron-up');
const SearchIcon = createIconifyIcon('lucide:search');

interface Props {
  workflowId: number;
}

const props = defineProps<Props>();

const debugContext = useDebugContext();
const drawerOpen = ref(false);
const searchText = ref('');
const activeTab = ref<'variables' | 'steps'>('variables');

// 是否有调试上下文
const hasContext = computed(() => debugContext.hasContext(props.workflowId));
const context = computed(() => debugContext.getContext(props.workflowId));
const summary = computed(() => context.value?.summary);
const variables = computed(() => context.value?.variables || {});
const envVariables = computed(() => context.value?.envVariables || {});

// 临时变量（步骤执行产生的，不包含环境变量）
const tempVariables = computed(() => {
  return debugContext.getTempVariables(props.workflowId) || {};
});

// 步骤结果（用于 StepTreePanel）
const cachedStepResults = computed<StepResult[]>(() => {
  return summary.value?.stepResults || [];
});
const stepResultsRef = computed(() => cachedStepResults.value);

// generateNodeKey 函数（与 useExecution 中逻辑一致）
function generateNodeKey(result: StepResult): string {
  if (result.parentId && result.iteration) {
    return `${result.parentId}_iter${result.iteration}_${result.stepId}`;
  }
  if (result.parentId) {
    return `${result.parentId}_${result.stepId}`;
  }
  return result.stepId;
}

// 使用 useStepTree 构建树结构
const stepTree = useStepTree({
  stepResults: stepResultsRef,
  generateNodeKey,
});

// 格式化时间
function formatTime(timestamp: number) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN', { hour12: false });
}

// 格式化耗时
function formatDuration(ms: number) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

// 统计信息
const statsText = computed(() => {
  if (!summary.value) return '';
  const s = summary.value;
  return `${s.successSteps}/${s.totalSteps} 通过`;
});

const statusColor = computed(() => {
  if (!summary.value) return 'default';
  const status = summary.value.status;
  if (status === 'success' || status === 'completed') return 'success';
  if (status === 'failed') return 'error';
  if (status === 'timeout') return 'warning';
  return 'default';
});

const statusText = computed(() => {
  if (!summary.value) return '无调试记录';
  const status = summary.value.status;
  if (status === 'success' || status === 'completed') return '通过';
  if (status === 'failed') return '失败';
  if (status === 'timeout') return '超时';
  if (status === 'stopped') return '已停止';
  return status;
});

// 变量数量
const envVarCount = computed(() => Object.keys(envVariables.value).length);
const tempVarCount = computed(() => Object.keys(tempVariables.value).length);
const totalVarCount = computed(() => Object.keys(variables.value).length);

// 构建变量表格数据（按类别分组）
function buildVarTableData(vars: Record<string, unknown>, source: string) {
  return Object.entries(vars).map(([key, value]) => ({
    key: `${source}_${key}`,
    name: key,
    value: typeof value === 'object' ? JSON.stringify(value) : String(value ?? ''),
    type: typeof value,
    source,
  }));
}

const variableTableData = computed(() => {
  const envData = buildVarTableData(envVariables.value, '环境变量');
  const tempData = buildVarTableData(tempVariables.value, '临时变量');
  const data = [...envData, ...tempData];

  if (!searchText.value) return data;
  const search = searchText.value.toLowerCase();
  return data.filter(
    (item) =>
      item.name.toLowerCase().includes(search) ||
      item.value.toLowerCase().includes(search) ||
      item.source.toLowerCase().includes(search),
  );
});

// 变量表格列
const variableColumns = [
  {
    title: '变量名',
    dataIndex: 'name',
    key: 'name',
    width: 200,
    ellipsis: true,
  },
  {
    title: '值',
    dataIndex: 'value',
    key: 'value',
    ellipsis: true,
  },
  {
    title: '来源',
    dataIndex: 'source',
    key: 'source',
    width: 100,
  },
  {
    title: '操作',
    key: 'action',
    width: 60,
  },
];

function openDrawer() {
  drawerOpen.value = true;
}

function copyValue(value: string) {
  navigator.clipboard.writeText(value).then(() => {
    message.success('已复制');
  });
}

function copyAllVariables() {
  const allVars = {
    envVariables: envVariables.value,
    tempVariables: tempVariables.value,
  };
  const text = JSON.stringify(allVars, null, 2);
  navigator.clipboard.writeText(text).then(() => {
    message.success('所有变量已复制到剪贴板');
  });
}

function handleClear() {
  debugContext.clearContext(props.workflowId);
  drawerOpen.value = false;
  message.success('调试上下文已清空');
}

function getBodyContainer() {
  return document.body;
}
</script>

<template>
  <!-- 底部栏（非 absolute，正常 flex 流） -->
  <Transition name="slide-up">
    <div v-if="hasContext" class="debug-context-bar" @click="openDrawer">
      <div class="bar-content">
        <div class="bar-left">
          <BugIcon class="bar-icon" />
          <Tag :color="statusColor" size="small">{{ statusText }}</Tag>
          <span v-if="summary" class="bar-stats">
            {{ statsText }}
            <span class="bar-divider">|</span>
            {{ formatDuration(summary.totalDurationMs) }}
          </span>
        </div>
        <div class="bar-right">
          <Badge :count="totalVarCount" :overflow-count="999" size="small">
            <Tag color="blue" class="var-tag">
              <VariableIcon class="size-3" />
              变量
            </Tag>
          </Badge>
          <span class="bar-time">{{ formatTime(context?.timestamp || 0) }}</span>
          <ChevronUpIcon class="bar-expand-icon" />
        </div>
      </div>
    </div>
  </Transition>

  <!-- 抽屉 -->
  <Drawer
    v-model:open="drawerOpen"
    title="调试上下文"
    placement="bottom"
    :height="520"
    :body-style="{ padding: 0 }"
    :header-style="{ padding: '12px 16px' }"
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

    <div class="drawer-content">
      <!-- Tab 切换 -->
      <div class="drawer-tabs">
        <button
          class="drawer-tab"
          :class="{ active: activeTab === 'variables' }"
          @click="activeTab = 'variables'"
        >
          <VariableIcon class="size-4" />
          缓存变量
          <span class="tab-count">{{ totalVarCount }}</span>
        </button>
        <button
          class="drawer-tab"
          :class="{ active: activeTab === 'steps' }"
          @click="activeTab = 'steps'"
        >
          <ClockIcon class="size-4" />
          执行结果
          <span v-if="cachedStepResults.length > 0" class="tab-count">{{ cachedStepResults.length }}</span>
        </button>
        <div class="tab-spacer" />
        <!-- 搜索框（仅变量 tab 显示） -->
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

      <!-- 变量表格 -->
      <div v-show="activeTab === 'variables'" class="table-container">
        <!-- 变量统计 -->
        <div v-if="totalVarCount > 0" class="var-summary">
          <Tag color="green" size="small">环境变量: {{ envVarCount }}</Tag>
          <Tag color="orange" size="small">临时变量: {{ tempVarCount }}</Tag>
        </div>
        <Table
          v-if="totalVarCount > 0"
          :columns="variableColumns"
          :data-source="variableTableData"
          :pagination="false"
          size="small"
          :scroll="{ y: 350 }"
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
            <template v-else-if="column.key === 'source'">
              <Tag :color="record.source === '环境变量' ? 'green' : 'orange'" size="small">
                {{ record.source }}
              </Tag>
            </template>
            <template v-else-if="column.key === 'action'">
              <Button type="link" size="small" @click.stop="copyValue(record.value)">
                <template #icon><CopyIcon class="size-3" /></template>
              </Button>
            </template>
          </template>
        </Table>
        <Empty v-else description="暂无缓存变量" />
      </div>

      <!-- 执行结果（复用 StepTreePanel + StepDetailPanel） -->
      <div v-show="activeTab === 'steps'" class="steps-container">
        <div v-if="summary" class="steps-summary">
          <Tag :color="statusColor">{{ statusText }}</Tag>
          <span>
            总步骤: {{ summary.totalSteps || cachedStepResults.length }}
            <span class="summary-divider">|</span>
            <span class="text-green-600">成功: {{ summary.successSteps || cachedStepResults.filter(s => s.status === 'success').length }}</span>
            <span v-if="summary.failedSteps > 0" class="summary-divider">|</span>
            <span v-if="summary.failedSteps > 0" class="text-red-500">失败: {{ summary.failedSteps }}</span>
            <span class="summary-divider">|</span>
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
        <Empty v-else description="暂无执行记录" />
      </div>
    </div>
  </Drawer>
</template>

<style scoped>
/* 底部栏 - 正常 flex 流，不再用 absolute */
.debug-context-bar {
  flex-shrink: 0;
  background: hsl(var(--card));
  border-top: 1px solid hsl(var(--border));
  cursor: pointer;
  transition: background 0.2s;
}

.debug-context-bar:hover {
  background: hsl(var(--accent));
}

.bar-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 16px;
  height: 36px;
}

.bar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bar-icon {
  width: 16px;
  height: 16px;
  color: hsl(var(--primary));
}

.bar-stats {
  font-size: 12px;
  color: hsl(var(--foreground) / 70%);
}

.bar-divider {
  margin: 0 6px;
  color: hsl(var(--foreground) / 30%);
}

.bar-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.var-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.bar-time {
  font-size: 12px;
  color: hsl(var(--foreground) / 50%);
}

.bar-expand-icon {
  width: 14px;
  height: 14px;
  color: hsl(var(--foreground) / 40%);
  transition: transform 0.2s;
}

.debug-context-bar:hover .bar-expand-icon {
  color: hsl(var(--primary));
  transform: translateY(-2px);
}

/* 抽屉内容 */
.drawer-content {
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

.table-container {
  flex: 1;
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* 变量统计 */
.var-summary {
  display: flex;
  gap: 8px;
  padding: 8px 16px;
  background: hsl(var(--accent) / 30%);
  border-bottom: 1px solid hsl(var(--border));
  flex-shrink: 0;
}

/* 变量样式 */
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

/* 步骤结果区域 */
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

.summary-divider {
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
  width: 320px;
  flex-shrink: 0;
}

.steps-content :deep(.detail-panel) {
  flex: 1;
  min-width: 0;
}

/* 过渡动画 */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>
