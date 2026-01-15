<script setup lang="ts">
import { computed, h, ref, watch } from 'vue';

import {
  ChevronDown,
  ChevronRight,
  Copy,
  Plus,
  X,
  createIconifyIcon,
} from '@vben/icons';

// 禁用/启用图标
const Ban = createIconifyIcon('lucide:ban');
const CircleCheck = createIconifyIcon('lucide:circle-check');

import {
  Button,
  Checkbox,
  Dropdown,
  Menu,
  Popconfirm,
  Tooltip,
  Tree,
} from 'ant-design-vue';
import type { TreeProps } from 'ant-design-vue';

import { getNodeTypeConfig, getNodeTypes } from './node-types';

export interface StepNode {
  id: string;
  type: string;
  name: string;
  disabled?: boolean; // 是否禁用
  config?: Record<string, any>;
  loop?: {
    mode?: string;           // 循环模式: for, foreach, while
    count?: number;          // for 模式的迭代次数
    items?: string;          // foreach 模式的集合
    item_var?: string;       // foreach 模式的元素变量名
    condition?: string;      // while 模式的条件表达式
    max_iterations?: number; // while 模式的最大迭代次数
    break_condition?: string;    // 跳出条件
    continue_condition?: string; // 跳过条件
  };
  children?: StepNode[]; // 前端用于显示，保存时会转换
}

interface Props {
  definition: { name: string; steps: StepNode[] };
  readonly?: boolean;
  expandedKeys?: string[];
  selectedKeys?: string[];
  checkedKeys?: string[];  // 外部传入的勾选状态
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false,
  expandedKeys: () => [],
  selectedKeys: () => [],
  checkedKeys: () => [],
});

const emit = defineEmits<{
  (e: 'update', definition: { name: string; steps: StepNode[] }): void;
  (e: 'select', node: StepNode | null): void;
  (e: 'update:expandedKeys', keys: string[]): void;
  (e: 'update:selectedKeys', keys: string[]): void;
  (e: 'update:checkedKeys', keys: string[]): void;  // 勾选状态变化
}>();

// 本地状态，从 props 初始化
const localExpandedKeys = ref<string[]>([...props.expandedKeys]);
const localSelectedKeys = ref<string[]>([...props.selectedKeys]);
const localCheckedKeys = ref<string[]>([...props.checkedKeys]);

// 同步外部传入的 keys
watch(() => props.expandedKeys, (newKeys) => {
  localExpandedKeys.value = [...newKeys];
}, { immediate: true });

watch(() => props.selectedKeys, (newKeys) => {
  localSelectedKeys.value = [...newKeys];
}, { immediate: true });

watch(() => props.checkedKeys, (newKeys) => {
  localCheckedKeys.value = [...newKeys];
}, { immediate: true });

// 获取所有节点类型
const nodeTypes = getNodeTypes();

// 获取所有步骤的 ID（递归）
function getAllStepKeys(steps: StepNode[]): string[] {
  const keys: string[] = [];
  for (const step of steps) {
    keys.push(step.id);
    if (step.children) {
      keys.push(...getAllStepKeys(step.children));
    }
  }
  return keys;
}

// 计算选择状态：none / partial / all
const selectionState = computed(() => {
  const allKeys = getAllStepKeys(props.definition.steps);
  if (allKeys.length === 0) return 'none';
  if (localCheckedKeys.value.length === 0) return 'none';
  if (localCheckedKeys.value.length >= allKeys.length) return 'all';
  return 'partial';
});

// 全选/取消全选
function toggleSelectAll() {
  const allKeys = getAllStepKeys(props.definition.steps);
  if (selectionState.value === 'all') {
    localCheckedKeys.value = [];
  } else {
    localCheckedKeys.value = [...allKeys];
  }
  emit('update:checkedKeys', localCheckedKeys.value);
}

