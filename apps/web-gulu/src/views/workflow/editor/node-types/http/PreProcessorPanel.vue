<script setup lang="ts">
import { ref, watch, computed } from 'vue';

import { createIconifyIcon } from '@vben/icons';
import {
  Button,
  Dropdown,
  Empty,
  Menu,
  Switch,
  Tooltip,
} from 'ant-design-vue';

import type { KeywordConfig, PreProcessorKeywordType } from '../../types';
import {
  createKeywordConfig,
  getPreProcessorKeywordTypes,
  KEYWORD_TYPE_META,
} from '../../types';

// 关键字配置表单组件
import SetVariableForm from './keywords/SetVariableForm.vue';
import JsScriptForm from './keywords/JsScriptForm.vue';
import DbQueryForm from './keywords/DbQueryForm.vue';
import WaitForm from './keywords/WaitForm.vue';

// 图标
const PlusIcon = createIconifyIcon('lucide:plus');
const GripVerticalIcon = createIconifyIcon('lucide:grip-vertical');
const TrashIcon = createIconifyIcon('lucide:trash-2');
const ChevronDownIcon = createIconifyIcon('lucide:chevron-down');
const ChevronRightIcon = createIconifyIcon('lucide:chevron-right');

interface Props {
  processors: KeywordConfig[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update', processors: KeywordConfig[]): void;
}>();

// 本地数据
const localProcessors = ref<KeywordConfig[]>([]);
const expandedIds = ref<Set<string>>(new Set());

// 可用的关键字类型
const availableKeywordTypes = computed(() => getPreProcessorKeywordTypes());

// 同步外部数据
watch(
  () => props.processors,
  (newProcessors) => {
    localProcessors.value = JSON.parse(JSON.stringify(newProcessors || []));
  },
  { immediate: true, deep: true }
);

// 触发更新
function emitUpdate() {
  emit('update', JSON.parse(JSON.stringify(localProcessors.value)));
}

// 添加关键字
function addKeyword(type: PreProcessorKeywordType) {
  const keyword = createKeywordConfig(type);
  localProcessors.value.push(keyword);
  expandedIds.value.add(keyword.id);
  emitUpdate();
}

// 删除关键字
function removeKeyword(id: string) {
  const index = localProcessors.value.findIndex(k => k.id === id);
  if (index !== -1) {
    localProcessors.value.splice(index, 1);
    expandedIds.value.delete(id);
    emitUpdate();
  }
}

// 切换启用状态
function toggleEnabled(id: string) {
  const keyword = localProcessors.value.find(k => k.id === id);
  if (keyword) {
    keyword.enabled = !keyword.enabled;
    emitUpdate();
  }
}

// 切换展开状态
function toggleExpanded(id: string) {
  if (expandedIds.value.has(id)) {
    expandedIds.value.delete(id);
  } else {
    expandedIds.value.add(id);
  }
}

// 更新关键字配置
function updateKeywordConfig(id: string, config: any) {
  const keyword = localProcessors.value.find(k => k.id === id);
  if (keyword) {
    keyword.config = config;
    emitUpdate();
  }
}

// 更新关键字名称
function updateKeywordName(id: string, name: string) {
  const keyword = localProcessors.value.find(k => k.id === id);
  if (keyword) {
    keyword.name = name;
    emitUpdate();
  }
}

// 获取关键字图标组件
function getKeywordIcon(type: string) {
  const meta = KEYWORD_TYPE_META[type as keyof typeof KEYWORD_TYPE_META];
  return meta ? createIconifyIcon(meta.icon) : null;
}

// 获取关键字颜色
function getKeywordColor(type: string) {
  const meta = KEYWORD_TYPE_META[type as keyof typeof KEYWORD_TYPE_META];
  return meta?.color || '#666';
}

// 拖拽相关
const draggedIndex = ref<number | null>(null);
const isDragging = ref(false);
const canDrag = ref(false);

// 在 drag handle 上按下鼠标时启用拖动
function handleDragHandleMouseDown() {
  canDrag.value = true;
}

// 鼠标释放时禁用拖动
function handleDragHandleMouseUp() {
  canDrag.value = false;
}

function handleDragStart(e: DragEvent, index: number) {
  if (!canDrag.value) {
    e.preventDefault();
    return;
  }
  isDragging.value = true;
  draggedIndex.value = index;
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
  }
}

function handleDragOver(e: DragEvent, index: number) {
  e.preventDefault();
  if (draggedIndex.value === null || draggedIndex.value === index) return;

  const items = [...localProcessors.value];
  const draggedItem = items[draggedIndex.value];
  items.splice(draggedIndex.value, 1);
  items.splice(index, 0, draggedItem);
  localProcessors.value = items;
  draggedIndex.value = index;
}

function handleDragEnd() {
  isDragging.value = false;
  draggedIndex.value = null;
  canDrag.value = false;
  emitUpdate();
}
</script>

