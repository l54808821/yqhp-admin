<script setup lang="ts">
import { computed, ref } from 'vue';
import { useMarkdown } from './composables/useMarkdown';

const props = defineProps<{
  content: string;
  streaming?: boolean;
}>();

const { renderMarkdown } = useMarkdown();

const renderedHtml = computed(() => renderMarkdown(props.content));

const containerRef = ref<HTMLElement>();

function handleClick(e: MouseEvent) {
  const btn = (e.target as HTMLElement).closest('.ai-code-copy') as HTMLElement | null;
  if (!btn) return;

  const raw = btn.getAttribute('data-code') || '';
  const code = raw
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  const showCopied = () => {
    btn.classList.add('ai-code-copy--copied');
    btn.innerHTML = '<svg class="ai-code-action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
    setTimeout(() => {
      btn.classList.remove('ai-code-copy--copied');
      btn.innerHTML = '<svg class="ai-code-action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
    }, 2000);
  };

  navigator.clipboard.writeText(code).then(showCopied).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = code;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showCopied();
  });
}
</script>

<template>
  <div ref="containerRef" class="ai-markdown-body" v-html="renderedHtml" @click="handleClick" />
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

/* 代码块 — 豆包风格 */
.ai-code-block {
  margin: 12px 0;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid hsl(var(--border) / 50%);
  background: hsl(var(--accent) / 10%);
  box-shadow: 0 1px 3px hsl(var(--foreground) / 4%);
}

.ai-code-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2px 4px 2px 12px;
  background: hsl(var(--accent) / 50%);
  border-bottom: 1px solid hsl(var(--border) / 30%);
}

.ai-code-header-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.ai-code-header-right {
  display: flex;
  align-items: center;
  gap: 2px;
}

.ai-code-lang {
  color: hsl(var(--muted-foreground));
  text-transform: lowercase;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.01em;
}

.ai-code-copy {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 6px;
  transition: all 0.15s ease;
}

.ai-code-action-icon {
  width: 14px;
  height: 14px;
}

.ai-code-copy:hover {
  color: hsl(var(--foreground));
  background: hsl(var(--accent));
}

.ai-code-copy:active {
  transform: scale(0.92);
}

.ai-code-copy--copied {
  color: #52c41a;
}

.ai-code-copy--copied:hover {
  color: #52c41a;
  background: #52c41a12;
}

.ai-code-pre {
  margin: 0;
  padding: 12px 16px;
  overflow-x: auto;
  font-size: 13.5px;
  line-height: 1.7;
  background: #fafafa;
}

.ai-code-pre code {
  font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', Menlo, Consolas, monospace;
  font-weight: 450;
  background: transparent;
}

.ai-code-pre code.hljs {
  background: transparent;
  padding: 0;
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