// 切换展开/收缩
function toggleExpand(nodeId: string, event: Event) {
  event.stopPropagation();
  const index = localExpandedKeys.value.indexOf(nodeId);
  if (index > -1) {
    localExpandedKeys.value = localExpandedKeys.value.filter((k) => k !== nodeId);
  } else {
    localExpandedKeys.value = [...localExpandedKeys.value, nodeId];
  }
  emit('update:expandedKeys', localExpandedKeys.value);
}

// 切换勾选（支持父子联动）
function toggleCheck(nodeId: string, checked: boolean) {
  const node = findNodeById(props.definition.steps, nodeId);
  let newCheckedKeys = [...localCheckedKeys.value];

  if (checked) {
    // 勾选：同时勾选所有子节点
    newCheckedKeys.push(nodeId);
    if (node?.children) {
      const childKeys = getAllStepKeys(node.children);
      for (const key of childKeys) {
        if (!newCheckedKeys.includes(key)) {
          newCheckedKeys.push(key);
        }
      }
    }
  } else {
    // 取消勾选：同时取消所有子节点
    newCheckedKeys = newCheckedKeys.filter((k) => k !== nodeId);
    if (node?.children) {
      const childKeys = getAllStepKeys(node.children);
      newCheckedKeys = newCheckedKeys.filter((k) => !childKeys.includes(k));
    }
  }

  // 更新父节点状态：如果所有子节点都勾选，则父节点也勾选
  updateParentCheckState(props.definition.steps, newCheckedKeys);

  localCheckedKeys.value = newCheckedKeys;
  emit('update:checkedKeys', localCheckedKeys.value);
}

// 根据 ID 查找节点
function findNodeById(steps: StepNode[], id: string): StepNode | null {
  for (const step of steps) {
    if (step.id === id) return step;
    if (step.children) {
      const found = findNodeById(step.children, id);
      if (found) return found;
    }
  }
  return null;
}

// 更新父节点勾选状态
function updateParentCheckState(steps: StepNode[], checkedKeys: string[]) {
  for (const step of steps) {
    if (step.children?.length) {
      // 先递归处理子节点
      updateParentCheckState(step.children, checkedKeys);

      // 检查所有子节点是否都被勾选
      const childKeys = getAllStepKeys(step.children);
      const allChildrenChecked = childKeys.every((k) => checkedKeys.includes(k));
      const someChildrenChecked = childKeys.some((k) => checkedKeys.includes(k));

      const index = checkedKeys.indexOf(step.id);
      if (allChildrenChecked && index === -1) {
        // 所有子节点都勾选，父节点也勾选
        checkedKeys.push(step.id);
      } else if (!someChildrenChecked && index > -1) {
        // 没有子节点勾选，父节点取消勾选
        checkedKeys.splice(index, 1);
      }
    }
  }
}

// 判断节点是否部分选中（用于显示 indeterminate 状态）
function isIndeterminate(step: StepNode): boolean {
  if (!step.children?.length) return false;
  const childKeys = getAllStepKeys(step.children);
  const checkedCount = childKeys.filter((k) => localCheckedKeys.value.includes(k)).length;
  return checkedCount > 0 && checkedCount < childKeys.length;
}

// 判断节点是否可展开
function isExpandable(step: StepNode): boolean {
  const config = getNodeTypeConfig(step.type);
  return config?.canHaveChildren ?? false;
}

// 获取节点类型配置
function getNodeType(type: string) {
  return getNodeTypeConfig(type) || nodeTypes[0];
}

// 获取步骤描述
function getStepDescription(step: StepNode | null | undefined): string {
  if (!step || !step.type) return '';
  const config = getNodeTypeConfig(step.type);
  return config?.getDescription?.(step) || '';
}

// 获取节点序号
function getNodeIndex(nodeId: string): string {
  function findIndex(steps: StepNode[], prefix: string): string {
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]!;
      const currentIndex = prefix ? `${prefix}.${i + 1}` : `${i + 1}`;
      if (step.id === nodeId) {
        return currentIndex;
      }
      if (step.children) {
        const found = findIndex(step.children, currentIndex);
        if (found) return found;
      }
    }
    return '';
  }
  return findIndex(props.definition.steps, '');
}

