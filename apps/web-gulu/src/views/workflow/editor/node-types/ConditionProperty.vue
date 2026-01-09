<script setup lang="ts">
import { Form, Input } from 'ant-design-vue';

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
  <Form.Item label="条件表达式">
    <Input.TextArea
      v-model:value="node.condition.expression"
      :rows="3"
      placeholder="如: ${response.status} == 200"
      @blur="handleUpdate"
    />
  </Form.Item>
</template>
