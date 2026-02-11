<script setup lang="ts">
import type { McpServer, McpServerListParams } from '#/api/mcp-server';

import { onMounted, ref } from 'vue';

import {
  Button,
  Card,
  Col,
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
} from 'ant-design-vue';

import {
  deleteMcpServerApi,
  getMcpServerListApi,
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

// 表格列定义
const columns = [
  { title: '名称', dataIndex: 'name', key: 'name', width: 160 },
  { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
  { title: '传输方式', dataIndex: 'transport', key: 'transport', width: 100 },
  { title: '连接信息', key: 'connection', width: 260 },
  { title: '超时(秒)', dataIndex: 'timeout', key: 'timeout', width: 90 },
  { title: '状态', key: 'status', width: 90 },
  { title: '操作', key: 'action', width: 140, fixed: 'right' as const },
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

// 表单提交成功回调
function handleFormSuccess() {
  loadData();
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
          :scroll="{ x: 900 }"
        >
          <template #bodyCell="{ column, record: rawRecord }">
            <template v-if="column.key === 'transport'">
              <Tag :color="rawRecord.transport === 'stdio' ? 'blue' : 'green'">
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
</style>
