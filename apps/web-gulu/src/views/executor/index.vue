<script setup lang="ts">
import type { Executor, ExecutorListParams } from '#/api/executor';
import type { ColumnConfig, SearchFieldConfig } from '#/components/search-table';

import { computed, onBeforeUnmount, ref } from 'vue';

import { Page } from '#/components/page';

import {
  Badge,
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Progress,
  Radio,
  Row,
  Select,
  Space,
  Spin,
  Switch,
  Tag,
  Tooltip,
  Typography,
} from 'ant-design-vue';

import {
  createExecutorApi,
  deleteExecutorApi,
  getExecutorListApi,
  registerExecutorApi,
  syncExecutorsApi,
  updateExecutorApi,
  updateExecutorStatusApi,
} from '#/api/executor';
import { SearchTable } from '#/components/search-table';

type ViewMode = 'card' | 'table';

const viewMode = ref<ViewMode>('card');

const searchParams = ref<ExecutorListParams>({
  page: 1,
  pageSize: 50,
  name: undefined,
  type: undefined,
  status: undefined,
});

const searchFields: SearchFieldConfig[] = [
  { field: 'name', label: '名称', type: 'input', defaultValue: undefined },
  {
    field: 'type',
    label: '类型',
    type: 'select',
    width: 120,
    defaultValue: undefined,
    options: [
      { label: '全部', value: '' },
      { label: '普通', value: 'normal' },
      { label: '压测专用', value: 'performance' },
      { label: '调试专用', value: 'debug' },
    ],
  },
  {
    field: 'status',
    label: '状态',
    type: 'select',
    width: 100,
    defaultValue: undefined,
    options: [
      { label: '全部', value: '' },
      { label: '启用', value: 1 },
      { label: '禁用', value: 0 },
    ],
  },
];

const columns: ColumnConfig[] = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
  { title: '名称', dataIndex: 'name', key: 'name', width: 150 },
  { title: 'Slave ID', dataIndex: 'slave_id', key: 'slave_id', width: 180 },
  { title: '类型', dataIndex: 'type', key: 'type', width: 100 },
  { title: '运行状态', dataIndex: 'state', key: 'state', width: 100 },
  { title: '负载', dataIndex: 'load', key: 'load', width: 100 },
  { title: '优先级', dataIndex: 'priority', key: 'priority', width: 80 },
  { title: '启用', dataIndex: 'status', key: 'status', width: 80 },
  {
    title: '最后心跳',
    dataIndex: 'last_seen',
    key: 'last_seen',
    width: 180,
    defaultShow: false,
  },
  {
    title: '操作',
    key: 'action',
    width: 150,
    fixed: 'right' as const,
    fixedLock: true,
  },
];

const tableData = ref<Executor[]>([]);
const total = ref(0);
const loading = ref(false);
const syncLoading = ref(false);

// 弹框状态
const modalVisible = ref(false);
const modalTitle = ref('新增执行机');
const editingId = ref<number | null>(null);
const modalMode = ref<'create' | 'edit' | 'register'>('create');

const formState = ref({
  slave_id: '',
  name: '',
  address: '',
  type: 'normal',
  description: '',
  labels: {} as Record<string, string>,
  max_vus: 0,
  priority: 0,
  status: 1,
});

const labelInput = ref({ key: '', value: '' });

const typeOptions = [
  { label: '普通', value: 'normal' },
  { label: '压测专用', value: 'performance' },
  { label: '调试专用', value: 'debug' },
];

// 统计数据
const stats = computed(() => {
  const all = tableData.value;
  return {
    total: all.length,
    online: all.filter((e) => e.state === 'online').length,
    busy: all.filter((e) => e.state === 'busy').length,
    offline: all.filter(
      (e) => !e.state || e.state === 'offline' || e.state === 'draining',
    ).length,
    enabled: all.filter((e) => e.status === 1).length,
  };
});

// 自动刷新
let refreshTimer: ReturnType<typeof setInterval> | null = null;

function startAutoRefresh() {
  stopAutoRefresh();
  refreshTimer = setInterval(() => {
    loadData(true);
  }, 15000);
}

function stopAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

onBeforeUnmount(() => {
  stopAutoRefresh();
});

