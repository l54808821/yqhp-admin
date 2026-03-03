<script setup lang="ts">
import type { AiModel, AiProvider } from '#/api/ai-model';

import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import {
  Badge,
  Button,
  Collapse,
  CollapsePanel,
  Dropdown,
  Empty,
  Menu,
  MenuItem,
  message,
  Modal,
  Space,
  Spin,
  Switch,
  Table,
  Tag,
  Tooltip,
} from 'ant-design-vue';
import { createIconifyIcon } from '@vben/icons';

const PlusOutlined = createIconifyIcon('ant-design:plus-outlined');
const SettingOutlined = createIconifyIcon('ant-design:setting-outlined');
const EditOutlined = createIconifyIcon('ant-design:edit-outlined');
const DeleteOutlined = createIconifyIcon('ant-design:delete-outlined');
const MessageOutlined = createIconifyIcon('ant-design:message-outlined');

import {
  deleteAiModelApi,
  deleteAiProviderApi,
  getAiModelListApi,
  getAiProviderListApi,
  updateAiModelStatusApi,
  updateAiProviderStatusApi,
} from '#/api/ai-model';

import BatchModelModal from './components/BatchModelModal.vue';
import ModelFormModal from './components/ModelFormModal.vue';
import ProviderFormModal from './components/ProviderFormModal.vue';

const router = useRouter();
const route = useRoute();

const providers = ref<AiProvider[]>([]);
const providerModels = ref<Record<number, AiModel[]>>({});
const loadingProviders = ref(false);
const loadingModels = ref<Record<number, boolean>>({});
const activeKeys = ref<number[]>([]);

const providerFormRef = ref<InstanceType<typeof ProviderFormModal>>();
const modelFormRef = ref<InstanceType<typeof ModelFormModal>>();
const batchModelRef = ref<InstanceType<typeof BatchModelModal>>();

// 加载供应商列表
async function loadProviders() {
  loadingProviders.value = true;
  try {
    const res = await getAiProviderListApi({ pageSize: 100 });
    providers.value = res.list || [];
  } catch {
    message.error('加载供应商列表失败');
  } finally {
    loadingProviders.value = false;
  }
}

// 加载某个供应商下的模型列表
async function loadModels(providerId: number) {
  loadingModels.value[providerId] = true;
  try {
    const res = await getAiModelListApi({ provider_id: providerId, pageSize: 200 });
    providerModels.value[providerId] = res.list || [];
  } catch {
    message.error('加载模型列表失败');
  } finally {
    loadingModels.value[providerId] = false;
  }
}

// 展开/折叠供应商时加载模型
function handleCollapseChange(keys: any) {
  activeKeys.value = keys;
  for (const key of keys) {
    if (!providerModels.value[key]) {
      loadModels(key);
    }
  }
}

// 供应商 CRUD
function handleAddProvider() {
  providerFormRef.value?.open();
}

function handleEditProvider(provider: AiProvider) {
  providerFormRef.value?.open(provider);
}

async function handleDeleteProvider(provider: AiProvider) {
  Modal.confirm({
    title: '确认删除',
    content: `确定删除供应商「${provider.name}」吗？其下模型将无法使用。`,
    okText: '删除',
    okType: 'danger',
    async onOk() {
      try {
        await deleteAiProviderApi(provider.id);
        message.success('删除成功');
        await loadProviders();
      } catch {
        message.error('删除失败');
      }
    },
  });
}

async function handleProviderStatusChange(provider: AiProvider, checked: boolean) {
  try {
    await updateAiProviderStatusApi(provider.id, checked ? 1 : 0);
    message.success('状态更新成功');
    await loadProviders();
  } catch {
    message.error('状态更新失败');
  }
}

// 模型 CRUD
function handleAddModel(provider: AiProvider) {
  modelFormRef.value?.open(provider);
}

function handleBatchAddModels(provider: AiProvider) {
  batchModelRef.value?.open(provider);
}

function handleEditModel(provider: AiProvider, model: AiModel) {
  modelFormRef.value?.open(provider, model);
}

async function handleDeleteModel(model: AiModel) {
  Modal.confirm({
    title: '确认删除',
    content: `确定删除模型「${model.name}」吗？`,
    okText: '删除',
    okType: 'danger',
    async onOk() {
      try {
        await deleteAiModelApi(model.id);
        message.success('删除成功');
        if (model.provider_id) await loadModels(model.provider_id);
      } catch {
        message.error('删除失败');
      }
    },
  });
}

