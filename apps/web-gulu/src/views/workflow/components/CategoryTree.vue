<script setup lang="ts">
import { computed, h, ref, watch } from 'vue';

import {
  createIconifyIcon,
  Plus,
  Search,
} from '@vben/icons';

const MoreHorizontal = createIconifyIcon('lucide:ellipsis');
const Trash = createIconifyIcon('lucide:trash-2');
import {
  File,
  Folder,
  FolderOpen,
  Pencil,
} from '#/components/icons';
import {
  Button,
  Dropdown,
  Input,
  Menu,
  message,
  Modal,
  Select,
  Tree,
} from 'ant-design-vue';
import type { TreeProps } from 'ant-design-vue';

import type { CategoryTreeNode } from '#/api/category';

import {
  createCategoryApi,
  deleteCategoryApi,
  moveCategoryApi,
  updateCategoryApi,
} from '#/api/category';
import { createWorkflowApi } from '#/api/workflow';
import { useCategoryStore } from '#/store/category';

interface Props {
  projectId: number;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'selectWorkflow', workflow: { id: number; name: string }): void;
}>();

const categoryStore = useCategoryStore();

const searchValue = ref('');
const expandedKeys = ref<(string | number)[]>([]);
const selectedKeys = ref<(string | number)[]>([]);

// 编辑弹框
const editModalVisible = ref(false);
const editModalTitle = ref('');
const editForm = ref({
  name: '',
  type: 'folder' as 'folder' | 'workflow',
  workflow_type: 'normal' as 'normal' | 'performance' | 'data_generation',
});
const editingCategory = ref<CategoryTreeNode | null>(null);
const isCreating = ref(false);
const parentIdForCreate = ref<number>(0);

// 工作流类型选项
const workflowTypeOptions = [
  { label: '普通流程', value: 'normal' },
  { label: '压测流程', value: 'performance' },
  { label: '造数流程', value: 'data_generation' },
];

// 将分类数据转换为树形结构
const treeData = computed(() => {
  return buildTreeData(categoryStore.categories, searchValue.value);
});

