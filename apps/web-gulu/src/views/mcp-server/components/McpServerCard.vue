<script setup lang="ts">
import type { McpServer } from '#/api/mcp-server';

import {
  Card,
  Dropdown,
  Menu,
  MenuItem,
  Switch,
  Tag,
  Typography,
} from 'ant-design-vue';

defineProps<{
  server: McpServer;
}>();

const emit = defineEmits<{
  viewTools: [server: McpServer];
  edit: [server: McpServer];
  delete: [id: number];
  statusChange: [id: number, checked: boolean];
}>();

function getTransportColor(transport: string): string {
  switch (transport) {
    case 'stdio': return 'blue';
    case 'sse': return 'green';
    case 'streamable-http': return 'purple';
    default: return 'default';
  }
}

function getConnectionInfo(server: McpServer): string {
  if (server.transport === 'stdio') {
    const args = server.args?.length ? ` ${server.args.join(' ')}` : '';
    return `${server.command || ''}${args}`;
  }
  return server.url || '';
}
</script>

<template>
  <Card
    hoverable
    class="mcp-card"
    :class="{ 'mcp-card--disabled': server.status === 0 }"
  >
    <template #title>
      <div class="mcp-card__header">
        <div class="mcp-card__title-row">
          <Typography.Text strong class="mcp-card__name" :ellipsis="{ tooltip: server.name }">
            {{ server.name }}
          </Typography.Text>
        </div>
        <div class="mcp-card__meta">
          <Tag :color="getTransportColor(server.transport)" size="small">
            {{ server.transport }}
          </Tag>
          <Tag v-if="server.timeout" size="small">
            {{ server.timeout }}s
          </Tag>
        </div>
      </div>
    </template>

    <template #extra>
      <div class="mcp-card__extra" @click.stop>
        <Switch
          :checked="server.status === 1"
          size="small"
          @change="(checked: any) => emit('statusChange', server.id, !!checked)"
        />
        <Dropdown :trigger="['click']" placement="bottomRight">
          <span class="mcp-card__more">···</span>
          <template #overlay>
            <Menu @click="(info: any) => {
              if (info.key === 'tools') emit('viewTools', server);
              else if (info.key === 'edit') emit('edit', server);
              else if (info.key === 'delete') emit('delete', server.id);
            }">
              <MenuItem key="tools">查看工具</MenuItem>
              <MenuItem key="edit">编辑</MenuItem>
              <Menu.Divider />
              <MenuItem key="delete" danger>删除</MenuItem>
            </Menu>
          </template>
        </Dropdown>
      </div>
    </template>

    <div class="mcp-card__body">
      <Typography.Paragraph
        type="secondary"
        :ellipsis="{ rows: 2, tooltip: server.description }"
        class="mcp-card__desc"
      >
        {{ server.description || '暂无描述' }}
      </Typography.Paragraph>

      <div class="mcp-card__connection" :title="getConnectionInfo(server)">
        {{ getConnectionInfo(server) }}
      </div>
    </div>
  </Card>
</template>

<style scoped>
.mcp-card {
  height: 100%;
  transition: all 0.3s;
  cursor: default;
}

.mcp-card :deep(.ant-card-head) {
  min-height: auto;
  padding: 8px 12px;
}

.mcp-card :deep(.ant-card-body) {
  padding: 8px 12px 12px;
}

.mcp-card:hover {
  box-shadow: 0 4px 12px rgb(0 0 0 / 15%);
}

.mcp-card--disabled {
  opacity: 0.6;
}

.mcp-card__header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mcp-card__title-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.mcp-card__name {
  max-width: 160px;
  font-size: 15px;
}

.mcp-card__meta {
  display: flex;
  gap: 4px;
}

.mcp-card__meta :deep(.ant-tag) {
  margin: 0;
}

.mcp-card__extra {
  display: flex;
  gap: 8px;
  align-items: center;
}

.mcp-card__more {
  padding: 0 4px;
  font-size: 16px;
  font-weight: bold;
  line-height: 1;
  color: var(--ant-color-text-secondary, #999);
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
  letter-spacing: 1px;
}

.mcp-card__more:hover {
  color: var(--ant-color-text, #333);
  background: var(--ant-color-bg-text-hover, #f5f5f5);
}

.mcp-card__body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 160px;
  overflow: hidden;
}

.mcp-card__desc {
  margin-bottom: 0;
  font-size: 13px;
}

.mcp-card__connection {
  overflow: hidden;
  font-family: monospace;
  font-size: 12px;
  line-height: 1.4;
  color: var(--ant-color-text-secondary, #666);
  text-overflow: ellipsis;
  white-space: nowrap;
  background: var(--ant-color-bg-layout, #f5f5f5);
  border-radius: 4px;
  padding: 4px 8px;
}
</style>
