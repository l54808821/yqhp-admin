<script setup lang="ts">
import type { ColumnConfig, ColumnFixedConfig } from './types';

import { computed } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { Button, Checkbox, Space, Tooltip } from 'ant-design-vue';

interface Props {
  columns: ColumnConfig[];
  selectedKeys: string[];
  columnFixed: ColumnFixedConfig[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:selectedKeys': [keys: string[]];
  'update:columnFixed': [fixed: ColumnFixedConfig[]];
}>();

// 所有可配置的列
const allColumns = computed(() => {
  return props.columns.filter((col) => col.key);
});

// 锁定固定的列
const lockedFixedKeys = computed(() => {
  return props.columns
    .filter((col) => col.fixedLock && col.key)
    .map((col) => String(col.key));
});

// 固定配置Map
const fixedMap = computed(() => {
  const map: Record<string, 'left' | 'right'> = {};
  props.columnFixed.forEach((f) => {
    if (f.fixed) map[f.key] = f.fixed;
  });
  return map;
});

// 左侧固定列
const leftFixedColumns = computed(() => {
  return props.selectedKeys.filter((key) => fixedMap.value[key] === 'left');
});

// 右侧固定列
const rightFixedColumns = computed(() => {
  return props.selectedKeys.filter((key) => fixedMap.value[key] === 'right');
});

// 普通列
const normalColumns = computed(() => {
  return props.selectedKeys.filter((key) => !fixedMap.value[key]);
});

// 未选中的列
const unselectedColumns = computed(() => {
  return allColumns.value.filter(
    (c) => !props.selectedKeys.includes(String(c.key)),
  );
});

function isColumnLocked(key: string): boolean {
  return lockedFixedKeys.value.includes(key);
}

function getColumnTitle(key: string): string {
  return (allColumns.value.find((c) => c.key === key)?.title as string) || key;
}

function toggleColumn(key: string, checked: boolean) {
  let newKeys = [...props.selectedKeys];
  if (checked) {
    if (!newKeys.includes(key)) {
      const allKeys = allColumns.value.map((c) => String(c.key));
      const targetIndex = allKeys.indexOf(key);
      let insertIndex = newKeys.length;
      for (let i = 0; i < newKeys.length; i++) {
        const currentIndex = allKeys.indexOf(newKeys[i]!);
        if (currentIndex > targetIndex) {
          insertIndex = i;
          break;
        }
      }
      newKeys.splice(insertIndex, 0, key);
    }
  } else {
    newKeys = newKeys.filter((k) => k !== key);
    // 同时移除固定配置
    const newFixed = props.columnFixed.filter((f) => f.key !== key);
    emit('update:columnFixed', newFixed);
  }
  emit('update:selectedKeys', newKeys);
}

function setColumnFixed(key: string, fixed: 'left' | 'right' | false) {
  const newFixed = props.columnFixed.filter((f) => f.key !== key);
  if (fixed) {
    newFixed.push({ key, fixed });
  }
  emit('update:columnFixed', newFixed);
}

function selectAll() {
  emit(
    'update:selectedKeys',
    allColumns.value.map((col) => String(col.key)),
  );
}

function resetDefault() {
  const defaultKeys = allColumns.value
    .filter((col) => col.defaultShow !== false)
    .map((col) => String(col.key));
  emit('update:selectedKeys', defaultKeys);

  const defaultFixed: ColumnFixedConfig[] = [];
  props.columns.forEach((col) => {
    if (col.fixed && col.key) {
      defaultFixed.push({
        key: String(col.key),
        fixed: col.fixed as 'left' | 'right',
      });
    }
  });
  emit('update:columnFixed', defaultFixed);
}

// 拖拽相关
let dragIndex: number | null = null;
let dragGroup: 'left' | 'normal' | 'right' | null = null;

function handleDragStart(index: number, group: 'left' | 'normal' | 'right') {
  dragIndex = index;
  dragGroup = group;
}

function handleDragEnd() {
  dragIndex = null;
  dragGroup = null;
}

function handleDrop(
  targetIndex: number,
  targetGroup: 'left' | 'normal' | 'right',
) {
  if (dragIndex === null || dragGroup === null || dragGroup !== targetGroup) {
    dragIndex = null;
    dragGroup = null;
    return;
  }

  let groupColumns: string[];
  if (targetGroup === 'left') {
    groupColumns = leftFixedColumns.value;
  } else if (targetGroup === 'right') {
    groupColumns = rightFixedColumns.value;
  } else {
    groupColumns = normalColumns.value;
  }

  if (dragIndex === targetIndex) return;

  const dragKey = groupColumns[dragIndex];
  const targetKey = groupColumns[targetIndex];
  if (!dragKey || !targetKey) return;

  const newKeys = [...props.selectedKeys];
  const dragGlobalIndex = newKeys.indexOf(dragKey);
  const targetGlobalIndex = newKeys.indexOf(targetKey);

  if (dragGlobalIndex > -1 && targetGlobalIndex > -1) {
    newKeys.splice(dragGlobalIndex, 1);
    const newTargetIndex = newKeys.indexOf(targetKey);
    if (dragGlobalIndex < targetGlobalIndex) {
      newKeys.splice(newTargetIndex + 1, 0, dragKey);
    } else {
      newKeys.splice(newTargetIndex, 0, dragKey);
    }
    emit('update:selectedKeys', newKeys);
  }

  dragIndex = null;
  dragGroup = null;
}
</script>

<template>
  <div class="flex h-full flex-col">
    <div class="mb-3 flex items-center justify-between">
      <Space>
        <Button size="small" @click="selectAll">全选</Button>
        <Button size="small" @click="resetDefault">重置</Button>
      </Space>
      <span class="text-xs text-gray-400">勾选显示，拖拽排序，图钉固定</span>
    </div>

