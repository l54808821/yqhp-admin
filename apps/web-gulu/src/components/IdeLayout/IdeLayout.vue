<script setup lang="ts">
import { provide } from 'vue';

import SplitPane from '#/components/SplitPane.vue';

import EditorTabs from './EditorTabs.vue';
import type { TabItem } from './types';
import { useTabManager } from './useTabManager';

const props = withDefaults(
  defineProps<{
    sidebarWidth?: number;
    sidebarMinWidth?: number;
    sidebarMaxWidth?: number;
    storageKey?: string;
    showAddButton?: boolean;
  }>(),
  {
    sidebarWidth: 280,
    sidebarMinWidth: 200,
    sidebarMaxWidth: 800,
    storageKey: 'ide-layout',
    showAddButton: true,
  },
);

const tabManager = useTabManager(props.storageKey);

// 提供给子组件使用
provide('tabManager', tabManager);

// 暴露方法给父组件
defineExpose({
  openTab: tabManager.openTab,
  closeTab: tabManager.closeTab,
  pinTab: tabManager.pinTab,
  setModified: tabManager.setModified,
  activateTab: tabManager.activateTab,
  closeAllTabs: tabManager.closeAllTabs,
  closeOtherTabs: tabManager.closeOtherTabs,
  tabs: tabManager.tabs,
  activeTabId: tabManager.activeTabId,
  activeTab: tabManager.activeTab,
});

const emit = defineEmits<{
  tabChange: [tab: TabItem | undefined];
  tabClose: [id: string | number];
  add: [];
}>();

function handleActivate(id: string | number) {
  tabManager.activateTab(id);
  emit('tabChange', tabManager.activeTab.value);
}

function handleClose(id: string | number) {
  tabManager.closeTab(id);
  emit('tabClose', id);
  emit('tabChange', tabManager.activeTab.value);
}

function handlePin(id: string | number) {
  tabManager.pinTab(id);
}

function handleAdd() {
  emit('add');
}

function handleCloseAll() {
  tabManager.closeAllTabs();
  emit('tabChange', undefined);
}

function handleCloseCurrent() {
  if (tabManager.activeTabId.value) {
    handleClose(tabManager.activeTabId.value);
  }
}

function handleCloseOthers() {
  if (tabManager.activeTabId.value) {
    tabManager.closeOtherTabs(tabManager.activeTabId.value);
  }
}
</script>

<template>
  <div class="ide-layout">
    <SplitPane
      :default-width="sidebarWidth"
      :min-width="sidebarMinWidth"
      :max-width="sidebarMaxWidth"
      :storage-key="`${storageKey}-sidebar`"
    >
      <template #left>
        <div class="ide-sidebar">
          <slot name="sidebar" />
        </div>
      </template>
      <template #right>
        <div class="ide-editor">
          <EditorTabs
            :tabs="tabManager.tabs.value"
            :active-tab-id="tabManager.activeTabId.value"
            :show-add-button="showAddButton"
            @activate="handleActivate"
            @close="handleClose"
            @pin="handlePin"
            @add="handleAdd"
            @close-all="handleCloseAll"
            @close-current="handleCloseCurrent"
            @close-others="handleCloseOthers"
          />
          <div class="editor-content">
            <slot
              name="editor"
              :active-tab="tabManager.activeTab.value"
              :tabs="tabManager.tabs.value"
            />
          </div>
        </div>
      </template>
    </SplitPane>
  </div>
</template>

<style scoped>
.ide-layout {
  height: 100%;
  width: 100%;
}

.ide-sidebar {
  height: 100%;
  overflow: auto;
}

.ide-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.editor-content {
  flex: 1;
  overflow: auto;
}
</style>
