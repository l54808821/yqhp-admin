<script setup lang="ts">
/**
 * 召回测试 Tab — 支持检索方式选择 + 持久化历史
 */
import type {
  KnowledgeBase,
  KnowledgeSearchResult,
  QueryHistoryItem,
  RetrievalMode,
} from '#/api/knowledge-base';

import { onMounted, ref } from 'vue';

import {
  Button,
  Empty,
  Input,
  InputNumber,
  Radio,
  Slider,
  Spin,
  Tag,
  message,
} from 'ant-design-vue';
import { Clock, FileText, Search } from 'lucide-vue-next';

import {
  getQueryHistoryApi,
  searchKnowledgeBaseApi,
} from '#/api/knowledge-base';

interface Props {
  kb: KnowledgeBase;
}

const props = defineProps<Props>();

const query = ref('');
const results = ref<KnowledgeSearchResult[]>([]);
const searching = ref(false);
const hasSearched = ref(false);
const retrievalMode = ref<RetrievalMode>(props.kb.retrieval_mode || 'vector');
// 独立的阈值控件，默认 0（不过滤），与知识库全局配置解耦
const scoreThreshold = ref(0);
const topK = ref(props.kb.top_k || 5);

const searchHistory = ref<QueryHistoryItem[]>([]);

async function loadHistory() {
  try {
    const res = await getQueryHistoryApi(props.kb.id, 20);
    searchHistory.value = res || [];
  } catch {
    // ignore
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
  handleSearch();
}

function renderContent(content: string): string {
  if (!content) return '';
  // 将 Markdown 图片语法 ![alt](url) 转为 <img> 标签
  // 支持 https:// 绝对 URL 和 /api/... 相对路径
  return content
    .replace(
      /!\[([^\]]*)\]\(((?:https?:\/\/|\/api\/)[^)]+)\)/g,
      '<img src="$2" alt="$1" class="inline-result-image" loading="lazy" />',
    )
    .replace(/\n/g, '<br />');
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

const modeLabels: Record<string, string> = {
  vector: '向量检索',
  keyword: '关键词检索',
  hybrid: '混合检索',
};

function formatTime(dateStr?: string) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

onMounted(() => {
  loadHistory();
});
</script>

<template>
  <div class="recall-tab">
    <div class="recall-left">
      <div class="recall-left-title">召回测试</div>
      <div class="recall-left-desc">
        根据给定的查询文本测试知识的召回效果。
      </div>

      <div class="recall-input-area">
        <div class="recall-input-header">
          <span>源文本</span>
          <Radio.Group v-model:value="retrievalMode" size="small" button-style="solid">
            <Radio.Button value="vector">向量</Radio.Button>
            <Radio.Button value="keyword">关键词</Radio.Button>
            <Radio.Button value="hybrid">混合</Radio.Button>
          </Radio.Group>
        </div>
        <Input.TextArea
          v-model:value="query"
          :rows="4"
          placeholder="输入查询文本..."
          :maxlength="2000"
          show-count
          @press-enter="handleSearch"
        />
        <div class="recall-params">
          <div class="recall-param-row">
            <span class="recall-param-label">
              相似度阈值
              <span class="recall-param-value">{{ scoreThreshold.toFixed(2) }}</span>
            </span>
            <Slider
              v-model:value="scoreThreshold"
              :min="0"
              :max="1"
              :step="0.01"
              class="recall-param-slider"
            />
          </div>
          <div class="recall-param-row">
            <span class="recall-param-label">召回数量</span>
            <InputNumber
              v-model:value="topK"
              :min="1"
              :max="20"
              size="small"
              style="width: 70px"
            />
          </div>
        </div>
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

      <div v-if="searchHistory.length > 0" class="recall-history">
        <div class="recall-history-title">
          <Clock :size="14" />
          历史记录
        </div>
        <div class="recall-history-list">
          <div
            v-for="record in searchHistory"
            :key="record.id"
            class="recall-history-item"
            @click="handleHistoryClick(record)"
          >
            <div class="history-query">{{ record.query_text }}</div>
            <div class="history-meta">
              <Tag size="small">{{ modeLabels[record.retrieval_mode] || record.retrieval_mode }}</Tag>
              <span>{{ record.result_count }} 结果</span>
              <span>{{ formatTime(record.created_at) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

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

              <div class="result-chunk-header">
                <span class="result-chunk-label">
                  Chunk-{{ String(result.chunk_index + 1).padStart(2, '0') }}
                </span>
                <span class="result-chunk-chars">
                  {{ result.word_count }} 字
                </span>
                <span v-if="result.hit_count" class="result-hit-count">
                  命中 {{ result.hit_count }} 次
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
                <li>切换检索方式（向量 / 关键词 / 混合）</li>
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

.recall-params {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid hsl(var(--border));
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.recall-param-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.recall-param-label {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  white-space: nowrap;
  min-width: 90px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.recall-param-value {
  font-weight: 600;
  color: hsl(var(--foreground));
}

.recall-param-slider {
  flex: 1;
  margin: 0;
}

.recall-input-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
}

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
  margin-bottom: 4px;
}

.history-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: hsl(var(--muted-foreground));
}

.history-meta :deep(.ant-tag) {
  margin: 0;
  font-size: 10px;
}

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

.result-hit-count {
  font-size: 11px;
  color: hsl(var(--primary));
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
  gap: 4px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid hsl(var(--border));
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

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
