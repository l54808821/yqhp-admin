<script setup lang="ts">
import { Image as AImage } from 'ant-design-vue';
import type { ImageBlock } from '../types';

defineProps<{
  block: ImageBlock;
}>();
</script>

<template>
  <div class="image-block">
    <AImage
      :src="block.url"
      :alt="block.name || '图片'"
      :preview="true"
      class="image-preview"
    />
    <span v-if="block.name" class="image-name">{{ block.name }}</span>
  </div>
</template>

<style scoped>
.image-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 100px;
}

.image-block :deep(.ant-image) {
  display: block;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid hsl(var(--border));
  cursor: pointer;
}

.image-block :deep(.ant-image img) {
  max-width: 100%;
  max-height: 70px;
  object-fit: contain;
  display: block;
}

.image-name {
  font-size: 11px;
  color: hsl(var(--muted-foreground));
}
</style>
