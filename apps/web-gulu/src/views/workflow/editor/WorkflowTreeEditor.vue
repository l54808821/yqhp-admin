<script setup lang="ts">
import { computed, h, ref } from 'vue';

import {
  ChevronDown,
  ChevronRight,
  Copy,
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
  Checkbox,
  Dropdown,
  Menu,
  Popconfirm,
  Tooltip,
  Tree,
} from 'ant-design-vue';
import type { TreeProps } from 'ant-design-vue';

export interface StepNode {
  id: string;
  type: 'http' | 'script' | 'condition' | 'loop' | 'database' | 'wait' | 'mq';
  name: string;
  config?: Record<string, any>;
  condition?: {
    expression: string;
    then?: StepNode[];
    else?: StepNode[];
  };
  loop?: {
    count?: number;
    items?: string;
    item_var?: string;
    index_var?: string;
    condition?: string;
  };
  children?: StepNode[]; // 前端用于显示，保存时会转换
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
const checkedKeys = ref<string[]>([]);

// 切换展开/收缩
function toggleExpand(nodeId: string, event: Event) {
  event.stopPropagation();
  const index = expandedKeys.value.indexOf(nodeId);
  if (index > -1) {
    expandedKeys.value = expandedKeys.value.filter((k) => k !== nodeId);
  } else {
    expandedKeys.value = [...expandedKeys.value, nodeId];
  }
}

// 切换勾选
function toggleCheck(nodeId: string, checked: boolean) {
  if (checked) {
    checkedKeys.value = [...checkedKeys.value, nodeId];
  } else {
    checkedKeys.value = checkedKeys.value.filter((k) => k !== nodeId);
  }
}

// 判断节点是否可展开（条件和循环节点都可以展开，不管有没有子节点）
function isExpandable(step: StepNode): boolean {
  return step.type === 'condition' || step.type === 'loop';
}

// 节点类型配置
const nodeTypes = [
  { key: 'http', label: 'HTTP请求', icon: Globe, color: '#52c41a' },
  { key: 'script', label: '脚本', icon: Code, color: '#722ed1' },
  { key: 'condition', label: '条件判断', icon: GitBranch, color: '#fa8c16' },
  { key: 'loop', label: '循环', icon: GripVertical, color: '#13c2c2' },
  { key: 'database', label: '数据库', icon: Database, color: '#1890ff' },
  { key: 'wait', label: '等待', icon: Clock, color: '#eb2f96' },
  { key: 'mq', label: 'MQ消息', icon: MessageSquare, color: '#faad14' },
];

// 获取节点类型配置
function getNodeType(type: string) {
  return nodeTypes.find((t) => t.key === type) || nodeTypes[0];
}

// 获取步骤描述
function getStepDescription(step: StepNode | null | undefined): string {
  if (!step || !step.type) return '';
  switch (step.type) {
    case 'http':
      return step.config?.url ? `${step.config.method || 'GET'} ${step.config.url}` : '';
    case 'script':
      return step.config?.language || '';
    case 'condition':
      return step.condition?.expression || '';
    case 'loop':
      if (step.loop?.count && step.loop.count > 0) return `循环 ${step.loop.count} 次`;
      if (step.loop?.items) return `遍历 ${step.loop.items}`;
      if (step.loop?.condition) return step.loop.condition;
      return '';
    case 'database':
      return step.config?.query ? step.config.query.slice(0, 30) : '';
    case 'wait':
      return step.config?.duration ? `${step.config.duration}ms` : '';
    case 'mq':
      return step.config?.topic || '';
    default:
      return '';
  }
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
  return steps.map((step) => ({
    key: step.id,
    title: step.name,
    children: step.children ? buildTreeData(step.children) : undefined,
    isLeaf: !step.children?.length && step.type !== 'condition' && step.type !== 'loop',
    stepData: step,
  }));
}

// 选择节点
function handleSelect(keys: (string | number)[], info: any) {
  selectedKeys.value = keys as string[];
  const node = info.node?.stepData as StepNode | undefined;
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
  const dragNode = findAndRemoveNode(newSteps, dragKey);
  if (!dragNode) return;

  if (dropToGap) {
    insertNodeAtPosition(newSteps, dragNode, dropKey, dropPosition);
  } else {
    insertNodeIntoParent(newSteps, dragNode, dropKey);
  }
  emit('update', { ...props.definition, steps: newSteps });
}

// 限制拖拽目标：只有条件和循环节点才能接收子节点
function allowDrop(options: { dropNode: any; dropPosition: number }): boolean {
  const { dropNode, dropPosition } = options;
  const targetStep = dropNode.stepData as StepNode | undefined;

  // dropPosition: -1 表示放在节点前面，0 表示放入节点内部，1 表示放在节点后面
  // 如果是放入节点内部（dropPosition === 0），只允许条件和循环节点
  if (dropPosition === 0) {
    return targetStep?.type === 'condition' || targetStep?.type === 'loop';
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
  selectedKeys.value = [newNode.id];
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

  const baseNode: StepNode = { id, type: type as StepNode['type'], name };

  switch (type) {
    case 'http':
      baseNode.config = { method: 'GET', url: '', headers: {}, body: '' };
      break;
    case 'script':
      baseNode.config = { language: 'javascript', script: '' };
      break;
    case 'condition':
      baseNode.condition = { expression: '', then: [], else: [] };
      baseNode.children = []; // 前端显示用
      break;
    case 'loop':
      baseNode.loop = { count: 1 };
      baseNode.children = []; // 前端显示用
      break;
    case 'database':
      baseNode.config = { database_config: '', query: '', params: [] };
      break;
    case 'wait':
      baseNode.config = { duration: 1000 };
      break;
    case 'mq':
      baseNode.config = { mq_config: '', action: 'send', topic: '', message: '' };
      break;
  }
  return baseNode;
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
            :style="{
              backgroundColor: getNodeType(nodeProps.stepData.type)?.color + '08',
            }"
          >
            <!-- 勾选框 -->
            <Checkbox
              :checked="checkedKeys.includes(nodeProps.stepData.id)"
              @click.stop
              @change="(e: any) => toggleCheck(nodeProps.stepData.id, e.target.checked)"
            />
            <!-- 展开/收缩按钮 -->
            <span
              v-if="isExpandable(nodeProps.stepData)"
              class="expand-btn"
              @click="toggleExpand(nodeProps.stepData.id, $event)"
            >
              <ChevronDown v-if="expandedKeys.includes(nodeProps.stepData.id)" class="size-4" />
              <ChevronRight v-else class="size-4" />
            </span>
            <span v-else class="expand-placeholder"></span>
            <!-- 序号 -->
            <span class="node-index">{{ getNodeIndex(nodeProps.stepData.id) }}</span>
            <span
              class="node-type-tag"
              :style="{
                backgroundColor: getNodeType(nodeProps.stepData.type)?.color + '20',
                color: getNodeType(nodeProps.stepData.type)?.color,
              }"
            >
              <component :is="getNodeType(nodeProps.stepData.type)?.icon" class="size-3" />
              {{ getNodeType(nodeProps.stepData.type)?.label }}
            </span>
            <span class="node-name">{{ nodeProps.stepData.name }}</span>
            <span v-if="getStepDescription(nodeProps.stepData)" class="node-desc">
              {{ getStepDescription(nodeProps.stepData) }}
            </span>
            <div class="node-actions" v-if="!readonly" @click.stop>
              <Dropdown
                v-if="nodeProps.stepData.type === 'condition' || nodeProps.stepData.type === 'loop'"
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
  padding: 12px;
  border-bottom: 1px solid hsl(var(--border));
  flex-shrink: 0;
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
