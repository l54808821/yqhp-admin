<script setup lang="ts">
import { computed } from 'vue';

import { createIconifyIcon } from '@vben/icons';

import { Dropdown, Menu, Tooltip } from 'ant-design-vue';

import type { ConfigItem } from '#/api/env';

import { useProjectStore } from '#/store/project';

const LinkIcon = createIconifyIcon('lucide:link');
const ChevronDownIcon = createIconifyIcon('lucide:chevron-down');
const GlobeIcon = createIconifyIcon('lucide:globe');
const XIcon = createIconifyIcon('lucide:x');

interface Props {
  domainCode?: string;
}

const props = withDefaults(defineProps<Props>(), {
  domainCode: '',
});

const emit = defineEmits<{
  (e: 'update:domainCode', code: string): void;
}>();

const projectStore = useProjectStore();

// 直接从 store 读取域名配置，数据由 store 统一管理
// 获取启用的域名列表
const enabledDomains = computed(() =>
  projectStore.domainConfigs.filter((d) => d.status === 1),
);

// 当前选中的域名
const selectedDomain = computed(() => {
  if (!props.domainCode) return null;
  return projectStore.domainConfigs.find((d) => d.code === props.domainCode) || null;
});

// 选中域名的 base_url
const selectedBaseUrl = computed(() => {
  if (!selectedDomain.value?.value) return '';
  return (selectedDomain.value.value as any).base_url || '';
});

// 选择域名
function selectDomain(code: string) {
  emit('update:domainCode', code);
}

// 获取域名的 base_url 显示
function getDomainUrl(domain: ConfigItem): string {
  return (domain.value as any)?.base_url || '未配置';
}
</script>

<template>
  <Dropdown :trigger="['click']" placement="bottomLeft">
    <!-- 触发器 -->
    <Tooltip v-if="selectedDomain" :title="selectedBaseUrl || selectedDomain.name">
      <button class="domain-btn domain-btn--active">
        <GlobeIcon class="size-3.5" />
        <span class="domain-name">{{ selectedDomain.name }}</span>
        <ChevronDownIcon class="size-3 opacity-60" />
      </button>
    </Tooltip>
    <Tooltip v-else title="选择环境域名">
      <button class="domain-btn domain-btn--empty">
        <LinkIcon class="size-4" />
      </button>
    </Tooltip>

    <!-- 下拉菜单 -->
    <template #overlay>
      <Menu class="domain-menu" @click="({ key }: any) => selectDomain(key)">
        <!-- 无域名选项 -->
        <Menu.Item key="" class="domain-menu-item">
          <div class="domain-option">
            <XIcon class="size-3.5 option-icon" />
            <span class="option-label">不使用域名</span>
          </div>
        </Menu.Item>

        <Menu.Divider v-if="enabledDomains.length > 0" />

        <!-- 域名列表 -->
        <Menu.Item
          v-for="domain in enabledDomains"
          :key="domain.code"
          class="domain-menu-item"
        >
          <div class="domain-option">
            <GlobeIcon class="size-3.5 option-icon" />
            <div class="option-info">
              <span class="option-label">{{ domain.name }}</span>
              <span class="option-url">{{ getDomainUrl(domain) }}</span>
            </div>
          </div>
        </Menu.Item>

        <!-- 空状态 -->
        <Menu.Item v-if="enabledDomains.length === 0" disabled>
          <span class="empty-hint">当前环境暂无域名配置</span>
        </Menu.Item>
      </Menu>
    </template>
  </Dropdown>
</template>

<style scoped>
.domain-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.domain-btn--empty {
  width: 32px;
  height: 32px;
  justify-content: center;
  padding: 0;
  color: hsl(var(--foreground) / 50%);
  background: transparent;
}

.domain-btn--empty:hover {
  color: hsl(var(--foreground));
  background: hsl(var(--accent));
}

.domain-btn--active {
  height: 32px;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 500;
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 10%);
  border: 1px solid hsl(var(--primary) / 25%);
}

.domain-btn--active:hover {
  background: hsl(var(--primary) / 18%);
}

.domain-name {
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 下拉菜单 */
.domain-menu {
  min-width: 260px;
}

.domain-menu-item {
  padding: 6px 12px;
}

.domain-option {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.option-icon {
  margin-top: 2px;
  color: hsl(var(--foreground) / 40%);
  flex-shrink: 0;
}

.option-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.option-label {
  font-size: 13px;
  font-weight: 500;
  color: hsl(var(--foreground));
}

.option-url {
  font-size: 11px;
  color: hsl(var(--foreground) / 45%);
  font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty-hint {
  font-size: 12px;
  color: hsl(var(--foreground) / 40%);
}
</style>
