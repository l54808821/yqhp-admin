<script setup lang="ts">
import { computed } from 'vue';
import { useMarkdown } from './composables/useMarkdown';

const props = defineProps<{
  content: string;
  streaming?: boolean;
}>();

const { renderMarkdown } = useMarkdown();

const renderedHtml = computed(() => renderMarkdown(props.content));
</script>

<template>
  <div class="ai-markdown-body" v-html="renderedHtml" />
  <span v-if="streaming" class="ai-typing-cursor">|</span>
</template>

<style>
.ai-markdown-body {
  font-size: 14px;
  line-height: 1.7;
  color: inherit;
  word-break: break-word;
  overflow-wrap: break-word;
}

.ai-markdown-body h1,
.ai-markdown-body h2,
.ai-markdown-body h3,
.ai-markdown-body h4,
.ai-markdown-body h5,
.ai-markdown-body h6 {
  margin: 16px 0 8px;
  font-weight: 600;
  line-height: 1.4;
}

.ai-markdown-body h1 { font-size: 1.5em; }
.ai-markdown-body h2 { font-size: 1.3em; }
.ai-markdown-body h3 { font-size: 1.15em; }

.ai-markdown-body p {
  margin: 8px 0;
}

.ai-markdown-body p:first-child {
  margin-top: 0;
}

.ai-markdown-body p:last-child {
  margin-bottom: 0;
}

.ai-markdown-body ul,
.ai-markdown-body ol {
  padding-left: 1.5em;
  margin: 8px 0;
}

.ai-markdown-body li {
  margin: 4px 0;
}

.ai-markdown-body li > p {
  margin: 2px 0;
}

.ai-markdown-body blockquote {
  padding: 4px 12px;
  margin: 8px 0;
  color: hsl(var(--foreground) / 70%);
  border-left: 3px solid hsl(var(--border));
}

.ai-markdown-body hr {
  margin: 16px 0;
  border: none;
  border-top: 1px solid hsl(var(--border));
}

.ai-markdown-body strong {
  font-weight: 600;
}

/* 代码块 */
.ai-code-block {
  margin: 12px 0;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid hsl(var(--border) / 50%);
}

.ai-code-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  background: #2d2d2d;
  font-size: 12px;
}

.ai-code-lang {
  color: #999;
  text-transform: lowercase;
}

.ai-code-copy {
  padding: 2px 10px;
  font-size: 12px;
  color: #ccc;
  cursor: pointer;
  background: transparent;
  border: 1px solid #555;
  border-radius: 4px;
  transition: all 0.2s;
}

.ai-code-copy:hover {
  color: #fff;
  background: #444;
}

.ai-code-pre {
  margin: 0;
  padding: 14px 16px;
  overflow-x: auto;
  font-size: 13px;
  line-height: 1.6;
  background: #1e1e1e;
}

.ai-code-pre code {
  font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', Menlo, Consolas, monospace;
}

/* 行内代码 */
.ai-inline-code {
  padding: 2px 6px;
  font-size: 0.9em;
  font-family: 'SF Mono', 'Fira Code', Menlo, Consolas, monospace;
  background: hsl(var(--accent) / 60%);
  border-radius: 4px;
}

/* 表格 */
.ai-table-wrapper {
  margin: 12px 0;
  overflow-x: auto;
}

.ai-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.ai-table th,
.ai-table td {
  padding: 8px 12px;
  text-align: left;
  border: 1px solid hsl(var(--border));
}

.ai-table th {
  font-weight: 600;
  background: hsl(var(--accent) / 40%);
}

.ai-table tr:nth-child(even) {
  background: hsl(var(--accent) / 20%);
}

/* 链接 */
.ai-link {
  color: var(--ant-color-primary, #1677ff);
  text-decoration: none;
}

.ai-link:hover {
  text-decoration: underline;
}

/* 打字光标 */
.ai-typing-cursor {
  display: inline-block;
  color: var(--ant-color-primary, #1677ff);
  font-weight: 300;
  animation: ai-cursor-blink 1s infinite;
}

@keyframes ai-cursor-blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}
</style>
