<script setup lang="ts">
import type { ViewConfig } from './types';

import { IconifyIcon } from '@vben/icons';

import { Button, Checkbox, Popconfirm, Tooltip } from 'ant-design-vue';

interface Props {
  views: ViewConfig[];
  selectedId: number | null;
  allowSystemView?: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
  select: [id: number];
  add: [];
  delete: [id: number];
  setDefault: [id: number, isDefault: boolean];
  reorder: [fromIndex: number, toIndex: number];
}>();

// 拖拽相关
let dragIndex: number | null = null;

function handleDragStart(index: number) {
  dragIndex = index;
}

function handleDragEnd() {
  dragIndex = null;
}

function handleDrop(targetIndex: number) {
  if (dragIndex !== null && dragIndex !== targetIndex) {
    emit('reorder', dragIndex, targetIndex);
  }
  dragIndex = null;
}

function handleSetDefault(id: number, checked: boolean) {
  emit('setDefault', id, checked);
}
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="flex items-center justify-between mb-3">
      <span class="font-medium">视图列表</span>
      <Button type="primary" size="small" @click="emit('add')">
        <IconifyIcon icon="ant-design:plus-outlined" class="size-3 mr-1" />
        新建
      </Button>
    </div>

    <div class="flex-1 overflow-auto space-y-1">
      <div
        v-for="(view, index) in views"
        :key="view.id"
        class="group flex items-center gap-2 p-2 rounded cursor-pointer transition-colors"
        :class="[
          selectedId === view.id
            ? 'bg-blue-50 border border-blue-200'
            : 'hover:bg-gray-50 border border-transparent',
        ]"
        draggable="true"
        @click="emit('select', view.id)"
        @dragstart="handleDragStart(index)"
        @dragend="handleDragEnd"
        @dragover.prevent
        @drop="handleDrop(index)"
      >
        <!-- 默认视图复选框 -->
        <Tooltip title="设为默认视图">
          <Checkbox
            :checked="view.isDefault"
            @click.stop
            @change="(e: any) => handleSetDefault(view.id, e.target.checked)"
          />
        </Tooltip>

        <!-- 拖拽手柄 -->
        <IconifyIcon
          icon="ant-design:holder-outlined"
          class="size-4 text-gray-400 cursor-move"
        />

        <!-- 视图名称 -->
        <div class="flex-1 min-w-0">
          <span class="truncate block">{{ view.name }}</span>
        </div>

        <!-- 标签 -->
        <div class="flex items-center gap-1">
          <span v-if="view.id < 0" class="text-xs text-orange-500">[未保存]</span>
          <Tooltip v-if="view.isSystem" title="系统视图">
            <IconifyIcon icon="ant-design:global-outlined" class="size-3 text-orange-500" />
          </Tooltip>
        </div>

        <!-- 删除按钮 -->
        <Popconfirm
          title="确定删除该视图吗？"
          ok-text="确定"
          cancel-text="取消"
          @confirm="emit('delete', view.id)"
        >
          <IconifyIcon
            icon="ant-design:delete-outlined"
            class="size-4 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
            @click.stop
          />
        </Popconfirm>
      </div>

      <div v-if="views.length === 0" class="text-center text-gray-400 py-8">
        <IconifyIcon icon="ant-design:inbox-outlined" class="size-10 mb-2" />
        <p>暂无个人视图</p>
        <p class="text-sm">点击上方"新建"按钮创建</p>
      </div>
    </div>
  </div>
</template>
