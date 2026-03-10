<script setup lang="ts">
import { ref, nextTick, onBeforeUnmount, watch } from 'vue';

const props = withDefaults(defineProps<{
  panelOpen?: boolean;
  defaultMainPercent?: number;
  minMainWidth?: number;
  minPanelWidth?: number;
}>(), {
  panelOpen: false,
  defaultMainPercent: 40,
  minMainWidth: 250,
  minPanelWidth: 350,
});

const rootRef = ref<HTMLElement | null>(null);
const mainRef = ref<HTMLElement | null>(null);
const mainWidth = ref<number | null>(null);
const isDragging = ref(false);

function calcDefaultMainWidth() {
  const root = rootRef.value;
  if (!root) return;
  const sidebarEl = root.querySelector<HTMLElement>('.split-panel-sidebar');
  const sidebarWidth = sidebarEl?.offsetWidth ?? 0;
  const available = root.getBoundingClientRect().width - sidebarWidth - 4;
  mainWidth.value = Math.round(available * (props.defaultMainPercent / 100));
}

function startDrag(e: MouseEvent) {
  e.preventDefault();
  isDragging.value = true;

  const mainEl = mainRef.value;
  if (!mainEl) return;

  const startX = e.clientX;
  const startWidth = mainEl.getBoundingClientRect().width;

  const onMove = (ev: MouseEvent) => {
    const root = rootRef.value;
    if (!root) return;
    const delta = ev.clientX - startX;
    const rootWidth = root.getBoundingClientRect().width;
    const maxWidth = rootWidth - props.minPanelWidth;
    mainWidth.value = Math.max(props.minMainWidth, Math.min(maxWidth, startWidth + delta));
  };

  const onUp = () => {
    isDragging.value = false;
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  };

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

watch(() => props.panelOpen, (open) => {
  if (open) {
    nextTick(calcDefaultMainWidth);
  } else {
    mainWidth.value = null;
  }
});

defineExpose({ rootRef });

onBeforeUnmount(() => {
  isDragging.value = false;
});
</script>

<template>
  <div
    ref="rootRef"
    class="split-panel-root"
    :class="{ 'split-panel-root--dragging': isDragging }"
  >
    <div class="split-panel-sidebar">
      <slot name="sidebar" />
    </div>

    <div
      ref="mainRef"
      class="split-panel-main"
      :class="{ 'split-panel-main--with-panel': panelOpen }"
      :style="panelOpen && mainWidth ? { width: mainWidth + 'px', maxWidth: mainWidth + 'px' } : undefined"
    >
      <slot />
    </div>

    <div v-if="panelOpen" class="split-panel-divider" @mousedown="startDrag" />

    <div v-if="panelOpen" class="split-panel-panel">
      <slot name="panel" />
    </div>
  </div>
</template>

<style scoped>
.split-panel-root {
  display: flex;
  height: 100%;
  overflow: hidden;
}

.split-panel-sidebar {
  flex-shrink: 0;
  height: 100%;
  background: hsl(var(--background));
}

.split-panel-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  position: relative;
  background: hsl(var(--background));
}

.split-panel-main--with-panel {
  flex: none;
  width: 40%;
  max-width: 40%;
}

.split-panel-divider {
  width: 5px;
  margin: 0 -2px;
  cursor: col-resize;
  position: relative;
  flex-shrink: 0;
  z-index: 10;
  background: transparent;
}

.split-panel-divider::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 2px;
  width: 1px;
  background: hsl(var(--border));
  transition: background 0.15s;
}

.split-panel-divider:hover::before,
.split-panel-root--dragging .split-panel-divider::before {
  background: hsl(var(--primary) / 50%);
}

.split-panel-root--dragging {
  user-select: none;
  cursor: col-resize;
}

.split-panel-root--dragging iframe {
  pointer-events: none;
}

.split-panel-panel {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 300px;
  overflow: hidden;
  background: hsl(var(--background));
}
</style>
