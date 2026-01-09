<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import {
  Button,
  Form,
  Input,
  InputNumber,
  Select,
  Tabs,
} from 'ant-design-vue';

const props = defineProps<{
  node: any;
}>();

const emit = defineEmits<{
  update: [node: any];
}>();

const localNode = ref<any>(null);

watch(
  () => props.node,
  (newNode) => {
    if (newNode) {
      localNode.value = JSON.parse(JSON.stringify(newNode));
    } else {
      localNode.value = null;
    }
  },
  { immediate: true, deep: true },
);

const nodeType = computed(() => localNode.value?.type);

function handleUpdate() {
  if (localNode.value) {
    emit('update', JSON.parse(JSON.stringify(localNode.value)));
  }
}

function addHeader() {
  if (!localNode.value.config.headers) {
    localNode.value.config.headers = {};
  }
  const key = `header_${Date.now()}`;
  localNode.value.config.headers[key] = '';
}

function removeHeader(key: string) {
  delete localNode.value.config.headers[key];
}

function updateHeaderKey(oldKey: string, newKey: string) {
  const value = localNode.value.config.headers[oldKey];
  delete localNode.value.config.headers[oldKey];
  localNode.value.config.headers[newKey] = value;
}
</script>

<template>
  <div class="property-panel w-80 bg-white border-l overflow-y-auto">
    <div v-if="!localNode" class="p-4 text-center text-gray-400">
      选择一个节点查看属性
    </div>

    <div v-else class="p-4">
      <div class="text-lg font-medium mb-4">节点属性</div>

      <Form layout="vertical" @finish="handleUpdate">
        <Form.Item label="节点名称">
          <Input v-model:value="localNode.name" @blur="handleUpdate" />
        </Form.Item>

        <Tabs v-if="nodeType === 'http'">
          <Tabs.TabPane key="basic" tab="基本">
            <Form.Item label="请求方法">
              <Select v-model:value="localNode.config.method" @change="handleUpdate">
                <Select.Option value="GET">GET</Select.Option>
                <Select.Option value="POST">POST</Select.Option>
                <Select.Option value="PUT">PUT</Select.Option>
                <Select.Option value="DELETE">DELETE</Select.Option>
                <Select.Option value="PATCH">PATCH</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item label="URL">
              <Input v-model:value="localNode.config.url" placeholder="支持变量 ${var}" @blur="handleUpdate" />
            </Form.Item>
            <Form.Item label="域名代码">
              <Input v-model:value="localNode.config.domainCode" placeholder="引用域名配置" @blur="handleUpdate" />
            </Form.Item>
          </Tabs.TabPane>
          <Tabs.TabPane key="headers" tab="请求头">
            <div v-for="(_value, key) in localNode.config.headers" :key="key" class="flex gap-2 mb-2">
              <Input :value="String(key)" placeholder="Key" style="width: 40%" @change="(e: any) => updateHeaderKey(String(key), e.target.value)" />
              <Input v-model:value="localNode.config.headers[key]" placeholder="Value" style="width: 40%" @blur="handleUpdate" />
              <Button type="link" danger @click="removeHeader(String(key)); handleUpdate()">删除</Button>
            </div>
            <Button type="dashed" block @click="addHeader">添加请求头</Button>
          </Tabs.TabPane>
          <Tabs.TabPane key="body" tab="请求体">
            <Form.Item label="请求体">
              <Input.TextArea v-model:value="localNode.config.body" :rows="6" placeholder="JSON格式" @blur="handleUpdate" />
            </Form.Item>
          </Tabs.TabPane>
        </Tabs>

        <template v-else-if="nodeType === 'script'">
          <Form.Item label="脚本语言">
            <Select v-model:value="localNode.config.language" @change="handleUpdate">
              <Select.Option value="javascript">JavaScript</Select.Option>
              <Select.Option value="python">Python</Select.Option>
              <Select.Option value="groovy">Groovy</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="脚本代码">
            <Input.TextArea v-model:value="localNode.config.code" :rows="10" placeholder="输入脚本代码" @blur="handleUpdate" />
          </Form.Item>
        </template>

        <template v-else-if="nodeType === 'condition'">
          <Form.Item label="条件表达式">
            <Input.TextArea v-model:value="localNode.config.expression" :rows="3" placeholder="如: ${response.status} == 200" @blur="handleUpdate" />
          </Form.Item>
        </template>

        <template v-else-if="nodeType === 'loop'">
          <Form.Item label="循环类型">
            <Select v-model:value="localNode.config.type" @change="handleUpdate">
              <Select.Option value="count">固定次数</Select.Option>
              <Select.Option value="foreach">遍历数组</Select.Option>
              <Select.Option value="while">条件循环</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item v-if="localNode.config.type === 'count'" label="循环次数">
            <InputNumber v-model:value="localNode.config.count" :min="1" style="width: 100%" @change="handleUpdate" />
          </Form.Item>
          <Form.Item v-if="localNode.config.type === 'foreach'" label="数据源">
            <Input v-model:value="localNode.config.items" placeholder="如: ${response.data.list}" @blur="handleUpdate" />
          </Form.Item>
          <Form.Item v-if="localNode.config.type === 'while'" label="循环条件">
            <Input v-model:value="localNode.config.condition" placeholder="如: ${index} < 10" @blur="handleUpdate" />
          </Form.Item>
        </template>

        <template v-else-if="nodeType === 'database'">
          <Form.Item label="数据库配置代码">
            <Input v-model:value="localNode.config.configCode" placeholder="引用数据库配置" @blur="handleUpdate" />
          </Form.Item>
          <Form.Item label="SQL语句">
            <Input.TextArea v-model:value="localNode.config.sql" :rows="4" placeholder="SELECT * FROM users WHERE id = ?" @blur="handleUpdate" />
          </Form.Item>
          <Form.Item label="参数">
            <Input v-model:value="localNode.config.params" placeholder='JSON数组格式: [1, "test"]' @blur="handleUpdate" />
          </Form.Item>
        </template>

        <template v-else-if="nodeType === 'wait'">
          <Form.Item label="等待时间(毫秒)">
            <InputNumber v-model:value="localNode.config.duration" :min="0" :step="100" style="width: 100%" @change="handleUpdate" />
          </Form.Item>
        </template>

        <Button type="primary" html-type="submit" block class="mt-4">
          应用更改
        </Button>
      </Form>
    </div>
  </div>
</template>

<style scoped>
.property-panel {
  min-width: 300px;
}
</style>
