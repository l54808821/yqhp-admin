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
  <div class="toolbar flex items-center justify-between px-4 py-2 bg-white border-b">
    <div class="flex items-center gap-4">
      <Button @click="emit('back')">
        <template #icon>
          <span class="i-lucide-arrow-left" />
        </template>
        返回
      </Button>
      <span v-if="workflow" class="text-lg font-medium">
        {{ workflow.name }}
        <span class="text-gray-400 text-sm ml-2">v{{ workflow.version }}</span>
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
  height: 56px;
}
</style>
