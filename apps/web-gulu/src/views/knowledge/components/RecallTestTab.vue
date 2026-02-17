<script setup lang="ts">
/**
 * 召回测试 Tab — Dify 风格左右分栏布局
 * 左侧：查询输入 + 历史记录
 * 右侧：召回结果卡片 + Score 徽标
 */
import type { KnowledgeBase, KnowledgeSearchResult } from '#/api/knowledge-base';

import { ref } from 'vue';

import {
  Badge,
  Button,
  Empty,
  Input,
  Spin,
  Tag,
  message,
} from 'ant-design-vue';
import { Clock, FileText, Search } from 'lucide-vue-next';

import { searchKnowledgeBaseApi } from '#/api/knowledge-base';

interface Props {
  kb: KnowledgeBase;
}

const props = defineProps<Props>();

const query = ref('');
const results = ref<KnowledgeSearchResult[]>([]);
const searching = ref(false);
const hasSearched = ref(false);

// 查询历史
interface SearchRecord {
  query: string;
  resultCount: number;
  timestamp: string;
}
const searchHistory = ref<SearchRecord[]>([]);

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
      top_k: props.kb.top_k || 5,
      score: props.kb.similarity_threshold || 0,
    });
    results.value = res || [];

    // 添加到历史记录
    searchHistory.value.unshift({
      query: q,
      resultCount: results.value.length,
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    });
    // 最多保留 20 条
    if (searchHistory.value.length > 20) {
      searchHistory.value = searchHistory.value.slice(0, 20);
    }
  } catch (e: any) {
    message.error('检索失败: ' + (e.message || '未知错误'));
  } finally {
    searching.value = false;
  }
}

function handleHistoryClick(record: SearchRecord) {
  query.value = record.query;
  handleSearch();
}

function getScoreColor(score: number): string {
  if (score >= 0.8) return '#52c41a';
  if (score >= 0.6) return '#1677ff';
  if (score >= 0.4) return '#faad14';
  return '#ff4d4f';
}

function getScoreBg(score: number): string {
  if (score >= 0.8) return '#f6ffed';
  if (score >= 0.6) return '#e6f4ff';
  if (score >= 0.4) return '#fffbe6';
  return '#fff2f0';
}
</script>

<template>
  <div class="recall-tab">
    <!-- 左侧面板 -->
    <div class="recall-left">
      <div class="recall-left-title">召回测试</div>
      <div class="recall-left-desc">
        根据给定的查询文本测试知识的召回效果。
      </div>

      <!-- 查询输入 -->
      <div class="recall-input-area">
        <div class="recall-input-header">
          <span>源文本</span>
          <Tag color="blue" size="small">
            <template #icon><Search :size="10" /></template>
            向量检索
          </Tag>
        </div>
        <Input.TextArea
          v-model:value="query"
          :rows="4"
          placeholder="输入查询文本..."
          :maxlength="200"
          show-count
          @press-enter="handleSearch"
        />
        <div class="recall-input-footer">
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

      <!-- 查询历史 -->
      <div v-if="searchHistory.length > 0" class="recall-history">
        <div class="recall-history-title">
          <Clock :size="14" />
          记录
        </div>
        <div class="recall-history-list">
          <div
            v-for="(record, idx) in searchHistory"
            :key="idx"
            class="recall-history-item"
            @click="handleHistoryClick(record)"
          >
            <div class="history-query">{{ record.query }}</div>
            <div class="history-meta">
              <span>{{ record.resultCount }} 结果</span>
              <span>{{ record.timestamp }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 右侧结果面板 -->
    <div class="recall-right">
      <Spin :spinning="searching">
        <template v-if="hasSearched && results.length > 0">
          <div class="recall-results-header">
            <strong>{{ results.length }} 个召回段落</strong>
          </div>
          <div class="recall-results-list">
            <div
              v-for="(result, idx) in results"
              :key="idx"
              class="recall-result-card"
            >
              <!-- Score 徽标 -->
              <div
                class="result-score-badge"
                :style="{
                  color: getScoreColor(result.score),
                  background: getScoreBg(result.score),
                  borderColor: getScoreColor(result.score) + '40',
                }"
              >
                SCORE {{ result.score.toFixed(2) }}
              </div>

              <!-- Chunk 信息 -->
              <div class="result-chunk-header">
                <span class="result-chunk-label">
                  Chunk-{{ String(result.chunk_index + 1).padStart(2, '0') }}
                </span>
                <span class="result-chunk-chars">
                  {{ result.content.length }} 字符
                </span>
              </div>

              <!-- 内容 -->
              <div class="result-content">
                {{ result.content }}
              </div>

              <!-- 文档来源 -->
              <div v-if="result.document_name" class="result-source">
                <FileText :size="12" />
                <span>{{ result.document_name }}</span>
              </div>
            </div>
          </div>
        </template>

        <template v-else-if="hasSearched && !searching">
          <div class="recall-empty">
            <Empty description="未找到与查询相关的内容">
              <template #image>
                <Search :size="48" style="color: hsl(var(--muted-foreground))" />
              </template>
            </Empty>
            <div class="recall-empty-tips">
              <p>建议：</p>
              <ul>
                <li>尝试使用不同的关键词</li>
                <li>检查知识库中是否有相关文档</li>
                <li>适当降低相似度阈值</li>
              </ul>
            </div>
          </div>
        </template>

        <template v-else>
          <div class="recall-placeholder">
            <Search :size="48" style="color: hsl(var(--muted-foreground) / 40%)" />
            <p>在左侧输入查询文本，点击「测试」查看召回结果</p>
          </div>
        </template>
      </Spin>
    </div>
  </div>
