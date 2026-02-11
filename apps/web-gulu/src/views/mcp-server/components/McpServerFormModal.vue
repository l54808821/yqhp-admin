<script setup lang="ts">
import type { CreateMcpServerParams, McpServer } from '#/api/mcp-server';

import { ref, watch } from 'vue';

import {
  Col,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Row,
  Select,
  Switch,
} from 'ant-design-vue';

import { createMcpServerApi, updateMcpServerApi } from '#/api/mcp-server';

const emit = defineEmits<{
  success: [];
}>();

// 弹框状态
const visible = ref(false);
const modalTitle = ref('新增 MCP 服务器');
const editingId = ref<number | null>(null);
const submitLoading = ref(false);

const formState = ref<CreateMcpServerParams>({
  name: '',
  description: '',
  transport: 'stdio',
  command: '',
  args: [],
  url: '',
  env: {},
  timeout: 30,
  sort: 0,
  status: 1,
});

// 用于 TextArea 绑定的中间值
const argsText = ref('');
const envText = ref('');

// 同步 argsText -> formState.args
watch(argsText, (val) => {
  formState.value.args = val
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
});

// 同步 envText -> formState.env
watch(envText, (val) => {
  const env: Record<string, string> = {};
  val.split('\n').forEach((line) => {
    const idx = line.indexOf('=');
    if (idx > 0) {
      const key = line.slice(0, idx).trim();
      const value = line.slice(idx + 1).trim();
      if (key) env[key] = value;
    }
  });
  formState.value.env = env;
});

// 暴露 open 方法
function open(record?: McpServer) {
  if (record) {
    modalTitle.value = '编辑 MCP 服务器';
    editingId.value = record.id;
    formState.value = {
      name: record.name,
      description: record.description || '',
      transport: record.transport,
      command: record.command || '',
      args: record.args || [],
      url: record.url || '',
      env: record.env || {},
      timeout: record.timeout || 30,
      sort: record.sort || 0,
      status: record.status,
    };
    argsText.value = (record.args || []).join('\n');
    envText.value = Object.entries(record.env || {})
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');
  } else {
    modalTitle.value = '新增 MCP 服务器';
    editingId.value = null;
    formState.value = {
      name: '',
      description: '',
      transport: 'stdio',
      command: '',
      args: [],
      url: '',
      env: {},
      timeout: 30,
      sort: 0,
      status: 1,
    };
    argsText.value = '';
    envText.value = '';
  }
  visible.value = true;
}

// 提交
async function handleSubmit() {
  if (!formState.value.name) return message.warning('请输入服务器名称');
  if (!formState.value.transport) return message.warning('请选择传输方式');
  if (formState.value.transport === 'stdio' && !formState.value.command) {
    return message.warning('请输入启动命令');
  }
  if (formState.value.transport === 'sse' && !formState.value.url) {
    return message.warning('请输入 SSE URL');
  }

  submitLoading.value = true;
  try {
    if (editingId.value) {
      await updateMcpServerApi(editingId.value, formState.value);
      message.success('更新成功');
    } else {
      await createMcpServerApi(formState.value);
      message.success('创建成功');
    }
    visible.value = false;
    emit('success');
  } catch {
    message.error('操作失败');
  } finally {
    submitLoading.value = false;
  }
}

defineExpose({ open });
</script>

<template>
  <Modal
    v-model:open="visible"
    :title="modalTitle"
    width="600px"
    :confirm-loading="submitLoading"
    @ok="handleSubmit"
  >
    <Form :model="formState" layout="vertical">
      <Form.Item label="名称" required>
        <Input v-model:value="formState.name" placeholder="请输入服务器名称" />
      </Form.Item>

      <Form.Item label="描述">
        <Input.TextArea
          v-model:value="formState.description"
          placeholder="请输入描述信息"
          :rows="2"
        />
      </Form.Item>

      <Form.Item label="传输方式" required>
        <Select
          v-model:value="formState.transport"
          :options="[
            { label: 'stdio', value: 'stdio' },
            { label: 'sse', value: 'sse' },
          ]"
          style="width: 100%"
        />
      </Form.Item>

      <!-- stdio 模式 -->
      <template v-if="formState.transport === 'stdio'">
        <Form.Item label="启动命令 (command)" required>
          <Input v-model:value="formState.command" placeholder="如 npx, uvx, node 等" />
        </Form.Item>
        <Form.Item label="参数 (args)">
          <Input.TextArea
            v-model:value="argsText"
            placeholder="每行一个参数，如：&#10;-y&#10;@modelcontextprotocol/server-filesystem&#10;/path/to/dir"
            :rows="3"
          />
        </Form.Item>
      </template>

      <!-- sse 模式 -->
      <template v-if="formState.transport === 'sse'">
        <Form.Item label="URL" required>
          <Input v-model:value="formState.url" placeholder="如 http://localhost:3000/sse" />
        </Form.Item>
      </template>

      <Form.Item label="环境变量">
        <Input.TextArea
          v-model:value="envText"
          placeholder="每行一个，格式：KEY=VALUE&#10;如：&#10;API_KEY=sk-xxx&#10;DEBUG=true"
          :rows="3"
        />
      </Form.Item>

      <Row :gutter="16">
        <Col :span="8">
          <Form.Item label="超时时间(秒)">
            <InputNumber
              v-model:value="formState.timeout"
              :min="1"
              :max="300"
              style="width: 100%"
            />
          </Form.Item>
        </Col>
        <Col :span="8">
          <Form.Item label="排序">
            <InputNumber v-model:value="formState.sort" :min="0" style="width: 100%" />
          </Form.Item>
        </Col>
        <Col :span="8">
          <Form.Item label="状态">
            <Switch
              v-model:checked="formState.status"
              :checked-value="1"
              :un-checked-value="0"
              checked-children="启用"
              un-checked-children="禁用"
            />
          </Form.Item>
        </Col>
      </Row>
    </Form>
  </Modal>
</template>