// 将步骤转换为树形数据
const treeData = computed<TreeProps['treeData']>(() => {
  return buildTreeData(props.definition.steps);
});

function buildTreeData(steps: StepNode[]): TreeProps['treeData'] {
  return steps.map((step) => {
    const config = getNodeTypeConfig(step.type);
    return {
      key: step.id,
      title: step.name,
      children: step.children ? buildTreeData(step.children) : undefined,
      isLeaf: !step.children?.length && !config?.canHaveChildren,
      stepData: step,
    };
  });
}

// 选择节点
function handleSelect(keys: (string | number)[], info: any) {
  localSelectedKeys.value = keys as string[];
  emit('update:selectedKeys', localSelectedKeys.value);
  const node = info.node?.stepData as StepNode | undefined;
  emit('select', node || null);
}

// 展开/折叠
function handleExpand(keys: (string | number)[]) {
  localExpandedKeys.value = keys as string[];
  emit('update:expandedKeys', localExpandedKeys.value);
}

// 拖拽排序
function handleDrop(info: any) {
  if (props.readonly) return;
  const dragKey = info.dragNode.key as string;
  const dropKey = info.node.key as string;
  const dropPosition = info.dropPosition;
  const dropToGap = info.dropToGap;

  const newSteps = JSON.parse(JSON.stringify(props.definition.steps));
  const dragNode = findAndRemoveNode(newSteps, dragKey);
  if (!dragNode) return;

  if (dropToGap) {
    insertNodeAtPosition(newSteps, dragNode, dropKey, dropPosition);
  } else {
    insertNodeIntoParent(newSteps, dragNode, dropKey);
  }
  emit('update', { ...props.definition, steps: newSteps });
}

// 限制拖拽目标：只有可以有子节点的节点才能接收子节点
function allowDrop(options: { dropNode: any; dropPosition: number }): boolean {
  const { dropNode, dropPosition } = options;
  const targetStep = dropNode.stepData as StepNode | undefined;

  // dropPosition: -1 表示放在节点前面，0 表示放入节点内部，1 表示放在节点后面
  // 如果是放入节点内部（dropPosition === 0），只允许可以有子节点的节点
  if (dropPosition === 0) {
    const config = getNodeTypeConfig(targetStep?.type || '');
    return config?.canHaveChildren ?? false;
  }

  // 放在节点前后都允许
  return true;
}

function findAndRemoveNode(steps: StepNode[], id: string): StepNode | null {
  for (let i = 0; i < steps.length; i++) {
    if (steps[i]!.id === id) {
      return steps.splice(i, 1)[0]!;
    }
    if (steps[i]!.children) {
      const found = findAndRemoveNode(steps[i]!.children!, id);
      if (found) return found;
    }
  }
  return null;
}

function insertNodeAtPosition(steps: StepNode[], node: StepNode, targetId: string, position: number) {
  for (let i = 0; i < steps.length; i++) {
    if (steps[i]!.id === targetId) {
      const insertIndex = position > i ? i + 1 : i;
      steps.splice(insertIndex, 0, node);
      return true;
    }
    if (steps[i]!.children) {
      if (insertNodeAtPosition(steps[i]!.children!, node, targetId, position)) return true;
    }
  }
  return false;
}

function insertNodeIntoParent(steps: StepNode[], node: StepNode, parentId: string) {
  for (const step of steps) {
    if (step.id === parentId) {
      if (!step.children) step.children = [];
      step.children.push(node);
      return true;
    }
    if (step.children) {
      if (insertNodeIntoParent(step.children, node, parentId)) return true;
    }
  }
  return false;
}

