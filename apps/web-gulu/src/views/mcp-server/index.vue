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
  Tag,
  Typography,
} from 'ant-design-vue';

import {
  deleteMcpServerApi,
  getMcpServerListApi,
  getMcpServerToolsApi,
  updateMcpServerStatusApi,
} from '#/api/mcp-server';

import McpServerCard from './components/McpServerCard.vue';
import McpServerFormModal from './components/McpServerFormModal.vue';

const searchParams = ref<McpServerListParams>({
  page: 1,
  pageSize: 12,
  name: undefined,
  transport: undefined,
  status: undefined,
});

const dataList = ref<McpServer[]>([]);
const total = ref(0);
const loading = ref(false);

const formModalRef = ref<InstanceType<typeof McpServerFormModal>>();

const toolDrawerVisible = ref(false);
const toolDrawerTitle = ref('');
const toolList = ref<McpToolDefinition[]>([]);
const toolLoading = ref(false);

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

function handleSearch() {
  searchParams.value.page = 1;
  loadData();
}

function handleReset() {
  searchParams.value = {
    page: 1,
    pageSize: 12,
    name: undefined,
    transport: undefined,
    status: undefined,
  };
  loadData();
}

function handlePageChange(page: number, pageSize: number) {
  searchParams.value.page = page;
  searchParams.value.pageSize = pageSize;
  loadData();
}

function handleAdd() {
  formModalRef.value?.open();
}

function handleEdit(record: McpServer) {
  formModalRef.value?.open(record);
}

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

function handleFormSuccess() {
  loadData();
}

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
            <Button type="primary" @click="handleAdd">添加 MCP 服务器</Button>
          </Space>
        </Col>
      </Row>
    </Card>

    <!-- 卡片列表 -->
    <div class="mcp-card-list">
      <Spin :spinning="loading">
        <div v-if="dataList.length > 0">
          <Row :gutter="[16, 16]">
            <Col
              v-for="server in dataList"
              :key="server.id"
              :xs="24"
              :sm="12"
              :md="8"
              :lg="8"
              :xl="6"
            >
              <McpServerCard
                :server="server"
                @view-tools="handleViewTools"
                @edit="handleEdit"
                @delete="handleDelete"
                @status-change="handleStatusChange"
              />
            </Col>
          </Row>

          <!-- 分页 -->
          <div class="mt-4 flex justify-end">
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
        </div>

        <!-- 空状态 -->
        <div v-else-if="!loading" class="flex items-center justify-center" style="min-height: 400px">
          <Empty description="暂无 MCP 服务器，点击上方按钮添加">
            <Button type="primary" @click="handleAdd">添加 MCP 服务器</Button>
          </Empty>
        </div>
      </Spin>
    </div>

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

.mcp-card-list {
  flex: 1;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
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
