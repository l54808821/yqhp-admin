import { Marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-light.css';

let markedInstance: Marked | null = null;

function getMarked(): Marked {
  if (markedInstance) return markedInstance;

  markedInstance = new Marked({
    breaks: true,
    gfm: true,
  });

  let mermaidBlockIdx = 0;

  const renderer = {
    code({ text, lang }: { text: string; lang?: string }) {
      if (lang === 'mermaid') {
        const id = `mermaid-${++mermaidBlockIdx}`;
        const escapedText = text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
        return `<div class="ai-mermaid-block" data-mermaid-id="${id}" data-mermaid-source="${escapedText}">
          <div class="ai-mermaid-toolbar">
            <div class="ai-mermaid-toolbar-left">
              <span class="ai-mermaid-lang">mermaid</span>
              <button class="ai-mermaid-tab ai-mermaid-tab--active" data-mermaid-action="show-chart" title="图表">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
                <span>图表</span>
              </button>
              <button class="ai-mermaid-tab" data-mermaid-action="show-source" title="源码">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                <span>源码</span>
              </button>
            </div>
            <div class="ai-mermaid-toolbar-right">
              <button class="ai-mermaid-btn" data-mermaid-action="zoom-in" title="放大">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
              </button>
              <button class="ai-mermaid-btn" data-mermaid-action="zoom-out" title="缩小">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
              </button>
              <button class="ai-mermaid-btn" data-mermaid-action="reset" title="重置">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
              </button>
              <button class="ai-mermaid-btn" data-mermaid-action="copy" title="复制源码">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              </button>
              <button class="ai-mermaid-btn" data-mermaid-action="download" title="下载图片">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              </button>
              <button class="ai-mermaid-btn" data-mermaid-action="fullscreen" title="全屏">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
              </button>
            </div>
          </div>
          <div class="ai-mermaid-chart-container">
            <div class="ai-mermaid-chart" data-mermaid-role="chart"></div>
          </div>
          <div class="ai-mermaid-source" style="display:none">
            <pre class="ai-code-pre"><code>${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>
          </div>
        </div>`;
      }

      const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
      const highlighted = hljs.highlight(text, { language }).value;
      const escapedText = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

      return `<div class="ai-code-block">
        <div class="ai-code-header">
          <div class="ai-code-header-left">
            <span class="ai-code-lang">${language}</span>
          </div>
          <div class="ai-code-header-right">
            <button class="ai-code-copy" data-code="${escapedText}" title="复制代码">
              <svg class="ai-code-action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
          </div>
        </div>
        <pre class="ai-code-pre"><code class="hljs language-${language}">${highlighted}</code></pre>
      </div>`;
    },

    codespan({ text }: { text: string }) {
      return `<code class="ai-inline-code">${text}</code>`;
    },

    table({ header, rows }: { header: any[]; rows: any[] }) {
      const renderCell = (cell: any) => {
        const text = cell?.text ?? cell?.tokens?.map((t: any) => t.raw || t.text || '').join('') ?? String(cell ?? '');
        return text;
      };
      const ths = header.map((h: any) => `<th>${renderCell(h)}</th>`).join('');
      const trs = rows.map((row: any[]) =>
        `<tr>${row.map((cell: any) => `<td>${renderCell(cell)}</td>`).join('')}</tr>`,
      ).join('');
      return `<div class="ai-table-wrapper"><table class="ai-table"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table></div>`;
    },

    link({ href, text }: { href: string; text: string }) {
      return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="ai-link">${text}</a>`;
    },
  };

  markedInstance.use({ renderer });
  return markedInstance;
}

export function useMarkdown() {
  function renderMarkdown(content: string): string {
    if (!content) return '';
    try {
      const result = getMarked().parse(content);
      const html = typeof result === 'string' ? result : '';
      // 去掉末尾换行/空白，避免 v-html 后产生尾随文本节点，导致 p:last-child 不匹配、段落底部多出一行空白
      return html.trimEnd();
    } catch {
      return content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }
  }

  return { renderMarkdown };
}
