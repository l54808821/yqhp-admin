<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';

import { Pencil, Play } from '#/components/icons';
import {
  Button,
  Card,
  Descriptions,
  Space,
  Spin,
  Tag,
} from 'ant-design-vue';

import type { Workflow } from '#/api/workflow';

import { getWorkflowApi } from '#/api/workflow';

interface Props {
  workflowId: number;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'edit', workflowId: number): void;
  (e: 'execute', workflowId: number): void;
}>();

const loading = ref(false);
const workflow = ref<Workflow | null>(null);

watch(
  () => props.workflowId,
  async (newId) => {
    if (newId) {
      await loadWorkflow(newId);
    }
  },
  { immediate: true },
);

async function loadWorkflow(id: number) {
  loading.value = true;
  try {
    workflow.value = await getWorkflowApi(id);
  } catch {
    workflow.value = null;
  } finally {
    loading.value = false;
  }
}

function handleEdit() {
  if (workflow.value) {
    emit('edit', workflow.value.id);
  }
}

function handleExecute() {
  if (workflow.value) {
    emit('execute', workflow.value.id);
  }
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('zh-CN');
}

function getStepCount() {
  if (!workflow.value?.definition) return 0;
  try {
    const def = JSON.parse(workflow.value.definition);
    return def.steps?.length || 0;
  } catch {
    return 0;
  }
}
</script>

<template>
  <Spin :spinning="loading" class="workflow-detail-spin">
    <Card v-if="workflow" class="workflow-detail">
      <template #title>
        <div class="detail-header">
          <span class="workflow-name">{{ workflow.name }}</span>
          <Tag v-if="workflow.status === 1" color="success">启用</Tag>
          <Tag v-else color="default">禁用</Tag>
        </div>
      </template>
      <template #extra>
        <Space>
          <Button type="primary" @click="handleEdit">
            <template #icon><Pencil class="size-4" /></template>
            编辑
          </Button>
          <Button @click="handleExecute">
            <template #icon><Play class="size-4" /></template>
            执行
          </Button>
        </Space>
      </template>

      <Descriptions :column="2" bordered>
        <Descriptions.Item label="工作流ID">
          {{ workflow.id }}
        </Descriptions.Item>
        <Descriptions.Item label="步骤数量">
          {{ getStepCount() }}
        </Descriptions.Item>
        <Descriptions.Item label="创建时间">
          {{ formatDate(workflow.created_at) }}
        </Descriptions.Item>
        <Descriptions.Item label="更新时间">
          {{ formatDate(workflow.updated_at) }}
        </Descriptions.Item>
        <Descriptions.Item label="描述" :span="2">
          {{ workflow.description || '暂无描述' }}
        </Descriptions.Item>
      </Descriptions>
    </Card>
  </Spin>
</template>

<style scoped>
.workflow-detail-spin {
  width: 100%;
  max-width: 800px;
}

.workflow-detail {
  width: 100%;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.workflow-name {
  font-size: 18px;
  font-weight: 500;
}
</style>
