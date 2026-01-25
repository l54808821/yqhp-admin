<script setup lang="ts">
import { ref, watch } from 'vue';

import { createIconifyIcon, Plus } from '@vben/icons';

import { Database, Globe } from '#/components/icons';

const Trash2 = createIconifyIcon('lucide:trash-2');
const Settings = createIconifyIcon('lucide:settings');
const Variable = createIconifyIcon('lucide:variable');
import {
  Badge,
  Button,
  Empty,
  Form,
  Input,
  InputNumber,
  message,
  Popconfirm,
  Switch,
  Table,
  Tabs,
  Tag,
} from 'ant-design-vue';

import type { Env } from '#/api/env';

import { updateEnvApi } from '#/api/env';

interface Props {
  env: Env;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'updated'): void;
}>();

const saving = ref(false);
const activeTab = ref('basic');
const formData = ref({
  name: '',
  description: '',
  status: 1,
});

// 域名配置
const domains = ref<{ code: string; url: string; description?: string }[]>([]);
// 变量配置
const variables = ref<{ key: string; value: string; description?: string }[]>([]);
// 数据库配置
const databases = ref<{ code: string; host: string; port: number; database: string; username: string; description?: string }[]>([]);
// MQ配置
const mqConfigs = ref<{ code: string; host: string; port: number; username: string; vhost?: string; description?: string }[]>([]);

watch(
  () => props.env,
  (env) => {
    if (env) {
      formData.value = {
        name: env.name,
        description: env.description || '',
        status: env.status,
      };
      // TODO: 从后端加载配置数据
      // 这里暂时使用空数据
      domains.value = [];
      variables.value = [];
      databases.value = [];
      mqConfigs.value = [];
    }
  },
  { immediate: true },
);

async function handleSave() {
  try {
    saving.value = true;
    await updateEnvApi(props.env.id, {
      name: formData.value.name,
      description: formData.value.description,
      status: formData.value.status,
    });
    message.success('保存成功');
    emit('updated');
  } catch {
    message.error('保存失败');
  } finally {
    saving.value = false;
  }
}

// 域名表格列
const domainColumns = [
  { title: '标识代码', dataIndex: 'code', key: 'code', width: 150 },
  { title: 'URL 地址', dataIndex: 'url', key: 'url' },
  { title: '备注', dataIndex: 'description', key: 'description', width: 150 },
  { title: '操作', key: 'action', width: 80, align: 'center' as const },
];

// 变量表格列
const variableColumns = [
  { title: '变量名', dataIndex: 'key', key: 'key', width: 180 },
  { title: '变量值', dataIndex: 'value', key: 'value' },
  { title: '备注', dataIndex: 'description', key: 'description', width: 150 },
  { title: '操作', key: 'action', width: 80, align: 'center' as const },
];

// 数据库表格列
const databaseColumns = [
  { title: '标识代码', dataIndex: 'code', key: 'code', width: 120 },
  { title: '主机地址', dataIndex: 'host', key: 'host', width: 160 },
  { title: '端口', dataIndex: 'port', key: 'port', width: 80 },
  { title: '数据库名', dataIndex: 'database', key: 'database', width: 140 },
  { title: '用户名', dataIndex: 'username', key: 'username', width: 120 },
  { title: '操作', key: 'action', width: 80, align: 'center' as const },
];

// MQ表格列
const mqColumns = [
  { title: '标识代码', dataIndex: 'code', key: 'code', width: 120 },
  { title: '主机地址', dataIndex: 'host', key: 'host', width: 160 },
  { title: '端口', dataIndex: 'port', key: 'port', width: 80 },
  { title: 'VHost', dataIndex: 'vhost', key: 'vhost', width: 100 },
  { title: '用户名', dataIndex: 'username', key: 'username', width: 120 },
  { title: '操作', key: 'action', width: 80, align: 'center' as const },
];

function addDomain() {
  domains.value.push({ code: '', url: '', description: '' });
}

