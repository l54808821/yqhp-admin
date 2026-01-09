<script setup lang="ts">
import { Ellipsis, Plus, X } from '@vben/icons';
import { Dropdown, Menu } from 'ant-design-vue';

import type { TabItem } from './types';

defineProps<{
  tabs: TabItem[];
  activeTabId: string | number | null;
  showAddButton?: boolean;
}>();

const emit = defineEmits<{
  activate: [id: string | number];
  close: [id: string | number];
  pin: [id: string | number];
  add: [];
  closeAll: [];
  closeCurrent: [];
  closeOthers: [];
}>();

function handleClick(id: string | number) {
  emit('activate', id);
}

function handleDblClick(id: string | number) {
  emit('pin', id);
}

function handleClose(e: Event, id: string | number) {
  e.stopPropagation();
  emit('close', id);
}

function handleMenuClick(key: string) {
  if (key === 'closeAll') {
    emit('closeAll');
  } else if (key === 'closeCurrent') {
    emit('closeCurrent');
  } else if (key === 'closeOthers') {
    emit('closeOthers');
  }
}
</script>

<template>
  <div class="editor-tabs">
    <div class="tabs-container">
      <div
        v-for="tab in tabs"
        :key="tab.id"
        class="tab-item"
        :class="{
          active: tab.id === activeTabId,
          preview: !tab.pinned && !tab.modified,
        }"
        @click="handleClick(tab.id)"
        @dblclick="handleDblClick(tab.id)"
      >
        <span class="tab-title" :class="{ italic: !tab.pinned && !tab.modified }">
          {{ tab.title }}
        </span>
        <span
          class="tab-close"
          :class="{ 'show-dot': tab.modified }"
          @click="(e) => handleClose(e, tab.id)"
        >
          <span v-if="tab.modified" class="modified-dot" />
          <X v-else class="close-icon" />
        </span>
      </div>
    </div>

    <div class="tabs-actions">
      <button
        v-if="showAddButton"
        class="action-btn"
        title="新建"
        @click="emit('add')"
      >
        <Plus class="action-icon" />
      </button>

      <Dropdown :trigger="['click']" placement="bottomRight">
        <button class="action-btn" title="更多操作">
          <Ellipsis class="action-icon" />
        </button>
        <template #overlay>
          <Menu @click="({ key }) => handleMenuClick(key as string)">
            <Menu.Item key="closeAll">关闭全部标签页</Menu.Item>
            <Menu.Item key="closeCurrent" :disabled="!activeTabId">
              关闭当前标签页
            </Menu.Item>
            <Menu.Item key="closeOthers" :disabled="tabs.length <= 1">
              关闭其它标签页
            </Menu.Item>
          </Menu>
        </template>
      </Dropdown>
    </div>
  </div>
</template>

<style scoped>
.editor-tabs {
  display: flex;
  align-items: center;
  height: 44px;
  background: var(--component-background, #fff);
  border-bottom: 1px solid var(--border-color, #f0f0f0);
  padding: 0 12px;
  gap: 8px;
}

.tabs-container {
  display: flex;
  flex: 1;
  overflow-x: auto;
  overflow-y: hidden;
  align-items: center;
  gap: 8px;
}

.tabs-container::-webkit-scrollbar {
  height: 0;
}

.tab-item {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  padding-right: 28px;
  cursor: pointer;
  white-space: nowrap;
  user-select: none;
  transition: all 0.2s;
  color: #666;
  font-size: 13px;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  background: #fafafa;
}

.tab-item:hover {
  border-color: #d9d9d9;
  background: #fff;
}

.tab-item.active {
  color: #7c3aed;
  border-color: #7c3aed;
  background: #faf5ff;
}

.tab-title {
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tab-title.italic {
  font-style: italic;
  opacity: 0.7;
}

.tab-close {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 3px;
  transition: opacity 0.15s, background 0.15s;
}

.tab-close:not(.show-dot) {
  opacity: 0;
}

.tab-item:hover .tab-close:not(.show-dot) {
  opacity: 1;
}

.tab-close:hover {
  background: rgba(0, 0, 0, 0.08);
}

.close-icon {
  width: 12px;
  height: 12px;
}

.modified-dot {
  width: 6px;
  height: 6px;
  background: #7c3aed;
  border-radius: 50%;
}

.tab-item:hover .tab-close.show-dot .modified-dot {
  display: none;
}

.tab-item:hover .tab-close.show-dot::after {
  content: '×';
  font-size: 12px;
  line-height: 1;
}

.tabs-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
  color: #666;
}

.action-btn:hover {
  background: rgba(0, 0, 0, 0.04);
  color: #333;
}

.action-icon {
  width: 16px;
  height: 16px;
}
</style>