async function loadData(silent = false) {
  if (!silent) loading.value = true;
  try {
    const res = await getExecutorListApi(searchParams.value);
    tableData.value = res.list || [];
    total.value = res.total || 0;
  } catch {
    if (!silent) message.error('加载执行机列表失败');
  } finally {
    if (!silent) loading.value = false;
  }
}

function handleSearch() {
  searchParams.value.page = 1;
  loadData();
}

function handleReset() {
  loadData();
}

function handlePageChange(page: number, pageSize: number) {
  searchParams.value.page = page;
  searchParams.value.pageSize = pageSize;
  loadData();
}

async function handleSync() {
  try {
    syncLoading.value = true;
    const result = await syncExecutorsApi();
    message.success(`同步完成，新增 ${result.synced_count} 台执行机`);
    await loadData();
  } catch {
    message.error('同步失败');
  } finally {
    syncLoading.value = false;
  }
}

function handleAdd() {
  modalTitle.value = '新增执行机';
  modalMode.value = 'create';
  editingId.value = null;
  formState.value = {
    slave_id: '',
    name: '',
    address: '',
    type: 'normal',
    description: '',
    labels: {},
    max_vus: 0,
    priority: 0,
    status: 1,
  };
  modalVisible.value = true;
}

function handleQuickRegister() {
  modalTitle.value = '快速注册执行机';
  modalMode.value = 'register';
  editingId.value = null;
  formState.value = {
    slave_id: '',
    name: '',
    address: '',
    type: 'normal',
    description: '',
    labels: {},
    max_vus: 0,
    priority: 0,
    status: 1,
  };
  modalVisible.value = true;
}

function handleEdit(record: Executor) {
  modalTitle.value = '编辑执行机';
  modalMode.value = 'edit';
  editingId.value = record.id;
  formState.value = {
    slave_id: record.slave_id,
    name: record.name,
    address: record.address || '',
    type: record.type,
    description: record.description || '',
    labels: record.labels || {},
    max_vus: record.max_vus || 0,
    priority: record.priority || 0,
    status: record.status,
  };
  modalVisible.value = true;
}

async function handleSubmit() {
  try {
    if (modalMode.value === 'register') {
      if (!formState.value.name && !formState.value.address) {
        message.warning('请至少填写名称或地址');
        return;
      }
      await registerExecutorApi({
        slave_id: formState.value.slave_id || formState.value.address,
        name: formState.value.name,
        address: formState.value.address,
        type: formState.value.type,
        labels: formState.value.labels,
      });
      message.success('注册成功');
    } else if (editingId.value) {
      await updateExecutorApi(editingId.value, {
        name: formState.value.name,
        type: formState.value.type,
        description: formState.value.description,
        labels: formState.value.labels,
        max_vus: formState.value.max_vus,
        priority: formState.value.priority,
        status: formState.value.status,
      });
      message.success('更新成功');
    } else {
      if (!formState.value.slave_id) {
        message.warning('请输入 Slave ID');
        return;
      }
      await createExecutorApi({
        slave_id: formState.value.slave_id,
        name: formState.value.name,
        type: formState.value.type,
        description: formState.value.description,
        labels: formState.value.labels,
        max_vus: formState.value.max_vus,
        priority: formState.value.priority,
        status: formState.value.status,
      });
      message.success('创建成功');
    }
    modalVisible.value = false;
    await loadData();
  } catch {
    message.error('操作失败');
  }
}

async function handleDelete(id: number) {
  try {
    await deleteExecutorApi(id);
    message.success('删除成功');
    await loadData();
  } catch {
    message.error('删除失败');
  }
}

async function handleStatusChange(
  id: number,
  checked: boolean | string | number,
) {
  try {
    const status = checked ? 1 : 0;
    await updateExecutorStatusApi(id, status);
    message.success('状态更新成功');
    await loadData();
  } catch {
    message.error('状态更新失败');
  }
}

function addLabel() {
  if (labelInput.value.key && labelInput.value.value) {
    formState.value.labels[labelInput.value.key] = labelInput.value.value;
    labelInput.value = { key: '', value: '' };
  }
}

function removeLabel(key: string) {
  delete formState.value.labels[key];
}

