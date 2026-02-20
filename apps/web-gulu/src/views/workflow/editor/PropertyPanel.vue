<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { X } from '@vben/icons';
import { Button, Form, Input } from 'ant-design-vue';

import { getNodeTypeConfig } from './node-types';

const props = defineProps<{
  node: any;
  envId?: number;
  workflowId?: number;
}>();

const emit = defineEmits<{
  update: [node: any];
  close: [];
  delete: [node: any];
}>();

const localNode = ref<any>(null);

watch(
  () => props.node,
  (newNode) => {
    if (newNode) {
      localNode.value = JSON.parse(JSON.stringify(newNode));
      // 确保 config 存在
      if (!localNode.value.config) {
        localNode.value.config = {};
      }
      // 确保 condition 存在
      if (localNode.value.type === 'condition' && !localNode.value.condition) {
        localNode.value.condition = { expression: '', then: [], else: [] };
      }
      // 确保 loop 存在（使用与后端一致的字段结构）
      if (localNode.value.type === 'loop' && !localNode.value.loop) {
        localNode.value.loop = {
          mode: 'for',
          count: 1,
          items: '',
          item_var: '',
          condition: '',
          max_iterations: 0,
        };
      }
    } else {
      localNode.value = null;
    }
  },
  { immediate: true, deep: true },
);

// 获取当前节点类型的属性编辑组件
const propertyComponent = computed(() => {
  if (!localNode.value?.type) return null;
  const config = getNodeTypeConfig(localNode.value.type);
  return config?.propertyComponent || null;
});

// 是否是 HTTP 节点（使用特殊布局）
const isHttpNode = computed(() => localNode.value?.type === 'http');

// 是否是脚本节点（使用特殊布局）
const isScriptNode = computed(() => localNode.value?.type === 'script');

// 是否是 AI 节点（使用特殊布局）
const isAiNode = computed(() => localNode.value?.type === 'ai');

// 是否是数据库节点（使用特殊布局）
const isDatabaseNode = computed(() => localNode.value?.type === 'database');

// 是否是 MQ 节点（使用特殊布局）
const isMqNode = computed(() => localNode.value?.type === 'mq');

// 是否使用特殊布局（无 padding）
const useSpecialLayout = computed(() => isHttpNode.value || isScriptNode.value || isAiNode.value || isDatabaseNode.value || isMqNode.value);

// 是否是条件分支节点（不显示通用的节点名称字段）
const isConditionBranch = computed(() => localNode.value?.type === 'condition_branch');

function handleUpdate(updatedNode?: any) {
  if (updatedNode) {
    // 如果子组件传递了更新后的节点数据，直接使用
    localNode.value = JSON.parse(JSON.stringify(updatedNode));
    emit('update', JSON.parse(JSON.stringify(updatedNode)));
  } else if (localNode.value) {
    emit('update', JSON.parse(JSON.stringify(localNode.value)));
  }
}

function handleClose() {
  emit('close');
}

function handleDelete(node: any) {
  emit('delete', node);
}
</script>

