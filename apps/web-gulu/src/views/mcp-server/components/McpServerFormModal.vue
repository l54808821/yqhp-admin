<script setup lang="ts">
import type { CreateMcpServerParams, McpServer } from '#/api/mcp-server';

import { computed, ref, watch } from 'vue';

import {
  Alert,
  Button,
  Col,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Row,
  Select,
  Space,
  Switch,
  Tabs,
  Tag,
  Typography,
} from 'ant-design-vue';

import { createMcpServerApi, updateMcpServerApi } from '#/api/mcp-server';

const emit = defineEmits<{
  success: [];
}>();

const visible = ref(false);
const modalTitle = ref('添加 MCP 服务器');
const editingId = ref<number | null>(null);
const submitLoading = ref(false);
const activeTab = ref<'json' | 'form'>('json');

// ============ JSON 模式 ============

const jsonText = ref('');
const parseError = ref('');

interface ParsedServer {
  name: string;
  transport: 'stdio' | 'sse' | 'streamable-http';
  params: CreateMcpServerParams;
}

const parsedServers = ref<ParsedServer[]>([]);

function detectTransport(config: Record<string, any>): 'stdio' | 'sse' | 'streamable-http' {
  if (config.command) return 'stdio';
  if (config.url) {
    return config.url.includes('/sse') ? 'sse' : 'streamable-http';
  }
  return 'sse';
}

function getTransportColor(transport: string): string {
  switch (transport) {
    case 'stdio': return 'blue';
    case 'sse': return 'green';
    case 'streamable-http': return 'purple';
    default: return 'default';
  }
}

function serverToJson(server: McpServer): string {
  const config: Record<string, any> = {};
  if (server.transport === 'stdio') {
    if (server.command) config.command = server.command;
    if (server.args?.length) config.args = server.args;
  } else {
    if (server.url) config.url = server.url;
    if (server.headers && Object.keys(server.headers).length > 0) {
      config.headers = server.headers;
    }
  }
  if (server.env && Object.keys(server.env).length > 0) {
    config.env = server.env;
  }
  const wrapper: Record<string, any> = {};
  wrapper[server.name] = config;
  return JSON.stringify({ mcpServers: wrapper }, null, 2);
}

function handleParse() {
  parseError.value = '';
  parsedServers.value = [];

  const text = jsonText.value.trim();
  if (!text) {
    parseError.value = '请粘贴 JSON 配置';
    return;
  }

  try {
    const json = JSON.parse(text);
    const servers = json.mcpServers || json;

    if (typeof servers !== 'object' || Array.isArray(servers)) {
      parseError.value = 'JSON 格式不正确，需要 { "mcpServers": { ... } } 或 { "server-name": { ... } } 格式';
      return;
    }

    const entries = Object.entries(servers);
    if (entries.length === 0) {
      parseError.value = '未找到任何 MCP 服务器配置';
      return;
    }

    parsedServers.value = entries.map(([name, config]: [string, any]) => {
      const transport = detectTransport(config);
      const params: CreateMcpServerParams = {
        name,
        description: config.description || '',
        transport,
        command: config.command || '',
        args: config.args || [],
        url: config.url || '',
        headers: config.headers || {},
        env: config.env || {},
        timeout: config.timeout || 30,
        status: 1,
      };
      return { name, transport, params };
    });
  } catch {
    parseError.value = 'JSON 解析失败，请检查格式是否正确';
  }
}

function handleRemove(index: number) {
  parsedServers.value.splice(index, 1);
}

