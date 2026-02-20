<script setup lang="ts">
import { computed, h, ref, watch } from 'vue';

import { Input, Modal, Spin, Tree } from 'ant-design-vue';
import type { TreeProps } from 'ant-design-vue';

import type { CategoryTreeNode } from '#/api/category';
import { useCategoryStore } from '#/store/category';

import { createIconifyIcon } from '@vben/icons';
import {
  File,
  Folder,
  FolderOpen,
} from '#/components/icons';

const Search = createIconifyIcon('lucide:search');

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

const loading = ref(false);
const searchText = ref('');
const selectedKeys = ref<(string | number)[]>([]);
const expandedKeys = ref<(string | number)[]>([]);
const selectedWorkflow = ref<{ id: number; name: string } | null>(null);

const treeData = computed(() => {
  return buildTreeData(categoryStore.categories, searchText.value);
});

function buildTreeData(
  categories: CategoryTreeNode[],
  search: string,
): TreeProps['treeData'] {
  return categories
    .filter((cat) => {
      if (cat.type === 'workflow' && cat.source_id === props.currentWorkflowId) {
        return false;
      }
      if (!search) return true;
      return (
        cat.name.toLowerCase().includes(search.toLowerCase()) ||
        (cat.children && hasMatchingChild(cat.children, search))
      );
    })
    .map((cat) => ({
      key: cat.type === 'workflow' ? `wf_${cat.source_id}` : `folder_${cat.id}`,
      title: cat.name,
      icon:
        cat.type === 'folder'
          ? expandedKeys.value.includes(`folder_${cat.id}`)
            ? () => h(FolderOpen, { class: 'tree-icon folder-icon' })
            : () => h(Folder, { class: 'tree-icon folder-icon' })
          : () => h(File, { class: 'tree-icon file-icon' }),
      children: cat.children ? buildTreeData(cat.children, search) : undefined,
      isLeaf: cat.type === 'workflow',
      selectable: cat.type === 'workflow',
      data: cat,
    }));
}

function hasMatchingChild(children: CategoryTreeNode[], search: string): boolean {
  return children.some(
    (child) =>
      child.name.toLowerCase().includes(search.toLowerCase()) ||
      (child.children && hasMatchingChild(child.children, search)),
  );
}

function getMatchingKeys(categories: CategoryTreeNode[], search: string): string[] {
  const keys: string[] = [];
  for (const cat of categories) {
    if (
      cat.name.toLowerCase().includes(search.toLowerCase()) ||
      (cat.children && hasMatchingChild(cat.children, search))
    ) {
      keys.push(cat.type === 'workflow' ? `wf_${cat.source_id}` : `folder_${cat.id}`);
      if (cat.children) {
        keys.push(...getMatchingKeys(cat.children, search));
      }
    }
  }
  return keys;
}

function getAllFolderKeys(categories: CategoryTreeNode[]): string[] {
  const keys: string[] = [];
  for (const cat of categories) {
    if (cat.type === 'folder') {
      keys.push(`folder_${cat.id}`);
      if (cat.children) {
        keys.push(...getAllFolderKeys(cat.children));
      }
    }
  }
  return keys;
}

watch(
  () => searchText.value,
  (val) => {
    if (val) {
      expandedKeys.value = getMatchingKeys(categoryStore.categories, val);
    }
  },
);

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      selectedKeys.value = [];
      selectedWorkflow.value = null;
      searchText.value = '';
      loading.value = true;
      try {
        if (!categoryStore.categories.length && props.projectId) {
          await categoryStore.loadCategories(props.projectId);
        }
        expandedKeys.value = getAllFolderKeys(categoryStore.categories);
      } finally {
        loading.value = false;
      }
    }
  },
);

function handleSelect(keys: (string | number)[], info: any) {
  selectedKeys.value = keys;
  const node = info.node;
  if (node.data?.type === 'workflow' && node.data?.source_id) {
    selectedWorkflow.value = { id: node.data.source_id, name: node.data.name };
  } else {
    selectedWorkflow.value = null;
  }
}

function handleConfirm() {
  if (!selectedWorkflow.value) return;
  emit('confirm', selectedWorkflow.value.id, selectedWorkflow.value.name);
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
    :ok-button-props="{ disabled: !selectedWorkflow }"
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
        <div class="tree-wrapper">
          <Tree
            v-if="treeData && treeData.length > 0"
            v-model:expandedKeys="expandedKeys"
            :selected-keys="selectedKeys"
            :tree-data="treeData"
            :show-icon="true"
            block-node
            @select="handleSelect"
          />
          <div v-else class="empty-state">
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

.tree-wrapper {
  max-height: 380px;
  overflow-y: auto;
  border: 1px solid hsl(var(--border) / 50%);
  border-radius: 8px;
  padding: 6px 4px;
}

.tree-wrapper :deep(.ant-tree) {
  background: transparent;
}

.tree-wrapper :deep(.ant-tree-treenode) {
  display: flex;
  align-items: center;
  padding: 2px 0;
}

.tree-wrapper :deep(.ant-tree-switcher) {
  display: inline-flex !important;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.tree-wrapper :deep(.ant-tree-switcher-noop) {
  width: 20px;
}

.tree-wrapper :deep(.ant-tree-node-content-wrapper) {
  display: flex !important;
  align-items: center;
  gap: 4px;
  min-width: 0;
  border-radius: 6px;
  transition: background 0.15s ease;
}

.tree-wrapper :deep(.ant-tree-iconEle) {
  display: inline-flex !important;
  align-items: center;
  flex-shrink: 0;
}

.tree-wrapper :deep(.ant-tree-title) {
  flex: 1;
  min-width: 0;
}

.tree-wrapper :deep(.ant-tree-indent-unit) {
  width: 16px;
}

.tree-wrapper :deep(.ant-tree-node-selected) {
  background: hsl(var(--primary) / 10%) !important;
  color: hsl(var(--primary));
  font-weight: 500;
}

.tree-wrapper :deep(.tree-icon) {
  width: 16px;
  height: 16px;
}

.tree-wrapper :deep(.folder-icon) {
  color: hsl(var(--muted-foreground) / 70%);
}

.tree-wrapper :deep(.file-icon) {
  color: hsl(270 50% 55%);
}

.tree-wrapper :deep(.ant-tree-treenode[aria-selected="false"] .ant-tree-node-content-wrapper) {
  cursor: default;
}

.empty-state {
  text-align: center;
  padding: 28px 0;
  font-size: 13px;
  color: hsl(var(--muted-foreground));
}
</style>
