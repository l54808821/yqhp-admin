<script setup lang="ts">
import type {
  KnowledgeBase,
  KnowledgeSearchResult,
  QueryHistoryItem,
  RetrievalMode,
} from '#/api/knowledge-base';

import { computed, onMounted, ref } from 'vue';

import {
  Button,
  Col,
  Pagination,
  Popover,
  Row,
  Spin,
  message,
} from 'ant-design-vue';
import {
  ExternalLink,
  FileText,
  Hash,
  Search,
  SlidersHorizontal,
  Target,
} from 'lucide-vue-next';

import {
  getQueryHistoryApi,
  searchKnowledgeBaseApi,
} from '#/api/knowledge-base';
import {
  formatTime,
  renderChunkContent,
  RETRIEVAL_MODE_LABELS,
} from '#/utils/knowledge';

import RetrievalSettingsPanel from './RetrievalSettingsPanel.vue';

interface Props {
  kb: KnowledgeBase;
}

const props = defineProps<Props>();

const query = ref('');
const results = ref<KnowledgeSearchResult[]>([]);
const searching = ref(false);
const hasSearched = ref(false);
const settingsOpen = ref(false);

const retrievalMode = ref<RetrievalMode>(props.kb.retrieval_mode || 'vector');
const scoreThreshold = ref(0);
const topK = ref(props.kb.top_k || 5);

const searchHistory = ref<QueryHistoryItem[]>([]);
const historyPage = ref(1);
const historyPageSize = 10;

const pagedHistory = computed(() => {
  const start = (historyPage.value - 1) * historyPageSize;
  return searchHistory.value.slice(start, start + historyPageSize);
});

const currentModeLabel = computed(() => {
  return RETRIEVAL_MODE_LABELS[retrievalMode.value] || '向量检索';
});

async function loadHistory() {
  try {
    const res = await getQueryHistoryApi(props.kb.id, 100);
    searchHistory.value = Array.isArray(res) ? res : [];
    historyPage.value = 1;
  } catch (e) {
    console.warn('[RecallTest] loadHistory failed:', e);
  }
}

async function handleSearch() {
  const q = query.value.trim();
  if (!q) {
    message.warning('请输入查询内容');
    return;
  }

  searching.value = true;
  hasSearched.value = true;
  results.value = [];

  try {
    const res = await searchKnowledgeBaseApi(props.kb.id, {
      query: q,
      top_k: topK.value,
      score: scoreThreshold.value,
      retrieval_mode: retrievalMode.value,
    });
    results.value = res || [];
    await loadHistory();
  } catch (e: any) {
    message.error('检索失败: ' + (e.message || '未知错误'));
  } finally {
    searching.value = false;
  }
}

function handleHistoryClick(record: QueryHistoryItem) {
  query.value = record.query_text;
  if (record.retrieval_mode) {
    retrievalMode.value = record.retrieval_mode as RetrievalMode;
  }
}

const renderContent = renderChunkContent;

function getScoreColor(score: number): string {
  if (score >= 0.8) return '#52c41a';
  if (score >= 0.6) return '#1677ff';
  if (score >= 0.4) return '#faad14';
  return '#ff4d4f';
}

onMounted(() => {
  loadHistory();
});
</script>

