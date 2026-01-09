<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Empty, Spin } from 'ant-design-vue';

import { IdeLayout } from '#/components/IdeLayout';
import type { TabItem } from '#/components/IdeLayout';
import { useCategoryStore } from '#/store/category';
import { useProjectStore } from '#/store/project';

import CategoryTree from './components/CategoryTree.vue';
import WorkflowDetail from './components/WorkflowDetail.vue';

const route = useRoute();
const router = useRouter();
const categoryStore = useCategoryStore();
const projectStore = useProjectStore();

const loading = ref(false);
const ideLayoutRef = ref<InstanceType<typeof IdeLayout> | null>(null);
const activeTab = ref<TabItem | undefined>();

// 从路由或 store 获取 projectId
function getProjectId(): number {
  const routeProjectId = Number(route.params.projectId);
  if (routeProjectId > 0) return routeProjectId;
  return projectStore.currentProjectId;
}

// 监听路由变化
watch(
  () => route.params.projectId,
  async (routeProjectId) => {
    if (routeProjectId) {
      const pid = Number(routeProjectId);
      if (pid > 0 && pid !== projectStore.currentProjectId) {
        if (projectStore.projects.length === 0) {
          await projectStore.loadProjects();
        }
        const project = projectStore.projects.find((p) => p.id === pid);
        if (project) {
          await projectStore.setCurrentProject(project);
        }
      }
    }
  },
  { immediate: true },
);

// 监听 projectId 变化，加载分类树
watch(
  () => getProjectId(),
  async (newProjectId) => {
    if (newProjectId > 0) {
      loading.value = true;
      try {
        await categoryStore.loadCategories(newProjectId);
      } finally {
        loading.value = false;
      }
    }
  },
  { immediate: true },
);

onMounted(async () => {
  if (!projectStore.currentProject) {
    await projectStore.loadProjects();
  }
  if (!getProjectId()) {
    router.push('/main');
  }
});

// 选择工作流时打开 tab
function handleSelectWorkflow(workflow: { id: number; name: string }) {
  ideLayoutRef.value?.openTab({
    id: workflow.id,
    title: workflow.name,
    data: { type: 'workflow', workflowId: workflow.id },
  });
}

function handleTabChange(tab: TabItem | undefined) {
  activeTab.value = tab;
}

function handleEditWorkflow(workflowId: number) {
  router.push(`/project/${getProjectId()}/workflow/${workflowId}/edit`);
}

function handleExecuteWorkflow(workflowId: number) {
  router.push(`/project/${getProjectId()}/workflow/${workflowId}/execute`);
}

// 新建工作流
function handleAddWorkflow() {
  // TODO: 打开新建工作流弹窗或跳转到新建页面
  router.push(`/project/${getProjectId()}/workflow/new`);
}
</script>

<template>
  <div class="workflow-page">
    <Spin :spinning="loading" class="workflow-spin">
      <IdeLayout
        ref="ideLayoutRef"
        storage-key="workflow-ide"
        @tab-change="handleTabChange"
        @add="handleAddWorkflow"
      >
        <template #sidebar>
          <CategoryTree
            :project-id="getProjectId()"
            @select-workflow="handleSelectWorkflow"
          />
        </template>
        <template #editor="{ activeTab: tab }">
          <div class="workflow-content">
            <WorkflowDetail
              v-if="tab?.data?.workflowId"
              :workflow-id="tab.data.workflowId"
              @edit="handleEditWorkflow"
              @execute="handleExecuteWorkflow"
            />
            <Empty v-else description="请从左侧选择一个工作流" />
          </div>
        </template>
      </IdeLayout>
    </Spin>
  </div>
</template>

<style scoped>
.workflow-page {
  height: calc(100vh - 48px);
  background: #fff;
}

.workflow-spin {
  height: 100%;
}

/* 修复 Spin 内部容器高度 */
:deep(.ant-spin-container) {
  height: 100%;
}

:deep(.ant-spin-nested-loading) {
  height: 100%;
}

.workflow-content {
  flex: 1;
  padding: 16px;
  overflow: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}
</style>
