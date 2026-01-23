<script setup lang="ts">
import { createIconifyIcon } from '@vben/icons';
import { Card, Spin, Tag, Tree } from 'ant-design-vue';
import type { TreeNode } from './types';

const CheckCircleOutlined = createIconifyIcon('lucide:check-circle');
const CloseCircleOutlined = createIconifyIcon('lucide:x-circle');
const LoadingOutlined = createIconifyIcon('lucide:loader-2');
const ClockCircleOutlined = createIconifyIcon('lucide:clock');
const BanOutlined = createIconifyIcon('lucide:ban');

interface Props {
  loading: boolean;
  isRunning: boolean;
  treeData: TreeNode[];
  expandedKeys: string[];
  selectedStepKey: string | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'select', keys: (string | number)[]): void;
  (e: 'update:expandedKeys', keys: string[]): void;
}>();

// 获取步骤状态图标
function getStepIcon(status?: string) {
  switch (status) {
    case 'success':
      return CheckCircleOutlined;
    case 'failed':
      return CloseCircleOutlined;
    case 'running':
      return LoadingOutlined;
    case 'skipped':
      return BanOutlined;
    default:
      return ClockCircleOutlined;
  }
}

// 获取步骤状态颜色
function getStepColor(status?: string) {
  switch (status) {
    case 'success':
      return '#52c41a';
    case 'failed':
      return '#ff4d4f';
    case 'running':
      return '#1890ff';
    case 'skipped':
      return '#faad14';
    default:
      return '#d9d9d9';
  }
}

// 格式化时长
function formatDuration(ms?: number) {
  if (!ms) return '-';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function handleUpdateExpandedKeys(keys: (string | number)[]) {
  emit('update:expandedKeys', keys.map(String));
}
</script>

<template>
  <Card class="tree-panel" size="small" title="执行步骤">
    <template #default>
      <div class="tree-panel-body">
        <Spin v-if="loading" />
        <Tree
          v-else-if="treeData.length > 0"
          :expanded-keys="expandedKeys"
          :tree-data="treeData"
          :selectable="true"
          :selected-keys="selectedStepKey ? [selectedStepKey] : []"
          @select="emit('select', $event)"
          @update:expanded-keys="handleUpdateExpandedKeys"
        >
          <template #title="{ title, status, duration, type, branchName }">
            <div class="tree-node">
              <component
                :is="getStepIcon(status)"
                :style="{ color: getStepColor(status), marginRight: '6px' }"
                :class="{ 'spin-icon': status === 'running' }"
              />
              <span class="node-title">{{ title }}</span>
              <Tag v-if="type === 'condition' && branchName" color="geekblue" size="small">
                {{ branchName }}
              </Tag>
              <Tag v-else-if="type === 'loop'" color="purple" size="small">循环</Tag>
              <Tag v-if="type === 'ai'" color="blue" size="small">AI</Tag>
              <Tag v-if="type === 'iteration'" color="cyan" size="small">迭代</Tag>
              <Tag v-if="status === 'running'" color="processing" size="small">执行中</Tag>
              <Tag v-else-if="status === 'success' || status === 'completed'" color="success" size="small">
                成功
              </Tag>
              <Tag v-else-if="status === 'failed'" color="error" size="small">失败</Tag>
              <Tag v-else-if="status === 'skipped'" color="warning" size="small">已跳过</Tag>
              <span v-if="duration" class="node-duration">{{ formatDuration(duration) }}</span>
            </div>
          </template>
        </Tree>
        <div v-else class="empty-tip">
          {{ isRunning ? '等待执行...' : '暂无步骤' }}
        </div>
      </div>
    </template>
  </Card>
</template>

<style scoped>
.tree-panel {
  width: 360px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}

.tree-panel :deep(.ant-card-body) {
  flex: 1;
  padding: 0;
  overflow: hidden;
}

.tree-panel-body {
  height: 100%;
  overflow: auto;
  padding: 12px;
}

.tree-panel-body :deep(.ant-tree) {
  font-size: 13px;
}

.tree-panel-body :deep(.ant-tree-indent-unit) {
  width: 16px;
}

.tree-panel-body :deep(.ant-tree-switcher) {
  width: 20px;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 4px;
}

.node-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node-duration {
  font-size: 11px;
  color: #999;
  margin-left: 8px;
}

.spin-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.empty-tip {
  text-align: center;
  color: #999;
  padding: 20px;
}
</style>
