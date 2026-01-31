<script setup lang="ts">
import { ref, watch, computed } from 'vue';

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
  Modal,
  Popconfirm,
  Switch,
  Table,
  Tabs,
  Tag,
} from 'ant-design-vue';

import type { ConfigItem, ConfigType, Env } from '#/api/env';

import {
  batchUpdateConfigValuesApi,
  createConfigDefinitionApi,
  deleteConfigDefinitionApi,
  getConfigsApi,
  updateConfigDefinitionApi,
  updateEnvApi,
} from '#/api/env';

interface Props {
  env: Env;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'updated'): void;
}>();

const saving = ref(false);
const loading = ref(false);
const activeTab = ref('basic');
const formData = ref({
  name: '',
  description: '',
  status: 1,
});

// 各类型配置
const domainConfigs = ref<ConfigItem[]>([]);
const variableConfigs = ref<ConfigItem[]>([]);
const databaseConfigs = ref<ConfigItem[]>([]);
const mqConfigs = ref<ConfigItem[]>([]);

// 当前环境的项目ID
const projectId = computed(() => props.env?.project_id);

watch(
  () => props.env,
  async (env) => {
    if (env) {
      formData.value = {
        name: env.name,
        description: env.description || '',
        status: env.status,
      };
      // 加载所有配置
      await loadConfigs();
    }
  },
  { immediate: true },
);

// 加载配置
async function loadConfigs() {
  try {
    loading.value = true;
    // 并行加载各类型配置
    const [domains, variables, databases, mqs] = await Promise.all([
      getConfigsApi(props.env.id, 'domain'),
      getConfigsApi(props.env.id, 'variable'),
      getConfigsApi(props.env.id, 'database'),
      getConfigsApi(props.env.id, 'mq'),
    ]);
    domainConfigs.value = domains || [];
    variableConfigs.value = variables || [];
    databaseConfigs.value = databases || [];
    mqConfigs.value = mqs || [];
  } catch {
    message.error('加载配置失败');
  } finally {
    loading.value = false;
  }
}

async function handleSave() {
  try {
    saving.value = true;
    
    // 根据当前 Tab 决定保存哪些内容
    if (activeTab.value === 'basic') {
      await updateEnvApi(props.env.id, {
        name: formData.value.name,
        description: formData.value.description,
        status: formData.value.status,
      });
      message.success('基本信息保存成功');
      emit('updated');
    } else if (activeTab.value === 'domains') {
      await saveConfigs(domainConfigs.value);
      message.success('域名配置保存成功');
    } else if (activeTab.value === 'variables') {
      await saveConfigs(variableConfigs.value);
      message.success('变量配置保存成功');
    } else if (activeTab.value === 'databases') {
      await saveConfigs(databaseConfigs.value);
      message.success('数据库配置保存成功');
    } else if (activeTab.value === 'mq') {
      await saveConfigs(mqConfigs.value);
      message.success('MQ配置保存成功');
    }
  } catch (error) {
    console.error('保存失败:', error);
  } finally {
    saving.value = false;
  }
}

// 保存配置（批量更新值）
async function saveConfigs(configs: ConfigItem[]) {
  const items = configs.map((config) => ({
    code: config.code,
    value: config.value || {},
  }));
  
  await batchUpdateConfigValuesApi(props.env.id, { items });
}

// 域名表格列
const domainColumns = [
  { title: '名称', dataIndex: 'name', key: 'name', width: 150 },
  { title: 'URL 地址', dataIndex: 'base_url', key: 'base_url' },
  { title: '状态', dataIndex: 'status', key: 'status', width: 80 },
  { title: '操作', key: 'action', width: 80, align: 'center' as const },
];

// 变量表格列
const variableColumns = [
  { title: '名称', dataIndex: 'name', key: 'name', width: 150 },
  { title: '变量值', dataIndex: 'value', key: 'value' },
  { title: '类型', dataIndex: 'var_type', key: 'var_type', width: 90 },
  { title: '敏感', dataIndex: 'is_sensitive', key: 'is_sensitive', width: 70 },
  { title: '操作', key: 'action', width: 80, align: 'center' as const },
];