async function handleJsonSubmit() {
  if (parsedServers.value.length === 0) {
    handleParse();
    if (parsedServers.value.length === 0) return;
  }

  submitLoading.value = true;

  if (editingId.value && parsedServers.value.length === 1) {
    try {
      await updateMcpServerApi(editingId.value, parsedServers.value[0]!.params);
      message.success('更新成功');
      visible.value = false;
      emit('success');
    } catch {
      message.error('更新失败');
    } finally {
      submitLoading.value = false;
    }
    return;
  }

  let successCount = 0;
  let failCount = 0;

  for (const server of parsedServers.value) {
    try {
      await createMcpServerApi(server.params);
      successCount++;
    } catch {
      failCount++;
    }
  }

  submitLoading.value = false;

  if (failCount === 0) {
    message.success(successCount === 1 ? '创建成功' : `成功添加 ${successCount} 个 MCP 服务器`);
  } else {
    message.warning(`添加完成：${successCount} 个成功，${failCount} 个失败`);
  }

  visible.value = false;
  emit('success');
}

// ============ 表单模式 ============

const formState = ref<CreateMcpServerParams>({
  name: '',
  description: '',
  transport: 'sse',
  command: '',
  args: [],
  url: '',
  headers: {},
  env: {},
  timeout: 30,
  sort: 0,
  status: 1,
});

const isHttpTransport = computed(
  () =>
    formState.value.transport === 'sse' ||
    formState.value.transport === 'streamable-http',
);

const argsText = ref('');
const headersText = ref('');
const envText = ref('');

watch(argsText, (val) => {
  formState.value.args = val
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
});

watch(headersText, (val) => {
  const headers: Record<string, string> = {};
  val.split('\n').forEach((line) => {
    const idx = line.indexOf(':');
    if (idx > 0) {
      const key = line.slice(0, idx).trim();
      const value = line.slice(idx + 1).trim();
      if (key) headers[key] = value;
    }
  });
  formState.value.headers = headers;
});

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

