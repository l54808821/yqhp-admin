<script setup lang="ts">
import { ref } from 'vue';
import { createIconifyIcon } from '@vben/icons';

import type { VariableInfo, VariableGroup } from '../utils/variable-collector';

const SearchIcon = createIconifyIcon('lucide:search');
const VariableIcon = createIconifyIcon('lucide:variable');

interface Props {
  groupedVariables: Array<{ group: VariableGroup; label: string; items: VariableInfo[] }>;
  flatFiltered: VariableInfo[];
  activeIndex: number;
  searchText: string;
  style?: Record<string, string>;
}

defineProps<Props>();

const emit = defineEmits<{
  (e: 'select', v: VariableInfo): void;
  (e: 'update:activeIndex', index: number): void;
  (e: 'update:searchText', text: string): void;
  (e: 'keydown', event: KeyboardEvent): void;
}>();

const rootRef = ref<HTMLElement | null>(null);

defineExpose({ rootRef });
</script>

<template>
  <Teleport to="body">
    <div
      ref="rootRef"
      class="var-popover"
      :style="{
        position: 'fixed',
        left: style?.left,
        top: style?.top,
        zIndex: 1060,
      }"
    >
      <div class="var-search">
        <SearchIcon class="search-icon" />
        <input
          :value="searchText"
          class="search-input"
          placeholder="搜索变量"
          @input="emit('update:searchText', ($event.target as HTMLInputElement).value)"
          @keydown="emit('keydown', $event)"
        />
      </div>
      <div class="var-list">
        <template v-if="groupedVariables.length">
          <template v-for="g in groupedVariables" :key="g.group">
            <div class="var-group-label">{{ g.label }}</div>
            <div
              v-for="v in g.items"
              :key="v.name"
              class="var-item"
              :class="{ active: flatFiltered.indexOf(v) === activeIndex }"
              @mousedown.prevent="emit('select', v)"
              @mouseenter="emit('update:activeIndex', flatFiltered.indexOf(v))"
            >
              <VariableIcon class="var-icon" />
              <span class="var-name">{{ v.name }}</span>
              <span class="var-type">{{ v.type }}</span>
            </div>
          </template>
        </template>
        <div v-else class="var-empty">无匹配变量</div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.var-popover {
  width: 280px;
  background: hsl(var(--popover, 0 0% 100%));
  border: 1px solid hsl(var(--border, 0 0% 90%));
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.var-search {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-bottom: 1px solid hsl(var(--border, 0 0% 90%));
}

.search-icon {
  width: 14px;
  height: 14px;
  color: hsl(var(--muted-foreground, 0 0% 55%));
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 13px;
  background: transparent;
  color: hsl(var(--foreground, 0 0% 10%));
}

.search-input::placeholder {
  color: hsl(var(--muted-foreground, 0 0% 55%));
}

.var-list {
  max-height: 240px;
  overflow-y: auto;
  padding: 4px 0;
}

.var-group-label {
  padding: 4px 12px 2px;
  font-size: 11px;
  font-weight: 600;
  color: hsl(var(--muted-foreground, 0 0% 55%));
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.var-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  cursor: pointer;
  transition: background 0.1s;
}

.var-item:hover,
.var-item.active {
  background: hsl(var(--accent, 0 0% 95%));
}

.var-icon {
  width: 14px;
  height: 14px;
  color: hsl(var(--primary, 220 90% 56%));
  flex-shrink: 0;
}

.var-name {
  flex: 1;
  font-size: 13px;
  color: hsl(var(--foreground, 0 0% 10%));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.var-type {
  font-size: 11px;
  color: hsl(var(--muted-foreground, 0 0% 55%));
  flex-shrink: 0;
}

.var-empty {
  padding: 16px;
  text-align: center;
  font-size: 13px;
  color: hsl(var(--muted-foreground, 0 0% 55%));
}
</style>
