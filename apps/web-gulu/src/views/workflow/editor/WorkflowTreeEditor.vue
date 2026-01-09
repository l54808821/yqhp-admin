<script setup lang="ts">
import { computed, h, ref } from 'vue';

import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  Plus,
  X,
} from '@vben/icons';
import {
  Clock,
  Code,
  Database,
  GitBranch,
  Globe,
  MessageSquare,
} from '#/components/icons';
import {
  Button,
  Dropdown,
  Menu,
  Popconfirm,
  Tree,
} from 'ant-design-vue';
import type { TreeProps } from 'ant-design-vue';

export interface StepNode {
  id: string;
  type: 'http' | 'script' | 'condition' | 'loop' | 'database' | 'wait' | 'mq';
  name: string;
  config: Record<string, any>;
  children?: StepNode[];
}

interface Props {
  definition: { name: string; steps: StepNode[] };
  readonly?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false,
});

const emit = defineEmits<{
  (e: 'update', definition: { name: string; steps: StepNode[] }): void;
  (e: 'select', node: StepNode | null): void;
}>();

const expandedKeys = ref<string[]>([]);
const selectedKeys = ref<string[]>([]);

// 节点类型配置
const nodeTypes = [
  { key: 'http', label: 'HTTP请求', icon: Globe },
  { key: 'script', label: '脚本', icon: Code },
  { key: 'condition', label: '条件判断', icon: GitBranch },
  { key: 'loop', label: '循环', icon: GripVertical },
  { key: 'database', label: '数据库', icon: Database },
  { key: 'wait', label: '等待', icon: Clock },
  { key: 'mq', label: 'MQ消息', icon: MessageSquare },
];

// 获取节点图标
function getNodeIcon(type: string) {
  const nodeType = nodeTypes.find((t) => t.key === type);
  return nodeType?.icon || Globe;
}

// 将步骤转换为树形数据
const treeData = computed<TreeProps['treeData']>(() => {
  return buildTreeData(props.definition.steps);
});

function buildTreeData(steps: StepNode[]): TreeProps['treeData'] {
  return steps.map((step) => ({
    key: step.id,
    title: step.name,
    icon: () => h(getNodeIcon(step.type)),
    children: step.children ? buildTreeData(step.children) : undefined,
    isLeaf: !step.children?.length && step.type !== 'condition' && step.type !== 'loop',
    data: step,
  }));
}

// 选择节点
function handleSelect(keys: (string | number)[], info: any) {
  selectedKeys.value = keys as string[];
  const node = info.node?.data as StepNode | undefined;
  emit('select', node || null);
}

// 展开/折叠
function handleExpand(keys: (string | number)[]) {
  expandedKeys.value = keys as string[];
}

// 拖拽排序
function handleDrop(info: any) {
  if (props.readonly) return;

  const dragKey = info.dragNode.key as string;
  const dropKey = info.node.key as string;
  const dropPosition = info.dropPosition;
  const dropToGap = info.dropToGap;

  const newSteps = JSON.parse(JSON.stringify(props.definition.steps));

  // 找到并移除拖拽的节点
  const dragNode = findAndRemoveNode(newSteps, dragKey);
  if (!dragNode) return;

  // 插入到新位置
  if (dropToGap) {
    // 插入到节点之间
    insertNodeAtPosition(newSteps, dragNode, dropKey, dropPosition);
  } else {
    // 插入到节点内部
    insertNodeIntoParent(newSteps, dragNode, dropKey);
  }

  emit('update', { ...props.definition, steps: newSteps });
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
      if (insertNodeAtPosition(steps[i]!.children!, node, targetId, position)) {
        return true;
      }
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
      if (insertNodeIntoParent(step.children, node, parentId)) {
        return true;
      }
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
    // 添加到指定父节点
    addNodeToParent(newSteps, newNode, parentId);
  } else {
    // 添加到根级别
    newSteps.push(newNode);
  }

  emit('update', { ...props.definition, steps: newSteps });
  emit('select', newNode);
}

