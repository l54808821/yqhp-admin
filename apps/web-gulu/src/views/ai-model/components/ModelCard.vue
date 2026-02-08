<script setup lang="ts">
import type { AiModel } from '#/api/ai-model';

import {
  Card,
  Dropdown,
  Menu,
  MenuItem,
  Switch,
  Tag,
  Tooltip,
  Typography,
} from 'ant-design-vue';

defineProps<{
  model: AiModel;
}>();

const emit = defineEmits<{
  chat: [model: AiModel];
  edit: [model: AiModel];
  delete: [id: number];
  statusChange: [id: number, checked: boolean];
}>();

function handleMenuClick(key: string) {
  const model = arguments[0]; // not used, we get model from parent
  switch (key) {
    case 'chat':
      emit('chat', arguments[1] as AiModel);
      break;
    case 'edit':
      emit('edit', arguments[1] as AiModel);
      break;
    case 'delete':
      emit('delete', (arguments[1] as AiModel).id);
      break;
  }
}

function formatContextLength(length?: number): string {
  if (!length) return '';
  if (length >= 1024) return `${Math.round(length / 1024)}K`;
  return `${length}`;
}

function getCapabilityTagColor(tag: string): string {
  const colorMap: Record<string, string> = {
    '对话': 'blue',
    'FIM': 'purple',
    'Prefix': 'cyan',
    'Tools': 'green',
    '视觉': 'orange',
    'MoE': 'magenta',
    'Math': 'red',
    'Coder': 'geekblue',
    '推理': 'volcano',
    '语音': 'lime',
    '生图': 'gold',
    '视频': 'purple',
  };
  return colorMap[tag] || 'default';
}
</script>

<template>
  <Card
    hoverable
    class="model-card"
    :class="{ 'model-card--disabled': model.status === 0 }"
  >
    <template #title>
      <div class="model-card__header">
        <div class="model-card__title-row">
          <Typography.Text strong class="model-card__name" :ellipsis="{ tooltip: model.name }">
            {{ model.name }}
          </Typography.Text>
          <Tag v-if="model.version" color="blue" class="model-card__version">
            v{{ model.version }}
          </Tag>
        </div>
        <Typography.Text type="secondary" class="model-card__provider">
          {{ model.provider }}
        </Typography.Text>
      </div>
    </template>

    <template #extra>
      <div class="model-card__extra" @click.stop>
        <Switch
          :checked="model.status === 1"
          size="small"
          @change="(checked: any) => emit('statusChange', model.id, !!checked)"
        />
        <Dropdown :trigger="['click']" placement="bottomRight">
          <span class="model-card__more">···</span>
          <template #overlay>
            <Menu @click="(info: any) => {
              if (info.key === 'chat') emit('chat', model);
              else if (info.key === 'edit') emit('edit', model);
              else if (info.key === 'delete') emit('delete', model.id);
            }">
              <MenuItem key="chat">对话体验</MenuItem>
              <MenuItem key="edit">编辑</MenuItem>
              <Menu.Divider />
              <MenuItem key="delete" danger>删除</MenuItem>
            </Menu>
          </template>
        </Dropdown>
      </div>
    </template>

    <div class="model-card__body" @click="emit('chat', model)">
      <Typography.Paragraph
        type="secondary"
        :ellipsis="{ rows: 2, tooltip: model.description }"
        class="model-card__desc"
      >
        {{ model.description || '暂无描述' }}
      </Typography.Paragraph>

      <div class="model-card__info">
        <span v-if="model.param_size" class="model-card__info-item">
          <Tag>{{ model.param_size }}</Tag>
        </span>
        <span v-if="model.context_length" class="model-card__info-item">
          <Tag>{{ formatContextLength(model.context_length) }}</Tag>
        </span>
        <span class="model-card__info-item">
          <Tooltip :title="model.model_id">
            <Tag color="processing">{{ model.model_id }}</Tag>
          </Tooltip>
        </span>
      </div>

      <div class="model-card__tags">
        <Tag
          v-for="tag in model.capability_tags"
          :key="tag"
          :color="getCapabilityTagColor(tag)"
          size="small"
        >
          {{ tag }}
        </Tag>
        <Tag
          v-for="tag in model.custom_tags"
          :key="'custom-' + tag"
          size="small"
        >
          {{ tag }}
        </Tag>
      </div>
    </div>
  </Card>
</template>

<style scoped>
.model-card {
  height: 100%;
  transition: all 0.3s;
  cursor: default;
}

.model-card :deep(.ant-card-head) {
  min-height: auto;
  padding: 8px 12px;
}

.model-card :deep(.ant-card-body) {
  padding: 8px 12px 12px;
}

.model-card:hover {
  box-shadow: 0 4px 12px rgb(0 0 0 / 15%);
}

.model-card--disabled {
  opacity: 0.6;
}

.model-card__header {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.model-card__title-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.model-card__name {
  max-width: 140px;
  font-size: 15px;
}

.model-card__version {
  flex-shrink: 0;
  margin: 0;
  font-size: 11px;
}

.model-card__provider {
  font-size: 12px;
}

.model-card__extra {
  display: flex;
  gap: 8px;
  align-items: center;
}

.model-card__more {
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

.model-card__more:hover {
  color: var(--ant-color-text, #333);
  background: var(--ant-color-bg-text-hover, #f5f5f5);
}

.model-card__body {
  cursor: pointer;
}

.model-card__desc {
  min-height: 44px;
  margin-bottom: 8px;
  font-size: 13px;
}

.model-card__info {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 8px;
}

.model-card__info-item :deep(.ant-tag) {
  margin: 0;
  font-size: 11px;
}

.model-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  min-height: 24px;
}

.model-card__tags :deep(.ant-tag) {
  margin: 0;
}
</style>