function getStateColor(state?: string) {
  switch (state) {
    case 'online':
      return 'success';
    case 'busy':
      return 'processing';
    case 'draining':
      return 'warning';
    default:
      return 'error';
  }
}

function getStateText(state?: string) {
  switch (state) {
    case 'online':
      return '在线';
    case 'busy':
      return '繁忙';
    case 'draining':
      return '下线中';
    default:
      return '离线';
  }
}

function getTypeColor(type: string) {
  switch (type) {
    case 'performance':
      return 'red';
    case 'debug':
      return 'blue';
    default:
      return 'default';
  }
}

function getTypeText(type: string) {
  switch (type) {
    case 'performance':
      return '压测专用';
    case 'debug':
      return '调试专用';
    default:
      return '普通';
  }
}

function getLoadPercent(load?: number) {
  if (!load) return 0;
  return Math.round(load * 100);
}

function getLoadStatus(load?: number) {
  const percent = getLoadPercent(load);
  if (percent >= 80) return 'exception';
  if (percent >= 50) return 'normal';
  return 'success';
}

function formatTime(time: string | null | undefined): string {
  if (!time) return '-';
  return new Date(time).toLocaleString('zh-CN');
}

loadData();
startAutoRefresh();
</script>

<template>
  <Page auto-content-height>
    <div class="executor-page">
      <!-- 概览统计 -->
      <div class="stats-bar">
        <div class="stat-item">
          <span class="stat-value">{{ stats.total }}</span>
          <span class="stat-label">总计</span>
        </div>
        <div class="stat-item stat-online">
          <span class="stat-value">{{ stats.online }}</span>
          <span class="stat-label">在线</span>
        </div>
        <div class="stat-item stat-busy">
          <span class="stat-value">{{ stats.busy }}</span>
          <span class="stat-label">繁忙</span>
        </div>
        <div class="stat-item stat-offline">
          <span class="stat-value">{{ stats.offline }}</span>
          <span class="stat-label">离线</span>
        </div>
      </div>

      <!-- 工具栏 -->
      <div class="toolbar">
        <Space>
          <Button type="primary" @click="handleAdd">新增</Button>
          <Button @click="handleQuickRegister">快速注册</Button>
          <Button :loading="syncLoading" @click="handleSync">
            同步执行机
          </Button>
        </Space>
        <div class="toolbar-right">
          <Radio.Group v-model:value="viewMode" size="small">
            <Radio.Button value="card">卡片</Radio.Button>
            <Radio.Button value="table">表格</Radio.Button>
          </Radio.Group>
        </div>
      </div>

      <!-- 卡片视图 -->
      <Spin :spinning="loading">
        <div v-if="viewMode === 'card'" class="card-grid">
          <Row :gutter="[16, 16]">
            <Col
              v-for="item in tableData"
              :key="item.id"
              :xs="24"
              :sm="12"
              :md="8"
              :lg="6"
              :xl="6"
            >
              <Card
                :hoverable="true"
                class="executor-card"
                :class="{
                  'card-online': item.state === 'online',
                  'card-busy': item.state === 'busy',
                  'card-offline': !item.state || item.state === 'offline',
                  'card-disabled': item.status !== 1,
                }"
              >
                <template #title>
                  <div class="card-header">
                    <div class="card-title-row">
                      <Badge
                        :status="getStateColor(item.state)"
                        class="status-dot"
                      />
                      <Typography.Text
                        :ellipsis="{ tooltip: item.name }"
                        strong
                        class="card-name"
                      >
                        {{ item.name }}
                      </Typography.Text>
                    </div>
                    <Tag :color="getTypeColor(item.type)" size="small">
                      {{ getTypeText(item.type) }}
                    </Tag>
                  </div>
                </template>
                <template #extra>
                  <Switch
                    :checked="item.status === 1"
                    size="small"
                    @change="
                      (checked: any) => handleStatusChange(item.id, checked)
                    "
                  />
                </template>
                <div class="card-body">
                  <div class="card-info-row">
                    <span class="info-label">状态</span>
                    <Badge
                      :status="getStateColor(item.state)"
                      :text="getStateText(item.state)"
                    />
                  </div>
                  <div class="card-info-row">
                    <span class="info-label">负载</span>
                    <Progress
                      :percent="getLoadPercent(item.load)"
                      :status="getLoadStatus(item.load)"
                      :show-info="true"
                      size="small"
                      style="width: 120px"
                    />
                  </div>
                  <div class="card-info-row">
                    <span class="info-label">优先级</span>
                    <span>{{ item.priority ?? 0 }}</span>
                  </div>
                  <div v-if="item.labels && Object.keys(item.labels).length > 0" class="card-labels">
                    <Tag
                      v-for="(value, key) in item.labels"
                      :key="key"
                      size="small"
                      color="blue"
                    >
                      {{ key }}={{ value }}
                    </Tag>
                  </div>
                  <div class="card-info-row slave-id-row">
                    <Tooltip :title="item.slave_id">
                      <Typography.Text
                        type="secondary"
                        :ellipsis="{ tooltip: false }"
                        class="slave-id-text"
                      >
                        {{ item.slave_id }}
                      </Typography.Text>
                    </Tooltip>
                  </div>
                </div>
                <template #actions>
                  <span @click="handleEdit(item)">编辑</span>
                  <Popconfirm
                    title="确定删除此执行机？"
                    @confirm="handleDelete(item.id)"
                  >
                    <span class="danger-action">删除</span>
                  </Popconfirm>
                </template>
              </Card>
            </Col>
          </Row>
          <div v-if="!loading && tableData.length === 0" class="empty-state">
            <Typography.Text type="secondary">
              暂无执行机，点击「同步执行机」从引擎获取或「快速注册」手动添加
            </Typography.Text>
          </div>
        </div>

        <!-- 表格视图 -->
        <div v-else>
          <SearchTable
            table-key="executor-management"
            v-model:search-params="searchParams"
            :search-fields="searchFields"
            :columns="columns"
            :data-source="tableData"
            :loading="loading"
            :total="total"
            :page="searchParams.page"
            :page-size="searchParams.pageSize"
            @search="handleSearch"
            @reset="handleReset"
            @add="handleAdd"
            @page-change="handlePageChange"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'type'">
                <Tag :color="getTypeColor(record.type)">
                  {{ getTypeText(record.type) }}
                </Tag>
              </template>
              <template v-else-if="column.key === 'state'">
                <Badge
                  :status="getStateColor(record.state)"
                  :text="getStateText(record.state)"
                />
              </template>
              <template v-else-if="column.key === 'load'">
                <Progress
                  :percent="getLoadPercent(record.load)"
                  :status="getLoadStatus(record.load)"
                  size="small"
                  style="width: 80px"
                />
              </template>
              <template v-else-if="column.key === 'status'">
                <Switch
                  :checked="record.status === 1"
                  size="small"
                  @change="
                    (checked: any) => handleStatusChange(record.id, checked)
                  "
                />
              </template>
              <template v-else-if="column.key === 'last_seen'">
                {{ formatTime(record.last_seen) }}
              </template>
              <template v-else-if="column.key === 'action'">
                <Space>
                  <Button
                    type="link"
                    size="small"
                    @click="handleEdit(record as Executor)"
                  >
                    编辑
                  </Button>
                  <Popconfirm
                    title="确定删除此执行机？"
                    @confirm="handleDelete(record.id)"
                  >
                    <Button type="link" size="small" danger>删除</Button>
                  </Popconfirm>
                </Space>
              </template>
            </template>
          </SearchTable>
        </div>
      </Spin>

      <!-- 新增/编辑/注册弹框 -->
      <Modal
        v-model:open="modalVisible"
        :title="modalTitle"
        width="600px"
        @ok="handleSubmit"
      >
        <Form :model="formState" layout="vertical">
          <!-- 快速注册模式：简化表单 -->
          <template v-if="modalMode === 'register'">
            <Form.Item label="名称" required>
              <Input
                v-model:value="formState.name"
                placeholder="执行机名称，如 prod-worker-01"
              />
            </Form.Item>
            <Form.Item label="地址">
              <Input
                v-model:value="formState.address"
                placeholder="执行机地址，如 192.168.1.100:8080（可选）"
              />
            </Form.Item>
            <Form.Item label="类型">
              <Select
                v-model:value="formState.type"
                :options="typeOptions"
              />
            </Form.Item>
            <Form.Item label="标签">
              <div class="mb-2">
                <Tag
                  v-for="(value, key) in formState.labels"
                  :key="key"
                  closable
                  @close="removeLabel(key as string)"
                >
                  {{ key }}={{ value }}
                </Tag>
              </div>
              <Space>
                <Input
                  v-model:value="labelInput.key"
                  placeholder="Key"
                  style="width: 120px"
                />
                <Input
                  v-model:value="labelInput.value"
                  placeholder="Value"
                  style="width: 120px"
                />
                <Button type="dashed" @click="addLabel">添加</Button>
              </Space>
            </Form.Item>
          </template>

          <!-- 完整创建/编辑模式 -->
          <template v-else>
            <Form.Item
              v-if="modalMode === 'create'"
              label="Slave ID"
              required
            >
              <Input
                v-model:value="formState.slave_id"
                placeholder="请输入 Slave ID"
              />
            </Form.Item>
            <Form.Item label="名称" required>
              <Input
                v-model:value="formState.name"
                placeholder="请输入执行机名称"
              />
            </Form.Item>
            <Form.Item label="类型" required>
              <Select
                v-model:value="formState.type"
                :options="typeOptions"
              />
            </Form.Item>
            <Form.Item label="最大虚拟用户数">
              <InputNumber
                v-model:value="formState.max_vus"
                :min="0"
                style="width: 100%"
              />
            </Form.Item>
            <Form.Item label="优先级">
              <InputNumber
                v-model:value="formState.priority"
                :min="0"
                style="width: 100%"
              />
            </Form.Item>
            <Form.Item label="标签">
              <div class="mb-2">
                <Tag
                  v-for="(value, key) in formState.labels"
                  :key="key"
                  closable
                  @close="removeLabel(key as string)"
                >
                  {{ key }}={{ value }}
                </Tag>
              </div>
              <Space>
                <Input
                  v-model:value="labelInput.key"
                  placeholder="Key"
                  style="width: 120px"
                />
                <Input
                  v-model:value="labelInput.value"
                  placeholder="Value"
                  style="width: 120px"
                />
                <Button type="dashed" @click="addLabel">添加</Button>
              </Space>
            </Form.Item>
            <Form.Item label="描述">
              <Input.TextArea
                v-model:value="formState.description"
                placeholder="请输入描述"
                :rows="2"
              />
            </Form.Item>
            <Form.Item label="状态">
              <Switch
                v-model:checked="formState.status"
                :checked-value="1"
                :un-checked-value="0"
                checked-children="启用"
                un-checked-children="禁用"
              />
            </Form.Item>
          </template>
        </Form>
      </Modal>
    </div>
  </Page>
