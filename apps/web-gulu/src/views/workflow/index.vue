<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Empty, Spin } from 'ant-design-vue';

import SplitPane from '#/components/SplitPane.vue';
import { useCategoryStore } from '#/store/category';
import { useProjectStore } from '#/store/project';

import CategoryTree from './components/CategoryTree.vue';
import WorkflowDetail from './components/WorkflowDetail.vue';

const route = useRoute();
const router = useRouter();
const categoryStore = useCategoryStore();
const projectStore = useProjectStore();

const loading = ref(false);
const selectedWorkflowId = ref<number | null>(null);

// 优先从路由参数获取projectId，否则从store获取当前项目
const projectId = computed(() => {
  const routeProjectId = Number(route.params.projectId);
  if (routeProjectId > 0) {
    return routeProjectId;
  }
  return projectStore.currentProjectId;
});

// 监听路由变化，如果URL中有projectId，自动设置为当前项目
watch(
  () => route.params.projectId,
  async (routeProjectId) => {
    if (routeProjectId) {
      const pid = Number(routeProjectId);
      // 如果URL中的项目ID与当前项目不同，切换项目
      if (pid > 0 && pid !== projectStore.currentProjectId) {
        // 确保项目列表已加载
        if (projectStore.projects.length === 0) {
          await projectStore.loadProjects();
        }
        // 查找并设置项目
        const project = projectStore.projects.find((p) => p.id === pid);
        if (project) {
          await projectStore.setCurrentProject(project);
        }
      }
    }
  },
  { immediate: true },
);

// 监听projectId变化，加载分类树
watch(
  () => projectId.value,
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
  // 如果没有当前项目，先加载项目列表
  if (!projectStore.currentProject) {
    await projectStore.loadProjects();
  }
  // 如果还是没有项目，跳转到首页
  if (!projectId.value) {
    router.push('/main');
  }
});

function handleSelectWorkflow(workflowId: number) {
  selectedWorkflowId.value = workflowId;
}

function handleEditWorkflow(workflowId: number) {
  router.push(`/project/${projectId.value}/workflow/${workflowId}/edit`);
}

function handleExecuteWorkflow(workflowId: number) {
  router.push(`/project/${projectId.value}/workflow/${workflowId}/execute`);
}
</script>

<template>
  <div class="workflow-page">
    <Spin :spinning="loading" class="workflow-spin">
      <SplitPane
        :default-width="280"
        :min-width="200"
        :max-width="800"
        storage-key="workflow-sidebar"
      >
        <template #left>
          <CategoryTree
            :project-id="projectId"
            @select-workflow="handleSelectWorkflow"
          />
        </template>
        <template #right>
          <div class="workflow-content">
            <WorkflowDetail
              v-if="selectedWorkflowId"
              :workflow-id="selectedWorkflowId"
              @edit="handleEditWorkflow"
              @execute="handleExecuteWorkflow"
            />
            <Empty v-else description="请从左侧选择一个工作流" />
          </div>
        </template>
      </SplitPane>
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
