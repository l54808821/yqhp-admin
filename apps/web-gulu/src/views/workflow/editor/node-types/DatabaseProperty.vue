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
  <Form.Item label="数据库配置">
    <Input
      v-model:value="node.config.database_config"
      placeholder="引用数据库配置"
      @blur="handleUpdate"
    />
  </Form.Item>
  <Form.Item label="SQL语句">
    <Input.TextArea
      v-model:value="node.config.query"
      :rows="4"
      placeholder="SELECT * FROM users WHERE id = ?"
      @blur="handleUpdate"
    />
  </Form.Item>
</template>
