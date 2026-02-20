<script setup lang="ts">
import { computed } from 'vue';

import { createIconifyIcon } from '@vben/icons';

import { Dropdown, Menu, Tag, Tooltip } from 'ant-design-vue';

import type { ConfigItem } from '#/api/env';

import { useProjectStore } from '#/store/project';

const MqIcon = createIconifyIcon('lucide:message-square');
const ChevronDownIcon = createIconifyIcon('lucide:chevron-down');
const XIcon = createIconifyIcon('lucide:x');

interface Props {
  mqConfigCode?: string;
}

const props = withDefaults(defineProps<Props>(), {
  mqConfigCode: '',
});

const emit = defineEmits<{
  (e: 'update:mqConfigCode', code: string): void;
}>();

const projectStore = useProjectStore();

const mqConfigs = computed(() => projectStore.mqConfigs || []);

const selectedConfig = computed(() => {
  if (!props.mqConfigCode) return null;
  return mqConfigs.value.find((d) => d.code === props.mqConfigCode) || null;
});

function getMqTypeColor(mqType: string): string {
  const colors: Record<string, string> = {
    rabbitmq: '#ff6600',
    kafka: '#231f20',
    rocketmq: '#d77310',
  };
  return colors[mqType] || '#666';
}

function getMqTypeLabel(mqType: string): string {
  const labels: Record<string, string> = {
    rabbitmq: 'RabbitMQ',
    kafka: 'Kafka',
    rocketmq: 'RocketMQ',
  };
  return labels[mqType] || mqType;
}

function getConnectionSummary(config: ConfigItem): string {
  const host = config?.value?.host || '';
  const port = config?.value?.port || '';
  if (!host) return '未配置';
  return port ? `${host}:${port}` : host;
}

function selectConfig(code: string) {
  emit('update:mqConfigCode', code);
}
</script>

<template>
  <Dropdown :trigger="['click']" placement="bottomLeft">
    <Tooltip
      v-if="selectedConfig"
      :title="getConnectionSummary(selectedConfig)"
    >
      <button class="mq-btn mq-btn--active">
        <MqIcon class="size-3.5" />
        <span class="mq-name">{{ selectedConfig.name }}</span>
        <ChevronDownIcon class="size-3 opacity-60" />
      </button>
    </Tooltip>
    <button v-else class="mq-btn mq-btn--empty">
      <MqIcon class="size-4" />
      <span class="mq-placeholder">选择 MQ 配置</span>
      <ChevronDownIcon class="size-3 opacity-60" />
    </button>

    <template #overlay>
      <Menu class="mq-menu" @click="({ key }: any) => selectConfig(key)">
        <Menu.Item key="" class="mq-menu-item">
          <div class="mq-option">
            <XIcon class="size-3.5 option-icon" />
            <span class="option-label">不使用配置</span>
          </div>
        </Menu.Item>

        <Menu.Divider v-if="mqConfigs.length > 0" />

        <Menu.Item
          v-for="config in mqConfigs"
          :key="config.code"
          class="mq-menu-item"
        >
          <div class="mq-option">
            <MqIcon
              class="size-3.5 option-icon"
              :style="{ color: getMqTypeColor(config?.extra?.mq_type || 'rabbitmq') }"
            />
            <div class="option-info">
              <div class="option-header">
                <span class="option-label">{{ config.name }}</span>
                <Tag
                  :color="getMqTypeColor(config?.extra?.mq_type || 'rabbitmq')"
                  class="option-tag"
                >
                  {{ getMqTypeLabel(config?.extra?.mq_type || 'rabbitmq') }}
                </Tag>
              </div>
              <span class="option-summary">{{ getConnectionSummary(config) }}</span>
            </div>
          </div>
        </Menu.Item>

        <Menu.Item v-if="mqConfigs.length === 0" disabled>
          <span class="empty-hint">当前环境暂无 MQ 配置，请在环境设置中添加</span>
        </Menu.Item>
      </Menu>
    </template>
  </Dropdown>
</template>

<style scoped>
.mq-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.mq-btn--empty {
  height: 32px;
  padding: 0 10px;
  font-size: 12px;
  color: hsl(var(--foreground) / 50%);
  background: hsl(var(--accent) / 50%);
  border: 1px dashed hsl(var(--border));
}

.mq-btn--empty:hover {
  color: hsl(var(--foreground) / 70%);
  background: hsl(var(--accent));
  border-color: hsl(var(--primary) / 40%);
}

.mq-placeholder {
  font-size: 12px;
}

.mq-btn--active {
  height: 32px;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 500;
  color: #faad14;
  background: color-mix(in srgb, #faad14 10%, transparent);
  border: 1px solid color-mix(in srgb, #faad14 25%, transparent);
}

.mq-btn--active:hover {
  background: color-mix(in srgb, #faad14 18%, transparent);
}

.mq-name {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mq-menu {
  min-width: 280px;
}

.mq-menu-item {
  padding: 6px 12px;
}

.mq-option {
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
