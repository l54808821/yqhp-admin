<script setup lang="ts">
import { computed } from 'vue';
import { Form, Input, Select } from 'ant-design-vue';

const props = defineProps<{
  node: any;
}>();

const emit = defineEmits<{
  update: [node: any];
}>();

// 条件类型选项
const conditionTypes = [
  { value: 'if', label: 'if' },
  { value: 'else_if', label: 'else if' },
  { value: 'else', label: 'else' },
];

// 当前条件类型
const conditionType = computed({
  get: () => props.node.config?.type || 'if',
  set: (val) => {
    if (!props.node.config) {
      props.node.config = {};
    }
    props.node.config.type = val;
    handleUpdate();
  },
});

// 是否需要显示表达式输入框（else 不需要）
const showExpression = computed(() => conditionType.value !== 'else');

function handleUpdate() {
  emit('update', props.node);
}
</script>

<template>
  <Form.Item label="条件类型">
    <Select v-model:value="conditionType" :options="conditionTypes" />
  </Form.Item>
  <Form.Item v-if="showExpression" label="条件表达式">
    <Input.TextArea
      v-model:value="node.config.expression"
      :rows="3"
      placeholder="如: ${response.status} == 200"
      @blur="handleUpdate"
    />
  </Form.Item>
</template>