<template>
  <Row class="recall-tab" :gutter="0">
    <!-- 左侧 10/24 -->
    <Col :span="10" class="recall-col recall-col-left">
      <div class="recall-left-scroll">
        <!-- 标题区 -->
        <div class="recall-title">召回测试</div>
        <div class="recall-desc">根据给定的查询文本测试知识的召回效果。</div>

        <!-- 输入卡片 -->
        <div class="recall-input-card">
          <div class="recall-input-header">
            <span class="recall-input-label">源文本</span>
            <div class="recall-input-header-right">
              <Popover
                v-model:open="settingsOpen"
                trigger="click"
                placement="rightTop"
                :align="{ offset: [-2, 0] }"
                overlay-class-name="recall-settings-popover"
              >
                <template #content>
                  <div class="recall-settings-popover-body">
                    <RetrievalSettingsPanel
                      v-model:retrieval-mode="retrievalMode"
                      v-model:score-threshold="scoreThreshold"
                      v-model:top-k="topK"
                      compact
                    />
                  </div>
                </template>
                <button class="recall-mode-btn">
                  <Hash :size="12" />
                  {{ currentModeLabel }}
                  <SlidersHorizontal :size="12" />
                </button>
              </Popover>
            </div>
          </div>
          <textarea
            v-model="query"
            class="recall-textarea"
            rows="8"
            placeholder="请输入文本，建议使用简短的陈述句。"
            maxlength="2000"
            @keydown.enter.prevent="handleSearch"
          />
          <div class="recall-input-bottom">
            <span class="recall-char-count">{{ query.length }} / 2000</span>
            <Button
              type="primary"
              :loading="searching"
              :disabled="!query.trim()"
              @click="handleSearch"
            >
              <template #icon><Search :size="14" /></template>
              测试
            </Button>
          </div>
        </div>

        <!-- 记录表格 -->
        <div v-if="searchHistory.length > 0" class="recall-history">
          <div class="recall-history-title">记录</div>
          <table class="recall-history-table">
            <thead>
              <tr>
                <th class="col-query">查询内容</th>
                <th class="col-source">数据源</th>
                <th class="col-time">时间 ↓</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="record in pagedHistory"
                :key="record.id"
                class="history-row"
                @click="handleHistoryClick(record)"
              >
                <td class="col-query">
                  <span class="history-query-text">{{ record.query_text }}</span>
                </td>
                <td class="col-source">
                  <span class="history-source-dot" />
                  Retrieval Test
                </td>
                <td class="col-time">{{ formatTime(record.created_at) }}</td>
              </tr>
            </tbody>
          </table>
          <div v-if="searchHistory.length > historyPageSize" class="recall-history-pagination">
            <Pagination
              v-model:current="historyPage"
              :total="searchHistory.length"
              :page-size="historyPageSize"
              size="small"
              simple
            />
          </div>
        </div>
      </div>
    </Col>

    <!-- 右侧 14/24 -->
    <Col :span="14" class="recall-col recall-col-right">
      <div class="recall-right-scroll">
        <Spin :spinning="searching">
          <template v-if="hasSearched && results.length > 0">
            <div class="recall-results-count">{{ results.length }} 个召回段落</div>
            <div class="recall-results-list">
              <div
                v-for="(result, idx) in results"
                :key="idx"
                class="recall-result-card"
              >
                <div class="result-chunk-header">
                  <div class="result-chunk-left">
                    <Hash :size="13" class="result-hash-icon" />
                    <span class="result-chunk-label">
                      Chunk-{{ String(result.chunk_index + 1).padStart(2, '0') }}
                    </span>
                    <span class="result-chunk-chars">{{ result.word_count }} 字符</span>
                  </div>
                  <span
                    class="result-score"
                    :style="{ color: getScoreColor(result.score) }"
                  >
                    score {{ result.score.toFixed(2) }}
                  </span>
                </div>

                <div
                  v-if="result.content_type === 'image' && result.image_path"
                  class="result-content result-content-image"
                >
                  <img
                    :src="result.image_path"
                    alt="图片内容"
                    class="result-image"
                    loading="lazy"
                  />
                  <p v-if="result.content" class="result-image-desc">{{ result.content }}</p>
                </div>
                <div v-else class="result-content" v-html="renderContent(result.content)" />

                <div v-if="result.document_name" class="result-source">
                  <div class="result-source-left">
                    <FileText :size="12" />
                    <span>{{ result.document_name }}</span>
                  </div>
                  <a class="result-source-link" @click.stop>
                    打开
                    <ExternalLink :size="11" />
                  </a>
                </div>
              </div>
            </div>
          </template>

          <template v-else-if="hasSearched && !searching">
            <div class="recall-placeholder">
              <Target :size="40" style="color: hsl(var(--muted-foreground) / 40%)" />
              <p>未找到与查询相关的内容</p>
              <p class="recall-placeholder-sub">尝试调整关键词、切换检索方式或降低相似度阈值</p>
            </div>
          </template>

          <template v-else-if="!hasSearched">
            <div class="recall-placeholder">
              <Target :size="40" style="color: hsl(var(--muted-foreground) / 30%)" />
              <p>召回测试结果将展示在这里</p>
            </div>
          </template>
        </Spin>
      </div>
    </Col>

  </Row>
</template>

<style scoped>
.recall-tab {
  height: 100%;
}

.recall-tab :deep(.ant-row) {
  height: 100%;
}

/* 左右列共用：撑满高度 + 相对定位 */
.recall-col {
  position: relative;
  height: 100%;
}

.recall-col-left {
  border-right: 1px solid hsl(var(--border));
  background: hsl(var(--card));
}

.recall-col-right {
  background: hsl(var(--muted) / 20%);
}

/* 左侧：固定顶部 + 记录区域滚动 */
.recall-left-scroll {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 20px 24px 0;
}

.recall-right-scroll {
  position: absolute;
  inset: 0;
  overflow-y: auto;
  padding: 14px 16px;
}

.recall-title {
  font-size: 16px;
  font-weight: 600;
  color: hsl(var(--foreground));
  margin-bottom: 4px;
}

.recall-desc {
  font-size: 13px;
  color: hsl(var(--muted-foreground));
  margin-bottom: 16px;
}