    <div class="flex-1 overflow-auto">
      <!-- 左侧固定列 -->
      <div v-if="leftFixedColumns.length" class="mb-3">
        <div class="mb-1 px-2 text-xs text-gray-400">固定在左侧</div>
        <div class="space-y-1">
          <div
            v-for="(key, index) in leftFixedColumns"
            :key="key"
            class="flex cursor-move items-center gap-2 rounded border-l-2 border-blue-400 bg-blue-50 p-2 hover:bg-blue-100"
            draggable="true"
            @dragstart="handleDragStart(index, 'left')"
            @dragend="handleDragEnd"
            @dragover.prevent
            @drop="handleDrop(index, 'left')"
          >
            <IconifyIcon
              icon="ant-design:holder-outlined"
              class="size-4 text-gray-400"
            />
            <Checkbox
              :checked="true"
              class="flex-1"
              @change="(e: any) => toggleColumn(key, e.target.checked)"
            >
              {{ getColumnTitle(key) }}
            </Checkbox>
            <div v-if="isColumnLocked(key)" class="flex items-center">
              <Tooltip title="固定位置已锁定">
                <IconifyIcon
                  icon="ant-design:lock-outlined"
                  class="size-4 text-gray-400"
                />
              </Tooltip>
            </div>
            <div v-else class="flex items-center gap-1">
              <Tooltip title="取消固定">
                <div
                  class="cursor-pointer text-blue-500"
                  @click.stop="setColumnFixed(key, false)"
                >
                  <IconifyIcon
                    icon="ant-design:pushpin-filled"
                    class="size-4 rotate-45"
                  />
                </div>
              </Tooltip>
              <Tooltip title="固定在右侧">
                <div
                  class="cursor-pointer text-gray-400 hover:text-gray-600"
                  @click.stop="setColumnFixed(key, 'right')"
                >
                  <IconifyIcon
                    icon="ant-design:pushpin-filled"
                    class="size-4 -rotate-45"
                  />
                </div>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>

