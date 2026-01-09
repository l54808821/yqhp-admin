<script setup lang="ts">
import { Button, Form, Input, Select, Tabs } from 'ant-design-vue';

const props = defineProps<{
  node: any;
}>();

const emit = defineEmits<{
  update: [node: any];
}>();

function handleUpdate() {
  emit('update', props.node);
}

function addHeader() {
  if (!props.node.config.headers) {
    props.node.config.headers = {};
  }
  const key = `header_${Date.now()}`;
  props.node.config.headers[key] = '';
}

function removeHeader(key: string) {
  delete props.node.config.headers[key];
  handleUpdate();
}

function updateHeaderKey(oldKey: string, newKey: string) {
  const value = props.node.config.headers[oldKey];
  delete props.node.config.headers[oldKey];
  props.node.config.headers[newKey] = value;
}
</script>

<template>
  <Tabs>
    <Tabs.TabPane key="basic" tab="基本">
      <Form.Item label="请求方法">
        <Select v-model:value="node.config.method" @change="handleUpdate">
          <Select.Option value="GET">GET</Select.Option>
          <Select.Option value="POST">POST</Select.Option>
          <Select.Option value="PUT">PUT</Select.Option>
          <Select.Option value="DELETE">DELETE</Select.Option>
          <Select.Option value="PATCH">PATCH</Select.Option>
        </Select>
      </Form.Item>
      <Form.Item label="URL">
        <Input
          v-model:value="node.config.url"
          placeholder="支持变量 ${var}"
          @blur="handleUpdate"
        />
      </Form.Item>
      <Form.Item label="域名代码">
        <Input
          v-model:value="node.config.domainCode"
          placeholder="引用域名配置"
          @blur="handleUpdate"
        />
      </Form.Item>
    </Tabs.TabPane>
    <Tabs.TabPane key="headers" tab="请求头">
      <div
        v-for="(_value, key) in node.config.headers"
        :key="key"
        class="header-row"
      >
        <Input
          :value="String(key)"
          placeholder="Key"
          class="header-key"
          @change="(e: any) => updateHeaderKey(String(key), e.target.value)"
        />
        <Input
          v-model:value="node.config.headers[key]"
          placeholder="Value"
          class="header-value"
          @blur="handleUpdate"
        />
        <Button type="link" danger @click="removeHeader(String(key))">
          删除
        </Button>
      </div>
      <Button type="dashed" block @click="addHeader">添加请求头</Button>
    </Tabs.TabPane>
    <Tabs.TabPane key="body" tab="请求体">
      <Form.Item label="请求体">
        <Input.TextArea
          v-model:value="node.config.body"
          :rows="6"
          placeholder="JSON格式"
          @blur="handleUpdate"
        />
      </Form.Item>
    </Tabs.TabPane>
  </Tabs>
</template>

<style scoped>
.header-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.header-key {
  width: 40%;
}

.header-value {
  width: 40%;
}
</style>
