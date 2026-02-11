<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { createIconifyIcon } from '@vben/icons';
import { Button, Dropdown, Input, Menu, MenuItem, Space, Tag, Tooltip } from 'ant-design-vue';

import type { Workflow } from '#/api/workflow';
import { useDebugContext } from './execution/composables/useDebugContext';

// 创建图标
const Undo = createIconifyIcon('lucide:undo-2');
const Redo = createIconifyIcon('lucide:redo-2');
const Save = createIconifyIcon('lucide:save');
const Play = createIconifyIcon('lucide:play');
const Bug = createIconifyIcon('lucide:bug');
const Edit = createIconifyIcon('lucide:pencil');
const Check = createIconifyIcon('lucide:check');
const XIcon = createIconifyIcon('lucide:x');
const ChevronDown = createIconifyIcon('lucide:chevron-down');
const RotateCw = createIconifyIcon('lucide:rotate-cw');
const FileSearch = createIconifyIcon('lucide:file-search');

interface Props {
  workflow: Workflow | null;
  saving?: boolean;
  canUndo?: boolean;
  canRedo?: boolean;
  modified?: boolean;
  debugRunning?: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'save'): void;
  (e: 'undo'): void;
  (e: 'redo'): void;
  (e: 'execute'): void;
  (e: 'debug'): void;
  (e: 'viewDebugContext'): void;
  (e: 'showDebugPanel'): void;
  (e: 'rename', name: string): void;
}>();

// 调试上下文
const debugContext = useDebugContext();
const hasDebugCtx = computed(() => {
  return !!props.workflow?.id && debugContext.hasContext(props.workflow.id);
});

function handleDebugMenuClick({ key }: { key: string | number }) {
  if (key === 'rerun') {
    emit('debug');
  } else if (key === 'result') {
    emit('viewDebugContext');
  } else if (key === 'panel') {
    emit('showDebugPanel');
  }
}

// 名称编辑状态
const isEditingName = ref(false);
const editingName = ref('');

// 监听 workflow 变化，重置编辑状态
watch(() => props.workflow, () => {
  isEditingName.value = false;
  editingName.value = '';
});

// 开始编辑名称
function startEditName() {
  editingName.value = props.workflow?.name || '';
  isEditingName.value = true;
}

// 确认修改名称
function confirmEditName() {
  if (!isEditingName.value) return; // 防止重复触发
  const newName = editingName.value.trim();
  if (newName && newName !== props.workflow?.name) {
    emit('rename', newName);
  }
  isEditingName.value = false;
}

// 取消编辑名称
function cancelEditName() {
  isEditingName.value = false;
  editingName.value = '';
}

// 处理输入框按键
function handleNameKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    confirmEditName();
  } else if (e.key === 'Escape') {
    cancelEditName();
  }
}

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
      <!-- 名称编辑 -->
      <template v-if="isEditingName">
        <Input
          v-model:value="editingName"
          size="small"
          class="name-input"
          placeholder="请输入工作流名称"
          @keydown="handleNameKeydown"
          @blur="confirmEditName"
          autofocus
        />
        <Button type="text" size="small" @click="confirmEditName">
          <template #icon><Check class="size-4 text-green-500" /></template>
        </Button>
        <Button type="text" size="small" @click="cancelEditName">
          <template #icon><XIcon class="size-4 text-red-500" /></template>
        </Button>
      </template>
      <template v-else>
        <span class="workflow-name" @click="startEditName">
          {{ workflow?.name || '工作流' }}
          <Edit class="edit-icon size-3" />
        </span>
      </template>
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
          <template v-if="hasDebugCtx || debugRunning">
            <Dropdown :trigger="['click']" placement="bottomRight">
              <Button type="default" class="debug-btn">
                <template #icon><Bug class="size-4" /></template>
                {{ debugRunning ? '调试中...' : '调试' }}
                <ChevronDown class="size-3 ml-1" />
              </Button>
              <template #overlay>
                <Menu @click="handleDebugMenuClick">
                  <MenuItem key="rerun">
                    <Space :size="6">
                      <RotateCw class="size-4" />
                      <span>重新调试</span>
                    </Space>
                  </MenuItem>
                  <MenuItem v-if="debugRunning" key="panel">
                    <Space :size="6">
                      <Bug class="size-4" />
                      <span>查看进度</span>
                    </Space>
                  </MenuItem>
                  <MenuItem v-if="hasDebugCtx" key="result">
                    <Space :size="6">
                      <FileSearch class="size-4" />
                      <span>调试结果</span>
                    </Space>
                  </MenuItem>
                </Menu>
              </template>
            </Dropdown>
          </template>
          <Button v-else type="default" class="debug-btn" @click="emit('debug')">
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
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 16px;
  font-weight: 500;
  color: hsl(var(--foreground));
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.workflow-name:hover {
  background: hsl(var(--accent) / 30%);
}

.workflow-name .edit-icon {
  opacity: 0;
  transition: opacity 0.2s;
}

.workflow-name:hover .edit-icon {
  opacity: 0.6;
}

.name-input {
  width: 200px;
}

.modified-tag {
  margin-left: 4px;
}

.toolbar-right {
  display: flex;
  align-items: center;
}

.debug-btn {
  position: relative;
}

.debug-btn .ml-1 {
  margin-left: 4px;
}
</style>
