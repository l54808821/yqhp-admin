<script setup lang="ts">
import { Button, Empty, Input, Modal, Form, message, Spin, Table } from 'ant-design-vue';
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';

import type { Project } from '#/api/project';

import { getTeamProjectsApi, createTeamProjectApi } from '#/api/team';
import { useTeamStore } from '#/store/team';

const router = useRouter();
const teamStore = useTeamStore();

const currentTeam = computed(() => teamStore.currentTeam);
const projects = ref<Project[]>([]);
const loading = ref(false);
const viewMode = ref<'grid' | 'list'>('grid');

const createModalVisible = ref(false);
const createForm = ref({ name: '', description: '' });
const creating = ref(false);

const ICON_GRADIENTS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)',
  'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
];

function getProjectGradient(name: string) {
  let hash = 0;
  for (const char of name) {
    hash = char.codePointAt(0)! + ((hash << 5) - hash);
  }
  return ICON_GRADIENTS[Math.abs(hash) % ICON_GRADIENTS.length]!;
}

function getProjectInitial(name: string) {
  return name.charAt(0).toUpperCase();
}

const listColumns = [
  { title: '项目名称', dataIndex: 'name', key: 'name' },
  { title: '描述', dataIndex: 'description', key: 'description' },
  { title: '创建时间', dataIndex: 'created_at', key: 'created_at', width: 180 },
  { title: '操作', key: 'action', width: 100 },
];

watch(
  () => currentTeam.value?.id,
  async (teamId) => {
    if (teamId) {
      await loadProjects(teamId);
    } else {
      projects.value = [];
    }
  },
  { immediate: true },
);

async function loadProjects(teamId: number) {
  try {
    loading.value = true;
    projects.value = await getTeamProjectsApi(teamId);
  } catch {
    projects.value = [];
  } finally {
    loading.value = false;
  }
}

function goToProject(project: Project) {
  router.push(`/project/${project.id}/workflow`);
}

function showCreateModal() {
  createForm.value = { name: '', description: '' };
  createModalVisible.value = true;
}

async function handleCreate() {
  if (!createForm.value.name.trim()) {
    message.error('请输入项目名称');
    return;
  }
  if (!currentTeam.value) {
    message.error('请先选择团队');
    return;
  }
  try {
    creating.value = true;
    const project = await createTeamProjectApi(currentTeam.value.id, createForm.value);
    createModalVisible.value = false;
    projects.value.push(project);
    message.success('创建成功');
  } catch (error: any) {
    message.error(error.message || '创建失败');
  } finally {
    creating.value = false;
  }
}
</script>

