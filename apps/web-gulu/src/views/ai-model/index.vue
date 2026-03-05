<script setup lang="ts">
import type { AiModel, AiProvider } from '#/api/ai-model';

import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import {
  Badge,
  Button,
  Dropdown,
  Empty,
  Menu,
  MenuItem,
  message,
  Modal,
  Spin,
  Switch,
} from 'ant-design-vue';
import { createIconifyIcon } from '@vben/icons';

const PlusOutlined = createIconifyIcon('ant-design:plus-outlined');
import {
  deleteAiModelApi,
  deleteAiProviderApi,
  getAiModelListApi,
  getAiProviderListApi,
  updateAiModelStatusApi,
  updateAiProviderStatusApi,
} from '#/api/ai-model';

import ModelCard from './components/ModelCard.vue';
import ModelFormModal from './components/ModelFormModal.vue';
import ProviderFormModal from './components/ProviderFormModal.vue';

const router = useRouter();
const route = useRoute();

const providers = ref<AiProvider[]>([]);
const providerModels = ref<Record<number, AiModel[]>>({});
const loadingProviders = ref(false);
const loadingModels = ref<Record<number, boolean>>({});
const selectedProviderId = ref<number | null>(null);

const providerFormRef = ref<InstanceType<typeof ProviderFormModal>>();
const modelFormRef = ref<InstanceType<typeof ModelFormModal>>();
const selectedProvider = computed(() =>
  providers.value.find((p) => p.id === selectedProviderId.value),
);

const currentModels = computed(() => {
  if (!selectedProviderId.value) return [];
  return providerModels.value[selectedProviderId.value] || [];
});

const isLoadingCurrentModels = computed(() => {
  if (!selectedProviderId.value) return false;
  return !!loadingModels.value[selectedProviderId.value];
});

async function loadProviders() {
  loadingProviders.value = true;
  try {
    const res = await getAiProviderListApi({ pageSize: 100 });
    providers.value = res.list || [];
    if (providers.value.length > 0 && !selectedProviderId.value) {
      selectProvider(providers.value[0]!);
    }
  } catch {
    message.error('加载供应商列表失败');
  } finally {
    loadingProviders.value = false;
  }
}

async function loadModels(providerId: number) {
  loadingModels.value[providerId] = true;
  try {
    const res = await getAiModelListApi({
      provider_id: providerId,
      pageSize: 200,
    });
    providerModels.value[providerId] = res.list || [];
  } catch {
    message.error('加载模型列表失败');
  } finally {
    loadingModels.value[providerId] = false;
  }
}

function selectProvider(provider: AiProvider) {
  selectedProviderId.value = provider.id;
  if (!providerModels.value[provider.id]) {
    loadModels(provider.id);
  }
}

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
        if (selectedProviderId.value === provider.id) {
          selectedProviderId.value = null;
        }
        await loadProviders();
      } catch {
        message.error('删除失败');
      }
    },
  });
}

async function handleProviderStatusChange(
  provider: AiProvider,
  checked: boolean,
) {
  try {
    await updateAiProviderStatusApi(provider.id, checked ? 1 : 0);
    message.success('状态更新成功');
    await loadProviders();
  } catch {
    message.error('状态更新失败');
  }
}

function handleAddModel() {
  if (selectedProvider.value) {
    modelFormRef.value?.open(selectedProvider.value);
  }
}

function handleEditModel(model: AiModel) {
  if (selectedProvider.value) {
    modelFormRef.value?.open(selectedProvider.value, model);
  }
}