function removeDomain(index: number) {
  domains.value.splice(index, 1);
}

function addVariable() {
  variables.value.push({ key: '', value: '', description: '' });
}

function removeVariable(index: number) {
  variables.value.splice(index, 1);
}

function addDatabase() {
  databases.value.push({ code: '', host: '', port: 3306, database: '', username: '', description: '' });
}

function removeDatabase(index: number) {
  databases.value.splice(index, 1);
}

function addMqConfig() {
  mqConfigs.value.push({ code: '', host: '', port: 5672, username: '', vhost: '/', description: '' });
}

function removeMqConfig(index: number) {
  mqConfigs.value.splice(index, 1);
}
</script>

<template>
  <div class="env-detail-form">
    <!-- 顶部标题栏 -->
    <div class="detail-header">
      <div class="header-left">
        <h3 class="env-title">{{ env.name }}</h3>
        <Badge
          :status="formData.status === 1 ? 'success' : 'default'"
          :text="formData.status === 1 ? '启用' : '禁用'"
        />
      </div>
      <div class="header-right">
        <Button type="primary" :loading="saving" @click="handleSave">
          保存配置
        </Button>
      </div>
    </div>

    <!-- Tabs 内容区 -->
    <Tabs v-model:activeKey="activeTab" class="detail-tabs">
      <!-- 基本信息 Tab -->
      <Tabs.TabPane key="basic">
        <template #tab>
          <span class="tab-label">
            <Settings class="size-4" />
            <span>基本信息</span>
          </span>
        </template>
        <div class="tab-content">
          <Form layout="vertical" class="basic-form">
            <Form.Item label="环境名称" required>
              <Input v-model:value="formData.name" placeholder="请输入环境名称" />
            </Form.Item>
            <Form.Item label="描述">
              <Input.TextArea
                v-model:value="formData.description"
                :rows="3"
                placeholder="请输入环境描述"
              />
            </Form.Item>
            <Form.Item label="状态">
              <div class="status-switch">
                <Switch
                  :checked="formData.status === 1"
                  checked-children="启用"
                  un-checked-children="禁用"
                  @change="(checked: any) => formData.status = checked ? 1 : 0"
                />
                <span class="status-hint">
                  {{ formData.status === 1 ? '环境处于启用状态，可用于测试执行' : '环境已禁用，无法用于测试执行' }}
                </span>
              </div>
            </Form.Item>
          </Form>
        </div>
      </Tabs.TabPane>

      <!-- 域名配置 Tab -->
      <Tabs.TabPane key="domains">
        <template #tab>
          <span class="tab-label">
            <Globe class="size-4" />
            <span>域名配置</span>
            <Tag v-if="domains.length > 0" class="tab-count">{{ domains.length }}</Tag>
          </span>
        </template>
        <div class="tab-content">
          <div class="config-toolbar">
            <Button type="primary" @click="addDomain">
              <template #icon><Plus class="size-4" /></template>
              添加域名
            </Button>
            <span class="toolbar-hint">配置此环境下的服务域名地址</span>
          </div>
          <Table
            v-if="domains.length > 0"
            :columns="domainColumns"
            :data-source="domains"
            :pagination="false"
            size="middle"
            :scroll="{ y: 320 }"
            row-key="code"
          >
            <template #bodyCell="{ column, record, index }">
              <template v-if="column.key === 'code'">
                <Input v-model:value="record.code" placeholder="如：api" />
              </template>
              <template v-else-if="column.key === 'url'">
                <Input v-model:value="record.url" placeholder="如：https://api.example.com" />
              </template>
              <template v-else-if="column.key === 'description'">
                <Input v-model:value="record.description" placeholder="备注" />
              </template>
              <template v-else-if="column.key === 'action'">
                <Popconfirm title="确定删除？" @confirm="removeDomain(index)">
                  <Button type="text" size="small" danger>
                    <Trash2 class="size-4" />
                  </Button>
                </Popconfirm>
              </template>
            </template>
          </Table>
          <Empty v-else description="暂无域名配置" class="empty-state">
            <Button type="primary" @click="addDomain">
              <template #icon><Plus class="size-4" /></template>
              添加第一个域名
            </Button>
          </Empty>
        </div>
      </Tabs.TabPane>

      <!-- 变量配置 Tab -->
      <Tabs.TabPane key="variables">
        <template #tab>
          <span class="tab-label">
            <Variable class="size-4" />
            <span>变量配置</span>
            <Tag v-if="variables.length > 0" class="tab-count">{{ variables.length }}</Tag>
          </span>
        </template>
        <div class="tab-content">
          <div class="config-toolbar">
            <Button type="primary" @click="addVariable">
              <template #icon><Plus class="size-4" /></template>
              添加变量
            </Button>
            <span class="toolbar-hint">配置此环境下的全局变量，可在测试用例中引用</span>
          </div>
          <Table
            v-if="variables.length > 0"
            :columns="variableColumns"
            :data-source="variables"
            :pagination="false"
            size="middle"
            :scroll="{ y: 320 }"
            row-key="key"
          >
            <template #bodyCell="{ column, record, index }">
              <template v-if="column.key === 'key'">
                <Input v-model:value="record.key" placeholder="变量名" />
              </template>
              <template v-else-if="column.key === 'value'">
                <Input v-model:value="record.value" placeholder="变量值" />
              </template>
              <template v-else-if="column.key === 'description'">
                <Input v-model:value="record.description" placeholder="备注" />
              </template>
              <template v-else-if="column.key === 'action'">
                <Popconfirm title="确定删除？" @confirm="removeVariable(index)">
                  <Button type="text" size="small" danger>
                    <Trash2 class="size-4" />
                  </Button>
                </Popconfirm>
              </template>
            </template>
          </Table>
          <Empty v-else description="暂无变量配置" class="empty-state">
            <Button type="primary" @click="addVariable">
              <template #icon><Plus class="size-4" /></template>
              添加第一个变量
            </Button>
          </Empty>
        </div>
      </Tabs.TabPane>

      <!-- 数据库配置 Tab -->
      <Tabs.TabPane key="databases">
        <template #tab>
          <span class="tab-label">
            <Database class="size-4" />
            <span>数据库</span>
            <Tag v-if="databases.length > 0" class="tab-count">{{ databases.length }}</Tag>
          </span>
        </template>
        <div class="tab-content">
          <div class="config-toolbar">
            <Button type="primary" @click="addDatabase">
              <template #icon><Plus class="size-4" /></template>
              添加数据库
            </Button>
            <span class="toolbar-hint">配置此环境下的数据库连接信息</span>
          </div>
          <Table
            v-if="databases.length > 0"
            :columns="databaseColumns"
            :data-source="databases"
            :pagination="false"
            size="middle"
            :scroll="{ y: 320 }"
            row-key="code"
          >
            <template #bodyCell="{ column, record, index }">
              <template v-if="column.key === 'code'">
                <Input v-model:value="record.code" placeholder="标识" />
              </template>
              <template v-else-if="column.key === 'host'">
                <Input v-model:value="record.host" placeholder="主机地址" />
              </template>
              <template v-else-if="column.key === 'port'">
                <InputNumber v-model:value="record.port" :min="1" :max="65535" style="width: 100%" />
              </template>
              <template v-else-if="column.key === 'database'">
                <Input v-model:value="record.database" placeholder="数据库名" />
              </template>
              <template v-else-if="column.key === 'username'">
                <Input v-model:value="record.username" placeholder="用户名" />
              </template>
              <template v-else-if="column.key === 'action'">
                <Popconfirm title="确定删除？" @confirm="removeDatabase(index)">
                  <Button type="text" size="small" danger>
                    <Trash2 class="size-4" />
                  </Button>
                </Popconfirm>
              </template>
            </template>
          </Table>
          <Empty v-else description="暂无数据库配置" class="empty-state">
            <Button type="primary" @click="addDatabase">
              <template #icon><Plus class="size-4" /></template>
              添加第一个数据库
            </Button>
          </Empty>
        </div>
      </Tabs.TabPane>

      <!-- MQ配置 Tab -->
      <Tabs.TabPane key="mq">
        <template #tab>
          <span class="tab-label">
            <Database class="size-4" />
            <span>MQ 配置</span>
            <Tag v-if="mqConfigs.length > 0" class="tab-count">{{ mqConfigs.length }}</Tag>
          </span>
        </template>
        <div class="tab-content">
          <div class="config-toolbar">
            <Button type="primary" @click="addMqConfig">
              <template #icon><Plus class="size-4" /></template>
              添加 MQ
            </Button>
            <span class="toolbar-hint">配置此环境下的消息队列连接信息</span>
          </div>
          <Table
            v-if="mqConfigs.length > 0"
            :columns="mqColumns"
            :data-source="mqConfigs"
            :pagination="false"
            size="middle"
            :scroll="{ y: 320 }"
            row-key="code"
          >
            <template #bodyCell="{ column, record, index }">
              <template v-if="column.key === 'code'">
                <Input v-model:value="record.code" placeholder="标识" />
              </template>
              <template v-else-if="column.key === 'host'">
                <Input v-model:value="record.host" placeholder="主机地址" />
              </template>
              <template v-else-if="column.key === 'port'">
                <InputNumber v-model:value="record.port" :min="1" :max="65535" style="width: 100%" />
              </template>
              <template v-else-if="column.key === 'vhost'">
                <Input v-model:value="record.vhost" placeholder="/" />
              </template>
              <template v-else-if="column.key === 'username'">
                <Input v-model:value="record.username" placeholder="用户名" />
              </template>
              <template v-else-if="column.key === 'action'">
                <Popconfirm title="确定删除？" @confirm="removeMqConfig(index)">
                  <Button type="text" size="small" danger>
                    <Trash2 class="size-4" />
                  </Button>
                </Popconfirm>
              </template>
            </template>
          </Table>
          <Empty v-else description="暂无 MQ 配置" class="empty-state">
            <Button type="primary" @click="addMqConfig">
              <template #icon><Plus class="size-4" /></template>
              添加第一个 MQ
            </Button>
          </Empty>
        </div>
      </Tabs.TabPane>
    </Tabs>
  </div>
