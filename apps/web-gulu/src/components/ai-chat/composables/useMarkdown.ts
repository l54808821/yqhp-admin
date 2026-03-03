import { Marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';

let markedInstance: Marked | null = null;

function getMarked(): Marked {
  if (markedInstance) return markedInstance;

  markedInstance = new Marked({
    breaks: true,
    gfm: true,
  });

  const renderer = {
    code({ text, lang }: { text: string; lang?: string }) {
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
          <span class="ai-code-lang">${language}</span>
          <button class="ai-code-copy" data-code="${escapedText}" onclick="(function(btn){var code=btn.getAttribute('data-code');var ta=document.createElement('textarea');ta.value=code.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'\"').replace(/&#39;/g,\"'\");document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);var orig=btn.textContent;btn.textContent='已复制';setTimeout(function(){btn.textContent=orig},2000)})(this)">复制</button>
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
