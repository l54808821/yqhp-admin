<script setup lang="ts">
import { computed } from 'vue';

import { createIconifyIcon } from '@vben/icons';
import { Button, Space, Tag, Tooltip } from 'ant-design-vue';

import type { Workflow } from '#/api/workflow';

// 创建图标
const Undo = createIconifyIcon('lucide:undo-2');
const Redo = createIconifyIcon('lucide:redo-2');
const Save = createIconifyIcon('lucide:save');
const Play = createIconifyIcon('lucide:play');
const Bug = createIconifyIcon('lucide:bug');

interface Props {
  workflow: Workflow | null;
  saving?: boolean;
  canUndo?: boolean;
  canRedo?: boolean;
  modified?: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'save'): void;
  (e: 'undo'): void;
  (e: 'redo'): void;
  (e: 'execute'): void;
  (e: 'debug'): void;
}>();

// 是否可以执行（仅压测和造数流程）
const canExecute = computed(() => {
  const type = props.workflow?.workflow_type;
  return type === 'performance' || type === 'data_generation';
});

// 工作流类型标签
const workflowTypeLabel = computed(() => {
  const type = props.workflow?.workflow_type;
  if (type === 'performance') return '压测';
  if (type === 'data_generation') return '造数';
  return '普通';
});

const workflowTypeColor = computed(() => {
  const type = props.workflow?.workflow_type;
  if (type === 'performance') return 'orange';
  if (type === 'data_generation') return 'purple';
  return 'default';
});
</script>

<template>
  <div class="editor-toolbar">
    <div class="toolbar-left">
      <span class="workflow-name">{{ workflow?.name || '工作流' }}</span>
      <Tag :color="workflowTypeColor">{{ workflowTypeLabel }}</Tag>
      <Tag v-if="modified" color="warning" class="modified-tag">未保存</Tag>
      <Tag v-if="workflow?.status === 1" color="success">启用</Tag>
      <Tag v-else-if="workflow" color="default">禁用</Tag>
    </div>
    <div class="toolbar-right">
      <Space>
        <Tooltip title="撤销 (Ctrl+Z)">
          <Button :disabled="!canUndo" @click="emit('undo')">
            <template #icon><Undo class="size-4" /></template>
          </Button>
        </Tooltip>
        <Tooltip title="重做 (Ctrl+Y)">
          <Button :disabled="!canRedo" @click="emit('redo')">
            <template #icon><Redo class="size-4" /></template>
          </Button>
        </Tooltip>
        <Button type="primary" :loading="saving" @click="emit('save')">
          <template #icon><Save class="size-4" /></template>
          保存
        </Button>
        <Tooltip title="调试工作流（在 Master 上执行）">
          <Button type="default" @click="emit('debug')">
            <template #icon><Bug class="size-4" /></template>
            调试
          </Button>
        </Tooltip>
        <Tooltip v-if="canExecute" title="执行工作流（在 Slave 上执行）">
          <Button type="primary" ghost @click="emit('execute')">
            <template #icon><Play class="size-4" /></template>
            执行
          </Button>
        </Tooltip>
      </Space>
    </div>
  </div>
</template>

<style scoped>
.editor-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  border-bottom: 1px solid hsl(var(--border));
  background: hsl(var(--background));
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.workflow-name {
  font-size: 16px;
  font-weight: 500;
  color: hsl(var(--foreground));
}

.modified-tag {
  margin-left: 4px;
}

.toolbar-right {
  display: flex;
  align-items: center;
}
</style>
