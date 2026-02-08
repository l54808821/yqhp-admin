<script setup lang="ts">
import type { AiModel, AiModelListParams } from '#/api/ai-model';

import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import {
  Button,
  Card,
  Col,
  Empty,
  Input,
  message,
  Modal,
  Pagination,
  Row,
  Select,
  Space,
  Spin,
} from 'ant-design-vue';

import {
  deleteAiModelApi,
  getAiModelListApi,
  getAiModelProvidersApi,
  PROVIDER_NAMES,
  updateAiModelStatusApi,
} from '#/api/ai-model';

import ModelCard from './components/ModelCard.vue';
import ModelFormModal from './components/ModelFormModal.vue';

const router = useRouter();
const route = useRoute();

// 搜索参数
const searchParams = ref<AiModelListParams>({
  page: 1,
  pageSize: 12,
  name: undefined,
  provider: [],
  status: undefined,
});

// 数据
const modelList = ref<AiModel[]>([]);
const total = ref(0);
const loading = ref(false);
const providers = ref<string[]>([]);

// 弹框 ref
const formModalRef = ref<InstanceType<typeof ModelFormModal>>();

// 搜索栏厂商选项
const searchProviderOptions = computed(() => {
  const all = new Set([...PROVIDER_NAMES.filter((n) => n !== '自定义'), ...providers.value]);
  return [...all].map((p) => ({ label: p, value: p }));
});

// 加载数据
async function loadData() {
  loading.value = true;
  try {
    const res = await getAiModelListApi(searchParams.value);
    modelList.value = res.list || [];
    total.value = res.total || 0;
  } catch {
    message.error('加载模型列表失败');
  } finally {
    loading.value = false;
  }
}

// 加载厂商列表
async function loadProviders() {
  try {
    const res = await getAiModelProvidersApi();
    providers.value = res || [];
  } catch {
    // 忽略
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
    pageSize: 12,
    name: undefined,
    provider: [],
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
function handleEdit(record: AiModel) {
  formModalRef.value?.open(record);
}

// 删除
function handleDelete(id: number) {
  Modal.confirm({
    title: '确认删除',
    content: '确定删除该模型吗？',
    okText: '删除',
    okType: 'danger',
    async onOk() {
      try {
        await deleteAiModelApi(id);
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
    await updateAiModelStatusApi(id, status);
    message.success('状态更新成功');
    await loadData();
  } catch {
    message.error('状态更新失败');
  }
}

// 进入对话
function handleChat(record: AiModel) {
  const projectId = route.params.projectId;
  router.push(`/project/${projectId}/ai-model/${record.id}/chat`);
}

// 表单提交成功回调
function handleFormSuccess() {
  loadData();
  loadProviders();
}

// 初始化
onMounted(() => {
  loadData();
  loadProviders();
});
</script>

<template>
  <div class="ai-model-page">
    <!-- 搜索栏 -->
    <Card class="search-bar" size="small">
      <Row :gutter="16" align="middle">
        <Col :span="6">
          <Input
            v-model:value="searchParams.name"
            placeholder="搜索模型名称"
            allow-clear
            @press-enter="handleSearch"
            @change="handleSearch"
          />
        </Col>
        <Col :span="6">
          <Select
            v-model:value="searchParams.provider"
            placeholder="选择厂商"
            mode="multiple"
            :max-tag-count="2"
            allow-clear
            :options="searchProviderOptions"
            style="width: 100%"
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
        <Col :span="9" style="text-align: right">
          <Space>
            <Button @click="handleReset">重置</Button>
            <Button type="primary" @click="handleAdd">新增模型</Button>
          </Space>
        </Col>
      </Row>
    </Card>

    <!-- 模型卡片列表 -->
    <div class="model-card-list">
    <Spin :spinning="loading">
      <div v-if="modelList.length > 0">
        <Row :gutter="[16, 16]">
          <Col
            v-for="model in modelList"
            :key="model.id"
            :xs="24"
            :sm="12"
            :md="8"
            :lg="8"
            :xl="6"
          >
            <ModelCard
              :model="model"
              @chat="handleChat"
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
            :show-total="(t: number) => `共 ${t} 个模型`"
            @change="handlePageChange"
          />
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else-if="!loading" class="flex items-center justify-center" style="min-height: 400px">
        <Empty description="暂无模型，点击上方「新增模型」添加">
          <Button type="primary" @click="handleAdd">新增模型</Button>
        </Empty>
      </div>
    </Spin>
    </div>

    <!-- 新增/编辑弹框 -->
    <ModelFormModal ref="formModalRef" @success="handleFormSuccess" />
  </div>
</template>

<style scoped>
.ai-model-page {
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

.model-card-list {
  flex: 1;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
}
</style>
