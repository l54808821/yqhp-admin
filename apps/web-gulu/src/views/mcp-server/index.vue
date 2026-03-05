<script setup lang="ts">
import type { McpServer, McpServerListParams, McpToolDefinition } from '#/api/mcp-server';

import { onMounted, ref } from 'vue';

import {
  Button,
  Card,
  Col,
  Collapse,
  Drawer,
  Empty,
  Input,
  message,
  Modal,
  Pagination,
  Row,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tag,
  Typography,
} from 'ant-design-vue';

import {
  deleteMcpServerApi,
  getMcpServerListApi,
  getMcpServerToolsApi,
  updateMcpServerStatusApi,
} from '#/api/mcp-server';

import McpServerFormModal from './components/McpServerFormModal.vue';

// 搜索参数
const searchParams = ref<McpServerListParams>({
  page: 1,
  pageSize: 20,
  name: undefined,
  transport: undefined,
  status: undefined,
});

// 数据
const dataList = ref<McpServer[]>([]);
const total = ref(0);
const loading = ref(false);

// 弹框 ref
const formModalRef = ref<InstanceType<typeof McpServerFormModal>>();

// 工具抽屉
const toolDrawerVisible = ref(false);
const toolDrawerTitle = ref('');
const toolList = ref<McpToolDefinition[]>([]);
const toolLoading = ref(false);