</template>

<style scoped>
.env-detail-form {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.env-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #1f1f1f;
}

.header-right {
  display: flex;
  gap: 8px;
}

.detail-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.detail-tabs :deep(.ant-tabs-nav) {
  margin: 0;
  padding: 0 16px;
  background: #fff;
}

.detail-tabs :deep(.ant-tabs-content-holder) {
  flex: 1;
  overflow: hidden;
}

.detail-tabs :deep(.ant-tabs-content) {
  height: 100%;
}

.detail-tabs :deep(.ant-tabs-tabpane) {
  height: 100%;
  overflow: auto;
}

.tab-label {
  display: flex;
  align-items: center;
  gap: 6px;
}

.tab-count {
  margin-left: 4px;
  font-size: 12px;
  padding: 0 6px;
  height: 18px;
  line-height: 18px;
  border-radius: 9px;
}

.tab-content {
  padding: 20px;
  height: 100%;
}

.basic-form {
  max-width: 600px;
}

.form-hint {
  font-size: 12px;
  color: #8c8c8c;
  margin-top: 4px;
}

.status-switch {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-hint {
  font-size: 13px;
  color: #8c8c8c;
}

.config-toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.toolbar-hint {
  font-size: 13px;
  color: #8c8c8c;
}

.empty-state {
  padding: 60px 0;
}

:deep(.ant-table-wrapper) {
  border: 1px solid #f0f0f0;
  border-radius: 8px;
}

:deep(.ant-table-thead > tr > th) {
  background: #fafafa;
}
</style>
