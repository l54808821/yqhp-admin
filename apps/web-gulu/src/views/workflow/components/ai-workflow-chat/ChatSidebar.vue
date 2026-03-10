<script setup lang="ts">
import { Button, Dropdown, Tooltip, Popconfirm } from 'ant-design-vue';
import { createIconifyIcon } from '@vben/icons';

import type { AIConversation } from '#/api/workflow';

const PlusIcon = createIconifyIcon('lucide:plus');
const TrashIcon = createIconifyIcon('lucide:trash-2');
const MessageCircle = createIconifyIcon('lucide:message-circle');
const SparklesIcon = createIconifyIcon('lucide:sparkles');
const PanelLeftClose = createIconifyIcon('lucide:panel-left-close');
const PanelLeftOpen = createIconifyIcon('lucide:panel-left-open');

defineProps<{
  conversations: AIConversation[];
  currentConversationId?: number;
  currentTitle?: string;
  workflowName?: string;
  compact?: boolean;
  collapsed?: boolean;
}>();

const emit = defineEmits<{
  'new-conversation': [];
  'switch-conversation': [conv: AIConversation];
  'delete-conversation': [id: number];
  'update:collapsed': [value: boolean];
}>();
</script>

<template>
  <!-- 完整侧栏（非 compact 模式） -->
  <template v-if="!compact">
    <div class="sidebar" :class="{ 'sidebar--collapsed': collapsed }">
      <div class="sidebar-header">
        <div class="sidebar-title">
          <SparklesIcon class="sidebar-title-icon" />
          <span>{{ workflowName || '对话' }}</span>
        </div>
        <Tooltip title="收起侧栏">
          <button class="sidebar-toggle" @click="emit('update:collapsed', true)">
            <PanelLeftClose class="size-4" />
          </button>
        </Tooltip>
      </div>

      <Button type="primary" block class="new-conv-btn" @click="emit('new-conversation')">
        <template #icon><PlusIcon class="size-4" /></template>
        开启新对话
      </Button>

      <div class="conv-list">
        <div
          v-for="conv in conversations"
          :key="conv.id"
          class="conv-item"
          :class="{ 'conv-item--active': currentConversationId === conv.id }"
          @click="emit('switch-conversation', conv)"
        >
          <MessageCircle class="conv-item-icon" />
          <span class="conv-item-title">{{ conv.title || '新的对话' }}</span>
          <Popconfirm title="确定删除此对话？" @confirm.stop="emit('delete-conversation', conv.id)">
            <button class="conv-item-delete" @click.stop>
              <TrashIcon class="size-3" />
            </button>
          </Popconfirm>
        </div>
        <div v-if="conversations.length === 0" class="conv-empty">暂无对话</div>
      </div>
    </div>

    <!-- 侧栏收起时的展开按钮 -->
    <div v-if="collapsed" class="sidebar-expand-bar">
      <Tooltip title="展开侧栏" placement="right">
        <button class="sidebar-expand-btn" @click="emit('update:collapsed', false)">
          <PanelLeftOpen class="size-4" />
        </button>
      </Tooltip>
    </div>
  </template>

  <!-- compact 模式顶栏（渲染在主区域内部，由父组件放置） -->
  <div v-if="compact" class="compact-topbar">
    <div class="compact-topbar-left">
      <SparklesIcon class="compact-topbar-icon" />
      <span class="compact-topbar-title">
        {{ currentTitle || workflowName || 'AI 对话' }}
      </span>
    </div>
    <div class="compact-topbar-right">
      <Tooltip title="历史对话">
        <Dropdown placement="bottomRight" :trigger="['click']">
          <button class="compact-topbar-btn">
            <MessageCircle class="size-4" />
          </button>
          <template #overlay>
            <div class="conv-dropdown">
              <div class="conv-dropdown-header">
                <span>历史对话</span>
                <Button type="link" size="small" @click="emit('new-conversation')">
                  <template #icon><PlusIcon class="size-3" /></template>
                  新对话
                </Button>
              </div>
              <div class="conv-dropdown-list">
                <div
                  v-for="conv in conversations"
                  :key="conv.id"
                  class="conv-dropdown-item"
                  :class="{ 'conv-dropdown-item--active': currentConversationId === conv.id }"
                  @click="emit('switch-conversation', conv)"
                >
                  <span class="conv-dropdown-item-title">{{ conv.title || '新的对话' }}</span>
                  <Popconfirm title="确定删除？" @confirm.stop="emit('delete-conversation', conv.id)">
                    <button class="conv-dropdown-item-delete" @click.stop>
                      <TrashIcon class="size-3" />
                    </button>
                  </Popconfirm>
                </div>
                <div v-if="conversations.length === 0" class="conv-dropdown-empty">暂无历史对话</div>
              </div>
            </div>
          </template>
        </Dropdown>
      </Tooltip>
      <Tooltip title="开启新对话">
        <button class="compact-topbar-btn" @click="emit('new-conversation')">
          <PlusIcon class="size-4" />
        </button>
      </Tooltip>
    </div>
  </div>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  width: 240px;
  min-width: 240px;
  max-width: 240px;
  height: 100%;
  background: hsl(var(--background));
  overflow: hidden;
  border-right: 1px solid hsl(var(--border));
  transition: width 0.2s, min-width 0.2s;
}