      <!-- 普通列 -->
      <div class="mb-3">
        <div
          v-if="leftFixedColumns.length || rightFixedColumns.length"
          class="mb-1 px-2 text-xs text-gray-400"
        >
          普通列
        </div>
        <div class="space-y-1">
          <div
            v-for="(key, index) in normalColumns"
            :key="key"
            class="flex cursor-move items-center gap-2 rounded bg-gray-50 p-2 hover:bg-gray-100"
            draggable="true"
            @dragstart="handleDragStart(index, 'normal')"
            @dragend="handleDragEnd"
            @dragover.prevent
            @drop="handleDrop(index, 'normal')"
          >
            <IconifyIcon
              icon="ant-design:holder-outlined"
              class="size-4 text-gray-400"
            />
            <Checkbox
              :checked="true"
              class="flex-1"
              @change="(e: any) => toggleColumn(key, e.target.checked)"
            >
              {{ getColumnTitle(key) }}
            </Checkbox>
            <div class="flex items-center gap-1">
              <Tooltip title="固定在左侧">
                <div
                  class="cursor-pointer text-gray-400 hover:text-gray-600"
                  @click.stop="setColumnFixed(key, 'left')"
                >
                  <IconifyIcon
                    icon="ant-design:pushpin-filled"
                    class="size-4"
                  />
                </div>
              </Tooltip>
              <Tooltip title="固定在右侧">
                <div
                  class="cursor-pointer text-gray-400 hover:text-gray-600"
                  @click.stop="setColumnFixed(key, 'right')"
                >
                  <IconifyIcon
                    icon="ant-design:pushpin-filled"
                    class="size-4 -rotate-90"
                  />
                </div>
              </Tooltip>
            </div>
          </div>

          <!-- 未选中的列 -->
          <div
            v-for="col in unselectedColumns"
            :key="String(col.key)"
            class="flex items-center gap-2 rounded p-2 hover:bg-gray-50"
          >
            <IconifyIcon
              icon="ant-design:holder-outlined"
              class="size-4 text-transparent"
            />
            <Checkbox
              :checked="false"
              class="flex-1"
              @change="
                (e: any) => toggleColumn(String(col.key), e.target.checked)
              "
            >
              {{ col.title }}
            </Checkbox>
            <span class="w-9" />
          </div>
        </div>
      </div>

      <!-- 右侧固定列 -->
      <div v-if="rightFixedColumns.length">
        <div class="mb-1 px-2 text-xs text-gray-400">固定在右侧</div>
        <div class="space-y-1">
          <div
            v-for="(key, index) in rightFixedColumns"
            :key="key"
            class="flex cursor-move items-center gap-2 rounded border-r-2 border-blue-400 bg-blue-50 p-2 hover:bg-blue-100"
            draggable="true"
            @dragstart="handleDragStart(index, 'right')"
            @dragend="handleDragEnd"
            @dragover.prevent
            @drop="handleDrop(index, 'right')"
          >
            <IconifyIcon
              icon="ant-design:holder-outlined"
              class="size-4 text-gray-400"
            />
            <Checkbox
              :checked="true"
              class="flex-1"
              @change="(e: any) => toggleColumn(key, e.target.checked)"
            >
              {{ getColumnTitle(key) }}
            </Checkbox>
            <div v-if="isColumnLocked(key)" class="flex items-center">
              <Tooltip title="固定位置已锁定">
                <IconifyIcon
                  icon="ant-design:lock-outlined"
                  class="size-4 text-gray-400"
                />
              </Tooltip>
            </div>
            <div v-else class="flex items-center gap-1">
              <Tooltip title="固定在左侧">
                <div
                  class="cursor-pointer text-gray-400 hover:text-gray-600"
                  @click.stop="setColumnFixed(key, 'left')"
                >
                  <IconifyIcon
                    icon="ant-design:pushpin-filled"
                    class="size-4 rotate-45"
                  />
                </div>
              </Tooltip>
              <Tooltip title="取消固定">
                <div
                  class="cursor-pointer text-blue-500"
                  @click.stop="setColumnFixed(key, false)"
                >
                  <IconifyIcon
                    icon="ant-design:pushpin-filled"
                    class="size-4 -rotate-45"
                  />
                </div>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
