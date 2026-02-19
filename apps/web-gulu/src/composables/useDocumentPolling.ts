/**
 * useDocumentPolling — 文档索引状态轮询 composable
 * 消除 DocumentTab.vue 中的硬编码轮询逻辑
 */
import { onUnmounted, ref } from 'vue';
import { POLL_INTERVAL_MS } from '#/utils/knowledge';

export function useDocumentPolling(
  fetchFn: () => Promise<void>,
  hasProcessing: () => boolean,
  interval = POLL_INTERVAL_MS,
) {
  let timer: ReturnType<typeof setInterval> | null = null;
  const isPolling = ref(false);

  function start() {
    stop();
    isPolling.value = true;
    timer = setInterval(async () => {
      if (!hasProcessing()) {
        stop();
        return;
      }
      await fetchFn();
    }, interval);
  }

  function stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    isPolling.value = false;
  }

  onUnmounted(stop);

  return { start, stop, isPolling };
}
