<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { X } from '@vben/icons';
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
  close: [];
}>();

const localNode = ref<any>(null);

watch(
  () => props.node,
  (newNode) => {
    if (newNode) {
      localNode.value = JSON.parse(JSON.stringify(newNode));
      // 确保 config 存在
      if (!localNode.value.config) {
        localNode.value.config = {};
      }
      // 确保 condition 存在
      if (localNode.value.type === 'condition' && !localNode.value.condition) {
        localNode.value.condition = { expression: '', then: [], else: [] };
      }
      // 确保 loop 存在
      if (localNode.value.type === 'loop' && !localNode.value.loop) {
        localNode.value.loop = { count: 1 };
      }
    } else {
      localNode.value = null;
    }
  },
  { immediate: true, deep: true },
);

const nodeType = computed(() => localNode.value?.type);

// 循环类型（根据 loop 配置推断）
const loopType = computed({
  get() {
    if (!localNode.value?.loop) return 'count';
    if (localNode.value.loop.items) return 'foreach';
    if (localNode.value.loop.condition) return 'while';
    return 'count';
  },
  set(val: string) {
    if (!localNode.value.loop) localNode.value.loop = {};
    // 清除其他类型的配置
    if (val === 'count') {
      localNode.value.loop.items = '';
      localNode.value.loop.condition = '';
      if (!localNode.value.loop.count) localNode.value.loop.count = 1;
    } else if (val === 'foreach') {
      localNode.value.loop.count = 0;
      localNode.value.loop.condition = '';
    } else if (val === 'while') {
      localNode.value.loop.count = 0;
      localNode.value.loop.items = '';
    }
  }
});

function handleUpdate() {
  if (localNode.value) {
    emit('update', JSON.parse(JSON.stringify(localNode.value)));
  }
}

function handleClose() {
  emit('close');
}

function addHeader() {
  if (!localNode.value.config) localNode.value.config = {};
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
  <div class="property-panel">
    <div v-if="localNode" class="panel-content">
      <div class="panel-header">
        <span class="panel-title">节点属性</span>
        <Button type="text" size="small" @click="handleClose">
          <template #icon><X class="size-4" /></template>
        </Button>
      </div>

      <Form layout="vertical" @finish="handleUpdate">
        <Form.Item label="节点名称">
          <Input v-model:value="localNode.name" @blur="handleUpdate" />
        </Form.Item>

        <!-- HTTP 请求 -->
        <Tabs v-if="nodeType === 'http' && localNode.config">
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
            <div v-for="(_value, key) in localNode.config.headers" :key="key" class="header-row">
              <Input :value="String(key)" placeholder="Key" class="header-key" @change="(e: any) => updateHeaderKey(String(key), e.target.value)" />
              <Input v-model:value="localNode.config.headers[key]" placeholder="Value" class="header-value" @blur="handleUpdate" />
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

        <!-- 脚本 -->
        <template v-else-if="nodeType === 'script' && localNode.config">
          <Form.Item label="脚本语言">
            <Select v-model:value="localNode.config.language" @change="handleUpdate">
              <Select.Option value="javascript">JavaScript</Select.Option>
              <Select.Option value="python">Python</Select.Option>
              <Select.Option value="groovy">Groovy</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="脚本代码">
            <Input.TextArea v-model:value="localNode.config.script" :rows="10" placeholder="输入脚本代码" @blur="handleUpdate" />
          </Form.Item>
        </template>

        <!-- 条件判断 -->
        <template v-else-if="nodeType === 'condition' && localNode.condition">
          <Form.Item label="条件表达式">
            <Input.TextArea v-model:value="localNode.condition.expression" :rows="3" placeholder="如: ${response.status} == 200" @blur="handleUpdate" />
          </Form.Item>
        </template>

        <!-- 循环 -->
        <template v-else-if="nodeType === 'loop' && localNode.loop">
          <Form.Item label="循环类型">
            <Select v-model:value="loopType" @change="handleUpdate">
              <Select.Option value="count">固定次数</Select.Option>
              <Select.Option value="foreach">遍历数组</Select.Option>
              <Select.Option value="while">条件循环</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item v-if="loopType === 'count'" label="循环次数">
            <InputNumber v-model:value="localNode.loop.count" :min="1" style="width: 100%" @change="handleUpdate" />
          </Form.Item>
          <Form.Item v-if="loopType === 'foreach'" label="数据源">
            <Input v-model:value="localNode.loop.items" placeholder="如: ${response.data.list}" @blur="handleUpdate" />
          </Form.Item>
          <Form.Item v-if="loopType === 'foreach'" label="元素变量名">
            <Input v-model:value="localNode.loop.item_var" placeholder="如: item" @blur="handleUpdate" />
          </Form.Item>
          <Form.Item v-if="loopType === 'foreach'" label="索引变量名">
            <Input v-model:value="localNode.loop.index_var" placeholder="如: index" @blur="handleUpdate" />
          </Form.Item>
          <Form.Item v-if="loopType === 'while'" label="循环条件">
            <Input v-model:value="localNode.loop.condition" placeholder="如: ${index} < 10" @blur="handleUpdate" />
          </Form.Item>
        </template>

        <!-- 数据库 -->
        <template v-else-if="nodeType === 'database' && localNode.config">
          <Form.Item label="数据库配置">
            <Input v-model:value="localNode.config.database_config" placeholder="引用数据库配置" @blur="handleUpdate" />
          </Form.Item>
          <Form.Item label="SQL语句">
            <Input.TextArea v-model:value="localNode.config.query" :rows="4" placeholder="SELECT * FROM users WHERE id = ?" @blur="handleUpdate" />
          </Form.Item>
        </template>

        <!-- 等待 -->
        <template v-else-if="nodeType === 'wait' && localNode.config">
          <Form.Item label="等待时间(毫秒)">
            <InputNumber v-model:value="localNode.config.duration" :min="0" :step="100" style="width: 100%" @change="handleUpdate" />
          </Form.Item>
        </template>

        <!-- MQ -->
        <template v-else-if="nodeType === 'mq' && localNode.config">
          <Form.Item label="MQ配置">
            <Input v-model:value="localNode.config.mq_config" placeholder="引用MQ配置" @blur="handleUpdate" />
          </Form.Item>
          <Form.Item label="操作类型">
            <Select v-model:value="localNode.config.action" @change="handleUpdate">
              <Select.Option value="send">发送</Select.Option>
              <Select.Option value="receive">接收</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="Topic">
            <Input v-model:value="localNode.config.topic" placeholder="消息主题" @blur="handleUpdate" />
          </Form.Item>
          <Form.Item v-if="localNode.config.action === 'send'" label="消息内容">
            <Input.TextArea v-model:value="localNode.config.message" :rows="4" placeholder="JSON格式" @blur="handleUpdate" />
          </Form.Item>
        </template>

        <Button type="primary" html-type="submit" block class="submit-btn">
          应用更改
        </Button>
      </Form>
    </div>
  </div>
</template>

<style scoped>
.property-panel {
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: hsl(var(--background));
  overflow: hidden;
}

.panel-content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  min-height: 0;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.panel-title {
  font-size: 16px;
  font-weight: 500;
  color: hsl(var(--foreground));
}

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

.submit-btn {
  margin-top: 16px;
}
</style>
