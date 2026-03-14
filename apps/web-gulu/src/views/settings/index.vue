<script setup lang="ts">
import { type Component, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { createIconifyIcon } from '@vben/icons';

const ServerIcon = createIconifyIcon('lucide:server');
const BrainIcon = createIconifyIcon('lucide:brain');
const PlugIcon = createIconifyIcon('lucide:plug');
const SparklesIcon = createIconifyIcon('lucide:sparkles');

interface SettingMenuItem {
  key: string;
  routeName: string;
  title: string;
  icon: Component;
}

const route = useRoute();
const router = useRouter();

const menuItems: SettingMenuItem[] = [
  { key: 'executor', routeName: 'SettingsExecutor', title: '执行机', icon: ServerIcon },
  { key: 'ai-model', routeName: 'SettingsAiModel', title: '模型管理', icon: BrainIcon },
  { key: 'mcp', routeName: 'SettingsMcp', title: 'MCP', icon: PlugIcon },
  { key: 'skill', routeName: 'SettingsSkill', title: 'Skill', icon: SparklesIcon },
];

const activeKey = computed(() => {
  const name = route.name as string;
  const item = menuItems.find((m) => name === m.routeName || name?.startsWith(m.routeName));
  return item?.key ?? menuItems[0]?.key;
});

function handleMenuClick(item: SettingMenuItem) {
  const projectId = route.params.projectId;
  router.push({ name: item.routeName, params: { projectId } });
}
</script>

<template>
  <div class="settings-page">
    <div class="settings-sidebar">
      <div class="settings-sidebar__title">设置</div>
      <nav class="settings-nav">
        <div
          v-for="item in menuItems"
          :key="item.key"
          class="settings-nav__item"
          :class="{ 'settings-nav__item--active': activeKey === item.key }"
          @click="handleMenuClick(item)"
        >
          <component :is="item.icon" class="settings-nav__icon" />
          <span>{{ item.title }}</span>
        </div>
      </nav>
    </div>
    <div class="settings-content">
      <router-view />
    </div>
  </div>
</template>

<style scoped>
.settings-page {
  display: flex;
  height: calc(100vh - 50px);
  overflow: hidden;
}

.settings-sidebar {
  width: 200px;
  flex-shrink: 0;
  border-right: 1px solid var(--ant-color-border-secondary, #f0f0f0);
  background: var(--ant-color-bg-container, #fff);
  display: flex;
  flex-direction: column;
  padding: 16px 0;
}

.settings-sidebar__title {
  padding: 0 20px 16px;
  font-size: 16px;
  font-weight: 600;
  color: var(--ant-color-text, #1f1f1f);
}

.settings-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 8px;
}

.settings-nav__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  color: var(--ant-color-text-secondary, #666);
  transition: all 0.2s;
  user-select: none;
}

.settings-nav__item:hover {
  background: var(--ant-color-bg-layout, #f5f5f5);
  color: var(--ant-color-text, #1f1f1f);
}

.settings-nav__item--active {
  background: var(--ant-color-primary-bg, #e6f4ff);
  color: var(--ant-color-primary, #1677ff);
  font-weight: 500;
}

.settings-nav__item--active:hover {
  background: var(--ant-color-primary-bg, #e6f4ff);
  color: var(--ant-color-primary, #1677ff);
}

.settings-nav__icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.settings-content {
  flex: 1;
  min-width: 0;
  overflow: auto;
}
</style>