// 添加节点
function handleAddNode(type: string, parentId?: string) {
  if (props.readonly) return;
  const newNode = createNode(type);
  const newSteps = JSON.parse(JSON.stringify(props.definition.steps));

  if (parentId) {
    addNodeToParent(newSteps, newNode, parentId);
  } else {
    newSteps.push(newNode);
  }

  emit('update', { ...props.definition, steps: newSteps });
  emit('select', newNode);
  localSelectedKeys.value = [newNode.id];
  emit('update:selectedKeys', localSelectedKeys.value);
}

function addNodeToParent(steps: StepNode[], node: StepNode, parentId: string) {
  for (const step of steps) {
    if (step.id === parentId) {
      if (!step.children) step.children = [];
      step.children.push(node);
      return true;
    }
    if (step.children) {
      if (addNodeToParent(step.children, node, parentId)) return true;
    }
  }
  return false;
}

// 复制节点
function handleCopyNode(step: StepNode) {
  if (props.readonly) return;
  const newNode: StepNode = {
    ...JSON.parse(JSON.stringify(step)),
    id: `step_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: `${step.name} (复制)`,
  };
  const newSteps = JSON.parse(JSON.stringify(props.definition.steps));
  insertCopiedNode(newSteps, step.id, newNode);
  emit('update', { ...props.definition, steps: newSteps });
}

function insertCopiedNode(steps: StepNode[], afterId: string, newNode: StepNode): boolean {
  for (let i = 0; i < steps.length; i++) {
    if (steps[i]!.id === afterId) {
      steps.splice(i + 1, 0, newNode);
      return true;
    }
    if (steps[i]!.children) {
      if (insertCopiedNode(steps[i]!.children!, afterId, newNode)) return true;
    }
  }
  return false;
}

// 删除节点
function handleDeleteNode(nodeId: string) {
  if (props.readonly) return;
  const newSteps = JSON.parse(JSON.stringify(props.definition.steps));
  findAndRemoveNode(newSteps, nodeId);
  emit('update', { ...props.definition, steps: newSteps });
  if (localSelectedKeys.value.includes(nodeId)) {
    localSelectedKeys.value = [];
    emit('update:selectedKeys', localSelectedKeys.value);
    emit('select', null);
  }
}

// 切换节点禁用状态
function handleToggleDisabled(nodeId: string) {
  if (props.readonly) return;
  const newSteps = JSON.parse(JSON.stringify(props.definition.steps));
  const node = findNodeById(newSteps, nodeId);
  if (node) {
    node.disabled = !node.disabled;
    emit('update', { ...props.definition, steps: newSteps });
    // 如果当前选中的是这个节点，更新选中状态
    if (localSelectedKeys.value.includes(nodeId)) {
      emit('select', node);
    }
  }
}

// 创建新节点
function createNode(type: string): StepNode {
  const id = `step_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const config = getNodeTypeConfig(type);
  const name = config?.label || '未知节点';
  const defaultConfig = config?.defaultConfig() || {};

  return {
    id,
    type,
    name,
    ...defaultConfig,
  };
}

// 渲染添加节点菜单
function renderAddMenu(parentId?: string) {
  return h(Menu, {
    onClick: (info: { key: string | number }) => handleAddNode(String(info.key), parentId),
  }, () => nodeTypes.map((type) =>
    h(Menu.Item, { key: type.key }, () =>
      h('div', { style: 'display: flex; align-items: center; gap: 8px;' }, [
        h(type.icon, { class: 'size-4', style: { color: type.color } }),
        h('span', type.label),
      ])
    )
  ));
}
</script>

<template>
  <div class="workflow-tree-editor">
    <!-- 工具栏 -->
    <div class="tree-toolbar">
      <!-- 全选复选框 -->
      <div class="select-all-wrapper">
        <Checkbox
          :checked="selectionState === 'all'"
          :indeterminate="selectionState === 'partial'"
          :disabled="readonly || !treeData?.length"
          @change="toggleSelectAll"
        />
        <span class="select-all-label" @click="toggleSelectAll">全选</span>
      </div>
      <Dropdown :trigger="['click']" :disabled="readonly">
        <Button type="primary" size="small">
          <template #icon><Plus class="size-4" /></template>
          添加步骤
        </Button>
        <template #overlay>
          <component :is="renderAddMenu()" />
        </template>
      </Dropdown>
    </div>

    <!-- 树形结构 -->
    <div class="tree-content">
      <Tree
        v-model:expandedKeys="localExpandedKeys"
        v-model:selectedKeys="localSelectedKeys"
        :tree-data="treeData"
        :show-icon="false"
        :show-line="false"
        :draggable="!readonly"
        :block-node="true"
        :allow-drop="allowDrop"
        @select="handleSelect"
        @expand="handleExpand"
        @drop="handleDrop"
      >
        <template #switcherIcon>
          <span class="hidden-switcher"></span>
        </template>
        <template #title="nodeProps">
          <div
            class="tree-node-row"
            v-if="nodeProps.stepData"
            :class="{ 'node-disabled': nodeProps.stepData.disabled }"
            :style="{
              backgroundColor: nodeProps.stepData.disabled
                ? 'hsl(var(--muted) / 30%)'
                : getNodeType(nodeProps.stepData.type)?.color + '08',
            }"
          >
            <!-- 勾选框 -->
            <Checkbox
              :checked="localCheckedKeys.includes(nodeProps.stepData.id)"
              :indeterminate="isIndeterminate(nodeProps.stepData)"
              @click.stop
              @change="(e: any) => toggleCheck(nodeProps.stepData.id, e.target.checked)"
            />
            <!-- 展开/收缩按钮 -->
            <span
              v-if="isExpandable(nodeProps.stepData)"
              class="expand-btn"
              @click="toggleExpand(nodeProps.stepData.id, $event)"
            >
              <ChevronDown v-if="localExpandedKeys.includes(nodeProps.stepData.id)" class="size-4" />
              <ChevronRight v-else class="size-4" />
            </span>
            <span v-else class="expand-placeholder"></span>
            <!-- 序号 -->
            <span class="node-index">{{ getNodeIndex(nodeProps.stepData.id) }}</span>
            <span
              class="node-type-tag"
              :style="{
                backgroundColor: nodeProps.stepData.disabled
                  ? 'hsl(var(--muted) / 50%)'
                  : getNodeType(nodeProps.stepData.type)?.color + '20',
                color: nodeProps.stepData.disabled
                  ? 'hsl(var(--muted-foreground))'
                  : getNodeType(nodeProps.stepData.type)?.color,
              }"
            >
              <component :is="getNodeType(nodeProps.stepData.type)?.icon" class="size-3" />
              {{ getNodeType(nodeProps.stepData.type)?.label }}
            </span>
            <span class="node-name" :class="{ 'text-muted': nodeProps.stepData.disabled }">
              {{ nodeProps.stepData.name }}
            </span>
            <!-- 禁用标签 -->
            <span v-if="nodeProps.stepData.disabled" class="disabled-tag">已禁用</span>
            <span v-if="getStepDescription(nodeProps.stepData) && !nodeProps.stepData.disabled" class="node-desc">
              {{ getStepDescription(nodeProps.stepData) }}
            </span>
            <div class="node-actions" v-if="!readonly" @click.stop>
              <Dropdown
                v-if="getNodeTypeConfig(nodeProps.stepData.type)?.canHaveChildren"
                :trigger="['click']"
              >
                <Tooltip title="添加子步骤">
                  <Button type="text" size="small">
                    <Plus class="size-4" />
                  </Button>
                </Tooltip>
                <template #overlay>
                  <component :is="renderAddMenu(nodeProps.stepData.id)" />
                </template>
              </Dropdown>
              <Tooltip :title="nodeProps.stepData.disabled ? '启用' : '禁用'">
                <Button
                  type="text"
                  size="small"
                  @click="handleToggleDisabled(nodeProps.stepData.id)"
                >
                  <CircleCheck v-if="nodeProps.stepData.disabled" class="size-4 text-green-500" />
                  <Ban v-else class="size-4 text-orange-500" />
                </Button>
              </Tooltip>
              <Tooltip title="复制">
                <Button type="text" size="small" @click="handleCopyNode(nodeProps.stepData)">
                  <Copy class="size-4" />
                </Button>
              </Tooltip>
              <Popconfirm title="确定删除此步骤？" @confirm="handleDeleteNode(nodeProps.stepData.id)">
                <Tooltip title="删除">
                  <Button type="text" size="small" danger>
                    <X class="size-4" />
                  </Button>
                </Tooltip>
              </Popconfirm>
            </div>
          </div>
          <span v-else>{{ nodeProps.title }}</span>
        </template>
      </Tree>

      <div v-if="!treeData?.length" class="empty-tip">
        <div class="empty-icon">📋</div>
        <div class="empty-text">暂无步骤</div>
        <div class="empty-hint">点击"添加步骤"开始构建工作流</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.workflow-tree-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: hsl(var(--background));
}

