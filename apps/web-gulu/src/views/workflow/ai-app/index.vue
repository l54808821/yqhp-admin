<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Spin, message } from 'ant-design-vue';
import { createIconifyIcon } from '@vben/icons';

import { getWorkflowApi } from '#/api/workflow';
import type { Workflow } from '#/api/workflow';
import { useProjectStore } from '#/store/project';
import { AIChatPanel } from '../components/ai-workflow-chat';

const ArrowLeft = createIconifyIcon('lucide:arrow-left');
const Settings = createIconifyIcon('lucide:settings');

const route = useRoute();
const router = useRouter();
const projectStore = useProjectStore();

const loading = ref(true);
const workflow = ref<Workflow | null>(null);

const workflowId = computed(() => Number(route.params.workflowId));

onMounted(async () => {
  try {
    loading.value = true;
    workflow.value = await getWorkflowApi(workflowId.value);
  } catch {
    message.error('加载工作流失败');
  } finally {
    loading.value = false;
  }
});

function goBack() {
  router.back();
}
</script>

<template>
  <div class="ai-app-page">
    <!-- 顶栏 -->
    <header class="app-header">
      <div class="header-left">
        <button class="back-btn" @click="goBack">
          <ArrowLeft class="size-4" />
        </button>
        <div class="app-info">
          <h1 class="app-name">{{ workflow?.name || 'AI 应用' }}</h1>
          <span v-if="workflow?.description" class="app-desc">
            {{ workflow.description }}
          </span>
        </div>
      </div>
      <div class="header-right">
        <button
          class="settings-btn"
          @click="router.push({ name: 'WorkflowIndex' })"
        >
          <Settings class="size-4" />
          编辑工作流
        </button>
      </div>
    </header>

    <!-- 主体 -->
    <div class="app-body">
      <Spin v-if="loading" class="app-loading" />
      <AIChatPanel
        v-else-if="workflow"
        :workflow="workflow"
        :env-id="projectStore.currentEnvId"
      />
      <div v-else class="app-error">
        加载失败，请返回重试
      </div>
    </div>
  </div>
</template>

<style scoped>
.ai-app-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f7fa;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 20px;
  background: #fff;
  border-bottom: 1px solid #eee;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  color: #666;
  transition: all 0.2s;
}

.back-btn:hover {
  border-color: #1677ff;
  color: #1677ff;
  background: #f0f5ff;
}

.app-info {
  display: flex;
  flex-direction: column;
}

.app-name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 0;
  line-height: 1.3;
}

.app-desc {
  font-size: 12px;
  color: #999;
  line-height: 1.3;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.settings-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  font-size: 13px;
  color: #666;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.settings-btn:hover {
  color: #1677ff;
  border-color: #1677ff;
  background: #f0f5ff;
}

.app-body {
  flex: 1;
  overflow: hidden;
}

.app-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.app-error {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: 14px;
  color: #999;
}
</style>