// 表格列定义
const columns = [
  { title: '名称', dataIndex: 'name', key: 'name', width: 160 },
  { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
  { title: '传输方式', dataIndex: 'transport', key: 'transport', width: 120 },
  { title: '连接信息', key: 'connection', width: 260 },
  { title: '超时(秒)', dataIndex: 'timeout', key: 'timeout', width: 90 },
  { title: '状态', key: 'status', width: 90 },
  { title: '操作', key: 'action', width: 220, fixed: 'right' as const },
];

// 加载数据
async function loadData() {
  loading.value = true;
  try {
    const res = await getMcpServerListApi(searchParams.value);
    dataList.value = res.list || [];
    total.value = res.total || 0;
  } catch {
    message.error('加载 MCP 服务器列表失败');
  } finally {
    loading.value = false;
  }
}

// 搜索
function handleSearch() {
  searchParams.value.page = 1;
  loadData();
}

// 重置
function handleReset() {
  searchParams.value = {
    page: 1,
    pageSize: 20,
    name: undefined,
    transport: undefined,
    status: undefined,
  };
  loadData();
}

// 分页
function handlePageChange(page: number, pageSize: number) {
  searchParams.value.page = page;
  searchParams.value.pageSize = pageSize;
  loadData();
}

// 新增
function handleAdd() {
  formModalRef.value?.open();
}

// 编辑
function handleEdit(record: McpServer) {
  formModalRef.value?.open(record);
}

// 删除
function handleDelete(id: number) {
  Modal.confirm({
    title: '确认删除',
    content: '确定删除该 MCP 服务器配置吗？删除后不可恢复。',
    okText: '删除',
    okType: 'danger',
    async onOk() {
      try {
        await deleteMcpServerApi(id);
        message.success('删除成功');
        await loadData();
      } catch {
        message.error('删除失败');
      }
    },
  });
}

// 状态变更
async function handleStatusChange(id: number, checked: boolean) {
  try {
    const status = checked ? 1 : 0;
    await updateMcpServerStatusApi(id, status);
    message.success('状态更新成功');
    await loadData();
  } catch {
    message.error('状态更新失败');
  }
}

// 获取连接信息显示
function getConnectionInfo(record: McpServer): string {
  if (record.transport === 'stdio') {
    const args = record.args?.length ? ` ${record.args.join(' ')}` : '';
    return `${record.command || ''}${args}`;
  }
  return record.url || '';
}

// 查看工具
async function handleViewTools(record: McpServer) {
  toolDrawerTitle.value = `${record.name} - 工具列表`;
  toolDrawerVisible.value = true;
  toolLoading.value = true;
  toolList.value = [];

  try {
    const res = await getMcpServerToolsApi(record.id);
    toolList.value = res.tools || [];
  } catch {
    message.error('获取工具列表失败，请检查 MCP 服务器是否可连接');
  } finally {
    toolLoading.value = false;
  }
}

// 格式化参数 schema
function formatParamSchema(parameters: Record<string, any>): { name: string; type: string; description: string; required: boolean }[] {
  if (!parameters || !parameters.properties) return [];
  const props = parameters.properties as Record<string, any>;
  const requiredFields: string[] = parameters.required || [];
  return Object.entries(props).map(([name, schema]: [string, any]) => ({
    name,
    type: schema.type || 'any',
    description: schema.description || '',
    required: requiredFields.includes(name),
  }));
}

// 表单提交成功回调
function handleFormSuccess() {
  loadData();
}

// 获取传输方式颜色
function getTransportColor(transport: string): string {
  switch (transport) {
    case 'stdio': return 'blue';
    case 'sse': return 'green';
    case 'streamable-http': return 'purple';
    default: return 'default';
  }
}

// 初始化
onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="mcp-server-page">
    <!-- 搜索栏 -->
    <Card class="search-bar" size="small">
      <Row :gutter="16" align="middle">
        <Col :span="6">
          <Input
            v-model:value="searchParams.name"
            placeholder="搜索服务器名称"
            allow-clear
            @press-enter="handleSearch"
            @change="handleSearch"
          />
        </Col>
        <Col :span="4">
          <Select
            v-model:value="searchParams.transport"
            placeholder="传输方式"
            allow-clear
            style="width: 100%"
            :options="[
              { label: 'stdio', value: 'stdio' },
              { label: 'sse', value: 'sse' },
              { label: 'streamable-http', value: 'streamable-http' },
            ]"
            @change="handleSearch"
          />
        </Col>
        <Col :span="3">
          <Select
            v-model:value="searchParams.status"
            placeholder="状态"
            allow-clear
            style="width: 100%"
            :options="[
              { label: '启用', value: 1 },
              { label: '禁用', value: 0 },
            ]"
            @change="handleSearch"
          />
        </Col>
        <Col :span="11" style="text-align: right">
          <Space>
            <Button @click="handleReset">重置</Button>
            <Button type="primary" @click="handleAdd">新增 MCP 服务器</Button>
          </Space>
        </Col>
      </Row>
    </Card>

    <!-- 表格 -->
    <Card class="table-card" size="small">
      <Spin :spinning="loading">
        <Table
          :columns="columns"
          :data-source="dataList"
          :pagination="false"
          row-key="id"
          size="middle"
          :scroll="{ x: 1000 }"
        >
          <template #bodyCell="{ column, record: rawRecord }">
            <template v-if="column.key === 'transport'">
              <Tag :color="getTransportColor(rawRecord.transport)">
                {{ rawRecord.transport }}
              </Tag>
            </template>
            <template v-else-if="column.key === 'connection'">
              <span class="connection-info" :title="getConnectionInfo(rawRecord as McpServer)">
                {{ getConnectionInfo(rawRecord as McpServer) }}
              </span>
            </template>
            <template v-else-if="column.key === 'status'">
              <Switch
                :checked="rawRecord.status === 1"
                checked-children="启用"
                un-checked-children="禁用"
                size="small"
                @change="(checked: string | number | boolean) => handleStatusChange(rawRecord.id, !!checked)"
              />
            </template>
            <template v-else-if="column.key === 'action'">
              <Space>
                <Button type="link" size="small" @click="handleViewTools(rawRecord as McpServer)">查看工具</Button>
                <Button type="link" size="small" @click="handleEdit(rawRecord as McpServer)">编辑</Button>
                <Button type="link" size="small" danger @click="handleDelete(rawRecord.id)">删除</Button>
              </Space>
            </template>
          </template>
        </Table>

        <!-- 分页 -->
        <div v-if="total > 0" class="mt-4 flex justify-end">
          <Pagination
            :current="searchParams.page"
            :page-size="searchParams.pageSize"
            :total="total"
            show-size-changer
            show-quick-jumper
            :show-total="(t: number) => `共 ${t} 个服务器`"
            @change="handlePageChange"
          />
        </div>
      </Spin>
    </Card>

    <!-- 新增/编辑弹框 -->
    <McpServerFormModal ref="formModalRef" @success="handleFormSuccess" />

    <!-- 工具列表抽屉 -->
    <Drawer
      v-model:open="toolDrawerVisible"
      :title="toolDrawerTitle"
      width="560"
      placement="right"
    >
      <Spin :spinning="toolLoading">
        <Empty v-if="!toolLoading && toolList.length === 0" description="暂无工具" />
        <Collapse v-else accordion>
          <Collapse.Panel
            v-for="tool in toolList"
            :key="tool.name"
            :header="tool.name"
          >
            <template #extra>
              <Tag color="blue" style="margin-right: 0">
                {{ formatParamSchema(tool.parameters).length }} 个参数
              </Tag>
            </template>
            <div class="tool-detail">
              <Typography.Paragraph v-if="tool.description" class="tool-description">
                {{ tool.description }}
              </Typography.Paragraph>
              <div v-if="formatParamSchema(tool.parameters).length > 0" class="tool-params">
                <Typography.Text strong class="params-title">参数定义</Typography.Text>
                <div
                  v-for="param in formatParamSchema(tool.parameters)"
                  :key="param.name"
                  class="param-item"
                >
                  <div class="param-header">
                    <code class="param-name">{{ param.name }}</code>
                    <Tag :color="param.required ? 'red' : 'default'" size="small">
                      {{ param.required ? '必填' : '可选' }}
                    </Tag>
                    <Tag color="geekblue" size="small">{{ param.type }}</Tag>
                  </div>
                  <div v-if="param.description" class="param-desc">
                    {{ param.description }}
                  </div>
                </div>
              </div>
            </div>
          </Collapse.Panel>
        </Collapse>
      </Spin>
    </Drawer>
  </div>
</template>

<style scoped>
.mcp-server-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 50px);
  padding: 16px;
  overflow: hidden;
}

.search-bar {
  flex-shrink: 0;
  margin-bottom: 16px;
}

.table-card {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.connection-info {
  display: inline-block;
  max-width: 240px;
  overflow: hidden;
  font-family: monospace;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tool-detail {
  padding: 0;
}

.tool-description {
  margin-bottom: 12px;
  color: rgba(0, 0, 0, 65%);
}

.tool-params {
  margin-top: 8px;
}

.params-title {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
}

.param-item {
  padding: 8px 12px;
  margin-bottom: 6px;
  background: #fafafa;
  border-radius: 6px;
}

.param-header {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-bottom: 4px;
}

.param-name {
  padding: 1px 6px;
  font-size: 13px;
  font-weight: 500;
  background: #f0f0f0;
  border-radius: 3px;
}

.param-desc {
  padding-left: 2px;
  font-size: 12px;
  color: rgba(0, 0, 0, 45%);
}
</style>
