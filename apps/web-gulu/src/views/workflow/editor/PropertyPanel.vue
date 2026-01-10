<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { X } from '@vben/icons';
import { Button, Form, Input } from 'ant-design-vue';

import { getNodeTypeConfig } from './node-types';

const props = defineProps<{
  node: any;
}>();

const emit = defineEmits<{
  update: [node: any];
  close: [];
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

function handleUpdate() {
  if (localNode.value) {
    emit('update', JSON.parse(JSON.stringify(localNode.value)));
  }
}

function handleClose() {
  emit('close');
}
</script>

<template>
  <div class="property-panel">
    <div v-if="localNode" class="panel-content">
      <div class="panel-header">
        <span class="panel-title">节点属性</span>
        <Button type="text" size="small" @click="handleClose">
          <template #icon><X class="size-4" /></template>
        </Button>
      </div>

      <Form layout="vertical" @finish="handleUpdate">
        <Form.Item label="节点名称">
          <Input v-model:value="localNode.name" @blur="handleUpdate" />
        </Form.Item>

        <!-- 动态加载节点类型对应的属性编辑组件 -->
        <component
          :is="propertyComponent"
          v-if="propertyComponent"
          :node="localNode"
          @update="handleUpdate"
        />

        <Button type="primary" html-type="submit" block class="submit-btn">
          应用更改
        </Button>
      </Form>
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
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.panel-title {
  font-size: 16px;
  font-weight: 500;
  color: hsl(var(--foreground));
}

.submit-btn {
  margin-top: 16px;
}
</style>
