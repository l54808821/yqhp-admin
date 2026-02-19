/**
 * useModelFilter — 模型列表过滤 composable
 * 消除 SettingsTab.vue 和 KnowledgeBaseFormModal.vue 中的重复过滤逻辑
 */
import type { Ref } from 'vue';
import { computed } from 'vue';

export function useModelFilter(modelList: Ref<any[]>) {
  const embeddingModels = computed(() => {
    const filtered = modelList.value.filter(
      (m: any) =>
        m.capability_tags?.includes('embedding') ||
        m.model_id?.includes('embedding') ||
        m.model_id?.toLowerCase().includes('embed'),
    );
    return filtered.length > 0 ? filtered : modelList.value;
  });

  const rerankModels = computed(() =>
    modelList.value.filter(
      (m: any) =>
        m.capability_tags?.includes('重排序') ||
        m.capability_tags?.includes('rerank') ||
        m.model_id?.includes('rerank'),
    ),
  );

  const llmModels = computed(() => {
    const filtered = modelList.value.filter(
      (m: any) =>
        !m.model_id?.toLowerCase().includes('embedding') ||
        m.capability_tags?.includes('chat') ||
        m.capability_tags?.includes('对话'),
    );
    return filtered.length > 0 ? filtered : modelList.value;
  });

  return { embeddingModels, rerankModels, llmModels };
}