<template>
  <div class="processor-panel">
    <!-- 工具栏 -->
    <div class="panel-toolbar">
      <Dropdown :trigger="['click']">
        <Button type="primary" size="small">
          <template #icon><PlusIcon class="size-4" /></template>
          添加前置操作
          <ChevronDownIcon class="size-4 ml-1" />
        </Button>
        <template #overlay>
          <Menu @click="({ key }: any) => addKeyword(key)">
            <Menu.Item
              v-for="meta in availableKeywordTypes"
              :key="meta.type"
            >
              <div class="menu-item-content">
                <component
                  :is="getKeywordIcon(meta.type)"
                  class="size-4"
                  :style="{ color: meta.color }"
                />
                <span>{{ meta.label }}</span>
                <span class="menu-item-desc">{{ meta.description }}</span>
              </div>
            </Menu.Item>
          </Menu>
        </template>
      </Dropdown>
    </div>

    <!-- 关键字列表 -->
    <div class="keyword-list" v-if="localProcessors.length > 0">
      <div
        v-for="(keyword, index) in localProcessors"
        :key="keyword.id"
        class="keyword-item"
        :class="{ 'is-disabled': !keyword.enabled, 'is-dragging': isDragging && draggedIndex === index }"
        draggable="true"
        @dragstart="(e) => handleDragStart(e, index)"
        @dragover="(e) => handleDragOver(e, index)"
        @dragend="handleDragEnd"
      >
        <!-- 关键字头部 -->
        <div class="keyword-header" @click="toggleExpanded(keyword.id)">
          <div
            class="keyword-drag-handle"
            @click.stop
            @mousedown="handleDragHandleMouseDown"
            @mouseup="handleDragHandleMouseUp"
          >
            <GripVerticalIcon class="size-4" />
          </div>
          <div class="keyword-expand">
            <component
              :is="expandedIds.has(keyword.id) ? ChevronDownIcon : ChevronRightIcon"
              class="size-4"
            />
          </div>
          <div
            class="keyword-icon"
            :style="{ backgroundColor: getKeywordColor(keyword.type) + '20' }"
          >
            <component
              :is="getKeywordIcon(keyword.type)"
              class="size-4"
              :style="{ color: getKeywordColor(keyword.type) }"
            />
          </div>
          <div class="keyword-info">
            <span class="keyword-name">{{ keyword.name }}</span>
            <span class="keyword-type">{{ KEYWORD_TYPE_META[keyword.type]?.label }}</span>
          </div>
          <div class="keyword-actions" @click.stop>
            <Switch
              :checked="keyword.enabled"
              size="small"
              @change="() => toggleEnabled(keyword.id)"
            />
            <Tooltip title="删除">
              <Button
                type="text"
                size="small"
                danger
                @click="removeKeyword(keyword.id)"
              >
                <template #icon><TrashIcon class="size-4" /></template>
              </Button>
            </Tooltip>
          </div>
        </div>

        <!-- 关键字配置表单 -->
        <div v-if="expandedIds.has(keyword.id)" class="keyword-body">
          <SetVariableForm
            v-if="keyword.type === 'set_variable'"
            :config="keyword.config"
            @update="(config) => updateKeywordConfig(keyword.id, config)"
          />
          <JsScriptForm
            v-else-if="keyword.type === 'js_script'"
            :config="keyword.config"
            @update="(config) => updateKeywordConfig(keyword.id, config)"
          />
          <DbQueryForm
            v-else-if="keyword.type === 'db_query'"
            :config="keyword.config"
            @update="(config) => updateKeywordConfig(keyword.id, config)"
          />
          <WaitForm
            v-else-if="keyword.type === 'wait'"
            :config="keyword.config"
            @update="(config) => updateKeywordConfig(keyword.id, config)"
          />
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <Empty
      v-else
      :image="Empty.PRESENTED_IMAGE_SIMPLE"
      description="暂无前置操作"
      class="empty-state"
    />
  </div>
</template>

<style scoped>
.processor-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.panel-toolbar {
  display: flex;
  justify-content: flex-start;
}

.menu-item-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.menu-item-desc {
  font-size: 12px;
  color: hsl(var(--foreground) / 50%);
  margin-left: auto;
}

.keyword-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.keyword-item {
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  background: hsl(var(--card));
  overflow: hidden;
  transition: all 0.2s;
}

.keyword-item:hover {
  border-color: hsl(var(--primary) / 50%);
}

.keyword-item.is-disabled {
  opacity: 0.6;
}

.keyword-item.is-dragging {
  opacity: 0.5;
  border-color: hsl(var(--primary));
}

.keyword-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  cursor: pointer;
  user-select: none;
}

.keyword-header:hover {
  background: hsl(var(--accent) / 30%);
}

.keyword-drag-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  margin: -4px;
  cursor: grab;
  color: hsl(var(--foreground) / 40%);
  border-radius: 4px;
  transition: all 0.15s;
}

.keyword-drag-handle:hover {
  color: hsl(var(--foreground) / 70%);
  background: hsl(var(--accent) / 50%);
}

.keyword-drag-handle:active {
  cursor: grabbing;
  color: hsl(var(--primary));
}

.keyword-expand {
  color: hsl(var(--foreground) / 60%);
}

.keyword-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
}

.keyword-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.keyword-name {
  font-weight: 500;
  color: hsl(var(--foreground));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.keyword-type {
  font-size: 12px;
  color: hsl(var(--foreground) / 50%);
}

.keyword-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.keyword-body {
  padding: 12px 16px;
  border-top: 1px solid hsl(var(--border) / 50%);
  background: hsl(var(--accent) / 20%);
}

.empty-state {
  padding: 40px 0;
}
</style>
