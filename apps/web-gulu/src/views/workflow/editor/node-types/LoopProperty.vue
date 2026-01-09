<script setup lang="ts">
import { ref, watch } from 'vue';

import { Form, Input, InputNumber, Select } from 'ant-design-vue';

const props = defineProps<{
  node: any;
}>();

const emit = defineEmits<{
  update: [node: any];
}>();

// 本地循环类型状态
const loopType = ref('count');

// 根据 node.loop 推断循环类型
function inferLoopType(): string {
  if (!props.node?.loop) return 'count';
  if (props.node.loop.items) return 'foreach';
  if (props.node.loop.condition) return 'while';
  return 'count';
}

// 监听 node 变化，更新本地状态
watch(
  () => props.node,
  () => {
    loopType.value = inferLoopType();
  },
  { immediate: true, deep: true },
);

// 切换循环类型
function handleLoopTypeChange(val: string) {
  loopType.value = val;
  if (!props.node.loop) props.node.loop = {};

  // 清除其他类型的配置
  if (val === 'count') {
    props.node.loop.items = '';
    props.node.loop.item_var = '';
    props.node.loop.index_var = '';
    props.node.loop.condition = '';
    if (!props.node.loop.count) props.node.loop.count = 1;
  } else if (val === 'foreach') {
    props.node.loop.count = 0;
    props.node.loop.condition = '';
  } else if (val === 'while') {
    props.node.loop.count = 0;
    props.node.loop.items = '';
    props.node.loop.item_var = '';
    props.node.loop.index_var = '';
  }

  handleUpdate();
}

function handleUpdate() {
  emit('update', props.node);
}
</script>

<template>
  <Form.Item label="循环类型">
    <Select :value="loopType" @change="handleLoopTypeChange">
      <Select.Option value="count">固定次数</Select.Option>
      <Select.Option value="foreach">遍历数组</Select.Option>
      <Select.Option value="while">条件循环</Select.Option>
    </Select>
  </Form.Item>
  <Form.Item v-if="loopType === 'count'" label="循环次数">
    <InputNumber
      v-model:value="node.loop.count"
      :min="1"
      style="width: 100%"
      @change="handleUpdate"
    />
  </Form.Item>
  <Form.Item v-if="loopType === 'foreach'" label="数据源">
    <Input
      v-model:value="node.loop.items"
      placeholder="如: ${response.data.list}"
      @blur="handleUpdate"
    />
  </Form.Item>
  <Form.Item v-if="loopType === 'foreach'" label="元素变量名">
    <Input
      v-model:value="node.loop.item_var"
      placeholder="如: item"
      @blur="handleUpdate"
    />
  </Form.Item>
  <Form.Item v-if="loopType === 'foreach'" label="索引变量名">
    <Input
      v-model:value="node.loop.index_var"
      placeholder="如: index"
      @blur="handleUpdate"
    />
  </Form.Item>
  <Form.Item v-if="loopType === 'while'" label="循环条件">
    <Input
      v-model:value="node.loop.condition"
      placeholder="如: ${index} < 10"
      @blur="handleUpdate"
    />
  </Form.Item>
</template>
