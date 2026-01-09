import { computed, ref, watch } from 'vue';

import type { TabItem } from './types';

export function useTabManager(storageKey?: string) {
  const tabs = ref<TabItem[]>([]);
  const activeTabId = ref<string | number | null>(null);

  // 从 localStorage 恢复状态
  if (storageKey) {
    const saved = localStorage.getItem(`${storageKey}-tabs`);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        tabs.value = data.tabs || [];
        activeTabId.value = data.activeTabId || null;
      } catch {
        // ignore
      }
    }
  }

  // 保存到 localStorage
  function saveState() {
    if (storageKey) {
      localStorage.setItem(
        `${storageKey}-tabs`,
        JSON.stringify({
          tabs: tabs.value,
          activeTabId: activeTabId.value,
        }),
      );
    }
  }

  // 监听变化自动保存
  watch([tabs, activeTabId], saveState, { deep: true });

  // 当前激活的 tab
  const activeTab = computed(() =>
    tabs.value.find((t) => t.id === activeTabId.value),
  );

  // 查找预览 tab（未固定的 tab）
  function findPreviewTab(): TabItem | undefined {
    return tabs.value.find((t) => !t.pinned && !t.modified);
  }

  // 打开 tab
  function openTab(item: TabItem) {
    const existingTab = tabs.value.find((t) => t.id === item.id);

    if (existingTab) {
      // 已存在，直接激活
      activeTabId.value = item.id;
      return;
    }

    // 查找预览 tab
    const previewTab = findPreviewTab();

    if (previewTab && !item.pinned) {
      // 替换预览 tab
      const index = tabs.value.findIndex((t) => t.id === previewTab.id);
      tabs.value.splice(index, 1, { ...item, pinned: false });
    } else {
      // 添加新 tab
      tabs.value.push({ ...item, pinned: item.pinned ?? false });
    }

    activeTabId.value = item.id;
  }

  // 关闭 tab
  function closeTab(id: string | number) {
    const index = tabs.value.findIndex((t) => t.id === id);
    if (index === -1) return;

    tabs.value.splice(index, 1);

    // 如果关闭的是当前激活的 tab，切换到相邻 tab
    if (activeTabId.value === id) {
      if (tabs.value.length > 0) {
        const newIndex = Math.min(index, tabs.value.length - 1);
        activeTabId.value = tabs.value[newIndex]?.id ?? null;
      } else {
        activeTabId.value = null;
      }
    }
  }

  // 固定 tab（双击）
  function pinTab(id: string | number) {
    const tab = tabs.value.find((t) => t.id === id);
    if (tab) {
      tab.pinned = true;
    }
  }

  // 设置 tab 修改状态
  function setModified(id: string | number, modified: boolean) {
    const tab = tabs.value.find((t) => t.id === id);
    if (tab) {
      tab.modified = modified;
      // 修改后自动固定
      if (modified) {
        tab.pinned = true;
      }
    }
  }

  // 激活 tab
  function activateTab(id: string | number) {
    activeTabId.value = id;
  }

  // 关闭所有 tab
  function closeAllTabs() {
    tabs.value = [];
    activeTabId.value = null;
  }

  // 关闭其他 tab
  function closeOtherTabs(id: string | number) {
    tabs.value = tabs.value.filter((t) => t.id === id);
    activeTabId.value = id;
  }

  return {
    tabs,
    activeTabId,
    activeTab,
    openTab,
    closeTab,
    pinTab,
    setModified,
    activateTab,
    closeAllTabs,
    closeOtherTabs,
  };
}
