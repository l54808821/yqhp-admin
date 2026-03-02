<script setup lang="ts">
import type { ImageBlock } from '../types';

defineProps<{
  block: ImageBlock;
}>();
</script>

<template>
  <div class="image-block">
    <img :src="block.url" :alt="block.name || '图片'" class="image-preview" />
    <span v-if="block.name" class="image-name">{{ block.name }}</span>
  </div>
</template>

<style scoped>
.image-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.image-preview {
  max-width: 100%;
  max-height: 300px;
  border-radius: 8px;
  object-fit: contain;
  border: 1px solid hsl(var(--border));
}

.image-name {
  font-size: 11px;
  color: hsl(var(--muted-foreground));
}
</style>
