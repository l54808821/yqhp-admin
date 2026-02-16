<script setup lang="ts">
/**
 * 数据库数据源选择器
 * 参考 DomainSelector 设计，从 store 读取数据库配置
 */
import { computed } from 'vue';

import { createIconifyIcon } from '@vben/icons';

import { Dropdown, Menu, Tag, Tooltip } from 'ant-design-vue';

import type { ConfigItem } from '#/api/env';

import { useProjectStore } from '#/store/project';

const DatabaseIcon = createIconifyIcon('lucide:database');
const ChevronDownIcon = createIconifyIcon('lucide:chevron-down');
const XIcon = createIconifyIcon('lucide:x');

interface Props {
  datasourceCode?: string;
}

const props = withDefaults(defineProps<Props>(), {
  datasourceCode: '',
});

const emit = defineEmits<{
  (e: 'update:datasourceCode', code: string): void;
}>();

const projectStore = useProjectStore();

// 获取数据库配置列表
const databaseConfigs = computed(() => projectStore.databaseConfigs || []);

// 当前选中的数据源
const selectedDatasource = computed(() => {
  if (!props.datasourceCode) return null;
  return databaseConfigs.value.find((d) => d.code === props.datasourceCode) || null;
});

// 数据库类型颜色
function getDbTypeColor(dbType: string): string {
  const colors: Record<string, string> = {
    mysql: '#1890ff',
    postgresql: '#336791',
    redis: '#dc382d',
    mongodb: '#47a248',
  };
  return colors[dbType] || '#666';
}

// 数据库类型标签
function getDbTypeLabel(dbType: string): string {
  const labels: Record<string, string> = {
    mysql: 'MySQL',
    postgresql: 'PostgreSQL',
    redis: 'Redis',
    mongodb: 'MongoDB',
  };
  return labels[dbType] || dbType;
}

// 获取连接摘要
function getConnectionSummary(config: ConfigItem): string {
  const host = config?.value?.host || '';
  const port = config?.value?.port || '';
  const database = config?.value?.database || '';
  if (!host) return '未配置';
  let summary = host;
  if (port) summary += `:${port}`;
  if (database) summary += `/${database}`;
  return summary;
}

// 选择数据源
function selectDatasource(code: string) {
  emit('update:datasourceCode', code);
}
</script>

<template>
  <Dropdown :trigger="['click']" placement="bottomLeft">
    <!-- 触发器 -->
    <Tooltip
      v-if="selectedDatasource"
      :title="getConnectionSummary(selectedDatasource)"
    >
      <button class="ds-btn ds-btn--active">
        <DatabaseIcon class="size-3.5" />
        <span class="ds-name">{{ selectedDatasource.name }}</span>
        <ChevronDownIcon class="size-3 opacity-60" />
      </button>
    </Tooltip>
    <button v-else class="ds-btn ds-btn--empty">
      <DatabaseIcon class="size-4" />
      <span class="ds-placeholder">选择数据源</span>
      <ChevronDownIcon class="size-3 opacity-60" />
    </button>

    <!-- 下拉菜单 -->
    <template #overlay>
      <Menu class="ds-menu" @click="({ key }: any) => selectDatasource(key)">
        <!-- 不使用数据源 -->
        <Menu.Item key="" class="ds-menu-item">
          <div class="ds-option">
            <XIcon class="size-3.5 option-icon" />
            <span class="option-label">不使用数据源</span>
          </div>
        </Menu.Item>

        <Menu.Divider v-if="databaseConfigs.length > 0" />

        <!-- 数据源列表 -->
        <Menu.Item
          v-for="config in databaseConfigs"
          :key="config.code"
          class="ds-menu-item"
        >
          <div class="ds-option">
            <DatabaseIcon
              class="size-3.5 option-icon"
              :style="{ color: getDbTypeColor(config?.extra?.db_type || 'mysql') }"
            />
            <div class="option-info">
              <div class="option-header">
                <span class="option-label">{{ config.name }}</span>
                <Tag
                  :color="getDbTypeColor(config?.extra?.db_type || 'mysql')"
                  class="option-tag"
                >
                  {{ getDbTypeLabel(config?.extra?.db_type || 'mysql') }}
                </Tag>
              </div>
              <span class="option-summary">{{ getConnectionSummary(config) }}</span>
            </div>
          </div>
        </Menu.Item>

        <!-- 空状态 -->
        <Menu.Item v-if="databaseConfigs.length === 0" disabled>
          <span class="empty-hint">当前环境暂无数据库配置，请在环境设置中添加</span>
        </Menu.Item>
      </Menu>
    </template>
  </Dropdown>
</template>

<style scoped>
.ds-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.ds-btn--empty {
  height: 32px;
  padding: 0 10px;
  font-size: 12px;
  color: hsl(var(--foreground) / 50%);
  background: hsl(var(--accent) / 50%);
  border: 1px dashed hsl(var(--border));
}

.ds-btn--empty:hover {
  color: hsl(var(--foreground) / 70%);
  background: hsl(var(--accent));
  border-color: hsl(var(--primary) / 40%);
}

.ds-placeholder {
  font-size: 12px;
}

.ds-btn--active {
  height: 32px;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 500;
  color: #1890ff;
  background: color-mix(in srgb, #1890ff 10%, transparent);
  border: 1px solid color-mix(in srgb, #1890ff 25%, transparent);
}

.ds-btn--active:hover {
  background: color-mix(in srgb, #1890ff 18%, transparent);
}

.ds-name {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 下拉菜单 */
.ds-menu {
  min-width: 280px;
}

.ds-menu-item {
  padding: 6px 12px;
}

.ds-option {
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

.option-header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.option-label {
  font-size: 13px;
  font-weight: 500;
  color: hsl(var(--foreground));
}

.option-tag {
  font-size: 10px;
  line-height: 16px;
  padding: 0 4px;
  margin: 0;
  border-radius: 3px;
}

.option-summary {
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
