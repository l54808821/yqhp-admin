<script setup lang="ts">
import type { Skill, SkillResource } from '#/api/skill';

import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useAppConfig } from '@vben/hooks';
import { useAccessStore } from '@vben/stores';

import {
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  message,
  Row,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from 'ant-design-vue';

import {
  exportSkillApi,
  getSkillApi,
  getSkillResourcesApi,
} from '#/api/skill';

import SkillFormModal from './components/SkillFormModal.vue';

const route = useRoute();
const router = useRouter();
const accessStore = useAccessStore();
const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);

const skillId = Number(route.params.skillId);
const skill = ref<Skill | null>(null);
const resources = ref<SkillResource[]>([]);
const loading = ref(false);
const resourceLoading = ref(false);
const formModalRef = ref<InstanceType<typeof SkillFormModal>>();

function getCategoryColor(category: string): string {
  const colorMap: Record<string, string> = {
    '编程': 'blue',
    '测试': 'green',
    '写作': 'purple',
    '翻译': 'cyan',
    '分析': 'orange',
  };
  return colorMap[category] || 'default';
}

function getTypeLabel(type: number): string {
  switch (type) {
    case 0: return '用户自建';
    case 1: return '系统内置';
    case 2: return '导入';
    default: return '未知';
  }
}

function getTypeColor(type: number): string {
  switch (type) {
    case 0: return 'blue';
    case 1: return 'gold';
    case 2: return 'green';
    default: return 'default';
  }
}

const resourceColumns = [
  { title: '类别', dataIndex: 'category', key: 'category', width: 100 },
  { title: '文件名', dataIndex: 'filename', key: 'filename' },
  { title: '类型', dataIndex: 'content_type', key: 'content_type', width: 150 },
  { title: '大小', dataIndex: 'size', key: 'size', width: 100 },
];

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

async function loadSkill() {
  loading.value = true;
  try {
    skill.value = await getSkillApi(skillId);
  } catch {
    message.error('加载 Skill 详情失败');
  } finally {
    loading.value = false;
  }
}

async function loadResources() {
  resourceLoading.value = true;
  try {
    resources.value = await getSkillResourcesApi(skillId) || [];
  } catch {
    resources.value = [];
  } finally {
    resourceLoading.value = false;
  }
}

function handleBack() {
  router.back();
}

function handleEdit() {
  if (skill.value) {
    formModalRef.value?.open(skill.value);
  }
}

function handleEditSuccess() {
  loadSkill();
  loadResources();
}

