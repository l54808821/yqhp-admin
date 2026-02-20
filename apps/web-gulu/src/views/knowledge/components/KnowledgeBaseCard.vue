<script setup lang="ts">
import type { KnowledgeBase } from '#/api/knowledge-base';

import { computed } from 'vue';

import { Button, Card, Dropdown, Menu, Switch, Tag, Tooltip } from 'ant-design-vue';
import {
  Database,
  EllipsisVertical,
  FileText,
  GitFork,
  Layers,
} from 'lucide-vue-next';

interface Props {
  kb: KnowledgeBase;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'edit', kb: KnowledgeBase): void;
  (e: 'delete', id: number): void;
  (e: 'statusChange', id: number, checked: boolean): void;
  (e: 'view', kb: KnowledgeBase): void;
}>();

const typeLabel = computed(() =>
  props.kb.type === 'graph' ? '图知识库' : '普通知识库',
);
const typeColor = computed(() =>
  props.kb.type === 'graph' ? 'purple' : 'blue',
);
const typeIcon = computed(() =>
  props.kb.type === 'graph' ? GitFork : Database,
);
</script>

<template>
  <Card
    hoverable
    class="kb-card"
    :body-style="{ padding: '16px' }"
    @click="emit('view', kb)"
  >
    <!-- 头部 -->
    <div class="kb-card-header">
      <div class="kb-card-icon">
        <component :is="typeIcon" :size="20" />
      </div>
      <div class="kb-card-title-area">
        <div class="kb-card-name">{{ kb.name }}</div>
        <Tag :color="typeColor" size="small">{{ typeLabel }}</Tag>
      </div>
      <Dropdown :trigger="['click']" placement="bottomRight" @click.stop>
        <Button type="text" size="small" class="kb-card-more" @click.stop>
          <EllipsisVertical :size="16" />
        </Button>
        <template #overlay>
          <Menu>
            <Menu.Item key="edit" @click="emit('edit', kb)">编辑</Menu.Item>
            <Menu.Divider />
            <Menu.Item key="delete" danger @click="emit('delete', kb.id)">删除</Menu.Item>
          </Menu>
        </template>
      </Dropdown>
    </div>

    <!-- 描述 -->
    <div class="kb-card-desc">
      {{ kb.description || '暂无描述' }}
    </div>

    <!-- 统计信息 -->
    <div class="kb-card-stats">
      <Tooltip title="文档数">
        <div class="kb-card-stat">
          <FileText :size="14" />
          <span>{{ kb.document_count }} 文档</span>
        </div>
      </Tooltip>
      <Tooltip title="分块数">
        <div class="kb-card-stat">
          <Layers :size="14" />
          <span>{{ kb.chunk_count }} 分块</span>
        </div>
      </Tooltip>
      <Tooltip v-if="kb.type === 'graph' && kb.entity_count > 0" title="实体数">
        <div class="kb-card-stat">
          <GitFork :size="14" />
          <span>{{ kb.entity_count }} 实体</span>
        </div>
      </Tooltip>
    </div>

    <!-- 能力标签 -->
    <div v-if="kb.multimodal_enabled || kb.type === 'graph'" class="kb-card-caps">
      <Tag v-if="kb.multimodal_enabled" size="small" color="cyan">多模态</Tag>
      <Tag v-if="kb.type === 'graph'" size="small" color="purple">知识图谱</Tag>
    </div>

    <!-- 底部 -->
    <div class="kb-card-footer">
      <div class="kb-card-model">
        <Tag v-if="kb.embedding_model_name" size="small" color="default">
          {{ kb.embedding_model_name }}
        </Tag>
        <span v-else class="kb-card-no-model">未设置嵌入模型</span>
      </div>
      <Switch
        :checked="kb.status === 1"
        size="small"
        @click.stop
        @change="(checked: boolean) => emit('statusChange', kb.id, checked)"
      />
    </div>
  </Card>
</template>

<style scoped>
.kb-card {
  border-radius: 10px;
  transition: all 0.2s;
}

.kb-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.kb-card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.kb-card-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: hsl(var(--primary) / 10%);
  color: hsl(var(--primary));
  flex-shrink: 0;
}

.kb-card-title-area {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.kb-card-name {
  font-size: 14px;
  font-weight: 600;
  color: hsl(var(--foreground));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kb-card-title-area :deep(.ant-tag) {
  margin: 0;
  font-size: 10px;
  line-height: 16px;
  padding: 0 4px;
  flex-shrink: 0;
}

.kb-card-more {
  padding: 2px;
  color: hsl(var(--muted-foreground));
}

.kb-card-desc {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  margin-bottom: 12px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 34px;
}

.kb-card-stats {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
}

.kb-card-stat {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.kb-card-caps {
  display: flex;
  gap: 4px;
  margin-bottom: 8px;
}

.kb-card-caps :deep(.ant-tag) {
  margin: 0;
  font-size: 10px;
  line-height: 16px;
  padding: 0 4px;
}

.kb-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 10px;
  border-top: 1px solid hsl(var(--border));
}

.kb-card-model {
  flex: 1;
  min-width: 0;
}

.kb-card-model :deep(.ant-tag) {
  margin: 0;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kb-card-no-model {
  font-size: 11px;
  color: hsl(var(--muted-foreground));
}
</style>
