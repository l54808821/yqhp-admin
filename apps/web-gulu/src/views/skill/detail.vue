<script setup lang="ts">
import type { Skill, SkillResource } from '#/api/skill';

import { computed, onMounted, ref } from 'vue';
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
  Tag,
  Typography,
} from 'ant-design-vue';

import {
  exportSkillApi,
  getSkillApi,
  getSkillResourceContentApi,
  getSkillResourcesApi,
} from '#/api/skill';

import SkillFormModal from './components/SkillFormModal.vue';
import SkillEditor from './components/SkillEditor.vue';

const route = useRoute();
const router = useRouter();
const accessStore = useAccessStore();
const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);

const skillId = Number(route.params.skillId);
const skill = ref<Skill | null>(null);
const loading = ref(false);
const formModalRef = ref<InstanceType<typeof SkillFormModal>>();

function getCategoryColor(category: string): string {
  const colorMap: Record<string, string> = {
    '编程': 'blue', '测试': 'green', '写作': 'purple', '翻译': 'cyan', '分析': 'orange',
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
});
</script>

<template>
  <div class="skill-detail-page">
    <Spin :spinning="loading">
      <template v-if="skill">
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
                <Tag v-if="skill.author">{{ skill.author }}</Tag>
              </Space>
            </div>
          </div>
          <Space>
            <Button @click="handleEdit">编辑元数据</Button>
            <Button @click="handleExport">导出</Button>
          </Space>
        </div>

        <SkillEditor :skill-id="skillId" />
      </template>

      <div v-else-if="!loading" class="flex items-center justify-center" style="min-height: 400px">
        <Empty description="Skill 不存在">
          <Button @click="handleBack">返回列表</Button>
        </Empty>
      </div>
    </Spin>

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
</style>
