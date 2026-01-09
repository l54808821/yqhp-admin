<script setup lang="ts">
import { Form, InputNumber } from 'ant-design-vue';

const props = defineProps<{
  node: any;
}>();

const emit = defineEmits<{
  update: [node: any];
}>();

function handleUpdate() {
  emit('update', props.node);
}
</script>

<template>
  <Form.Item label="等待时间(毫秒)">
    <InputNumber
      v-model:value="node.config.duration"
      :min="0"
      :step="100"
      style="width: 100%"
      @change="handleUpdate"
    />
  </Form.Item>
</template>
