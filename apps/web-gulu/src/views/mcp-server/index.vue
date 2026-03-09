<script setup lang="ts">
import type { McpServer, McpServerListParams, McpToolDefinition } from '#/api/mcp-server';

import { onMounted, ref } from 'vue';

import {
  Button,
  Card,
  Col,
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
const expandedTool = ref(-1);

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
  expandedTool.value = -1;

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
      :width="720"
      placement="right"
      class="tool-drawer"
    >
      <template #extra>
        <Tag v-if="!toolLoading && toolList.length > 0" color="blue">
          共 {{ toolList.length }} 个工具
        </Tag>
      </template>
      <Spin :spinning="toolLoading">
        <Empty v-if="!toolLoading && toolList.length === 0" description="暂无工具" />
        <div v-else class="tool-list">
          <div
            v-for="(tool, index) in toolList"
            :key="tool.name"
            class="tool-card"
            :class="{ 'tool-card--expanded': expandedTool === index }"
            @click="expandedTool = expandedTool === index ? -1 : index"
          >
            <div class="tool-card__header">
              <div class="tool-card__title">
                <span class="tool-card__icon">⚡</span>
                <code class="tool-card__name">{{ tool.name }}</code>
                <Tag color="blue" size="small" class="tool-card__count">
                  {{ formatParamSchema(tool.parameters).length }} 参数
                </Tag>
              </div>
              <span class="tool-card__arrow" :class="{ 'tool-card__arrow--open': expandedTool === index }">
                ▸
              </span>
            </div>
            <div v-if="tool.description" class="tool-card__desc">
              {{ tool.description }}
            </div>

            <div v-if="expandedTool === index" class="tool-card__body" @click.stop>
              <div v-if="formatParamSchema(tool.parameters).length > 0" class="tool-params-table">
                <div class="tool-params-table__head">
                  <div class="tool-params-table__col tool-params-table__col--name">参数名</div>
                  <div class="tool-params-table__col tool-params-table__col--type">类型</div>
                  <div class="tool-params-table__col tool-params-table__col--required">必填</div>
                  <div class="tool-params-table__col tool-params-table__col--desc">描述</div>
                </div>
                <div
                  v-for="param in formatParamSchema(tool.parameters)"
                  :key="param.name"
                  class="tool-params-table__row"
                >
                  <div class="tool-params-table__col tool-params-table__col--name">
                    <code>{{ param.name }}</code>
                  </div>
                  <div class="tool-params-table__col tool-params-table__col--type">
                    <Tag color="geekblue" size="small">{{ param.type }}</Tag>
                  </div>
                  <div class="tool-params-table__col tool-params-table__col--required">
                    <Tag :color="param.required ? 'red' : 'default'" size="small">
                      {{ param.required ? '是' : '否' }}
                    </Tag>
                  </div>
                  <div class="tool-params-table__col tool-params-table__col--desc">
                    {{ param.description || '-' }}
                  </div>
                </div>
              </div>
              <div v-else class="tool-card__no-params">
                该工具无需参数
              </div>
            </div>
          </div>
        </div>
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

/* Tool drawer styles */
.tool-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tool-card {
  border: 1px solid var(--ant-color-border-secondary, #f0f0f0);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  overflow: hidden;
}

.tool-card:hover {
  border-color: var(--ant-color-primary-border, #91caff);
  box-shadow: 0 2px 8px rgb(0 0 0 / 6%);
}

.tool-card--expanded {
  border-color: var(--ant-color-primary-border, #91caff);
  box-shadow: 0 2px 12px rgb(0 0 0 / 8%);
}

.tool-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px 0;
}

.tool-card__title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tool-card__icon {
  font-size: 14px;
  flex-shrink: 0;
}

.tool-card__name {
  font-size: 14px;
  font-weight: 600;
  color: var(--ant-color-text, #1f1f1f);
  background: none;
  padding: 0;
}

.tool-card__count {
  margin: 0;
  flex-shrink: 0;
}

.tool-card__arrow {
  font-size: 12px;
  color: var(--ant-color-text-tertiary, #bbb);
  transition: transform 0.2s ease;
  flex-shrink: 0;
}

.tool-card__arrow--open {
  transform: rotate(90deg);
}

.tool-card__desc {
  padding: 6px 16px 12px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--ant-color-text-secondary, #666);
}

.tool-card__body {
  padding: 0 16px 16px;
  cursor: default;
}

.tool-card__no-params {
  padding: 12px 0;
  text-align: center;
  font-size: 13px;
  color: var(--ant-color-text-tertiary, #bbb);
}

/* Params table */
.tool-params-table {
  border: 1px solid var(--ant-color-border-secondary, #f0f0f0);
  border-radius: 6px;
  overflow: hidden;
}

.tool-params-table__head {
  display: flex;
  background: var(--ant-color-bg-layout, #fafafa);
  border-bottom: 1px solid var(--ant-color-border-secondary, #f0f0f0);
  font-size: 12px;
  font-weight: 600;
  color: var(--ant-color-text-secondary, #666);
}

.tool-params-table__row {
  display: flex;
  border-bottom: 1px solid var(--ant-color-border-secondary, #f0f0f0);
  font-size: 13px;
  transition: background 0.15s;
}

.tool-params-table__row:last-child {
  border-bottom: none;
}

.tool-params-table__row:hover {
  background: var(--ant-color-bg-layout, #fafafa);
}

.tool-params-table__col {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  min-height: 38px;
}

.tool-params-table__col--name {
  width: 160px;
  flex-shrink: 0;
}

.tool-params-table__col--name code {
  font-size: 12px;
  font-weight: 500;
  color: var(--ant-color-text, #1f1f1f);
  background: var(--ant-color-bg-layout, #f5f5f5);
  padding: 1px 6px;
  border-radius: 3px;
}

.tool-params-table__col--type {
  width: 90px;
  flex-shrink: 0;
}

.tool-params-table__col--type :deep(.ant-tag) {
  margin: 0;
}

.tool-params-table__col--required {
  width: 70px;
  flex-shrink: 0;
}

.tool-params-table__col--required :deep(.ant-tag) {
  margin: 0;
}

.tool-params-table__col--desc {
  flex: 1;
  min-width: 0;
  color: var(--ant-color-text-secondary, #666);
  font-size: 12px;
  line-height: 1.4;
  word-break: break-word;
}
</style>