</template>

<style scoped>
.recall-tab {
  display: flex;
  height: 100%;
  min-height: 500px;
}

/* 左侧面板 */
.recall-left {
  width: 380px;
  flex-shrink: 0;
  border-right: 1px solid hsl(var(--border));
  padding: 20px 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.recall-left-title {
  font-size: 16px;
  font-weight: 600;
  color: hsl(var(--foreground));
  margin-bottom: 4px;
}

.recall-left-desc {
  font-size: 13px;
  color: hsl(var(--muted-foreground));
  margin-bottom: 20px;
}

.recall-input-area {
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 20px;
}

.recall-input-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 500;
  color: hsl(var(--foreground));
}

.recall-input-header :deep(.ant-tag) {
  margin: 0;
}

.recall-input-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
}

/* 查询历史 */
.recall-history {
  flex: 1;
  min-height: 0;
}

.recall-history-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  color: hsl(var(--foreground));
  margin-bottom: 10px;
}

.recall-history-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.recall-history-item {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid hsl(var(--border));
  cursor: pointer;
  transition: all 0.15s;
}

.recall-history-item:hover {
  background: hsl(var(--primary) / 4%);
  border-color: hsl(var(--primary) / 30%);
}

.history-query {
  font-size: 13px;
  color: hsl(var(--foreground));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 2px;
}

.history-meta {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: hsl(var(--muted-foreground));
}

/* 右侧结果面板 */
.recall-right {
  flex: 1;
  min-width: 0;
  padding: 20px 24px;
  overflow-y: auto;
  background: hsl(var(--muted) / 30%);
}

.recall-results-header {
  font-size: 15px;
  margin-bottom: 16px;
  color: hsl(var(--foreground));
}

.recall-results-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.recall-result-card {
  position: relative;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
  padding: 16px;
}

.result-score-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid;
  letter-spacing: 0.5px;
}

.result-chunk-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.result-chunk-label {
  font-size: 13px;
  font-weight: 600;
  color: hsl(var(--foreground));
}

.result-chunk-chars {
  font-size: 11px;
  color: hsl(var(--muted-foreground));
}

.result-content {
  font-size: 13px;
  line-height: 1.7;
  color: hsl(var(--foreground));
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 200px;
  overflow-y: auto;
  padding-right: 60px;
}

.result-source {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid hsl(var(--border));
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

/* 空状态 */
.recall-empty {
  padding: 60px 0;
  text-align: center;
}

.recall-empty-tips {
  margin-top: 16px;
  font-size: 13px;
  color: hsl(var(--muted-foreground));
  text-align: left;
  max-width: 280px;
  margin-left: auto;
  margin-right: auto;
}

.recall-empty-tips ul {
  padding-left: 18px;
  margin-top: 4px;
}

.recall-empty-tips li {
  margin-bottom: 2px;
}

.recall-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  gap: 12px;
  color: hsl(var(--muted-foreground));
  font-size: 14px;
}
</style>
