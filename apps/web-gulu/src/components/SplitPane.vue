<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';

interface Props {
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  storageKey?: string;
}

const props = withDefaults(defineProps<Props>(), {
  defaultWidth: 280,
  minWidth: 200,
  maxWidth: 500,
  storageKey: '',
});

const leftWidth = ref(props.defaultWidth);
const isDragging = ref(false);
const startX = ref(0);
const startWidth = ref(0);

// 从 localStorage 恢复宽度
onMounted(() => {
  if (props.storageKey) {
    const saved = localStorage.getItem(`split-pane-${props.storageKey}`);
    if (saved) {
      const width = Number(saved);
      if (width >= props.minWidth && width <= props.maxWidth) {
        leftWidth.value = width;
      }
    }
  }
});

// 保存宽度到 localStorage
function saveWidth() {
  if (props.storageKey) {
    localStorage.setItem(`split-pane-${props.storageKey}`, String(leftWidth.value));
  }
}

function handleMouseDown(e: MouseEvent) {
  isDragging.value = true;
  startX.value = e.clientX;
  startWidth.value = leftWidth.value;
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
}

function handleMouseMove(e: MouseEvent) {
  if (!isDragging.value) return;
  const delta = e.clientX - startX.value;
  let newWidth = startWidth.value + delta;
  newWidth = Math.max(props.minWidth, Math.min(props.maxWidth, newWidth));
  leftWidth.value = newWidth;
}

function handleMouseUp() {
  isDragging.value = false;
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', handleMouseUp);
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
  saveWidth();
}

onUnmounted(() => {
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', handleMouseUp);
});

const leftStyle = computed(() => ({
  width: `${leftWidth.value}px`,
  flexShrink: 0,
}));
</script>

<template>
  <div class="split-pane" :class="{ dragging: isDragging }">
    <div class="split-pane-left" :style="leftStyle">
      <slot name="left" />
    </div>
    <div class="split-pane-divider" @mousedown="handleMouseDown">
      <div class="divider-line" />
    </div>
    <div class="split-pane-right">
      <slot name="right" />
    </div>
  </div>
</template>

<style scoped>
.split-pane {
  display: flex;
  height: 100%;
  width: 100%;
}

.split-pane-left {
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.split-pane-divider {
  width: 4px;
  height: 100%;
  cursor: col-resize;
  background: transparent;
  position: relative;
  flex-shrink: 0;
  z-index: 10;
}

.split-pane-divider:hover .divider-line,
.split-pane.dragging .divider-line {
  background: hsl(var(--primary));
}

.divider-line {
  position: absolute;
  left: 1px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: hsl(var(--border));
  transition: background 0.2s;
}

.split-pane-right {
  flex: 1;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.split-pane.dragging {
  user-select: none;
}
</style>
