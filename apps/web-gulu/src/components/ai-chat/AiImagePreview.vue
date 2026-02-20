<script setup lang="ts">
import { Image as AImage } from 'ant-design-vue';
import { createIconifyIcon } from '@vben/icons';
import type { ImageAttachment } from './types';

const XIcon = createIconifyIcon('lucide:x');

defineProps<{
  images: ImageAttachment[];
}>();

const emit = defineEmits<{
  remove: [id: string];
}>();
</script>

<template>
  <div v-if="images.length" class="image-preview-bar">
    <AImage.PreviewGroup>
      <div v-for="img in images" :key="img.id" class="preview-item">
        <AImage
          :src="img.url"
          :alt="img.name"
          :width="64"
          :height="64"
          class="preview-thumb"
          :preview="true"
        />
        <button class="preview-remove" @click.stop="emit('remove', img.id)">
          <XIcon class="remove-icon" />
        </button>
        <div v-if="img.status === 'uploading'" class="preview-overlay">
          <span class="preview-loading" />
        </div>
      </div>
    </AImage.PreviewGroup>
  </div>
</template>

<style scoped>
.image-preview-bar {
  display: flex;
  gap: 8px;
  padding: 8px 0;
  overflow-x: auto;
}

.preview-item {
  position: relative;
  flex-shrink: 0;
  width: 64px;
  height: 64px;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid #e8e8e8;
  cursor: pointer;
}

.preview-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview-item :deep(.ant-image) {
  display: block;
}

.preview-item :deep(.ant-image img) {
  object-fit: cover;
  border-radius: 10px;
}

.preview-remove {
  position: absolute;
  top: 2px;
  right: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  color: #fff;
  cursor: pointer;
  background: rgba(0, 0, 0, 0.5);
  border: none;
  border-radius: 50%;
  opacity: 0;
  transition: opacity 0.2s;
}

.preview-item:hover .preview-remove {
  opacity: 1;
}

.remove-icon {
  width: 12px;
  height: 12px;
}

.preview-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.6);
}

.preview-loading {
  width: 20px;
  height: 20px;
  border: 2px solid #1677ff;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