/* 输入卡片 */
.recall-input-card {
  border: 1px solid hsl(var(--primary) / 40%);
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 16px;
  transition: border-color 0.15s;
  flex-shrink: 0;
}

.recall-input-card:focus-within {
  border-color: hsl(var(--primary) / 70%);
}

.recall-input-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.recall-input-label {
  font-size: 13px;
  font-weight: 500;
  color: hsl(var(--foreground));
}

.recall-input-header-right {
  display: flex;
  align-items: center;
}

.recall-mode-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  background: hsl(var(--muted) / 40%);
  border: 1px solid hsl(var(--border));
  border-radius: 5px;
  padding: 3px 8px;
  cursor: pointer;
  transition: all 0.15s;
  line-height: 1.5;
}

.recall-mode-btn:hover {
  background: hsl(var(--muted) / 70%);
  color: hsl(var(--foreground));
}

.recall-textarea {
  width: 100%;
  border: none;
  outline: none;
  resize: none;
  font-size: 13px;
  line-height: 1.6;
  color: hsl(var(--foreground));
  background: transparent;
  font-family: inherit;
}

.recall-textarea::placeholder {
  color: hsl(var(--muted-foreground) / 50%);
}

.recall-input-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
}

.recall-char-count {
  font-size: 11px;
  color: hsl(var(--muted-foreground));
}

/* ====== 记录表格 ====== */
.recall-history {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-bottom: 20px;
}

.recall-history-title {
  font-size: 14px;
  font-weight: 600;
  color: hsl(var(--foreground));
  margin-bottom: 10px;
}

.recall-history-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.recall-history-table thead th {
  text-align: left;
  font-weight: 500;
  color: hsl(var(--muted-foreground));
  padding: 6px 8px;
  border-bottom: 1px solid hsl(var(--border));
  white-space: nowrap;
  position: sticky;
  top: 0;
  background: hsl(var(--card));
}

.recall-history-table .col-query {
  width: 40%;
}

.recall-history-table .col-source {
  width: 30%;
}

.recall-history-table .col-time {
  width: 30%;
}

.history-row {
  cursor: pointer;
  transition: background 0.1s;
}

.history-row:hover {
  background: hsl(var(--muted) / 40%);
}

.history-row td {
  padding: 8px 8px;
  border-bottom: 1px solid hsl(var(--border) / 50%);
  color: hsl(var(--foreground));
  vertical-align: middle;
}

.history-query-text {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 140px;
}

.history-source-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: hsl(var(--muted-foreground) / 50%);
  margin-right: 5px;
  vertical-align: middle;
}

.recall-history-pagination {
  padding-top: 8px;
  display: flex;
  justify-content: flex-start;
}

/* ====== 右侧结果区 ====== */
.recall-results-count {
  font-size: 15px;
  font-weight: 600;
  color: hsl(var(--foreground));
  margin-bottom: 12px;
}

.recall-results-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.recall-result-card {
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
  padding: 16px;
}

.result-chunk-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.result-chunk-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.result-hash-icon {
  color: hsl(var(--muted-foreground));
}

.result-chunk-label {
  font-size: 13px;
  font-weight: 600;
  color: hsl(var(--foreground));
}

.result-chunk-chars {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.result-score {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.3px;
}

.result-content {
  font-size: 13px;
  line-height: 1.7;
  color: hsl(var(--foreground));
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 200px;
  overflow-y: auto;
}

.result-content-image {
  white-space: normal;
}

.result-image {
  max-width: 100%;
  max-height: 300px;
  border-radius: 6px;
  border: 1px solid hsl(var(--border));
  display: block;
}

.result-image-desc {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  margin-top: 6px;
  margin-bottom: 0;
}

:deep(.inline-result-image) {
  max-width: 100%;
  max-height: 300px;
  border-radius: 6px;
  border: 1px solid hsl(var(--border));
  display: block;
  margin: 6px 0;
}

.result-source {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid hsl(var(--border));
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.result-source-left {
  display: flex;
  align-items: center;
  gap: 4px;
}

.result-source-link {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 12px;
  color: hsl(var(--primary));
  cursor: pointer;
  transition: opacity 0.15s;
}

.result-source-link:hover {
  opacity: 0.8;
}

/* 空状态 */
.recall-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 260px;
  gap: 10px;
  color: hsl(var(--muted-foreground));
  font-size: 13px;
}

.recall-placeholder p {
  margin: 0;
}

.recall-placeholder-sub {
  font-size: 12px;
  color: hsl(var(--muted-foreground) / 60%);
}

/* ====== 设置 Popover ====== */
.recall-settings-popover-body {
  width: 380px;
  padding: 4px 0;
}
</style>