async function handleFormSubmit() {
  if (!formState.value.name) return message.warning('请输入服务器名称');
  if (!formState.value.transport) return message.warning('请选择传输方式');
  if (formState.value.transport === 'stdio' && !formState.value.command) {
    return message.warning('请输入启动命令');
  }
  if (isHttpTransport.value && !formState.value.url) {
    return message.warning('请输入服务器 URL');
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

// ============ 公共逻辑 ============

function resetForm() {
  formState.value = {
    name: '',
    description: '',
    transport: 'sse',
    command: '',
    args: [],
    url: '',
    headers: {},
    env: {},
    timeout: 30,
    sort: 0,
    status: 1,
  };
  argsText.value = '';
  headersText.value = '';
  envText.value = '';
}

function fillForm(record: McpServer) {
  formState.value = {
    name: record.name,
    description: record.description || '',
    transport: record.transport,
    command: record.command || '',
    args: record.args || [],
    url: record.url || '',
    headers: record.headers || {},
    env: record.env || {},
    timeout: record.timeout || 30,
    sort: record.sort || 0,
    status: record.status,
  };
  argsText.value = (record.args || []).join('\n');
  headersText.value = Object.entries(record.headers || {})
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
  envText.value = Object.entries(record.env || {})
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
}

function open(record?: McpServer) {
  parseError.value = '';
  parsedServers.value = [];

  if (record) {
    modalTitle.value = '编辑 MCP 服务器';
    editingId.value = record.id;
    activeTab.value = 'form';
    fillForm(record);
    jsonText.value = serverToJson(record);
  } else {
    modalTitle.value = '添加 MCP 服务器';
    editingId.value = null;
    activeTab.value = 'json';
    resetForm();
    jsonText.value = '';
  }
  visible.value = true;
}

defineExpose({ open });
</script>

<template>
  <Modal
    v-model:open="visible"
    :title="modalTitle"
    width="640px"
    :footer="null"
    destroyOnClose
  >
    <Tabs v-model:activeKey="activeTab">
      <!-- JSON 粘贴模式 -->
      <Tabs.TabPane key="json" tab="JSON 配置">
        <Alert
          type="info"
          showIcon
          style="margin-bottom: 12px"
        >
          <template #message>
            粘贴标准 MCP JSON 配置即可快速添加，支持 Cursor / Claude Desktop / VS Code 等工具的配置格式，支持批量添加。
          </template>
        </Alert>

        <Input.TextArea
          v-model:value="jsonText"
          :placeholder="'粘贴 MCP JSON 配置，例如：\n{\n  &quot;mcpServers&quot;: {\n    &quot;server-name&quot;: {\n      &quot;command&quot;: &quot;npx&quot;,\n      &quot;args&quot;: [&quot;-y&quot;, &quot;some-package@latest&quot;]\n    }\n  }\n}'"
          :rows="8"
          style="margin-bottom: 12px; font-family: monospace; font-size: 13px"
          @change="() => { parseError = ''; parsedServers = []; }"
        />

        <div style="margin-bottom: 12px; text-align: right">
          <Button type="primary" ghost @click="handleParse">解析配置</Button>
        </div>

        <div v-if="parseError" style="margin-bottom: 12px">
          <Alert :message="parseError" type="error" showIcon />
        </div>

        <div v-if="parsedServers.length > 0">
          <Typography.Text strong style="display: block; margin-bottom: 8px">
            识别到 {{ parsedServers.length }} 个 MCP 服务器：
          </Typography.Text>

          <div
            v-for="(server, index) in parsedServers"
            :key="server.name"
            class="parsed-server-item"
          >
            <div class="parsed-server-info">
              <Typography.Text strong>{{ server.name }}</Typography.Text>
              <Tag :color="getTransportColor(server.transport)" size="small">
                {{ server.transport }}
              </Tag>
              <Typography.Text
                v-if="server.params.command"
                type="secondary"
                class="parsed-server-detail"
              >
                {{ server.params.command }} {{ (server.params.args || []).join(' ') }}
              </Typography.Text>
              <Typography.Text
                v-else-if="server.params.url"
                type="secondary"
                class="parsed-server-detail"
              >
                {{ server.params.url }}
              </Typography.Text>
            </div>
            <Button
              v-if="parsedServers.length > 1"
              type="text"
              size="small"
              danger
              @click="handleRemove(index)"
            >
              移除
            </Button>
          </div>

          <div style="margin-top: 16px; text-align: right">
            <Space>
              <Button @click="visible = false">取消</Button>
              <Button
                type="primary"
                :loading="submitLoading"
                @click="handleJsonSubmit"
              >
                {{ editingId ? '保存' : (parsedServers.length === 1 ? '添加' : `添加 ${parsedServers.length} 个服务器`) }}
              </Button>
            </Space>
          </div>
        </div>
      </Tabs.TabPane>

      <!-- 表单模式 -->
      <Tabs.TabPane key="form" tab="表单填写">
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
                { label: 'streamable-http', value: 'streamable-http' },
              ]"
              style="width: 100%"
            />
          </Form.Item>

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

          <template v-if="isHttpTransport">
            <Form.Item label="URL" required>
              <Input
                v-model:value="formState.url"
                placeholder="如 http://localhost:3000/sse 或 http://localhost:6001/mcp"
              />
            </Form.Item>
            <Form.Item label="自定义请求头 (Headers)">
              <Input.TextArea
                v-model:value="headersText"
                placeholder="每行一个，格式：Key: Value&#10;如：&#10;X-Api-Key: sk-xxx&#10;Authorization: Bearer token123"
                :rows="3"
              />
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

        <div style="text-align: right">
          <Space>
            <Button @click="visible = false">取消</Button>
            <Button
              type="primary"
              :loading="submitLoading"
              @click="handleFormSubmit"
            >
              {{ editingId ? '保存' : '添加' }}
            </Button>
          </Space>
        </div>
      </Tabs.TabPane>
    </Tabs>
  </Modal>
</template>

<style scoped>
.parsed-server-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  margin-bottom: 6px;
  background: var(--ant-color-bg-layout, #f5f5f5);
  border-radius: 6px;
}

.parsed-server-info {
  display: flex;
  gap: 8px;
  align-items: center;
  overflow: hidden;
}

.parsed-server-info :deep(.ant-tag) {
  margin: 0;
  flex-shrink: 0;
}

.parsed-server-detail {
  font-size: 12px;
  font-family: monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