.tree-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-bottom: 1px solid hsl(var(--border));
  flex-shrink: 0;
}

.select-all-wrapper {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-left: 11px;
}

.select-all-label {
  font-size: 14px;
  color: hsl(var(--foreground));
  cursor: pointer;
  user-select: none;
}

.tree-content {
  flex: 1;
  overflow: auto;
  padding: 12px;
  min-height: 0;
}

.tree-node-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border-radius: 4px;
  width: 100%;
}

.tree-node-row:hover {
  background: hsl(var(--accent) / 30%);
}

.node-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 4px;
  font-size: 11px;
  font-weight: 500;
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 10%);
  border-radius: 10px;
}

.node-type-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  font-size: 11px;
  border-radius: 4px;
  white-space: nowrap;
}

.node-name {
  font-weight: 500;
  color: hsl(var(--foreground));
  white-space: nowrap;
}

.node-desc {
  color: hsl(var(--foreground) / 50%);
  font-size: 12px;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.disabled-tag {
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  font-size: 11px;
  color: hsl(var(--muted-foreground));
  background: hsl(var(--muted) / 50%);
  border-radius: 4px;
  white-space: nowrap;
}

.node-disabled {
  opacity: 0.7;
}

.node-disabled .node-name {
  text-decoration: line-through;
  color: hsl(var(--muted-foreground));
}

.text-muted {
  color: hsl(var(--muted-foreground)) !important;
}

.node-actions {
  margin-left: auto;
  display: none;
  gap: 2px;
}

.tree-node-row:hover .node-actions {
  display: inline-flex;
}

.empty-tip {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 16px;
  color: hsl(var(--foreground));
  margin-bottom: 8px;
}

.empty-hint {
  font-size: 14px;
  color: hsl(var(--foreground) / 50%);
}

:deep(.ant-tree) {
  background: transparent;
}

:deep(.ant-tree-treenode) {
  padding: 2px 0;
  width: 100%;
}

:deep(.ant-tree-node-content-wrapper) {
  display: flex;
  align-items: center;
  flex: 1;
  width: 100%;
}

:deep(.ant-tree-title) {
  flex: 1;
  width: 100%;
}

:deep(.ant-tree-switcher) {
  display: none !important;
  width: 0 !important;
}

.hidden-switcher {
  display: none;
}

.expand-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  cursor: pointer;
  color: hsl(var(--foreground) / 60%);
  border-radius: 4px;
  flex-shrink: 0;
}

.expand-btn:hover {
  background: hsl(var(--accent) / 50%);
  color: hsl(var(--foreground));
}

.expand-placeholder {
  width: 20px;
  flex-shrink: 0;
}
</style>
