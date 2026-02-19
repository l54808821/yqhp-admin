<script setup lang="ts">
/**
 * 知识库详情页 — Dify 风格三 Tab 布局
 */
import type { KnowledgeBase } from '#/api/knowledge-base';

import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Button, message, Spin, Tabs, Tag } from 'ant-design-vue';
import { ArrowLeft, Database, FileText, GitFork, Search, Settings } from 'lucide-vue-next';

import { getKnowledgeBaseApi } from '#/api/knowledge-base';

import DocumentTab from './components/DocumentTab.vue';
import RecallTestTab from './components/RecallTestTab.vue';
import SettingsTab from './components/SettingsTab.vue';

const route = useRoute();
const router = useRouter();

const kbId = Number(route.params.kbId);
const kb = ref<KnowledgeBase | null>(null);
const loading = ref(false);
const activeTab = ref('documents');

async function loadKB() {
  loading.value = true;
  try {
    kb.value = await getKnowledgeBaseApi(kbId);
  } catch {
    message.error('加载知识库详情失败');
  } finally {
    loading.value = false;
  }
}

function handleBack() {
  router.back();
}

function handleKBUpdated() {
  loadKB();
}

onMounted(() => {
  loadKB();
});
</script>

<template>
  <div class="kb-detail-page">
    <Spin :spinning="loading">
      <template v-if="kb">
        <!-- 顶部导航 -->
        <div class="kb-detail-header">
          <div class="kb-detail-header__left">
            <Button type="text" class="back-btn" @click="handleBack">
              <ArrowLeft :size="18" />
            </Button>
            <div class="kb-detail-icon" :class="kb.type === 'graph' ? 'icon-graph' : 'icon-normal'">
              <component :is="kb.type === 'graph' ? GitFork : Database" :size="22" />
            </div>
            <div class="kb-detail-title-area">
              <div class="kb-detail-name">{{ kb.name }}</div>
              <div class="kb-detail-meta">
                <Tag :color="kb.type === 'graph' ? 'purple' : 'blue'" size="small">
                  {{ kb.type === 'graph' ? '图知识库' : '普通知识库' }}
                </Tag>
                <span class="kb-detail-stat">
                  <FileText :size="12" />
                  {{ kb.document_count }} 文档
                </span>
                <span class="kb-detail-stat">{{ kb.chunk_count }} 分块</span>
                <Tag v-if="kb.embedding_model_name" size="small" color="default">
                  {{ kb.embedding_model_name }}
                </Tag>
              </div>
            </div>
          </div>
        </div>

        <!-- Tab 区域 -->
        <div class="kb-detail-body">
          <Tabs v-model:activeKey="activeTab" class="kb-tabs">
            <Tabs.TabPane key="documents">
              <template #tab>
                <span class="tab-label">
                  <FileText :size="14" />
                  文档
                </span>
              </template>
              <DocumentTab :kb="kb" @change="handleKBUpdated" />
            </Tabs.TabPane>

            <Tabs.TabPane key="recall">
              <template #tab>
                <span class="tab-label">
                  <Search :size="14" />
                  召回测试
                </span>
              </template>
              <RecallTestTab :kb="kb" />
            </Tabs.TabPane>

            <Tabs.TabPane key="settings">
              <template #tab>
                <span class="tab-label">
                  <Settings :size="14" />
                  设置
                </span>
              </template>
              <SettingsTab :kb="kb" @updated="handleKBUpdated" />
            </Tabs.TabPane>
          </Tabs>
        </div>
      </template>
    </Spin>
  </div>
</template>

<style scoped>
.kb-detail-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 50px);
  overflow: hidden;
}

.kb-detail-page :deep(> .ant-spin-nested-loading) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.kb-detail-page :deep(> .ant-spin-nested-loading > .ant-spin-container) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.kb-detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid hsl(var(--border));
  background: hsl(var(--card));
  flex-shrink: 0;
}

.kb-detail-header__left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.back-btn {
  padding: 4px 8px;
  color: hsl(var(--muted-foreground));
}

.kb-detail-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 10px;
  flex-shrink: 0;
}

.icon-normal {
  background: hsl(217 91% 60% / 10%);
  color: hsl(217 91% 60%);
}

.icon-graph {
  background: hsl(270 67% 47% / 10%);
  color: hsl(270 67% 47%);
}

.kb-detail-title-area {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.kb-detail-name {
  font-size: 18px;
  font-weight: 600;
  color: hsl(var(--foreground));
}

.kb-detail-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.kb-detail-meta :deep(.ant-tag) {
  margin: 0;
}

.kb-detail-stat {
  display: flex;
  align-items: center;
  gap: 3px;
}

.kb-detail-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.kb-tabs {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.kb-tabs :deep(.ant-tabs-nav) {
  flex-shrink: 0;
  padding: 0 24px;
  margin-bottom: 0;
  background: hsl(var(--card));
  border-bottom: 1px solid hsl(var(--border));
}

.kb-tabs :deep(.ant-tabs-content-holder) {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.kb-tabs :deep(.ant-tabs-content) {
  height: 100%;
}

.kb-tabs :deep(.ant-tabs-tabpane) {
  height: 100%;
  overflow-y: auto;
}

.tab-label {
  display: flex;
  align-items: center;
  gap: 6px;
}
</style>
