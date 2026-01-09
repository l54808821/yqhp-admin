<script setup lang="ts">
import { Button, Space } from 'ant-design-vue';

import type { Workflow } from '#/api/workflow';

defineProps<{
  workflow: Workflow | null;
  saving: boolean;
  canUndo: boolean;
  canRedo: boolean;
}>();

const emit = defineEmits<{
  save: [];
  back: [];
  undo: [];
  redo: [];
}>();
</script>

<template>
  <div class="toolbar">
    <div class="toolbar-left">
      <Button @click="emit('back')">
        <template #icon>
          <span class="i-lucide-arrow-left" />
        </template>
        返回
      </Button>
      <span v-if="workflow" class="workflow-title">
        {{ workflow.name }}
        <span class="version-tag">v{{ workflow.version }}</span>
      </span>
    </div>
    <Space>
      <Button :disabled="!canUndo" @click="emit('undo')">
        <template #icon>
          <span class="i-lucide-undo" />
        </template>
        撤销
      </Button>
      <Button :disabled="!canRedo" @click="emit('redo')">
        <template #icon>
          <span class="i-lucide-redo" />
        </template>
        重做
      </Button>
      <Button type="primary" :loading="saving" @click="emit('save')">
        <template #icon>
          <span class="i-lucide-save" />
        </template>
        保存
      </Button>
    </Space>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  height: 56px;
  background: hsl(var(--background));
  border-bottom: 1px solid hsl(var(--border));
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.workflow-title {
  font-size: 18px;
  font-weight: 500;
  color: hsl(var(--foreground));
}

.version-tag {
  color: hsl(var(--foreground) / 50%);
  font-size: 14px;
  margin-left: 8px;
}
</style>