<template>
  <div class="pt">
    <!-- Toolbar -->
    <div class="pt-toolbar">
      <div class="pt-toolbar__left">
        <div class="pt-view-switch">
          <div
            :class="['pt-view-switch__btn', { 'pt-view-switch__btn--active': viewMode === 'grid' }]"
            title="卡片视图"
            @click="viewMode = 'grid'"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <rect x="1" y="1" width="6" height="6" rx="1" />
              <rect x="9" y="1" width="6" height="6" rx="1" />
              <rect x="1" y="9" width="6" height="6" rx="1" />
              <rect x="9" y="9" width="6" height="6" rx="1" />
            </svg>
          </div>
          <div
            :class="['pt-view-switch__btn', { 'pt-view-switch__btn--active': viewMode === 'list' }]"
            title="列表视图"
            @click="viewMode = 'list'"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <rect x="1" y="2" width="14" height="2.5" rx="0.5" />
              <rect x="1" y="6.75" width="14" height="2.5" rx="0.5" />
              <rect x="1" y="11.5" width="14" height="2.5" rx="0.5" />
            </svg>
          </div>
        </div>
        <span class="pt-toolbar__count">{{ projects.length }} 个</span>
      </div>
      <div class="pt-toolbar__right">
        <Button @click="showCreateModal" class="pt-btn-import">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M7 1v8M3.5 5.5L7 9l3.5-3.5M2 12h10" />
          </svg>
          导入项目
        </Button>
        <Button type="primary" @click="showCreateModal" class="pt-btn-create">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <line x1="7" y1="3" x2="7" y2="11" />
            <line x1="3" y1="7" x2="11" y2="7" />
          </svg>
          新建项目
        </Button>
      </div>
    </div>

    <!-- Content -->
    <Spin :spinning="loading">
      <template v-if="projects.length > 0">
        <!-- 卡片视图 -->
        <div v-if="viewMode === 'grid'" class="pt-grid">
          <div
            v-for="project in projects"
            :key="project.id"
            class="pt-card"
            @click="goToProject(project)"
          >
            <div
              class="pt-card__icon"
              :style="{ background: getProjectGradient(project.name) }"
            >
              <span class="pt-card__initial">{{ getProjectInitial(project.name) }}</span>
            </div>
            <div class="pt-card__name">{{ project.name }}</div>
            <div class="pt-card__type">HTTP</div>
          </div>
        </div>

        <!-- 列表视图 -->
        <Table
          v-else
          :columns="listColumns"
          :data-source="projects"
          :pagination="false"
          row-key="id"
          class="pt-table"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'name'">
              <div class="pt-table__name-cell">
                <div
                  class="pt-table__icon"
                  :style="{ background: getProjectGradient(record.name) }"
                >
                  {{ getProjectInitial(record.name) }}
                </div>
                <span>{{ record.name }}</span>
              </div>
            </template>
            <template v-else-if="column.key === 'description'">
              <span class="pt-table__desc">{{ record.description || '暂无描述' }}</span>
            </template>
            <template v-else-if="column.key === 'action'">
              <Button type="link" size="small" @click="goToProject(record as Project)">进入</Button>
            </template>
          </template>
        </Table>
      </template>
      <Empty v-else description="暂无项目，点击上方按钮创建" class="pt-empty" />
    </Spin>

    <!-- 创建弹框 -->
    <Modal
      v-model:open="createModalVisible"
      title="新建项目"
      :confirm-loading="creating"
      @ok="handleCreate"
    >
      <Form layout="vertical">
        <Form.Item label="项目名称" required>
          <Input v-model:value="createForm.name" placeholder="请输入项目名称" />
        </Form.Item>
        <Form.Item label="项目描述">
          <Input.TextArea v-model:value="createForm.description" placeholder="请输入项目描述" :rows="3" />
        </Form.Item>
      </Form>
    </Modal>
  </div>
</template>

<style scoped>
.pt {
  padding: 20px 24px;
}

.pt-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.pt-toolbar__left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pt-toolbar__right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pt-toolbar__count {
  font-size: 13px;
  color: var(--text-tertiary, #999);
}

.pt-view-switch {
  display: inline-flex;
  border: 1px solid var(--border-color, #e5e5e5);
  border-radius: 6px;
  overflow: hidden;
}

.pt-view-switch__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 28px;
  cursor: pointer;
  color: var(--text-tertiary, #999);
  transition: all 0.15s;
}

.pt-view-switch__btn + .pt-view-switch__btn {
  border-left: 1px solid var(--border-color, #e5e5e5);
}

.pt-view-switch__btn--active {
  background: var(--primary-color, #7c5cfc);
  color: #fff;
}

.pt-view-switch__btn:not(.pt-view-switch__btn--active):hover {
  background: var(--hover-bg, #f5f5f5);
  color: var(--text-primary, #333);
}

.pt-btn-import {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.pt-btn-create {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border-radius: 6px;
}

/* 卡片网格 */
.pt-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.pt-card {
  border: 1px solid var(--border-color, #f0f0f0);
  border-radius: 10px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: var(--card-bg, #fff);
}

.pt-card:hover {
  border-color: var(--primary-color, #7c5cfc);
  box-shadow: 0 4px 16px rgba(124, 92, 252, 0.1);
  transform: translateY(-1px);
}

.pt-card__icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 14px;
}

.pt-card__initial {
  font-size: 20px;
  font-weight: 700;
  color: #fff;
}

.pt-card__name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #1a1a1a);
  margin-bottom: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pt-card__type {
  font-size: 12px;
  color: var(--text-tertiary, #999);
}

/* 列表视图 */
.pt-table__name-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pt-table__icon {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}

.pt-table__desc {
  color: var(--text-tertiary, #999);
  font-size: 13px;
}

.pt-empty {
  padding: 60px 0;
}
</style>
