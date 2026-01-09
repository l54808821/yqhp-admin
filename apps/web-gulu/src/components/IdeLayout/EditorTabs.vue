<script setup lang="ts">
import type { Component } from 'vue';

import { Ellipsis, Plus, X } from '@vben/icons';
import { createIconifyIcon } from '@vben/icons';
import { Dropdown, Menu } from 'ant-design-vue';

import type { TabItem } from './types';

// 默认文件图标
const FileIcon = createIconifyIcon('lucide:file');

defineProps<{
  tabs: TabItem[];
  activeTabId: string | number | null;
  showAddButton?: boolean;
  defaultIcon?: Component;
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
        class="tab"
        :class="{
          active: tab.id === activeTabId,
          preview: !tab.pinned && !tab.modified,
        }"
        @click="handleClick(tab.id)"
        @dblclick="handleDblClick(tab.id)"
      >
        <component
          :is="defaultIcon || FileIcon"
          class="tab-icon"
        />
        <span class="tab-label" :class="{ italic: !tab.pinned && !tab.modified }">
          {{ tab.title }}
        </span>
        <span class="tab-actions">
          <span v-if="tab.modified" class="tab-modified" />
          <span class="tab-close" @click="(e) => handleClose(e, tab.id)">
            <X class="tab-close-icon" />
          </span>
        </span>
      </div>

      <button
        v-if="showAddButton"
        class="action-btn action-btn-first"
        title="新建"
        @click="emit('add')"
      >
        <Plus class="action-icon" />
      </button>

      <Dropdown :trigger="['click']" placement="bottomLeft">
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
  align-items: stretch;
  min-height: 35px;
  background: #fff;
  border-bottom: 1px solid #e7e7e7;
}

.tabs-container {
  display: flex;
  align-items: stretch;
  overflow-x: auto;
  overflow-y: hidden;
}

.tabs-container::-webkit-scrollbar {
  height: 3px;
}

.tabs-container::-webkit-scrollbar-thumb {
  background: #c4c4c4;
}

/* 单个 Tab */
.tab {
  position: relative;
  display: flex;
  align-items: center;
  padding: 8px 10px;
  border-right: 1px solid #e7e7e7;
  cursor: pointer;
  user-select: none;
  min-width: 0;
  max-width: 200px;
}


/* 激活的 Tab */
.tab.active {
  background: #fff;
}

/* 激活 Tab 顶部主题色边框 */
.tab.active::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--primary-color, #1890ff);
}

/* Tab 图标 */
.tab-icon {
  width: 16px;
  height: 16px;
  margin-right: 6px;
  flex-shrink: 0;
  color: #6e6e6e;
}

.tab.active .tab-icon {
  color: var(--primary-color, #1890ff);
}

/* Tab 标签文字 */
.tab-label {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tab-label.italic {
  font-style: italic;
  padding-right: 2px;
}



/* Tab 操作区域 */
.tab-actions {
  display: flex;
  align-items: center;
  margin-left: 4px;
  width: 16px;
  height: 16px;
  position: relative;
}

/* 修改标记圆点 */
.tab-modified {
  position: absolute;
  width: 10px;
  height: 10px;
  background: #fff;
  border-radius: 50%;
}

.tab-modified::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 8px;
  height: 8px;
  background: var(--primary-color, #1890ff);
  border-radius: 50%;
}

/* 关闭按钮 */
.tab-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 3px;
  opacity: 0;
  position: absolute;
}

.tab:hover .tab-close {
  opacity: 1;
}

.tab:hover .tab-modified {
  display: none;
}

.tab-close:hover {
  background: rgba(0, 0, 0, 0.1);
}

.tab-close-icon {
  width: 14px;
  height: 14px;
  color: #6e6e6e;
}

/* 操作按钮 */
.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  align-self: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  color: #6e6e6e;
  flex-shrink: 0;
}

.action-btn-first {
  margin-left: 4px;
}

.action-btn:hover {
  background: rgba(0, 0, 0, 0.06);
  color: #333;
}

.action-icon {
  width: 16px;
  height: 16px;
}
</style>
