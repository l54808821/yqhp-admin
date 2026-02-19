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
        <!-- 面包屑导航条 -->
        <div class="kb-breadcrumb">
          <button class="kb-breadcrumb-btn" @click="handleBack">
            <ArrowLeft :size="14" />
            返回知识库列表
          </button>
        </div>

        <!-- 知识库信息 Header -->
        <div class="kb-detail-header">
          <div
            class="kb-detail-icon"
            :class="kb.type === 'graph' ? 'icon-graph' : 'icon-normal'"
          >
            <component :is="kb.type === 'graph' ? GitFork : Database" :size="26" />
          </div>
          <div class="kb-detail-title-area">
            <div class="kb-detail-name">{{ kb.name }}</div>
            <div class="kb-detail-meta">
              <Tag :color="kb.type === 'graph' ? 'purple' : 'blue'" size="small">
                {{ kb.type === 'graph' ? '图知识库' : '普通知识库' }}
              </Tag>
              <span class="meta-dot">·</span>
              <span class="kb-detail-stat">
                <FileText :size="12" />
                {{ kb.document_count }} 文档
              </span>
              <span class="meta-dot">·</span>
              <span class="kb-detail-stat">{{ kb.chunk_count }} 分块</span>
              <template v-if="kb.embedding_model_name">
                <span class="meta-dot">·</span>
                <span class="kb-detail-stat kb-detail-model">{{ kb.embedding_model_name }}</span>
              </template>
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

/* 面包屑导航条 */
.kb-breadcrumb {
  display: flex;
  align-items: center;
  padding: 0 24px;
  height: 38px;
  flex-shrink: 0;
  border-bottom: 1px solid hsl(var(--border) / 50%);
  background: hsl(var(--background));
}

.kb-breadcrumb-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 5px;
  transition: background 0.15s, color 0.15s;
  line-height: 1;
}

.kb-breadcrumb-btn:hover {
  background: hsl(var(--muted) / 60%);
  color: hsl(var(--foreground));
}

/* 知识库信息 Header */
.kb-detail-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 28px;
  background: hsl(var(--card));
  box-shadow: 0 1px 0 hsl(var(--border));
  flex-shrink: 0;
}

.kb-detail-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 14px;
  flex-shrink: 0;
}

.icon-normal {
  background: linear-gradient(135deg, hsl(217 91% 62% / 18%), hsl(217 91% 62% / 8%));
  color: hsl(217 91% 55%);
  box-shadow: 0 0 0 1px hsl(217 91% 60% / 20%);
}

.icon-graph {
  background: linear-gradient(135deg, hsl(270 67% 52% / 18%), hsl(270 67% 52% / 8%));
  color: hsl(270 67% 48%);
  box-shadow: 0 0 0 1px hsl(270 67% 47% / 20%);
}

.kb-detail-title-area {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.kb-detail-name {
  font-size: 20px;
  font-weight: 600;
  color: hsl(var(--foreground));
  line-height: 1.2;
}

.kb-detail-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: hsl(var(--muted-foreground));
}

.kb-detail-meta :deep(.ant-tag) {
  margin: 0;
}

.meta-dot {
  color: hsl(var(--border));
  font-size: 14px;
  line-height: 1;
  user-select: none;
}

.kb-detail-stat {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.kb-detail-model {
  font-size: 12px;
  color: hsl(var(--muted-foreground) / 80%);
}

/* Tab 区域 */
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
  padding: 0 28px;
  margin-bottom: 0;
  background: hsl(var(--card));
  border-bottom: 1px solid hsl(var(--border));
}

.kb-tabs :deep(.ant-tabs-tab) {
  padding: 14px 4px;
  font-size: 13px;
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
