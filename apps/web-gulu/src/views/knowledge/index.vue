<script setup lang="ts">
import type { KnowledgeBase, KnowledgeBaseListParams } from '#/api/knowledge-base';

import { onMounted, ref } from 'vue';
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
  deleteKnowledgeBaseApi,
  getKnowledgeBaseListApi,
  updateKnowledgeBaseStatusApi,
} from '#/api/knowledge-base';

import KnowledgeBaseCard from './components/KnowledgeBaseCard.vue';
import KnowledgeBaseFormModal from './components/KnowledgeBaseFormModal.vue';

const searchParams = ref<KnowledgeBaseListParams>({
  page: 1,
  pageSize: 12,
  name: undefined,
  type: undefined,
  status: undefined,
});

const route = useRoute();
const router = useRouter();

const kbList = ref<KnowledgeBase[]>([]);
const total = ref(0);
const loading = ref(false);

const formModalRef = ref<InstanceType<typeof KnowledgeBaseFormModal>>();

async function loadData() {
  loading.value = true;
  try {
    const res = await getKnowledgeBaseListApi(searchParams.value);
    kbList.value = res.list || [];
    total.value = res.total || 0;
  } catch {
    message.error('加载知识库列表失败');
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
    type: undefined,
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

function handleView(record: KnowledgeBase) {
  const projectId = route.params.projectId;
  router.push(`/project/${projectId}/knowledge/${record.id}`);
}

function handleEdit(record: KnowledgeBase) {
  formModalRef.value?.open(record);
}

function handleDelete(id: number) {
  Modal.confirm({
    title: '确认删除',
    content: '确定删除该知识库吗？关联的文档和向量数据将一并删除。',
    okText: '删除',
    okType: 'danger',
    async onOk() {
      try {
        await deleteKnowledgeBaseApi(id);
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
    await updateKnowledgeBaseStatusApi(id, status);
    message.success('状态更新成功');
    await loadData();
  } catch {
    message.error('状态更新失败');
  }
}

function handleFormSuccess() {
  loadData();
}

onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="knowledge-page">
    <!-- 搜索栏 -->
    <Card class="search-bar" size="small">
      <Row :gutter="16" align="middle">
        <Col :span="6">
          <Input
            v-model:value="searchParams.name"
            placeholder="搜索知识库名称"
            allow-clear
            @press-enter="handleSearch"
            @change="handleSearch"
          />
        </Col>
        <Col :span="4">
          <Select
            v-model:value="searchParams.type"
            placeholder="知识库类型"
            allow-clear
            style="width: 100%"
            :options="[
              { label: '普通知识库', value: 'normal' },
              { label: '图知识库', value: 'graph' },
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
            <Button type="primary" @click="handleAdd">新建知识库</Button>
          </Space>
        </Col>
      </Row>
    </Card>

    <!-- 知识库卡片列表 -->
    <div class="kb-card-list">
      <Spin :spinning="loading">
        <div v-if="kbList.length > 0">
          <Row :gutter="[16, 16]">
            <Col
              v-for="kb in kbList"
              :key="kb.id"
              :xs="24"
              :sm="12"
              :md="8"
              :lg="8"
              :xl="6"
            >
              <KnowledgeBaseCard
                :kb="kb"
                @view="handleView"
                @edit="handleEdit"
                @delete="handleDelete"
                @status-change="handleStatusChange"
              />
            </Col>
          </Row>

          <div class="mt-4 flex justify-end">
            <Pagination
              :current="searchParams.page"
              :page-size="searchParams.pageSize"
              :total="total"
              show-size-changer
              show-quick-jumper
              :show-total="(t: number) => `共 ${t} 个知识库`"
              @change="handlePageChange"
            />
          </div>
        </div>

        <div v-else-if="!loading" class="flex items-center justify-center" style="min-height: 400px">
          <Empty description="暂无知识库，点击上方「新建知识库」添加">
            <Button type="primary" @click="handleAdd">新建知识库</Button>
          </Empty>
        </div>
      </Spin>
    </div>

    <!-- 新增/编辑弹框 -->
    <KnowledgeBaseFormModal ref="formModalRef" @success="handleFormSuccess" />
  </div>
</template>

<style scoped>
.knowledge-page {
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

.kb-card-list {
  flex: 1;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
}
</style>
