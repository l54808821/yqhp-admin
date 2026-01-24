<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Empty, Spin } from 'ant-design-vue';

import { IdeLayout } from '#/components/IdeLayout';
import type { TabItem } from '#/components/IdeLayout';
import { useCategoryStore } from '#/store/category';
import { useProjectStore } from '#/store/project';

import CategoryTree from './components/CategoryTree.vue';
import WorkflowEditor from './components/WorkflowEditor.vue';

const route = useRoute();
const router = useRouter();
const categoryStore = useCategoryStore();
const projectStore = useProjectStore();

const loading = ref(false);
const ideLayoutRef = ref<InstanceType<typeof IdeLayout> | null>(null);
const categoryTreeRef = ref<InstanceType<typeof CategoryTree> | null>(null);
const editorRefs = ref<Map<string | number, InstanceType<typeof WorkflowEditor>>>(new Map());

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

// 定位到当前激活的 tab 对应的节点
function syncTreeSelection() {
  if (!ideLayoutRef.value || !categoryTreeRef.value) {
    return;
  }
  if (categoryStore.categories.length === 0) {
    return;
  }
  
  const activeTab = (ideLayoutRef.value as any).activeTab;
  const tabData = activeTab?.value || activeTab;
  
  if (tabData?.data?.workflowId) {
    categoryTreeRef.value.selectByWorkflowId(tabData.data.workflowId);
  }
}

// 监听 projectId 变化，加载分类树
watch(
  () => getProjectId(),
  async (newProjectId) => {
    if (newProjectId > 0) {
      loading.value = true;
      try {
        await categoryStore.loadCategories(newProjectId);
        // 分类加载完成后，定位到当前激活的 tab
        await syncTreeSelection();
      } finally {
        loading.value = false;
      }
    }
  },
  { immediate: true },
);

// 监听分类数据加载完成后进行同步
watch(
  () => categoryStore.categories.length,
  (len) => {
    if (len > 0) {
      // 延迟执行确保所有组件已挂载
      nextTick(() => {
        setTimeout(syncTreeSelection, 50);
      });
    }
  },
);

// 监听 categoryTreeRef 挂载
watch(
  () => categoryTreeRef.value,
  (val) => {
    if (val && categoryStore.categories.length > 0) {
      nextTick(() => {
        setTimeout(syncTreeSelection, 50);
      });
    }
  },
);

onMounted(async () => {
  if (!projectStore.currentProject) {
    await projectStore.loadProjects();
  }
  if (!getProjectId()) {
    router.push('/main');
  }
  // 挂载后延迟尝试同步
  setTimeout(syncTreeSelection, 300);
});

// 选择工作流时打开 tab
function handleSelectWorkflow(workflow: { id: number; name: string }) {
  ideLayoutRef.value?.openTab({
    id: `workflow-${workflow.id}`,
    title: workflow.name,
    data: { type: 'workflow', workflowId: workflow.id },
  });
}

function handleTabChange(tab: TabItem | undefined) {
  // tab 切换时，自动定位到左侧树对应的节点
  if (tab?.data?.workflowId) {
    categoryTreeRef.value?.selectByWorkflowId(tab.data.workflowId);
  }
}

// 处理编辑器修改状态变化
function handleEditorModified(tabId: string | number, modified: boolean) {
  ideLayoutRef.value?.setModified(tabId, modified);
}

// 处理标题变化
function handleTitleChange(tabId: string | number, title: string) {
  // 更新 tab 标题
  (ideLayoutRef.value as any)?.updateTabTitle(tabId, title);
}

// 处理工作流重命名（从左侧树触发）
function handleWorkflowRenamed(payload: { id: number; name: string }) {
  const tabId = `workflow-${payload.id}`;
  // 更新 tab 标题
  (ideLayoutRef.value as any)?.updateTabTitle(tabId, payload.name);
  // 更新编辑器中的 workflow 名称
  const editor = editorRefs.value.get(tabId);
  if (editor) {
    (editor as any).updateWorkflowName?.(payload.name);
  }
}

// 注册编辑器引用
function registerEditorRef(tabId: string | number, ref: any) {
  if (ref) {
    editorRefs.value.set(tabId, ref);
  } else {
    editorRefs.value.delete(tabId);
  }
}

// 新建工作流
function handleAddWorkflow() {
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
            ref="categoryTreeRef"
            :project-id="getProjectId()"
            @select-workflow="handleSelectWorkflow"
            @workflow-renamed="handleWorkflowRenamed"
          />
        </template>
        <template #editor="{ activeTab: tab, tabs }">
          <div class="workflow-content">
            <template v-if="tab?.data?.workflowId">
              <WorkflowEditor
                v-for="t in tabs.filter(t => t.data?.workflowId)"
                v-show="t.id === tab.id"
                :key="t.id"
                :ref="(el) => registerEditorRef(t.id, el)"
                :workflow-id="t.data!.workflowId"
                @modified="(m) => handleEditorModified(t.id, m)"
                @title-change="(title) => handleTitleChange(t.id, title)"
              />
            </template>
            <Empty v-else description="请从左侧选择一个工作流" />
          </div>
        </template>
      </IdeLayout>
    </Spin>
  </div>
</template>

<style scoped>
.workflow-page {
  height: calc(100vh - 50px);
  background: hsl(var(--background));
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
  overflow: hidden;
  display: flex;
  height: 100%;
  width: 100%;
}

.workflow-content > * {
  flex: 1;
  width: 100%;
}
</style>
