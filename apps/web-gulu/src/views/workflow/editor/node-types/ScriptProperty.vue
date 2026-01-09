<script setup lang="ts">
import { Form, Input, Select } from 'ant-design-vue';

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
  <Form.Item label="脚本语言">
    <Select v-model:value="node.config.language" @change="handleUpdate">
      <Select.Option value="javascript">JavaScript</Select.Option>
      <Select.Option value="python">Python</Select.Option>
      <Select.Option value="groovy">Groovy</Select.Option>
    </Select>
  </Form.Item>
  <Form.Item label="脚本代码">
    <Input.TextArea
      v-model:value="node.config.script"
      :rows="10"
      placeholder="输入脚本代码"
      @blur="handleUpdate"
    />
  </Form.Item>
</template>