.sidebar--collapsed {
  width: 0;
  min-width: 0;
  overflow: hidden;
  border-right: none;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid hsl(var(--border));
}

.sidebar-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 14px;
  color: hsl(var(--foreground));
  min-width: 0;
  overflow: hidden;
}

.sidebar-title span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar-title-icon {
  width: 20px;
  height: 20px;
  color: #1677ff;
}

.sidebar-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 6px;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  transition: all 0.2s;
}

.sidebar-toggle:hover {
  background: hsl(var(--accent));
  color: hsl(var(--foreground));
}

.new-conv-btn {
  margin: 12px 12px;
  width: calc(100% - 24px);
}

.conv-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 8px;
}

.conv-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s;
  position: relative;
}

.conv-item:hover {
  background: hsl(var(--accent));
}

.conv-item--active {
  background: hsl(var(--accent));
}

.conv-item-icon {
  width: 14px;
  height: 14px;
  color: hsl(var(--muted-foreground));
  flex-shrink: 0;
}

.conv-item-title {
  flex: 1;
  font-size: 13px;
  color: hsl(var(--foreground));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conv-item-delete {
  display: none;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  border-radius: 4px;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  flex-shrink: 0;
}

.conv-item:hover .conv-item-delete {
  display: flex;
}

.conv-item-delete:hover {
  color: #ff4d4f;
  background: #fff1f0;
}

.conv-empty {
  text-align: center;
  padding: 24px 0;
  font-size: 13px;
  color: hsl(var(--muted-foreground));
}

/* 侧栏展开按钮 */
.sidebar-expand-bar {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 10;
}

.sidebar-expand-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  background: hsl(var(--background));
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  transition: all 0.2s;
}

.sidebar-expand-btn:hover {
  border-color: var(--ant-color-primary, #1677ff);
  color: var(--ant-color-primary, #1677ff);
  background: hsl(var(--accent));
}

/* compact 模式顶栏 */
.compact-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 44px;
  padding: 0 12px;
  border-bottom: 1px solid hsl(var(--border));
  background: hsl(var(--background));
  flex-shrink: 0;
}

.compact-topbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.compact-topbar-icon {
  width: 18px;
  height: 18px;
  color: #1677ff;
  flex-shrink: 0;
}

.compact-topbar-title {
  font-size: 13px;
  font-weight: 500;
  color: hsl(var(--foreground));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.compact-topbar-right {
  display: flex;
  align-items: center;
  gap: 4px;
}

.compact-topbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 6px;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  transition: all 0.2s;
}

.compact-topbar-btn:hover {
  background: hsl(var(--accent));
  color: hsl(var(--foreground));
}

/* 会话下拉菜单 */
.conv-dropdown {
  width: 260px;
  background: hsl(var(--background));
  border-radius: 8px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.conv-dropdown-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px 6px;
  font-size: 13px;
  font-weight: 500;
  color: hsl(var(--foreground));
}

.conv-dropdown-list {
  max-height: 300px;
  overflow-y: auto;
  padding: 4px 6px 8px;
}

.conv-dropdown-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.conv-dropdown-item:hover {
  background: hsl(var(--accent));
}

.conv-dropdown-item--active {
  background: hsl(var(--accent));
}

.conv-dropdown-item-title {
  font-size: 13px;
  color: hsl(var(--foreground));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.conv-dropdown-item-delete {
  display: none;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: none;
  background: transparent;
  border-radius: 4px;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  flex-shrink: 0;
}

.conv-dropdown-item:hover .conv-dropdown-item-delete {
  display: flex;
}

.conv-dropdown-item-delete:hover {
  color: #ff4d4f;
  background: #fff1f0;
}

.conv-dropdown-empty {
  text-align: center;
  padding: 16px 0;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}
</style>
