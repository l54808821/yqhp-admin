<script setup lang="ts">
import { ref, watch } from 'vue';

import { Input, Modal, Spin } from 'ant-design-vue';

import type { Workflow } from '#/api/workflow';
import { getWorkflowsByProjectApi } from '#/api/workflow';

import { createIconifyIcon } from '@vben/icons';
const Search = createIconifyIcon('lucide:search');
const WorkflowIcon = createIconifyIcon('lucide:workflow');

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

const workflows = ref<Workflow[]>([]);
const loading = ref(false);
const searchText = ref('');
const selectedId = ref<number | null>(null);

const filteredWorkflows = ref<Workflow[]>([]);

watch(
  () => searchText.value,
  (text) => {
    const keyword = text.trim().toLowerCase();
    if (!keyword) {
      filteredWorkflows.value = workflows.value;
    } else {
      filteredWorkflows.value = workflows.value.filter(
        (w) =>
          w.name.toLowerCase().includes(keyword) ||
          (w.description || '').toLowerCase().includes(keyword),
      );
    }
  },
);

watch(
  () => workflows.value,
  () => {
    const keyword = searchText.value.trim().toLowerCase();
    if (!keyword) {
      filteredWorkflows.value = workflows.value;
    } else {
      filteredWorkflows.value = workflows.value.filter(
        (w) =>
          w.name.toLowerCase().includes(keyword) ||
          (w.description || '').toLowerCase().includes(keyword),
      );
    }
  },
);

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      selectedId.value = null;
      searchText.value = '';
      await loadWorkflows();
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
    :width="520"
    ok-text="确认"
    cancel-text="取消"
    :ok-button-props="{ disabled: !selectedId }"
    @ok="handleConfirm"
    @cancel="handleCancel"
  >
    <div class="select-modal-body">
      <Input
        v-model:value="searchText"
        placeholder="搜索工作流名称..."
        allow-clear
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
            <div class="workflow-icon">
              <WorkflowIcon class="size-5" />
            </div>
            <div class="workflow-info">
              <div class="workflow-name">{{ wf.name }}</div>
              <div v-if="wf.description" class="workflow-desc">{{ wf.description }}</div>
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
  gap: 12px;
}

.search-input {
  margin-bottom: 4px;
}

.workflow-list {
  max-height: 360px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.workflow-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.15s;
}

.workflow-item:hover {
  background: hsl(var(--accent) / 50%);
}

.workflow-item.selected {
  background: hsl(var(--primary) / 8%);
  border-color: hsl(var(--primary));
}

.workflow-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #9254de15;
  color: #9254de;
  flex-shrink: 0;
}

.workflow-info {
  flex: 1;
  min-width: 0;
}

.workflow-name {
  font-size: 14px;
  font-weight: 500;
  color: hsl(var(--foreground));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workflow-desc {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty-state {
  text-align: center;
  padding: 32px 0;
  font-size: 13px;
  color: hsl(var(--muted-foreground));
}
</style>
