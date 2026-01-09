<script setup lang="ts">
import { computed, ref } from 'vue';

import { Button, Card, Empty, Popconfirm, Tag } from 'ant-design-vue';

const props = defineProps<{
  definition: any;
  selectedNode: any;
}>();

const emit = defineEmits<{
  selectNode: [node: any];
  deleteNode: [nodeId: string];
  updateDefinition: [definition: any];
}>();

const canvasRef = ref<HTMLElement | null>(null);
const scale = ref(1);
const offset = ref({ x: 0, y: 0 });
const isDragging = ref(false);
const dragStart = ref({ x: 0, y: 0 });

const steps = computed(() => props.definition?.steps || []);

function getNodeColor(type: string): string {
  const colors: Record<string, string> = {
    http: '#1890ff',
    script: '#52c41a',
    condition: '#faad14',
    loop: '#722ed1',
    database: '#eb2f96',
    wait: '#13c2c2',
  };
  return colors[type] || '#666';
}

function getNodeIcon(type: string): string {
  const icons: Record<string, string> = {
    http: 'i-lucide-globe',
    script: 'i-lucide-code',
    condition: 'i-lucide-git-branch',
    loop: 'i-lucide-repeat',
    database: 'i-lucide-database',
    wait: 'i-lucide-clock',
  };
  return icons[type] || 'i-lucide-box';
}

function handleNodeClick(node: any) {
  emit('selectNode', node);
}

function handleDelete(nodeId: string) {
  emit('deleteNode', nodeId);
}

function handleDrop(event: DragEvent) {
  event.preventDefault();
  const nodeType = event.dataTransfer?.getData('nodeType');
  if (nodeType && canvasRef.value) {
    const rect = canvasRef.value.getBoundingClientRect();
    const x = (event.clientX - rect.left - offset.value.x) / scale.value;
    const y = (event.clientY - rect.top - offset.value.y) / scale.value;

    const newNode = createNode(nodeType, x, y);
    const newDefinition = {
      ...props.definition,
      steps: [...steps.value, newNode],
    };
    emit('updateDefinition', newDefinition);
    emit('selectNode', newNode);
  }
}

function createNode(type: string, x: number, y: number): any {
  const id = `node_${Date.now()}`;
  const baseNode = {
    id,
    type,
    name: getNodeDefaultName(type),
    position: { x, y },
  };

  switch (type) {
    case 'http':
      return { ...baseNode, config: { method: 'GET', url: '', headers: {}, body: '' } };
    case 'script':
      return { ...baseNode, config: { language: 'javascript', code: '' } };
    case 'condition':
      return { ...baseNode, config: { expression: '', trueBranch: [], falseBranch: [] } };
    case 'loop':
      return { ...baseNode, config: { type: 'count', count: 1, items: '', steps: [] } };
    case 'database':
      return { ...baseNode, config: { configCode: '', sql: '', params: [] } };
    case 'wait':
      return { ...baseNode, config: { duration: 1000 } };
    default:
      return baseNode;
  }
}

function getNodeDefaultName(type: string): string {
  const names: Record<string, string> = {
    http: 'HTTP请求',
    script: '脚本',
    condition: '条件判断',
    loop: '循环',
    database: '数据库操作',
    wait: '等待',
  };
  return names[type] || '未知节点';
}

function handleDragOver(event: DragEvent) {
  event.preventDefault();
}

function handleWheel(event: WheelEvent) {
  event.preventDefault();
  const delta = event.deltaY > 0 ? -0.1 : 0.1;
  scale.value = Math.max(0.5, Math.min(2, scale.value + delta));
}

function handleMouseDown(event: MouseEvent) {
  if (event.target === canvasRef.value) {
    isDragging.value = true;
    dragStart.value = { x: event.clientX - offset.value.x, y: event.clientY - offset.value.y };
  }
}

function handleMouseMove(event: MouseEvent) {
  if (isDragging.value) {
    offset.value = {
      x: event.clientX - dragStart.value.x,
      y: event.clientY - dragStart.value.y,
    };
  }
}

function handleMouseUp() {
  isDragging.value = false;
}

function handleNodeDrag(_event: MouseEvent, node: any, startX: number, startY: number) {
  const moveHandler = (e: MouseEvent) => {
    const dx = (e.clientX - startX) / scale.value;
    const dy = (e.clientY - startY) / scale.value;
    node.position = {
      x: node.position.x + dx,
      y: node.position.y + dy,
    };
    startX = e.clientX;
    startY = e.clientY;
  };

  const upHandler = () => {
    document.removeEventListener('mousemove', moveHandler);
    document.removeEventListener('mouseup', upHandler);
    emit('updateDefinition', { ...props.definition });
  };

  document.addEventListener('mousemove', moveHandler);
  document.addEventListener('mouseup', upHandler);
}
</script>

<template>
  <div
    ref="canvasRef"
    class="flow-canvas flex-1 relative overflow-hidden"
    @drop="handleDrop"
    @dragover="handleDragOver"
    @wheel="handleWheel"
    @mousedown="handleMouseDown"
    @mousemove="handleMouseMove"
    @mouseup="handleMouseUp"
    @mouseleave="handleMouseUp"
  >
    <div
      class="canvas-content absolute"
      :style="{
        transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
        transformOrigin: '0 0',
      }"
    >
      <Empty v-if="steps.length === 0" description="拖拽或点击左侧节点添加步骤" class="mt-20" />

      <div
        v-for="(node, index) in steps"
        :key="node.id"
        class="workflow-node absolute"
        :class="{ selected: selectedNode?.id === node.id }"
        :style="{
          left: `${node.position?.x || Number(index) * 200}px`,
          top: `${node.position?.y || 100}px`,
        }"
        @click.stop="handleNodeClick(node)"
        @mousedown.stop="handleNodeDrag($event, node, $event.clientX, $event.clientY)"
      >
        <Card size="small" class="node-card" :bordered="true">
          <template #title>
            <div class="flex items-center gap-2">
              <span
                :class="getNodeIcon(node.type)"
                :style="{ color: getNodeColor(node.type) }"
              />
              <span class="text-sm truncate">{{ node.name }}</span>
            </div>
          </template>
          <template #extra>
            <Popconfirm
              title="确定删除此节点？"
              @confirm="handleDelete(node.id)"
            >
              <Button type="text" size="small" danger @click.stop>
                <span class="i-lucide-trash-2" />
              </Button>
            </Popconfirm>
          </template>
          <div class="text-xs text-gray-400">
            <Tag :color="getNodeColor(node.type)" size="small">
              {{ node.type }}
            </Tag>
          </div>
        </Card>
      </div>
    </div>

    <div class="zoom-controls absolute bottom-4 right-4 flex gap-2">
      <Button size="small" @click="scale = Math.min(2, scale + 0.1)">+</Button>
      <span class="text-sm leading-6">{{ Math.round(scale * 100) }}%</span>
      <Button size="small" @click="scale = Math.max(0.5, scale - 0.1)">-</Button>
    </div>
  </div>
</template>

<style scoped>
.flow-canvas {
  background:
    linear-gradient(90deg, #e8e8e8 1px, transparent 1px),
    linear-gradient(#e8e8e8 1px, transparent 1px);
  background-size: 20px 20px;
  cursor: grab;
}

.flow-canvas:active {
  cursor: grabbing;
}

.workflow-node {
  cursor: move;
  min-width: 160px;
}

.workflow-node.selected .node-card {
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.node-card {
  transition: all 0.2s;
}

.node-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.zoom-controls {
  background: white;
  padding: 4px 8px;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
</style>
