<script setup lang="ts">
import { Card } from 'ant-design-vue';

const emit = defineEmits<{
  addNode: [type: string];
}>();

const nodeTypes = [
  { type: 'http', name: 'HTTP请求', icon: 'i-lucide-globe', color: '#1890ff' },
  { type: 'script', name: '脚本', icon: 'i-lucide-code', color: '#52c41a' },
  { type: 'condition', name: '条件判断', icon: 'i-lucide-git-branch', color: '#faad14' },
  { type: 'loop', name: '循环', icon: 'i-lucide-repeat', color: '#722ed1' },
  { type: 'database', name: '数据库', icon: 'i-lucide-database', color: '#eb2f96' },
  { type: 'wait', name: '等待', icon: 'i-lucide-clock', color: '#13c2c2' },
];

function handleDragStart(event: DragEvent, type: string) {
  event.dataTransfer?.setData('nodeType', type);
}

function handleClick(type: string) {
  emit('addNode', type);
}
</script>

<template>
  <div class="node-panel w-48 bg-white border-r p-3 overflow-y-auto">
    <div class="text-sm font-medium text-gray-500 mb-3">节点类型</div>
    <div class="space-y-2">
      <Card
        v-for="node in nodeTypes"
        :key="node.type"
        size="small"
        class="node-item cursor-pointer hover:shadow-md transition-shadow"
        :draggable="true"
        @dragstart="handleDragStart($event, node.type)"
        @click="handleClick(node.type)"
      >
        <div class="flex items-center gap-2">
          <span
            :class="node.icon"
            class="text-lg"
            :style="{ color: node.color }"
          />
          <span class="text-sm">{{ node.name }}</span>
        </div>
      </Card>
    </div>
  </div>
</template>

<style scoped>
.node-panel {
  min-width: 180px;
}
.node-item {
  user-select: none;
}
</style>
