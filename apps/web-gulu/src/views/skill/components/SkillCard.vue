<script setup lang="ts">
import type { Skill } from '#/api/skill';

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
  skill: Skill;
}>();

const emit = defineEmits<{
  view: [skill: Skill];
  edit: [skill: Skill];
  delete: [id: number];
  export: [skill: Skill];
  statusChange: [id: number, checked: boolean];
}>();

function getCategoryColor(category: string): string {
  const colorMap: Record<string, string> = {
    '编程': 'blue',
    '测试': 'green',
    '写作': 'purple',
    '翻译': 'cyan',
    '分析': 'orange',
    '设计': 'magenta',
    '运维': 'volcano',
  };
  return colorMap[category] || 'default';
}
</script>

<template>
  <Card
    hoverable
    class="skill-card"
    :class="{ 'skill-card--disabled': skill.status === 0 }"
  >
    <template #title>
      <div class="skill-card__header">
        <div class="skill-card__title-row">
          <span v-if="skill.icon" class="skill-card__icon">
            <component :is="'Icon'" />
          </span>
          <Typography.Text strong class="skill-card__name" :ellipsis="{ tooltip: skill.name }">
            {{ skill.name }}
          </Typography.Text>
          <Tag v-if="skill.type === 1" color="gold" class="skill-card__badge">内置</Tag>
        </div>
        <div class="skill-card__meta">
          <Tag v-if="skill.category" :color="getCategoryColor(skill.category)" size="small">
            {{ skill.category }}
          </Tag>
        </div>
      </div>
    </template>

    <template #extra>
      <div class="skill-card__extra" @click.stop>
        <Switch
          :checked="skill.status === 1"
          size="small"
          @change="(checked: any) => emit('statusChange', skill.id, !!checked)"
        />
        <Dropdown :trigger="['click']" placement="bottomRight">
          <span class="skill-card__more">···</span>
          <template #overlay>
            <Menu @click="(info: any) => {
              if (info.key === 'edit') emit('edit', skill);
              else if (info.key === 'export') emit('export', skill);
              else if (info.key === 'delete') emit('delete', skill.id);
            }">
              <MenuItem key="edit">编辑</MenuItem>
              <MenuItem key="export">导出</MenuItem>
              <Menu.Divider />
              <MenuItem v-if="skill.type !== 1" key="delete" danger>删除</MenuItem>
            </Menu>
          </template>
        </Dropdown>
      </div>
    </template>

    <div class="skill-card__body" @click="emit('view', skill)">
      <Typography.Paragraph
        type="secondary"
        :ellipsis="{ rows: 2, tooltip: skill.description }"
        class="skill-card__desc"
      >
        {{ skill.description || '暂无描述' }}
      </Typography.Paragraph>

      <div class="skill-card__prompt-preview">
        <Typography.Paragraph
          type="secondary"
          :ellipsis="{ rows: 3 }"
          class="skill-card__prompt-text"
        >
          {{ skill.system_prompt }}
        </Typography.Paragraph>
      </div>

      <div class="skill-card__tags">
        <Tag
          v-for="tag in skill.tags"
          :key="tag"
          size="small"
        >
          {{ tag }}
        </Tag>
      </div>
    </div>
  </Card>
</template>

<style scoped>
.skill-card {
  height: 100%;
  transition: all 0.3s;
  cursor: default;
}

.skill-card :deep(.ant-card-head) {
  min-height: auto;
  padding: 8px 12px;
}

.skill-card :deep(.ant-card-body) {
  padding: 8px 12px 12px;
}

.skill-card:hover {
  box-shadow: 0 4px 12px rgb(0 0 0 / 15%);
}

.skill-card--disabled {
  opacity: 0.6;
}

.skill-card__header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.skill-card__title-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.skill-card__icon {
  flex-shrink: 0;
  font-size: 16px;
}

.skill-card__name {
  max-width: 140px;
  font-size: 15px;
}

.skill-card__badge {
  flex-shrink: 0;
  margin: 0;
  font-size: 11px;
}

.skill-card__meta {
  display: flex;
  gap: 4px;
}

.skill-card__meta :deep(.ant-tag) {
  margin: 0;
}

.skill-card__extra {
  display: flex;
  gap: 8px;
  align-items: center;
}

.skill-card__more {
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

.skill-card__more:hover {
  color: var(--ant-color-text, #333);
  background: var(--ant-color-bg-text-hover, #f5f5f5);
}

.skill-card__body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skill-card__desc {
  min-height: 44px;
  margin-bottom: 0;
  font-size: 13px;
}

.skill-card__prompt-preview {
  padding: 8px;
  background: var(--ant-color-bg-layout, #f5f5f5);
  border-radius: 6px;
}

.skill-card__prompt-text {
  margin-bottom: 0;
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.skill-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  min-height: 22px;
}

.skill-card__tags :deep(.ant-tag) {
  margin: 0;
}
</style>