async function handleDeleteModel(id: number) {
  const model = currentModels.value.find((m) => m.id === id);
  if (!model) return;
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

async function handleModelStatusChange(id: number, checked: boolean) {
  try {
    await updateAiModelStatusApi(id, checked ? 1 : 0);
    message.success('状态更新成功');
    if (selectedProviderId.value) await loadModels(selectedProviderId.value);
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
  if (selectedProviderId.value) {
    loadModels(selectedProviderId.value);
  }
}

onMounted(() => {
  loadProviders();
});
</script>

<template>
  <div class="ai-model-page">
    <!-- 左侧供应商列表 -->
    <aside class="provider-sidebar">
      <div class="sidebar-header">
        <h2 class="sidebar-title">供应商</h2>
        <Button type="primary" size="small" @click="handleAddProvider">
          <template #icon><PlusOutlined /></template>
          添加
        </Button>
      </div>

      <Spin :spinning="loadingProviders">
        <div v-if="providers.length === 0 && !loadingProviders" class="sidebar-empty">
          <Empty :image="Empty.PRESENTED_IMAGE_SIMPLE" description="暂无供应商">
            <Button type="primary" size="small" @click="handleAddProvider">添加供应商</Button>
          </Empty>
        </div>

        <div v-else class="provider-list">
          <div
            v-for="provider in providers"
            :key="provider.id"
            class="provider-item"
            :class="{ 'provider-item--active': selectedProviderId === provider.id }"
            @click="selectProvider(provider)"
          >
            <div class="provider-item__icon">
              {{ provider.name.charAt(0) }}
            </div>
            <div class="provider-item__content">
              <div class="provider-item__name">{{ provider.name }}</div>
              <div class="provider-item__meta">
                <Badge
                  :status="provider.status === 1 ? 'success' : 'default'"
                  class="provider-item__status"
                />
                <span class="provider-item__count">
                  {{ provider.model_count || 0 }} 个模型
                </span>
              </div>
            </div>
          </div>
        </div>
      </Spin>
    </aside>

    <!-- 右侧内容区 -->
    <main class="content-area">
      <template v-if="selectedProvider">
        <!-- 供应商信息栏 -->
        <div class="content-header">
          <div class="content-header__info">
            <div class="content-header__top">
              <h3 class="content-header__name">{{ selectedProvider.name }}</h3>
              <Badge
                :status="selectedProvider.status === 1 ? 'success' : 'default'"
                :text="selectedProvider.status === 1 ? '已启用' : '已禁用'"
              />
              <Switch
                :checked="selectedProvider.status === 1"
                size="small"
                class="content-header__switch"
                @change="(checked: any) => handleProviderStatusChange(selectedProvider!, !!checked)"
              />
            </div>
            <div class="content-header__url">{{ selectedProvider.api_base_url }}</div>
          </div>
          <div class="content-header__actions">
            <Dropdown :trigger="['click']">
              <Button size="small" type="text">···</Button>
              <template #overlay>
                <Menu>
                  <MenuItem key="edit" @click="handleEditProvider(selectedProvider!)">编辑</MenuItem>
                  <Menu.Divider />
                  <MenuItem key="delete" danger @click="handleDeleteProvider(selectedProvider!)">删除</MenuItem>
                </Menu>
              </template>
            </Dropdown>
          </div>
        </div>

        <!-- 模型工具栏 -->
        <div class="model-toolbar">
          <div class="model-toolbar__title">
            模型列表
            <span class="model-toolbar__count">{{ currentModels.length }}</span>
          </div>
          <Button type="primary" size="small" @click="handleAddModel">
            <template #icon><PlusOutlined /></template>
            添加模型
          </Button>
        </div>

        <!-- 模型卡片网格 -->
        <div class="model-grid-wrapper">
          <Spin :spinning="isLoadingCurrentModels">
            <div v-if="currentModels.length > 0" class="model-grid">
              <ModelCard
                v-for="model in currentModels"
                :key="model.id"
                :model="model"
                @chat="handleChat"
                @edit="handleEditModel"
                @delete="handleDeleteModel"
                @status-change="handleModelStatusChange"
              />
            </div>
            <div v-else-if="!isLoadingCurrentModels" class="model-empty">
              <Empty description="暂无模型">
                <Button type="primary" size="small" @click="handleAddModel">添加模型</Button>
              </Empty>
            </div>
          </Spin>
        </div>
      </template>

      <div v-else class="content-placeholder">
        <Empty :image="Empty.PRESENTED_IMAGE_SIMPLE" description="请在左侧选择一个供应商" />
      </div>
    </main>

    <ProviderFormModal ref="providerFormRef" @success="handleFormSuccess" />
    <ModelFormModal ref="modelFormRef" @success="handleFormSuccess" />
  </div>
</template>

<style scoped>
.ai-model-page {
  display: flex;
  height: calc(100vh - 50px);
  overflow: hidden;
  background: hsl(var(--header));
}

/* ---- 左侧供应商列表 ---- */
.provider-sidebar {
  display: flex;
  flex-direction: column;
  width: 280px;
  flex-shrink: 0;
  border-right: 1px solid var(--ant-color-border-secondary, #f0f0f0);
  background: hsl(var(--header));
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 16px 12px;
  flex-shrink: 0;
}

.sidebar-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.sidebar-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 16px;
}

.provider-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px 8px;
}

.provider-item {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 10px 12px;
  margin-bottom: 4px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.provider-item:hover {
  background: var(--ant-color-bg-text-hover, #f5f5f5);
}

.provider-item--active {
  background: var(--ant-color-primary-bg, #e6f4ff);
  border-color: var(--ant-color-primary, #1677ff);
}

.provider-item--active:hover {
  background: var(--ant-color-primary-bg, #e6f4ff);
}

.provider-item__icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 15px;
  flex-shrink: 0;
}

.provider-item__content {
  flex: 1;
  min-width: 0;
}

.provider-item__name {
  font-weight: 500;
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.provider-item__meta {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
}

.provider-item__status {
  transform: scale(0.85);
}

.provider-item__count {
  font-size: 12px;
  color: var(--ant-color-text-tertiary, #999);
}

/* ---- 右侧内容区 ---- */
.content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px 24px;
  border-bottom: 1px solid var(--ant-color-border-secondary, #f0f0f0);
  flex-shrink: 0;
}

.content-header__info {
  flex: 1;
  min-width: 0;
}

.content-header__top {
  display: flex;
  align-items: center;
  gap: 10px;
}

.content-header__name {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.content-header__switch {
  margin-left: 4px;
}

.content-header__url {
  font-size: 12px;
  color: var(--ant-color-text-tertiary, #999);
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.content-header__actions {
  display: flex;
  gap: 4px;
  align-items: center;
  flex-shrink: 0;
  margin-left: 16px;
}

.model-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  border-bottom: 1px solid var(--ant-color-border-secondary, #f0f0f0);
  flex-shrink: 0;
}

.model-toolbar__title {
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
}

.model-toolbar__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  font-size: 12px;
  font-weight: 400;
  color: var(--ant-color-text-tertiary, #999);
  background: var(--ant-color-fill-quaternary, #f5f5f5);
  border-radius: 10px;
}

.model-grid-wrapper {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}

.model-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.model-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
}

.content-placeholder {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