async function handleModelStatusChange(model: AiModel, checked: boolean) {
  try {
    await updateAiModelStatusApi(model.id, checked ? 1 : 0);
    message.success('状态更新成功');
    if (model.provider_id) await loadModels(model.provider_id);
  } catch {
    message.error('状态更新失败');
  }
}

function handleChat(model: AiModel) {
  const projectId = route.params.projectId;
  router.push(`/project/${projectId}/ai-model/${model.id}/chat`);
}

function handleFormSuccess() {
  loadProviders();
  for (const key of activeKeys.value) {
    loadModels(key);
  }
}

function getCapColor(tag: string): string {
  const map: Record<string, string> = { '对话': 'blue', Tools: 'green', Coder: 'purple', '推理': 'orange', '视觉': 'cyan', Math: 'red', FIM: 'geekblue', MoE: 'volcano' };
  return map[tag] || 'default';
}

function formatCtxLen(len?: number): string {
  if (!len) return '-';
  if (len >= 1024) return `${Math.round(len / 1024)}K`;
  return `${len}`;
}

const modelColumns = [
  { title: '模型名称', dataIndex: 'name', key: 'name', width: 180 },
  { title: 'Model ID', dataIndex: 'model_id', key: 'model_id', width: 240 },
  { title: '参数量', dataIndex: 'param_size', key: 'param_size', width: 80 },
  { title: '上下文', key: 'context_length', width: 80 },
  { title: '能力', key: 'capability_tags', width: 200 },
  { title: '状态', key: 'status', width: 80 },
  { title: '操作', key: 'action', width: 120, fixed: 'right' as const },
];

onMounted(() => {
  loadProviders();
});
</script>

<template>
  <div class="ai-model-page">
    <div class="page-header">
      <div>
        <h2 class="page-title">模型供应商</h2>
        <p class="page-desc">配置 AI 供应商的 API Key，然后添加该供应商下的模型</p>
      </div>
      <Button type="primary" @click="handleAddProvider">
        <template #icon><PlusOutlined /></template>
        添加供应商
      </Button>
    </div>

    <Spin :spinning="loadingProviders">
      <div v-if="providers.length === 0 && !loadingProviders" class="empty-state">
        <Empty description="暂无供应商，点击上方添加">
          <Button type="primary" @click="handleAddProvider">添加供应商</Button>
        </Empty>
      </div>

      <Collapse
        v-else
        v-model:activeKey="activeKeys"
        class="provider-collapse"
        @change="handleCollapseChange"
      >
        <CollapsePanel
          v-for="provider in providers"
          :key="provider.id"
        >
          <template #header>
            <div class="provider-header">
              <div class="provider-info">
                <div class="provider-icon">
                  {{ provider.name.charAt(0) }}
                </div>
                <div class="provider-meta">
                  <div class="provider-name">
                    {{ provider.name }}
                    <Badge
                      :status="provider.status === 1 ? 'success' : 'default'"
                      :text="provider.status === 1 ? '已启用' : '已禁用'"
                      class="provider-badge"
                    />
                  </div>
                  <div class="provider-url">
                    {{ provider.api_base_url }}
                    <span v-if="provider.model_count" class="model-count">
                      · {{ provider.model_count }} 个模型
                    </span>
                  </div>
                </div>
              </div>
              <div class="provider-actions" @click.stop>
                <Switch
                  :checked="provider.status === 1"
                  size="small"
                  @change="(checked: any) => handleProviderStatusChange(provider, !!checked)"
                />
                <Tooltip title="配置">
                  <Button size="small" type="text" @click="handleEditProvider(provider)">
                    <template #icon><SettingOutlined /></template>
                  </Button>
                </Tooltip>
                <Dropdown :trigger="['click']">
                  <Button size="small" type="text">···</Button>
                  <template #overlay>
                    <Menu>
                      <MenuItem key="edit" @click="handleEditProvider(provider)">编辑</MenuItem>
                      <Menu.Divider />
                      <MenuItem key="delete" danger @click="handleDeleteProvider(provider)">删除</MenuItem>
                    </Menu>
                  </template>
                </Dropdown>
              </div>
            </div>
          </template>

          <!-- 模型列表 -->
          <div class="model-section">
            <div class="model-toolbar">
              <Space>
                <Button size="small" type="primary" @click="handleAddModel(provider)">
                  <template #icon><PlusOutlined /></template>
                  添加模型
                </Button>
                <Button size="small" @click="handleBatchAddModels(provider)">
                  批量添加
                </Button>
              </Space>
            </div>

            <Spin :spinning="!!loadingModels[provider.id]">
              <Table
                v-if="providerModels[provider.id]?.length"
                :columns="modelColumns"
                :data-source="providerModels[provider.id]"
                :pagination="false"
                size="small"
                row-key="id"
                :scroll="{ x: 900 }"
              >
                <template #bodyCell="{ column, record: rawRecord }">
                  <template v-if="column.key === 'name'">
                    <span class="model-name-cell">{{ rawRecord.name }}</span>
                    <div v-if="rawRecord.description" class="model-desc-cell">{{ rawRecord.description }}</div>
                  </template>
                  <template v-else-if="column.key === 'context_length'">
                    {{ formatCtxLen(rawRecord.context_length) }}
                  </template>
                  <template v-else-if="column.key === 'capability_tags'">
                    <Tag
                      v-for="tag in (rawRecord.capability_tags || []).slice(0, 4)"
                      :key="tag"
                      :color="getCapColor(tag)"
                      size="small"
                      class="cap-tag"
                    >{{ tag }}</Tag>
                    <span v-if="(rawRecord.capability_tags || []).length > 4" class="more-tags">
                      +{{ rawRecord.capability_tags.length - 4 }}
                    </span>
                  </template>
                  <template v-else-if="column.key === 'status'">
                    <Switch
                      :checked="rawRecord.status === 1"
                      size="small"
                      @change="(checked: any) => handleModelStatusChange(rawRecord as AiModel, !!checked)"
                    />
                  </template>
                  <template v-else-if="column.key === 'action'">
                    <Space :size="0">
                      <Tooltip title="对话">
                        <Button size="small" type="text" @click="handleChat(rawRecord as AiModel)">
                          <template #icon><MessageOutlined /></template>
                        </Button>
                      </Tooltip>
                      <Tooltip title="编辑">
                        <Button size="small" type="text" @click="handleEditModel(provider, rawRecord as AiModel)">
                          <template #icon><EditOutlined /></template>
                        </Button>
                      </Tooltip>
                      <Tooltip title="删除">
                        <Button size="small" type="text" danger @click="handleDeleteModel(rawRecord as AiModel)">
                          <template #icon><DeleteOutlined /></template>
                        </Button>
                      </Tooltip>
                    </Space>
                  </template>
                </template>
              </Table>
              <div v-else-if="!loadingModels[provider.id]" class="no-models">
                暂无模型，点击「添加模型」或「批量添加」
              </div>
            </Spin>
          </div>
        </CollapsePanel>
      </Collapse>
    </Spin>

    <ProviderFormModal ref="providerFormRef" @success="handleFormSuccess" />
    <ModelFormModal ref="modelFormRef" @success="handleFormSuccess" />
    <BatchModelModal ref="batchModelRef" @success="handleFormSuccess" />
  </div>
