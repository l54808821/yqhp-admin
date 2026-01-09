<script setup lang="ts">
import { Plus } from '@vben/icons';
import { LayoutGrid } from '#/components/icons';
import { Button, Card, Empty, Input, Modal, Form, message, Spin } from 'ant-design-vue';
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

// 创建项目弹框
const createModalVisible = ref(false);
const createForm = ref({
  name: '',
  description: '',
});
const creating = ref(false);

watch(
  () => currentTeam.value?.id,
  async (teamId) => {
    if (teamId) {
      await loadProjects(teamId);
    } else {
      projects.value = [];
    }
  },
  { immediate: true }
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
  <div class="projects-tab">
    <div class="projects-header">
      <Button type="primary" @click="showCreateModal">
        <Plus class="size-4" />
        新建项目
      </Button>
    </div>
    <Spin :spinning="loading">
      <div v-if="projects.length > 0" class="projects-grid">
        <Card
          v-for="project in projects"
          :key="project.id"
          hoverable
          class="project-card"
          @click="goToProject(project)"
        >
          <template #cover>
            <div class="project-icon">
              <LayoutGrid class="size-8" />
            </div>
          </template>
          <Card.Meta :title="project.name" :description="project.description || '暂无描述'" />
        </Card>
      </div>
      <Empty v-else description="暂无项目" />
    </Spin>

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
.projects-tab {
  padding: 16px;
}

.projects-header {
  margin-bottom: 16px;
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.project-card {
  cursor: pointer;
}

.project-icon {
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-size: 32px;
  color: white;
}
</style>
