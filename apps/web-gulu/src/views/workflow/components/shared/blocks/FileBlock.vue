<script setup lang="ts">
import { computed } from 'vue';

import { createIconifyIcon } from '@vben/icons';
import type { FileBlock } from '../types';

const FileIcon = createIconifyIcon('lucide:file');
const DownloadIcon = createIconifyIcon('lucide:download');

const props = defineProps<{
  block: FileBlock;
}>();

const sizeText = computed(() => {
  if (!props.block.size) return '';
  if (props.block.size < 1024) return `${props.block.size} B`;
  if (props.block.size < 1024 * 1024) return `${(props.block.size / 1024).toFixed(1)} KB`;
  return `${(props.block.size / 1024 / 1024).toFixed(1)} MB`;
});
</script>

<template>
  <a class="file-block" :href="block.url" target="_blank" download>
    <FileIcon class="file-icon" />
    <div class="file-info">
      <span class="file-name">{{ block.name }}</span>
      <span v-if="sizeText" class="file-size">{{ sizeText }}</span>
    </div>
    <DownloadIcon class="download-icon" />
  </a>
</template>

<style scoped>
.file-block {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: hsl(var(--muted) / 30%);
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
  transition: background 0.2s;
}

.file-block:hover {
  background: hsl(var(--muted) / 50%);
}

.file-icon {
  width: 20px;
  height: 20px;
  color: hsl(var(--primary));
  flex-shrink: 0;
}

.file-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.file-name {
  font-size: 13px;
  font-weight: 500;
  color: hsl(var(--foreground));
}

.file-size {
  font-size: 11px;
  color: hsl(var(--muted-foreground));
}

.download-icon {
  width: 16px;
  height: 16px;
  color: hsl(var(--muted-foreground));
  flex-shrink: 0;
}
</style>