// 数据库表格列
const databaseColumns = [
  { title: '名称', dataIndex: 'name', key: 'name', width: 150 },
  { title: '主机地址', dataIndex: 'host', key: 'host', width: 160 },
  { title: '端口', dataIndex: 'port', key: 'port', width: 80 },
  { title: '数据库名', dataIndex: 'database', key: 'database', width: 140 },
  { title: '用户名', dataIndex: 'username', key: 'username', width: 120 },
  { title: '操作', key: 'action', width: 80, align: 'center' as const },
];

// MQ表格列
const mqColumns = [
  { title: '名称', dataIndex: 'name', key: 'name', width: 150 },
  { title: '主机地址', dataIndex: 'host', key: 'host', width: 160 },
  { title: '端口', dataIndex: 'port', key: 'port', width: 80 },
  { title: 'VHost', dataIndex: 'vhost', key: 'vhost', width: 100 },
  { title: '用户名', dataIndex: 'username', key: 'username', width: 120 },
  { title: '操作', key: 'action', width: 80, align: 'center' as const },
];

// 添加配置弹窗状态
const addModalVisible = ref(false);
const addModalType = ref<ConfigType>('domain');
const addModalForm = ref({ name: '' });
const addModalLoading = ref(false);

const typeLabels: Record<ConfigType, string> = {
  domain: '域名',
  variable: '变量',
  database: '数据库',
  mq: 'MQ',
};

// 打开添加配置弹窗
function openAddModal(type: ConfigType) {
  addModalType.value = type;
  addModalForm.value = { name: '' };
  addModalVisible.value = true;
}

// 确认添加配置
async function confirmAddConfig() {
  if (!addModalForm.value.name) {
    message.error('请填写名称');
    return;
  }
  
  try {
    addModalLoading.value = true;
    await createConfigDefinitionApi(projectId.value, {
      type: addModalType.value,
      name: addModalForm.value.name,
      status: 1,
    });
    message.success('添加成功');
    addModalVisible.value = false;
    await loadConfigs();
  } catch (error: any) {
    message.error(error?.message || '添加失败');
  } finally {
    addModalLoading.value = false;
  }
}

// 删除配置定义
async function removeConfig(config: any) {
  try {
    await deleteConfigDefinitionApi(projectId.value, config.code);
    message.success('删除成功');
    await loadConfigs();
  } catch (error: any) {
    message.error(error?.message || '删除失败');
  }
}

// 修改配置定义（名称等）
async function updateDefinition(config: any, field: string, value: any) {
  try {
    await updateConfigDefinitionApi(projectId.value, config.code, {
      [field]: value,
    });
    // 不需要重新加载，因为是本地修改
  } catch (error: any) {
    message.error(error?.message || '更新失败');
    await loadConfigs(); // 恢复原值
  }
}

// 获取域名 base_url
function getDomainBaseUrl(config: any): string {
  return config?.value?.base_url || '';
}

// 设置域名 base_url
function setDomainBaseUrl(config: any, value: string) {
  if (!config.value) config.value = {};
  config.value.base_url = value;
}

// 获取变量值
function getVariableValue(config: any): string {
  return config?.value?.value || '';
}

// 设置变量值
function setVariableValue(config: any, value: string) {
  if (!config.value) config.value = {};
  config.value.value = value;
}

// 获取变量类型
function getVarType(config: any): string {
  return config?.extra?.var_type || 'string';
}

// 判断是否敏感
function isSensitive(config: any): boolean {
  return config?.extra?.is_sensitive || false;
}

// 获取数据库/MQ字段
function getDbField(config: any, field: string): any {
  return config?.value?.[field] || '';
}