async function handleExport() {
  if (!skill.value) return;
  try {
    const blob = await exportSkillApi(skill.value.id, {
      baseURL: apiURL,
      token: accessStore.accessToken || '',
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (skill.value.slug || skill.value.name) + '.zip';
    a.click();
    window.URL.revokeObjectURL(url);
    message.success('导出成功');
  } catch {
    message.error('导出失败');
  }
}

onMounted(() => {
  loadSkill();
  loadResources();
});
</script>

<template>
  <div class="skill-detail-page">
    <Spin :spinning="loading">
      <template v-if="skill">
        <!-- 顶部操作栏 -->
        <div class="detail-header">
          <div class="detail-header__left">
            <Button @click="handleBack">← 返回</Button>
            <div class="detail-header__title">
              <Typography.Title :level="4" style="margin: 0">
                {{ skill.name }}
              </Typography.Title>
              <Space>
                <Tag :color="getTypeColor(skill.type)">{{ getTypeLabel(skill.type) }}</Tag>
                <Tag v-if="skill.category" :color="getCategoryColor(skill.category)">{{ skill.category }}</Tag>
                <Tag v-if="skill.slug" color="processing">{{ skill.slug }}</Tag>
                <Tag :color="skill.status === 1 ? 'green' : 'default'">
                  {{ skill.status === 1 ? '启用' : '禁用' }}
                </Tag>
              </Space>
            </div>
          </div>
          <Space>
            <Button  @click="handleEdit">编辑</Button>
            <Button @click="handleExport">导出</Button>
          </Space>
        </div>

        <Row :gutter="16">
          <!-- 左列：基本信息 + 系统提示词 -->
          <Col :span="16">
            <!-- 系统提示词 -->
            <Card title="系统提示词" size="small" class="detail-card">
              <pre class="prompt-content">{{ skill.system_prompt }}</pre>
            </Card>

            <!-- 描述 -->
            <Card v-if="skill.description" title="描述" size="small" class="detail-card">
              <Typography.Paragraph>{{ skill.description }}</Typography.Paragraph>
            </Card>

            <!-- 资源文件 -->
            <Card title="资源文件" size="small" class="detail-card">
              <Spin :spinning="resourceLoading">
                <Table
                  v-if="resources.length > 0"
                  :columns="resourceColumns"
                  :data-source="resources"
                  :pagination="false"
                  row-key="id"
                  size="small"
                >
                  <template #bodyCell="{ column, record }">
                    <template v-if="column.key === 'category'">
                      <Tag>{{ record.category }}</Tag>
                    </template>
                    <template v-if="column.key === 'size'">
                      {{ formatSize(record.size || 0) }}
                    </template>
                  </template>
                </Table>
                <Empty v-else description="暂无资源文件" :image="Empty.PRESENTED_IMAGE_SIMPLE" />
              </Spin>
            </Card>
          </Col>

          <!-- 右列：元信息 -->
          <Col :span="8">
            <Card title="基本信息" size="small" class="detail-card">
              <Descriptions :column="1" size="small" :labelStyle="{ width: '90px' }">
                <Descriptions.Item label="Slug">
                  {{ skill.slug || '-' }}
                </Descriptions.Item>
                <Descriptions.Item label="版本">
                  {{ skill.version || '1.0.0' }}
                </Descriptions.Item>
                <Descriptions.Item label="分类">
                  <Tag v-if="skill.category" :color="getCategoryColor(skill.category)">{{ skill.category }}</Tag>
                  <span v-else>-</span>
                </Descriptions.Item>
                <Descriptions.Item label="标签">
                  <div v-if="skill.tags?.length" class="tag-list">
                    <Tag v-for="tag in skill.tags" :key="tag" size="small">{{ tag }}</Tag>
                  </div>
                  <span v-else>-</span>
                </Descriptions.Item>
                <Descriptions.Item label="创建时间">
                  {{ skill.created_at ? new Date(skill.created_at).toLocaleString() : '-' }}
                </Descriptions.Item>
                <Descriptions.Item label="更新时间">
                  {{ skill.updated_at ? new Date(skill.updated_at).toLocaleString() : '-' }}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <!-- 推荐工具 -->
            <Card v-if="skill.recommended_tools?.length" title="推荐工具" size="small" class="detail-card">
              <div class="tag-list">
                <Tag v-for="tool in skill.recommended_tools" :key="tool" color="blue">{{ tool }}</Tag>
              </div>
            </Card>

            <!-- Agent Skills 规范 -->
            <Card title="Agent Skills" size="small" class="detail-card">
              <Descriptions :column="1" size="small" :labelStyle="{ width: '100px' }">
                <Descriptions.Item label="License">
                  {{ skill.license || '-' }}
                </Descriptions.Item>
                <Descriptions.Item label="Compatibility">
                  {{ skill.compatibility || '-' }}
                </Descriptions.Item>
                <Descriptions.Item label="Allowed Tools">
                  {{ skill.allowed_tools || '-' }}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
        </Row>
      </template>

      <div v-else-if="!loading" class="flex items-center justify-center" style="min-height: 400px">
        <Empty description="Skill 不存在">
          <Button @click="handleBack">返回列表</Button>
        </Empty>
      </div>
    </Spin>

    <!-- 编辑抽屉 -->
    <SkillFormModal ref="formModalRef" @success="handleEditSuccess" />
  </div>
</template>

<style scoped>
.skill-detail-page {
  padding: 16px;
  height: calc(100vh - 50px);
  overflow-y: auto;
}

.detail-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
}

.detail-header__left {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.detail-header__title {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-card {
  margin-bottom: 16px;
}

.prompt-content {
  margin: 0;
  padding: 12px 16px;
  background: var(--ant-color-bg-layout, #f5f5f5);
  border-radius: 8px;
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 500px;
  overflow-y: auto;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.tag-list :deep(.ant-tag) {
  margin: 0;
}
</style>
