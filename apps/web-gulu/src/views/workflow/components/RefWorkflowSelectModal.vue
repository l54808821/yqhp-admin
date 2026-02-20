<script setup lang="ts">
import { ref, watch } from 'vue';

import { Input, Modal, Spin } from 'ant-design-vue';

import type { Workflow } from '#/api/workflow';
import { getWorkflowsByProjectApi } from '#/api/workflow';
import type { CategoryTreeNode } from '#/api/category';
import { useCategoryStore } from '#/store/category';

import { createIconifyIcon } from '@vben/icons';
const Search = createIconifyIcon('lucide:search');
const Check = createIconifyIcon('lucide:check');
const FolderIcon = createIconifyIcon('lucide:folder');

interface Props {
  open: boolean;
  projectId?: number;
  currentWorkflowId?: number;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:open', open: boolean): void;
  (e: 'confirm', workflowId: number, workflowName: string): void;
}>();

const categoryStore = useCategoryStore();

const workflows = ref<Workflow[]>([]);
const loading = ref(false);
const searchText = ref('');
const selectedId = ref<number | null>(null);
const workflowPaths = ref<Record<number, string>>({});

const filteredWorkflows = ref<Workflow[]>([]);

function buildWorkflowPaths() {
  const paths: Record<number, string> = {};

  function traverse(nodes: CategoryTreeNode[], parentPath: string) {
    for (const node of nodes) {
      if (node.type === 'workflow' && node.source_id) {
        paths[node.source_id] = parentPath || '/';
      }
      if (node.children?.length) {
        const currentPath = parentPath ? `${parentPath}/${node.name}` : `/${node.name}`;
        traverse(node.children, node.type === 'folder' ? currentPath : parentPath);
      }
    }
  }

  traverse(categoryStore.categories, '');
  workflowPaths.value = paths;
}

function filterWorkflows(keyword: string) {
  const k = keyword.trim().toLowerCase();
  if (!k) return workflows.value;
  return workflows.value.filter(
    (w) =>
      w.name.toLowerCase().includes(k) ||
      (w.code || '').toLowerCase().includes(k) ||
      (w.description || '').toLowerCase().includes(k) ||
      (workflowPaths.value[w.id] || '').toLowerCase().includes(k),
  );
}

watch(
  () => searchText.value,
  (text) => {
    filteredWorkflows.value = filterWorkflows(text);
  },
);

watch(
  () => workflows.value,
  () => {
    filteredWorkflows.value = filterWorkflows(searchText.value);
  },
);

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      selectedId.value = null;
      searchText.value = '';
      await loadWorkflows();
      buildWorkflowPaths();
    }
  },
);

async function loadWorkflows() {
  if (!props.projectId) return;
  loading.value = true;
  try {
    const list = await getWorkflowsByProjectApi(props.projectId);
    workflows.value = (list || []).filter((w) => w.id !== props.currentWorkflowId);
  } catch {
    workflows.value = [];
  } finally {
    loading.value = false;
  }
}

function handleSelect(wf: Workflow) {
  selectedId.value = wf.id;
}

function handleConfirm() {
  if (!selectedId.value) return;
  const wf = workflows.value.find((w) => w.id === selectedId.value);
  if (wf) {
    emit('confirm', wf.id, wf.name);
  }
  emit('update:open', false);
}

function handleCancel() {
  emit('update:open', false);
}
</script>

<template>
  <Modal
    :open="open"
    title="选择工作流"
    :width="480"
    ok-text="确认"
    cancel-text="取消"
    :ok-button-props="{ disabled: !selectedId }"
    @ok="handleConfirm"
    @cancel="handleCancel"
  >
    <div class="select-modal-body">
      <Input
        v-model:value="searchText"
        placeholder="搜索工作流..."
        allow-clear
        size="middle"
        class="search-input"
      >
        <template #prefix>
          <Search class="size-4 text-muted-foreground" />
        </template>
      </Input>

      <Spin :spinning="loading">
        <div class="workflow-list">
          <div
            v-for="wf in filteredWorkflows"
            :key="wf.id"
            class="workflow-item"
            :class="{ selected: selectedId === wf.id }"
            @click="handleSelect(wf)"
          >
            <div class="workflow-info">
              <div class="workflow-name">{{ wf.name }}</div>
              <div class="workflow-path">
                <FolderIcon class="path-icon" />
                <span class="path-text">{{ workflowPaths[wf.id] || '/' }}</span>
              </div>
            </div>
            <div class="check-indicator">
              <Check v-if="selectedId === wf.id" class="check-icon" />
            </div>
          </div>
          <div v-if="!loading && filteredWorkflows.length === 0" class="empty-state">
            {{ searchText ? '未找到匹配的工作流' : '暂无可引用的工作流' }}
          </div>
        </div>
      </Spin>
    </div>
  </Modal>
</template>

<style scoped>
.select-modal-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.search-input {
  margin-bottom: 2px;
}

.workflow-list {
  max-height: 340px;
  overflow-y: auto;
  border: 1px solid hsl(var(--border) / 60%);
  border-radius: 8px;
}

.workflow-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.workflow-item + .workflow-item {
  border-top: 1px solid hsl(var(--border) / 30%);
}

.workflow-item:hover {
  background: hsl(var(--accent) / 40%);
}

.workflow-item.selected {
  background: hsl(var(--primary) / 7%);
}

.workflow-info {
  flex: 1;
  min-width: 0;
}

.workflow-name {
  font-size: 13px;
  font-weight: 500;
  color: hsl(var(--foreground));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.workflow-item.selected .workflow-name {
  color: hsl(var(--primary));
}

.workflow-path {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
}

.path-icon {
  width: 12px;
  height: 12px;
  color: hsl(var(--muted-foreground) / 60%);
  flex-shrink: 0;
}

.path-text {
  font-size: 12px;
  font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
  color: hsl(var(--muted-foreground) / 70%);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.check-indicator {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.check-icon {
  width: 16px;
  height: 16px;
  color: hsl(var(--primary));
}

.empty-state {
  text-align: center;
  padding: 28px 0;
  font-size: 13px;
  color: hsl(var(--muted-foreground));
}
</style>