function setDbField(config: any, field: string, value: any) {
  if (!config.value) config.value = {};
  config.value[field] = value;
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
            <Tag v-if="domainConfigs.length > 0" class="tab-count">{{ domainConfigs.length }}</Tag>
          </span>
        </template>
        <div class="tab-content">
          <div class="config-toolbar">
            <Button type="primary" @click="openAddModal('domain')">
              <template #icon><Plus class="size-4" /></template>
              添加域名
            </Button>
            <span class="toolbar-hint">配置此环境下的服务域名地址（域名定义是项目级别的，所有环境共享）</span>
          </div>
          <Table
            v-if="domainConfigs.length > 0"
            :columns="domainColumns"
            :data-source="domainConfigs"
            :pagination="false"
            :loading="loading"
            size="middle"
            :scroll="{ y: 320 }"
            row-key="code"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'name'">
                <Input 
                  :value="record.name" 
                  @blur="(e: any) => updateDefinition(record, 'name', e.target.value)"
                  @pressEnter="(e: any) => updateDefinition(record, 'name', e.target.value)"
                />
              </template>
              <template v-else-if="column.key === 'base_url'">
                <Input 
                  :value="getDomainBaseUrl(record)" 
                  placeholder="如：https://api.example.com"
                  @input="(e: any) => setDomainBaseUrl(record, e.target.value)"
                />
              </template>
              <template v-else-if="column.key === 'status'">
                <Switch
                  :checked="record.status === 1"
                  size="small"
                  @change="(checked: any) => updateDefinition(record, 'status', checked ? 1 : 0)"
                />
              </template>
              <template v-else-if="column.key === 'action'">
                <Popconfirm title="确定删除？删除后所有环境的该配置都会被删除" @confirm="removeConfig(record)">
                  <Button type="text" size="small" danger>
                    <Trash2 class="size-4" />
                  </Button>
                </Popconfirm>
              </template>
            </template>
          </Table>
          <Empty v-else description="暂无域名配置" class="empty-state">
            <Button type="primary" @click="openAddModal('domain')">
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
            <Tag v-if="variableConfigs.length > 0" class="tab-count">{{ variableConfigs.length }}</Tag>
          </span>
        </template>
        <div class="tab-content">
          <div class="config-toolbar">
            <Button type="primary" @click="openAddModal('variable')">
              <template #icon><Plus class="size-4" /></template>
              添加变量
            </Button>
            <span class="toolbar-hint">配置此环境下的全局变量，可在测试用例中引用</span>
          </div>
          <Table
            v-if="variableConfigs.length > 0"
            :columns="variableColumns"
            :data-source="variableConfigs"
            :pagination="false"
            :loading="loading"
            size="middle"
            :scroll="{ y: 320 }"
            row-key="code"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'name'">
                <Input 
                  :value="record.name" 
                  @blur="(e: any) => updateDefinition(record, 'name', e.target.value)"
                  @pressEnter="(e: any) => updateDefinition(record, 'name', e.target.value)"
                />
              </template>
              <template v-else-if="column.key === 'value'">
                <Input.Password
                  v-if="isSensitive(record)"
                  :value="getVariableValue(record)"
                  placeholder="敏感变量值"
                  @input="(e: any) => setVariableValue(record, e.target.value)"
                />
                <Input 
                  v-else 
                  :value="getVariableValue(record)" 
                  placeholder="变量值"
                  @input="(e: any) => setVariableValue(record, e.target.value)"
                />
              </template>
              <template v-else-if="column.key === 'var_type'">
                <Tag>{{ getVarType(record) }}</Tag>
              </template>
              <template v-else-if="column.key === 'is_sensitive'">
                <Switch
                  :checked="isSensitive(record)"
                  size="small"
                  disabled
                />
              </template>
              <template v-else-if="column.key === 'action'">
                <Popconfirm title="确定删除？删除后所有环境的该配置都会被删除" @confirm="removeConfig(record)">
                  <Button type="text" size="small" danger>
                    <Trash2 class="size-4" />
                  </Button>
                </Popconfirm>
              </template>
            </template>
          </Table>
          <Empty v-else description="暂无变量配置" class="empty-state">
            <Button type="primary" @click="openAddModal('variable')">
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
            <Tag v-if="databaseConfigs.length > 0" class="tab-count">{{ databaseConfigs.length }}</Tag>
          </span>
        </template>
        <div class="tab-content">
          <div class="config-toolbar">
            <Button type="primary" @click="openAddModal('database')">
              <template #icon><Plus class="size-4" /></template>
              添加数据库
            </Button>
            <span class="toolbar-hint">配置此环境下的数据库连接信息</span>
          </div>
          <Table
            v-if="databaseConfigs.length > 0"
            :columns="databaseColumns"
            :data-source="databaseConfigs"
            :pagination="false"
            :loading="loading"
            size="middle"
            :scroll="{ y: 320 }"
            row-key="code"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'name'">
                <Input 
                  :value="record.name" 
                  @blur="(e: any) => updateDefinition(record, 'name', e.target.value)"
                  @pressEnter="(e: any) => updateDefinition(record, 'name', e.target.value)"
                />
              </template>
              <template v-else-if="column.key === 'host'">
                <Input 
                  :value="getDbField(record, 'host')" 
                  placeholder="主机地址"
                  @input="(e: any) => setDbField(record, 'host', e.target.value)"
                />
              </template>
              <template v-else-if="column.key === 'port'">
                <InputNumber 
                  :value="getDbField(record, 'port') || 3306" 
                  :min="1" 
                  :max="65535" 
                  style="width: 100%"
                  @change="(val: any) => setDbField(record, 'port', val)"
                />
              </template>
              <template v-else-if="column.key === 'database'">
                <Input 
                  :value="getDbField(record, 'database')" 
                  placeholder="数据库名"
                  @input="(e: any) => setDbField(record, 'database', e.target.value)"
                />
              </template>
              <template v-else-if="column.key === 'username'">
                <Input 
                  :value="getDbField(record, 'username')" 
                  placeholder="用户名"
                  @input="(e: any) => setDbField(record, 'username', e.target.value)"
                />
              </template>
              <template v-else-if="column.key === 'action'">
                <Popconfirm title="确定删除？删除后所有环境的该配置都会被删除" @confirm="removeConfig(record)">
                  <Button type="text" size="small" danger>
                    <Trash2 class="size-4" />
                  </Button>
                </Popconfirm>
              </template>
            </template>
          </Table>
          <Empty v-else description="暂无数据库配置" class="empty-state">
            <Button type="primary" @click="openAddModal('database')">
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
            <Button type="primary" @click="openAddModal('mq')">
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
            :loading="loading"
            size="middle"
            :scroll="{ y: 320 }"
            row-key="code"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'name'">
                <Input 
                  :value="record.name" 
                  @blur="(e: any) => updateDefinition(record, 'name', e.target.value)"
                  @pressEnter="(e: any) => updateDefinition(record, 'name', e.target.value)"
                />
              </template>
              <template v-else-if="column.key === 'host'">
                <Input 
                  :value="getDbField(record, 'host')" 
                  placeholder="主机地址"
                  @input="(e: any) => setDbField(record, 'host', e.target.value)"
                />
              </template>
              <template v-else-if="column.key === 'port'">
                <InputNumber 
                  :value="getDbField(record, 'port') || 5672" 
                  :min="1" 
                  :max="65535" 
                  style="width: 100%"
                  @change="(val: any) => setDbField(record, 'port', val)"
                />
              </template>
              <template v-else-if="column.key === 'vhost'">
                <Input 
                  :value="getDbField(record, 'vhost') || '/'" 
                  placeholder="/"
                  @input="(e: any) => setDbField(record, 'vhost', e.target.value)"
                />
              </template>
              <template v-else-if="column.key === 'username'">
                <Input 
                  :value="getDbField(record, 'username')" 
                  placeholder="用户名"
                  @input="(e: any) => setDbField(record, 'username', e.target.value)"
                />
              </template>
              <template v-else-if="column.key === 'action'">
                <Popconfirm title="确定删除？删除后所有环境的该配置都会被删除" @confirm="removeConfig(record)">
                  <Button type="text" size="small" danger>
                    <Trash2 class="size-4" />
                  </Button>
                </Popconfirm>
              </template>
            </template>
          </Table>
          <Empty v-else description="暂无 MQ 配置" class="empty-state">
            <Button type="primary" @click="openAddModal('mq')">
              <template #icon><Plus class="size-4" /></template>
              添加第一个 MQ
            </Button>
          </Empty>
        </div>
      </Tabs.TabPane>
    </Tabs>
    
    <!-- 添加配置弹窗 -->
    <Modal
      v-model:open="addModalVisible"
      :title="`添加${typeLabels[addModalType]}`"
      :confirm-loading="addModalLoading"
      @ok="confirmAddConfig"
    >
      <Form layout="vertical" style="margin-top: 16px;">
        <Form.Item label="名称" required>
          <Input 
            v-model:value="addModalForm.name" 
            :placeholder="addModalType === 'variable' ? '如：接口密钥' : '如：主服务'" 
          />
        </Form.Item>
      </Form>
    </Modal>
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
