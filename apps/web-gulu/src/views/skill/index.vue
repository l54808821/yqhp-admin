<script setup lang="ts">
import type { Skill, SkillListParams } from '#/api/skill';

import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useAppConfig } from '@vben/hooks';
import { useAccessStore } from '@vben/stores';

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
  deleteSkillApi,
  exportSkillApi,
  getSkillListApi,
  importSkillApi,
  SKILL_CATEGORY_OPTIONS,
  updateSkillStatusApi,
} from '#/api/skill';

import { Upload } from 'ant-design-vue';

import SkillCard from './components/SkillCard.vue';
import SkillFormModal from './components/SkillFormModal.vue';

const route = useRoute();
const router = useRouter();
const accessStore = useAccessStore();
const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);

// 搜索参数
const searchParams = ref<SkillListParams>({
  page: 1,
  pageSize: 12,
  name: undefined,
  category: undefined,
  type: undefined,
  status: undefined,
});

// 数据
const skillList = ref<Skill[]>([]);
const total = ref(0);
const loading = ref(false);
const importLoading = ref(false);

// 弹框 ref
const formModalRef = ref<InstanceType<typeof SkillFormModal>>();

// 分类选项
const categoryOptions = SKILL_CATEGORY_OPTIONS.map((c) => ({
  label: c,
  value: c,
}));

// 加载数据
async function loadData() {
  loading.value = true;
  try {
    const res = await getSkillListApi(searchParams.value);
    skillList.value = res.list || [];
    total.value = res.total || 0;
  } catch {
    message.error('加载 Skill 列表失败');
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
    pageSize: 12,
    name: undefined,
    category: undefined,
    type: undefined,
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

// 查看详情
function handleView(record: Skill) {
  const projectId = route.params.projectId;
  router.push(`/project/${projectId}/skill/${record.id}`);
}

// 编辑
function handleEdit(record: Skill) {
  formModalRef.value?.open(record);
}

// 删除
function handleDelete(id: number) {
  Modal.confirm({
    title: '确认删除',
    content: '确定删除该 Skill 吗？',
    okText: '删除',
    okType: 'danger',
    async onOk() {
      try {
        await deleteSkillApi(id);
        message.success('删除成功');
        await loadData();
      } catch {
        message.error('删除失败');
      }
    },
  });
}

// 导入
async function handleImport(info: any) {
  const file = info.file;
  if (!file) return;
  importLoading.value = true;
  try {
    await importSkillApi(file);
    message.success('导入成功');
    await loadData();
  } catch (e: any) {
    message.error('导入失败: ' + (e.message || '未知错误'));
  } finally {
    importLoading.value = false;
  }
}

// 导出
async function handleExport(skill: Skill) {
  try {
    const blob = await exportSkillApi(skill.id, {
      baseURL: apiURL,
      token: accessStore.accessToken || '',
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (skill.slug || skill.name) + '.zip';
    a.click();
    window.URL.revokeObjectURL(url);
    message.success('导出成功');
  } catch {
    message.error('导出失败');
  }
}

// 状态变更
async function handleStatusChange(id: number, checked: boolean) {
  try {
    const status = checked ? 1 : 0;
    await updateSkillStatusApi(id, status);
    message.success('状态更新成功');
    await loadData();
  } catch {
    message.error('状态更新失败');
  }
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
  <div class="skill-page">
    <!-- 搜索栏 -->
    <Card class="search-bar" size="small">
      <Row :gutter="16" align="middle">
        <Col :span="5">
          <Input
            v-model:value="searchParams.name"
            placeholder="搜索 Skill 名称"
            allow-clear
            @press-enter="handleSearch"
            @change="handleSearch"
          />
        </Col>
        <Col :span="4">
          <Select
            v-model:value="searchParams.category"
            placeholder="选择分类"
            allow-clear
            :options="categoryOptions"
            style="width: 100%"
            @change="handleSearch"
          />
        </Col>
        <Col :span="4">
          <Select
            v-model:value="searchParams.type"
            placeholder="来源"
            allow-clear
            style="width: 100%"
            :options="[
              { label: '系统内置', value: 1 },
              { label: '用户自建', value: 0 },
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
        <Col :span="8" style="text-align: right">
          <Space>
            <Button @click="handleReset">重置</Button>
            <Upload
              :showUploadList="false"
              :beforeUpload="() => false"
              accept=".zip"
              @change="handleImport"
            >
              <Button :loading="importLoading">导入 Skill</Button>
            </Upload>
            <Button type="primary" @click="handleAdd">新增 Skill</Button>
          </Space>
        </Col>
      </Row>
    </Card>

    <!-- Skill 卡片列表 -->
    <div class="skill-card-list">
      <Spin :spinning="loading">
        <div v-if="skillList.length > 0">
          <Row :gutter="[16, 16]">
            <Col
              v-for="skill in skillList"
              :key="skill.id"
              :xs="24"
              :sm="12"
              :md="8"
              :lg="8"
              :xl="6"
            >
              <SkillCard
                :skill="skill"
                @view="handleView"
                @edit="handleEdit"
                @delete="handleDelete"
                @export="handleExport"
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
              :show-total="(t: number) => `共 ${t} 个 Skill`"
              @change="handlePageChange"
            />
          </div>
        </div>

        <!-- 空状态 -->
        <div v-else-if="!loading" class="flex items-center justify-center" style="min-height: 400px">
          <Empty description="暂无 Skill，点击上方「新增 Skill」添加">
            <Button type="primary" @click="handleAdd">新增 Skill</Button>
          </Empty>
        </div>
      </Spin>
    </div>

    <!-- 新增/编辑弹框 -->
    <SkillFormModal ref="formModalRef" @success="handleFormSuccess" />
  </div>
</template>

<style scoped>
.skill-page {
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

.skill-card-list {
  flex: 1;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
}
</style>