function buildTreeData(
  categories: CategoryTreeNode[],
  search: string,
): TreeProps['treeData'] {
  return categories
    .filter((cat) => {
      if (!search) return true;
      // 搜索时显示匹配的节点及其子节点
      return (
        cat.name.toLowerCase().includes(search.toLowerCase()) ||
        (cat.children && hasMatchingChild(cat.children, search))
      );
    })
    .map((cat) => ({
      key: cat.id,
      title: cat.name,
      icon:
        cat.type === 'folder'
          ? expandedKeys.value.includes(cat.id)
            ? () => h(FolderOpen, { class: 'size-4' })
            : () => h(Folder, { class: 'size-4' })
          : () => h(File, { class: 'size-4' }),
      children: cat.children ? buildTreeData(cat.children, search) : undefined,
      isLeaf: cat.type === 'workflow',
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

// 监听搜索值变化，自动展开匹配的节点
watch(searchValue, (val) => {
  if (val) {
    const keys = getMatchingKeys(categoryStore.categories, val);
    expandedKeys.value = keys;
  }
});

function getMatchingKeys(categories: CategoryTreeNode[], search: string): number[] {
  const keys: number[] = [];
  for (const cat of categories) {
    if (
      cat.name.toLowerCase().includes(search.toLowerCase()) ||
      (cat.children && hasMatchingChild(cat.children, search))
    ) {
      keys.push(cat.id);
      if (cat.children) {
        keys.push(...getMatchingKeys(cat.children, search));
      }
    }
  }
  return keys;
}

// 选择节点
function handleSelect(keys: (string | number)[], info: any) {
  selectedKeys.value = keys;
  const node = info.node;
  if (node.data?.type === 'workflow' && node.data?.source_id) {
    emit('selectWorkflow', { id: node.data.source_id, name: node.data.name });
  }
}

// 拖拽排序
async function handleDrop(info: any) {
  const dragNode = info.dragNode;
  const dropNode = info.node;

  try {
    let targetId = dropNode.key as number;
    let position: 'before' | 'after' | 'inside';

    if (info.dropToGap) {
      // 拖到节点之间
      // dropPosition: -1 表示拖到目标节点前面，1 表示拖到目标节点后面
      position = info.dropPosition === -1 ? 'before' : 'after';
    } else {
      // 拖到节点内部（只有文件夹可以）
      if (dropNode.data?.type !== 'folder') {
        message.warning('只能拖入文件夹');
        return;
      }
      position = 'inside';
    }

    await moveCategoryApi(dragNode.key as number, { target_id: targetId, position });
    await categoryStore.loadCategories(props.projectId);
    message.success('移动成功');
  } catch {
    message.error('移动失败');
  }
}

// 右键菜单
function handleRightClick(info: { node: any }) {
  selectedKeys.value = [info.node.key];
}

// 新建文件夹
function handleCreateFolder(parentId: number = 0) {
  isCreating.value = true;
  parentIdForCreate.value = parentId;
  editingCategory.value = null;
  editForm.value = { name: '', type: 'folder', workflow_type: 'normal' };
  editModalTitle.value = '新建文件夹';
  editModalVisible.value = true;
}

// 新建工作流
function handleCreateWorkflow(parentId: number = 0) {
  isCreating.value = true;
  parentIdForCreate.value = parentId;
  editingCategory.value = null;
  editForm.value = { name: '', type: 'workflow', workflow_type: 'normal' };
  editModalTitle.value = '新建工作流';
  editModalVisible.value = true;
}

// 重命名
function handleRename(category: CategoryTreeNode) {
  isCreating.value = false;
  editingCategory.value = category;
  editForm.value = { name: category.name, type: category.type, workflow_type: 'normal' };
  editModalTitle.value = '重命名';
  editModalVisible.value = true;
}

// 删除
async function handleDelete(category: CategoryTreeNode) {
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除 "${category.name}" 吗？${category.type === 'folder' ? '文件夹下的所有内容也会被删除。' : ''}`,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      try {
        await deleteCategoryApi(category.id);
        await categoryStore.loadCategories(props.projectId);
        message.success('删除成功');
      } catch {
        message.error('删除失败');
      }
    },
  });
}

// 保存编辑
async function handleSaveEdit() {
  if (!editForm.value.name.trim()) {
    message.warning('名称不能为空');
    return;
  }

  try {
    if (isCreating.value) {
      if (editForm.value.type === 'workflow') {
        // 先创建工作流
        const workflow = await createWorkflowApi({
          project_id: props.projectId,
          name: editForm.value.name,
          description: '',
          workflow_type: editForm.value.workflow_type,
          definition: JSON.stringify({ steps: [] }),
        });
        // 再创建分类节点
        await createCategoryApi(props.projectId, {
          parent_id: parentIdForCreate.value,
          name: editForm.value.name,
          type: 'workflow',
          source_id: workflow.id,
        });
      } else {
        await createCategoryApi(props.projectId, {
          parent_id: parentIdForCreate.value,
          name: editForm.value.name,
          type: 'folder',
        });
      }
      message.success('创建成功');
    } else if (editingCategory.value) {
      await updateCategoryApi(editingCategory.value.id, {
        name: editForm.value.name,
      });
      message.success('更新成功');
    }
    await categoryStore.loadCategories(props.projectId);
    editModalVisible.value = false;
  } catch {
    message.error(isCreating.value ? '创建失败' : '更新失败');
  }
}

function handleMenuClick(key: string, node: any) {
  const category = node.data as CategoryTreeNode;
  switch (key) {
    case 'createFolder':
      handleCreateFolder(category.id);
      break;
    case 'createWorkflow':
      handleCreateWorkflow(category.id);
      break;
    case 'rename':
      handleRename(category);
      break;
    case 'delete':
      handleDelete(category);
      break;
  }
}
</script>

<template>
  <div class="category-tree">
    <!-- 搜索框 -->
    <div class="tree-header">
      <Input
        v-model:value="searchValue"
        placeholder="搜索工作流"
        allow-clear
      >
        <template #prefix>
          <Search class="size-4" />
        </template>
      </Input>
    </div>

    <!-- 工具栏 -->
    <div class="tree-toolbar">
      <Button type="text" size="small" @click="handleCreateFolder(0)">
        <template #icon><Folder class="size-4" /></template>
        文件夹
      </Button>
      <Button type="text" size="small" @click="handleCreateWorkflow(0)">
        <template #icon><Plus class="size-4" /></template>
        工作流
      </Button>
    </div>

    <!-- 树形结构 -->
    <div class="tree-content">
      <Tree
        v-model:expandedKeys="expandedKeys"
        v-model:selectedKeys="selectedKeys"
        :tree-data="treeData"
        :show-icon="true"
        :draggable="true"
        block-node
        @select="handleSelect"
        @drop="handleDrop"
        @rightClick="handleRightClick"
      >
        <template #title="{ title, dataRef }">
          <div class="tree-node-wrapper">
            <span class="tree-node-title" :title="title">{{ title }}</span>
            <div class="tree-node-actions" @click.stop>
              <!-- 添加子模块按钮 - 只有文件夹才显示 -->
              <Dropdown v-if="dataRef.data?.type === 'folder'" :trigger="['click']">
                <Button type="text" size="small" class="action-btn">
                  <Plus class="size-3.5" />
                </Button>
                <template #overlay>
                  <Menu @click="({ key }) => handleMenuClick(key as string, dataRef)">
                    <Menu.Item key="createFolder">
                      <div class="menu-item-content">
                        <Folder class="size-4" />
                        <span>新建文件夹</span>
                      </div>
                    </Menu.Item>
                    <Menu.Item key="createWorkflow">
                      <div class="menu-item-content">
                        <File class="size-4" />
                        <span>新建工作流</span>
                      </div>
                    </Menu.Item>
                  </Menu>
                </template>
              </Dropdown>
              <!-- 更多按钮 -->
              <Dropdown :trigger="['click']">
                <Button type="text" size="small" class="action-btn">
                  <MoreHorizontal class="size-3.5" />
                </Button>
                <template #overlay>
                  <Menu @click="({ key }) => handleMenuClick(key as string, dataRef)">
                    <Menu.Item key="rename">
                      <div class="menu-item-content">
                        <Pencil class="size-4" />
                        <span>重命名</span>
                      </div>
                    </Menu.Item>
                    <Menu.Item key="delete" danger>
                      <div class="menu-item-content">
                        <Trash class="size-4" />
                        <span>删除</span>
                      </div>
                    </Menu.Item>
                  </Menu>
                </template>
              </Dropdown>
            </div>
          </div>
        </template>
      </Tree>
    </div>

    <!-- 编辑弹框 -->
    <Modal
      v-model:open="editModalVisible"
      :title="editModalTitle"
      @ok="handleSaveEdit"
    >
      <div class="edit-form">
        <Input
          v-model:value="editForm.name"
          :placeholder="editForm.type === 'folder' ? '文件夹名称' : '工作流名称'"
          @pressEnter="handleSaveEdit"
        />
        <div v-if="isCreating && editForm.type === 'workflow'" class="workflow-type-select">
          <div class="select-label">工作流类型</div>
          <Select
            v-model:value="editForm.workflow_type"
            :options="workflowTypeOptions"
            style="width: 100%"
          />
          <div class="type-hint">
            <span v-if="editForm.workflow_type === 'normal'">普通流程仅支持调试</span>
            <span v-else>支持调试和正式执行</span>
          </div>
        </div>
      </div>
    </Modal>
  </div>
</template>

<style scoped>
.category-tree {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.tree-header {
  padding: 12px;
  border-bottom: 1px solid hsl(var(--border));
}

.tree-toolbar {
  display: flex;
  gap: 4px;
  padding: 8px 12px;
  border-bottom: 1px solid hsl(var(--border));
}

.tree-content {
  flex: 1;
  overflow: auto;
  padding: 8px;
}

.tree-node-wrapper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 4px;
}

.tree-node-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.tree-node-actions {
  display: none;
  align-items: center;
  justify-content: center;
  gap: 2px;
  flex-shrink: 0;
  margin-left: auto;
  height: 100%;
}

.action-btn {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 2px !important;
  height: 20px !important;
  width: 20px !important;
  min-width: 20px !important;
  border-radius: 3px !important;
  color: hsl(var(--foreground) / 60%) !important;
  transition: all 0.15s !important;
}

.action-btn:hover {
  background: hsl(var(--accent)) !important;
  color: hsl(var(--foreground)) !important;
}

:deep(.action-btn.ant-btn) {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
}

:deep(.action-btn.ant-btn:hover) {
  background: hsl(var(--accent)) !important;
  color: hsl(var(--foreground)) !important;
}

.menu-item-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 修复树节点对齐问题 */
:deep(.ant-tree-treenode) {
  display: flex;
  align-items: center;
  padding: 2px 0;
  width: 100%;
}

:deep(.ant-tree-switcher) {
  display: inline-flex !important;
  align-items: center;
  justify-content: center;
  align-self: center;
  width: 20px;
  flex-shrink: 0;
}

:deep(.ant-tree-node-content-wrapper) {
  display: flex !important;
  align-items: center;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

:deep(.ant-tree-iconEle) {
  display: inline-flex !important;
  align-items: center;
  flex-shrink: 0;
}

:deep(.ant-tree-title) {
  flex: 1;
  min-width: 0;
  width: 100%;
}

/* 减少缩进 */
:deep(.ant-tree-indent-unit) {
  width: 10px;
}

/* 确保没有展开图标的节点也对齐 */
:deep(.ant-tree-switcher-noop) {
  width: 20px;
}

/* 悬浮整个节点行时显示操作按钮 */
:deep(.ant-tree-treenode:hover .tree-node-actions) {
  display: flex !important;
}

/* 备选：通过 wrapper 悬浮触发 */
.tree-node-wrapper:hover .tree-node-actions {
  display: flex !important;
}

.edit-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.workflow-type-select {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.select-label {
  font-size: 14px;
  color: hsl(var(--foreground));
}

.type-hint {
  font-size: 12px;
  color: #999;
}
</style>