</template>

<style scoped>
.ai-model-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 50px);
  padding: 20px 24px;
  overflow-y: auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  flex-shrink: 0;
}

.page-title {
  margin: 0 0 4px;
  font-size: 20px;
  font-weight: 600;
}

.page-desc {
  margin: 0;
  font-size: 13px;
  color: #999;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
}

.provider-collapse {
  background: transparent;
}

.provider-collapse :deep(.ant-collapse-item) {
  margin-bottom: 12px;
  border: 1px solid #f0f0f0;
  border-radius: 8px !important;
  overflow: hidden;
}

.provider-collapse :deep(.ant-collapse-header) {
  padding: 12px 16px !important;
  align-items: center !important;
}

.provider-collapse :deep(.ant-collapse-content-box) {
  padding: 0 !important;
}

.provider-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  cursor: pointer;
}

.provider-info {
  display: flex;
  gap: 12px;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.provider-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 16px;
  flex-shrink: 0;
}

.provider-meta {
  flex: 1;
  min-width: 0;
}

.provider-name {
  font-weight: 500;
  font-size: 15px;
  display: flex;
  gap: 8px;
  align-items: center;
}

.provider-badge {
  font-size: 12px;
}

.provider-url {
  font-size: 12px;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.model-count {
  color: #666;
}

.provider-actions {
  display: flex;
  gap: 4px;
  align-items: center;
  flex-shrink: 0;
  margin-left: 12px;
}

.model-section {
  padding: 0;
}

.model-toolbar {
  display: flex;
  justify-content: flex-end;
  padding: 8px 16px;
  border-bottom: 1px solid #f5f5f5;
}

.model-name-cell {
  font-weight: 500;
}

.model-desc-cell {
  font-size: 12px;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 160px;
}

.cap-tag {
  margin: 1px 2px !important;
  font-size: 10px !important;
}

.more-tags {
  font-size: 11px;
  color: #999;
}

.no-models {
  padding: 24px;
  text-align: center;
  color: #999;
  font-size: 13px;
}
</style>
