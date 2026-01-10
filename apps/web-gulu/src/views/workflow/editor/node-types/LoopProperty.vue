<script setup lang="ts">
import { watch } from 'vue';

import { Form, Input, InputNumber, Select } from 'ant-design-vue';

const props = defineProps<{
  node: any;
}>();

const emit = defineEmits<{
  update: [node: any];
}>();

// 确保 loop 对象存在且有默认 mode
function ensureLoop() {
  if (!props.node.loop) {
    props.node.loop = { mode: 'for', count: 1 };
  }
  if (!props.node.loop.mode) {
    // 根据已有配置推断 mode
    if (props.node.loop.items) {
      props.node.loop.mode = 'foreach';
    } else if (props.node.loop.condition) {
      props.node.loop.mode = 'while';
    } else {
      props.node.loop.mode = 'for';
    }
  }
}

// 监听 node 变化，确保 loop 配置正确
watch(
  () => props.node,
  () => {
    ensureLoop();
  },
  { immediate: true, deep: true },
);

// 切换循环模式（直接使用后端的 mode 值：for, foreach, while）
function handleModeChange(val: any) {
  const mode = String(val);
  ensureLoop();
  props.node.loop.mode = mode;

  // 清除其他模式的配置
  if (mode === 'for') {
    props.node.loop.items = '';
    props.node.loop.item_var = '';
    props.node.loop.condition = '';
    props.node.loop.max_iterations = 0;
    if (!props.node.loop.count) props.node.loop.count = 1;
  } else if (mode === 'foreach') {
    props.node.loop.count = 0;
    props.node.loop.condition = '';
    props.node.loop.max_iterations = 0;
  } else if (mode === 'while') {
    props.node.loop.count = 0;
    props.node.loop.items = '';
    props.node.loop.item_var = '';
    if (!props.node.loop.max_iterations) props.node.loop.max_iterations = 1000;
  }

  handleUpdate();
}

function handleUpdate() {
  emit('update', props.node);
}
</script>

<template>
  <Form.Item label="循环模式">
    <Select :value="node.loop?.mode || 'for'" @change="handleModeChange">
      <Select.Option value="for">固定次数 (for)</Select.Option>
      <Select.Option value="foreach">遍历数组 (foreach)</Select.Option>
      <Select.Option value="while">条件循环 (while)</Select.Option>
    </Select>
  </Form.Item>
  <Form.Item v-if="node.loop?.mode === 'for'" label="循环次数">
    <InputNumber
      v-model:value="node.loop.count"
      :min="1"
      style="width: 100%"
      @change="handleUpdate"
    />
  </Form.Item>
  <Form.Item v-if="node.loop?.mode === 'foreach'" label="数据源">
    <Input
      v-model:value="node.loop.items"
      placeholder="如: ${response.data.list}"
      @blur="handleUpdate"
    />
  </Form.Item>
  <Form.Item v-if="node.loop?.mode === 'foreach'" label="元素变量名">
    <Input
      v-model:value="node.loop.item_var"
      placeholder="如: item（默认）"
      @blur="handleUpdate"
    />
  </Form.Item>
  <Form.Item v-if="node.loop?.mode === 'while'" label="循环条件">
    <Input
      v-model:value="node.loop.condition"
      placeholder="如: ${loop.index} < 10"
      @blur="handleUpdate"
    />
  </Form.Item>
  <Form.Item v-if="node.loop?.mode === 'while'" label="最大迭代次数">
    <InputNumber
      v-model:value="node.loop.max_iterations"
      :min="1"
      :max="10000"
      placeholder="默认 1000"
      style="width: 100%"
      @change="handleUpdate"
    />
  </Form.Item>
</template>