<template>
  <div class="property-panel">
    <div v-if="localNode" class="panel-content" :class="{ 'no-padding': useSpecialLayout }">
      <!-- HTTP 节点使用特殊布局 -->
      <template v-if="isHttpNode">
        <div class="panel-header http-header">
          <Input
            v-model:value="localNode.name"
            class="node-name-input"
            placeholder="节点名称"
            @blur="handleUpdate()"
          />
          <Button type="text" size="small" @click="handleClose">
            <template #icon><X class="size-4" /></template>
          </Button>
        </div>
        <component
          :is="propertyComponent"
          :node="localNode"
          :env-id="envId"
          :workflow-id="workflowId"
          class="http-panel-wrapper"
          @update="handleUpdate"
        />
      </template>

      <!-- 脚本节点使用特殊布局 -->
      <template v-else-if="isScriptNode">
        <div class="panel-header script-header">
          <Input
            v-model:value="localNode.name"
            class="node-name-input"
            placeholder="节点名称"
            @blur="handleUpdate()"
          />
          <Button type="text" size="small" @click="handleClose">
            <template #icon><X class="size-4" /></template>
          </Button>
        </div>
        <component
          :is="propertyComponent"
          :node="localNode"
          :env-id="envId"
          :workflow-id="workflowId"
          class="script-panel-wrapper"
          @update="handleUpdate"
        />
      </template>

      <!-- AI 节点使用特殊布局 -->
      <template v-else-if="isAiNode">
        <div class="panel-header ai-header">
          <Input
            v-model:value="localNode.name"
            class="node-name-input"
            placeholder="节点名称"
            @blur="handleUpdate()"
          />
          <Button type="text" size="small" @click="handleClose">
            <template #icon><X class="size-4" /></template>
          </Button>
        </div>
        <component
          :is="propertyComponent"
          :node="localNode"
          :env-id="envId"
          :workflow-id="workflowId"
          class="ai-panel-wrapper"
          @update="handleUpdate"
        />
      </template>

      <!-- 数据库节点使用特殊布局 -->
      <template v-else-if="isDatabaseNode">
        <div class="panel-header database-header">
          <Input
            v-model:value="localNode.name"
            class="node-name-input"
            placeholder="节点名称"
            @blur="handleUpdate()"
          />
          <Button type="text" size="small" @click="handleClose">
            <template #icon><X class="size-4" /></template>
          </Button>
        </div>
        <component
          :is="propertyComponent"
          :node="localNode"
          :env-id="envId"
          :workflow-id="workflowId"
          class="database-panel-wrapper"
          @update="handleUpdate"
        />
      </template>

      <!-- MQ 节点使用特殊布局 -->
      <template v-else-if="isMqNode">
        <div class="panel-header mq-header">
          <Input
            v-model:value="localNode.name"
            class="node-name-input"
            placeholder="节点名称"
            @blur="handleUpdate()"
          />
          <Button type="text" size="small" @click="handleClose">
            <template #icon><X class="size-4" /></template>
          </Button>
        </div>
        <component
          :is="propertyComponent"
          :node="localNode"
          :env-id="envId"
          :workflow-id="workflowId"
          class="mq-panel-wrapper"
          @update="handleUpdate"
        />
      </template>

      <!-- 其他节点使用原有布局 -->
      <template v-else>
        <div class="panel-header">
          <span class="panel-title">节点属性</span>
          <Button type="text" size="small" @click="handleClose">
            <template #icon><X class="size-4" /></template>
          </Button>
        </div>

        <Form layout="vertical">
          <!-- 条件分支节点不显示通用的节点名称字段，因为分支属性组件中已有分支名称 -->
          <Form.Item v-if="!isConditionBranch" label="节点名称">
            <Input v-model:value="localNode.name" @blur="handleUpdate()" />
          </Form.Item>

          <!-- 动态加载节点类型对应的属性编辑组件 -->
          <component
            :is="propertyComponent"
            v-if="propertyComponent"
            :node="localNode"
            @update="handleUpdate()"
            @delete="handleDelete"
          />
        </Form>
      </template>
    </div>
  </div>
</template>

<style scoped>
.property-panel {
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: hsl(var(--background));
  overflow: hidden;
}

.panel-content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.panel-content.no-padding {
  padding: 0;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  flex-shrink: 0;
}

.panel-header.http-header,
.panel-header.script-header,
.panel-header.ai-header,
.panel-header.database-header,
.panel-header.mq-header {
  height: 49px;
  padding: 0 16px;
  margin-bottom: 0;
  border-bottom: 1px solid hsl(var(--border));
  background: hsl(var(--card));
}

.panel-title {
  font-size: 16px;
  font-weight: 500;
  color: hsl(var(--foreground));
}

.node-name-input {
  flex: 1;
  margin-right: 8px;
  font-weight: 500;
}

.node-name-input :deep(.ant-input) {
  border: none;
  background: transparent;
  font-size: 15px;
  font-weight: 500;
  padding-left: 0;
}

.node-name-input :deep(.ant-input:focus) {
  box-shadow: none;
  border-bottom: 1px solid hsl(var(--primary));
}

.http-panel-wrapper,
.script-panel-wrapper,
.ai-panel-wrapper,
.database-panel-wrapper,
.mq-panel-wrapper {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
</style>
