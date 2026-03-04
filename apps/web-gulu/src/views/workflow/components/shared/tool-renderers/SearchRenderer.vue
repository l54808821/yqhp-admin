<script setup lang="ts">
import { computed } from 'vue';

import { createIconifyIcon } from '@vben/icons';

import { tryParseJSON } from './useHighlight';

const LinkIcon = createIconifyIcon('lucide:external-link');

const props = defineProps<{
  name: string;
  arguments: string;
  result?: string;
  isError?: boolean;
  status: 'running' | 'completed' | 'error';
}>();

interface SearchResult {
  title: string;
  url: string;
  snippet?: string;
  description?: string;
}

const searchResults = computed<SearchResult[]>(() => {
  if (!props.result) return [];
  const parsed = tryParseJSON(props.result);
  if (Array.isArray(parsed)) return parsed;
  if (parsed?.results && Array.isArray(parsed.results)) return parsed.results;
  return [];
});

const isPlainText = computed(() => {
  return props.result && searchResults.value.length === 0;
});
</script>

<template>
  <div class="search-renderer">
    <div v-if="searchResults.length > 0" class="results-section">
      <div v-for="(item, i) in searchResults" :key="i" class="result-card">
        <div class="result-title">
          <LinkIcon class="link-icon" />
          <span>{{ item.title }}</span>
        </div>
        <div v-if="item.url" class="result-url">{{ item.url }}</div>
        <div v-if="item.snippet || item.description" class="result-snippet">
          {{ item.snippet || item.description }}
        </div>
      </div>
    </div>

    <div v-else-if="isPlainText" class="plain-result">
      <pre class="plain-content" :class="{ error: isError }">{{ result }}</pre>
    </div>

    <div v-else-if="status === 'completed' || status === 'error'" class="plain-result">
      <pre class="plain-content empty">(无结果)</pre>
    </div>

    <div v-else class="waiting">
      <span class="waiting-text">搜索中...</span>
    </div>
  </div>
</template>

<style scoped>
.search-renderer {
  display: flex;
  flex-direction: column;
}

.results-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.result-card {
  padding: 6px 8px;
  border-radius: 4px;
  background: hsl(var(--muted) / 20%);
  border: 1px solid hsl(var(--border));
}

.result-title {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 500;
  color: hsl(var(--primary));
  line-height: 1.4;
}

.link-icon {
  width: 10px;
  height: 10px;
  flex-shrink: 0;
  color: hsl(var(--muted-foreground));
}

.result-url {
  font-size: 10px;
  color: hsl(var(--muted-foreground));
  font-family: 'SF Mono', 'Menlo', monospace;
  margin-top: 1px;
  word-break: break-all;
}

.result-snippet {
  font-size: 11px;
  color: hsl(var(--foreground) / 80%);
  margin-top: 3px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.plain-content {
  margin: 0;
  font-size: 11px;
  line-height: 1.5;
  font-family: 'SF Mono', 'Menlo', monospace;
  white-space: pre-wrap;
  word-break: break-all;
  color: hsl(var(--foreground));
  background: hsl(var(--muted) / 30%);
  padding: 6px 8px;
  border-radius: 4px;
  max-height: 200px;
  overflow-y: auto;
}

.plain-content.error {
  color: #ff4d4f;
}

.plain-content.empty {
  color: hsl(var(--muted-foreground));
  font-style: italic;
}

.waiting {
  padding: 4px 0;
}

.waiting-text {
  font-size: 11px;
  color: hsl(var(--muted-foreground));
  font-style: italic;
}
</style>
