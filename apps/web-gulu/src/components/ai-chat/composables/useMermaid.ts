import { nextTick, onBeforeUnmount, onMounted, watch, type Ref } from 'vue';

let mermaidModule: typeof import('mermaid') | null = null;

async function getMermaid() {
  if (!mermaidModule) {
    mermaidModule = await import('mermaid');
    mermaidModule.default.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
    });
  }
  return mermaidModule.default;
}

function unescapeHtml(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  });
}

function showCopiedFeedback(btn: HTMLElement) {
  btn.classList.add('ai-mermaid-btn--copied');
  const originalHTML = btn.innerHTML;
  btn.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
  setTimeout(() => {
    btn.classList.remove('ai-mermaid-btn--copied');
    btn.innerHTML = originalHTML;
  }, 2000);
}

export function useMermaid(containerRef: Ref<HTMLElement | undefined>, renderedHtml: Ref<string>) {
  const scaleMap = new Map<string, number>();
  const translateMap = new Map<string, { x: number; y: number }>();
  const renderedElements = new WeakSet<HTMLElement>();
  const cleanupFns: Array<() => void> = [];
  let renderCounter = 0;

  function applyTransform(id: string, chartEl: HTMLElement) {
    const scale = scaleMap.get(id) ?? 1;
    const translate = translateMap.get(id) ?? { x: 0, y: 0 };
    const svgEl = chartEl.querySelector('svg');
    if (svgEl) {
      svgEl.style.transform = `translate(${translate.x}px, ${translate.y}px) scale(${scale})`;
      svgEl.style.transformOrigin = 'center center';
      svgEl.style.transition = 'transform 0.2s ease';
    }
  }

  function setupDrag(id: string, block: HTMLElement) {
    const container = block.querySelector<HTMLElement>('.ai-mermaid-chart-container');
    if (!container || container.dataset.dragBound) return;
    container.dataset.dragBound = '1';

    let dragging = false;
    let startX = 0;
    let startY = 0;
    let startTranslate = { x: 0, y: 0 };

    const onDown = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('button')) return;
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      startTranslate = { ...(translateMap.get(id) ?? { x: 0, y: 0 }) };
      container.style.cursor = 'grabbing';
      e.preventDefault();
    };

    const onMove = (e: MouseEvent) => {
      if (!dragging) return;
      translateMap.set(id, {
        x: startTranslate.x + e.clientX - startX,
        y: startTranslate.y + e.clientY - startY,
      });
      const chartEl = block.querySelector<HTMLElement>('[data-mermaid-role="chart"]');
      const svgEl = chartEl?.querySelector<SVGElement>('svg');
      if (svgEl) {
        svgEl.style.transition = 'none';
        const s = scaleMap.get(id) ?? 1;
        const t = translateMap.get(id)!;
        svgEl.style.transform = `translate(${t.x}px, ${t.y}px) scale(${s})`;
      }
    };

    const onUp = () => {
      dragging = false;
      container.style.cursor = 'grab';
    };

    container.addEventListener('mousedown', onDown);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);

    cleanupFns.push(() => {
      container.removeEventListener('mousedown', onDown);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    });
  }

  async function renderBlocks() {
    const container = containerRef.value;
    if (!container) return;

    const blocks = container.querySelectorAll<HTMLElement>('.ai-mermaid-block');
    if (blocks.length === 0) return;

    const mermaid = await getMermaid();

    for (const block of blocks) {
      if (renderedElements.has(block)) continue;

      const source = unescapeHtml(block.dataset.mermaidSource || '');
      const chartEl = block.querySelector<HTMLElement>('[data-mermaid-role="chart"]');
      if (!chartEl || !source.trim()) continue;

      const renderId = `mermaid-render-${++renderCounter}`;
      try {
        const { svg } = await mermaid.render(renderId, source);
        chartEl.innerHTML = svg;
        renderedElements.add(block);

        const id = block.dataset.mermaidId!;
        if (!scaleMap.has(id)) scaleMap.set(id, 1);
        if (!translateMap.has(id)) translateMap.set(id, { x: 0, y: 0 });
        applyTransform(id, chartEl);
        setupDrag(id, block);
      } catch (err) {
        console.warn('[useMermaid] render failed:', err);
        chartEl.innerHTML = '<div class="ai-mermaid-error">Mermaid 语法错误，无法渲染</div>';
        renderedElements.add(block);
      }
    }
  }

  function downloadAsPng(block: HTMLElement, id: string) {
    const svgEl = block.querySelector<SVGElement>('[data-mermaid-role="chart"] svg');
    if (!svgEl) return;

    const cloned = svgEl.cloneNode(true) as SVGElement;
    cloned.style.transform = 'none';
    const svgStr = new XMLSerializer().serializeToString(cloned);
    const url = URL.createObjectURL(new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' }));

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const dpr = window.devicePixelRatio || 2;
      canvas.width = img.width * dpr;
      canvas.height = img.height * dpr;
      const ctx = canvas.getContext('2d')!;
      ctx.scale(dpr, dpr);
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, img.width, img.height);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);

      canvas.toBlob((blob) => {
        if (!blob) return;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${id}.png`;
        a.click();
        URL.revokeObjectURL(a.href);
      }, 'image/png');
    };
    img.src = url;
  }

  function toggleFullscreen(block: HTMLElement) {
    if (document.fullscreenElement === block) {
      document.exitFullscreen();
      block.classList.remove('ai-mermaid-block--fullscreen');
    } else {
      block.requestFullscreen().then(() => {
        block.classList.add('ai-mermaid-block--fullscreen');
      });
    }
  }

  function handleAction(block: HTMLElement, action: string) {
    const id = block.dataset.mermaidId!;
    const chartEl = block.querySelector<HTMLElement>('[data-mermaid-role="chart"]');

    switch (action) {
      case 'zoom-in': {
        scaleMap.set(id, Math.min((scaleMap.get(id) ?? 1) + 0.2, 5));
        if (chartEl) applyTransform(id, chartEl);
        break;
      }
      case 'zoom-out': {
        scaleMap.set(id, Math.max((scaleMap.get(id) ?? 1) - 0.2, 0.2));
        if (chartEl) applyTransform(id, chartEl);
        break;
      }
      case 'reset': {
        scaleMap.set(id, 1);
        translateMap.set(id, { x: 0, y: 0 });
        if (chartEl) applyTransform(id, chartEl);
        break;
      }
      case 'show-chart': {
        const chartContainer = block.querySelector<HTMLElement>('.ai-mermaid-chart-container');
        const sourceContainer = block.querySelector<HTMLElement>('.ai-mermaid-source');
        if (chartContainer) chartContainer.style.display = '';
        if (sourceContainer) sourceContainer.style.display = 'none';
        block.querySelector('[data-mermaid-action="show-chart"]')?.classList.add('ai-mermaid-tab--active');
        block.querySelector('[data-mermaid-action="show-source"]')?.classList.remove('ai-mermaid-tab--active');
        break;
      }
      case 'show-source': {
        const chartContainer = block.querySelector<HTMLElement>('.ai-mermaid-chart-container');
        const sourceContainer = block.querySelector<HTMLElement>('.ai-mermaid-source');
        if (chartContainer) chartContainer.style.display = 'none';
        if (sourceContainer) sourceContainer.style.display = '';
        block.querySelector('[data-mermaid-action="show-chart"]')?.classList.remove('ai-mermaid-tab--active');
        block.querySelector('[data-mermaid-action="show-source"]')?.classList.add('ai-mermaid-tab--active');
        break;
      }
      case 'copy': {
        copyToClipboard(unescapeHtml(block.dataset.mermaidSource || ''));
        const btn = block.querySelector<HTMLElement>('[data-mermaid-action="copy"]');
        if (btn) showCopiedFeedback(btn);
        break;
      }
      case 'download': {
        downloadAsPng(block, id);
        break;
      }
      case 'fullscreen': {
        toggleFullscreen(block);
        break;
      }
    }
  }

  function handleClick(e: MouseEvent): boolean {
    const target = e.target as HTMLElement;
    const mermaidBtn = target.closest<HTMLElement>('[data-mermaid-action]');
    if (!mermaidBtn) return false;

    const block = mermaidBtn.closest<HTMLElement>('.ai-mermaid-block');
    if (!block) return false;

    handleAction(block, mermaidBtn.dataset.mermaidAction!);
    return true;
  }

  function handleWheel(e: WheelEvent) {
    const target = e.target as HTMLElement;
    const chartContainer = target.closest<HTMLElement>('.ai-mermaid-chart-container');
    if (!chartContainer) return;

    const block = chartContainer.closest<HTMLElement>('.ai-mermaid-block');
    if (!block) return;

    e.preventDefault();
    const id = block.dataset.mermaidId!;
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    scaleMap.set(id, Math.max(0.2, Math.min(5, (scaleMap.get(id) ?? 1) + delta)));

    const chartEl = block.querySelector<HTMLElement>('[data-mermaid-role="chart"]');
    if (chartEl) applyTransform(id, chartEl);
  }

  const onFullscreenChange = () => {
    if (!document.fullscreenElement) {
      containerRef.value?.querySelectorAll('.ai-mermaid-block--fullscreen').forEach((el) => {
        el.classList.remove('ai-mermaid-block--fullscreen');
      });
    }
  };

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  function scheduleRender() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      nextTick(renderBlocks);
    }, 300);
  }

  watch(renderedHtml, scheduleRender);

  onMounted(() => {
    document.addEventListener('fullscreenchange', onFullscreenChange);
    nextTick(renderBlocks);
  });

  onBeforeUnmount(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
    document.removeEventListener('fullscreenchange', onFullscreenChange);
    cleanupFns.forEach((fn) => fn());
    cleanupFns.length = 0;
    scaleMap.clear();
    translateMap.clear();
  });

  return { handleClick, handleWheel };
}