function addNodeToParent(steps: StepNode[], node: StepNode, parentId: string) {
  for (const step of steps) {
    if (step.id === parentId) {
      if (!step.children) step.children = [];
      step.children.push(node);
      return true;
    }
    if (step.children) {
      if (addNodeToParent(step.children, node, parentId)) {
        return true;
      }
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
  if (selectedKeys.value.includes(nodeId)) {
    selectedKeys.value = [];
    emit('select', null);
  }
}

// 创建新节点
function createNode(type: string): StepNode {
  const id = `step_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const nodeType = nodeTypes.find((t) => t.key === type);
  const name = nodeType?.label || '未知节点';

  const baseNode: StepNode = {
    id,
    type: type as StepNode['type'],
    name,
    config: {},
  };

  switch (type) {
    case 'http':
      baseNode.config = { method: 'GET', url: '', headers: {}, body: '' };
      break;
    case 'script':
      baseNode.config = { language: 'javascript', code: '' };
      break;
    case 'condition':
      baseNode.config = { expression: '' };
      baseNode.children = [];
      break;
    case 'loop':
      baseNode.config = { type: 'count', count: 1 };
      baseNode.children = [];
      break;
    case 'database':
      baseNode.config = { configCode: '', sql: '', params: [] };
      break;
    case 'wait':
      baseNode.config = { duration: 1000 };
      break;
    case 'mq':
      baseNode.config = { configCode: '', topic: '', message: '' };
      break;
  }

  return baseNode;
}

// 渲染添加节点菜单
function renderAddMenu(parentId?: string) {
  return h(
    Menu,
    {
      onClick: (info: { key: string | number }) => handleAddNode(String(info.key), parentId),
    },
    () =>
      nodeTypes.map((type) =>
        h(
          Menu.Item,
          { key: type.key },
          () => [h(type.icon), h('span', { class: 'ml-2' }, type.label)],
        ),
      ),
  );
}
</script>

<template>
  <div class="workflow-tree-editor">
    <!-- 工具栏 -->
    <div class="tree-toolbar">
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
        v-model:expandedKeys="expandedKeys"
        v-model:selectedKeys="selectedKeys"
        :tree-data="treeData"
        :show-icon="true"
        :draggable="!readonly"
        :block-node="true"
        @select="handleSelect"
        @expand="handleExpand"
        @drop="handleDrop"
      >
        <template #title="{ title, data: node, expanded }">
          <div class="tree-node">
            <span class="node-expand-icon" v-if="node.children?.length">
              <ChevronDown v-if="expanded" class="size-4" />
              <ChevronRight v-else class="size-4" />
            </span>
            <span class="node-title">{{ title }}</span>
            <span class="node-type">({{ node.type }})</span>
            <div class="node-actions" v-if="!readonly">
              <Dropdown
                v-if="node.type === 'condition' || node.type === 'loop'"
                :trigger="['click']"
                @click.stop
              >
                <Button type="text" size="small">
                  <Plus class="size-4" />
                </Button>
                <template #overlay>
                  <component :is="renderAddMenu(node.id)" />
                </template>
              </Dropdown>
              <Popconfirm
                title="确定删除此节点？"
                @confirm="handleDeleteNode(node.id)"
                @click.stop
              >
                <Button type="text" size="small" danger>
                  <X class="size-4" />
                </Button>
              </Popconfirm>
            </div>
          </div>
        </template>
      </Tree>

      <div v-if="!treeData?.length" class="empty-tip">
        点击"添加步骤"开始构建工作流
      </div>
    </div>
  </div>
</template>

<style scoped>
.workflow-tree-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
}

.tree-toolbar {
  padding: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.tree-content {
  flex: 1;
  overflow: auto;
  padding: 12px;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 0;
}

.node-expand-icon {
  width: 16px;
  color: #999;
}

.node-title {
  font-weight: 500;
}

.node-type {
  color: #999;
  font-size: 12px;
}

.node-actions {
  margin-left: auto;
  display: none;
}

.tree-node:hover .node-actions {
  display: flex;
  gap: 4px;
}

.empty-tip {
  text-align: center;
  color: #999;
  padding: 40px;
}
</style>