</template>

<style scoped>
.executor-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stats-bar {
  display: flex;
  gap: 24px;
  padding: 16px 20px;
  background: var(--ant-color-bg-container, #fff);
  border-radius: 8px;
  border: 1px solid var(--ant-color-border-secondary, #f0f0f0);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 60px;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  line-height: 1.2;
  color: var(--ant-color-text, #333);
}

.stat-label {
  font-size: 12px;
  color: var(--ant-color-text-secondary, #999);
  margin-top: 2px;
}

.stat-online .stat-value {
  color: #52c41a;
}
.stat-busy .stat-value {
  color: #1890ff;
}
.stat-offline .stat-value {
  color: #ff4d4f;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-grid {
  min-height: 200px;
}

.executor-card {
  border-left: 3px solid transparent;
  transition: all 0.2s;
}

.executor-card.card-online {
  border-left-color: #52c41a;
}
.executor-card.card-busy {
  border-left-color: #1890ff;
}
.executor-card.card-offline {
  border-left-color: #d9d9d9;
}
.executor-card.card-disabled {
  opacity: 0.6;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.card-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex: 1;
}

.card-name {
  max-width: 120px;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.card-info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
}

.info-label {
  color: var(--ant-color-text-secondary, #999);
  flex-shrink: 0;
}

.card-labels {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.slave-id-row {
  margin-top: 4px;
}

.slave-id-text {
  font-size: 11px;
  max-width: 100%;
}

.danger-action {
  color: #ff4d4f;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}
</style>
