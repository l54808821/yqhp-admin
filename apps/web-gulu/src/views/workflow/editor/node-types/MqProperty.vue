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
  <Form.Item label="MQ配置">
    <Input
      v-model:value="node.config.mq_config"
      placeholder="引用MQ配置"
      @blur="handleUpdate"
    />
  </Form.Item>
  <Form.Item label="操作类型">
    <Select v-model:value="node.config.action" @change="handleUpdate">
      <Select.Option value="send">发送</Select.Option>
      <Select.Option value="receive">接收</Select.Option>
    </Select>
  </Form.Item>
  <Form.Item label="Topic">
    <Input
      v-model:value="node.config.topic"
      placeholder="消息主题"
      @blur="handleUpdate"
    />
  </Form.Item>
  <Form.Item v-if="node.config.action === 'send'" label="消息内容">
    <Input.TextArea
      v-model:value="node.config.message"
      :rows="4"
      placeholder="JSON格式"
      @blur="handleUpdate"
    />
  </Form.Item>
</template>
