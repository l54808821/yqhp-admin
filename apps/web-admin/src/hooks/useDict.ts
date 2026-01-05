import type { DictApi } from '#/api/system/dict';

import { computed, onMounted, ref, watch } from 'vue';

import { useDictStore } from '#/store/dict';

/**
 * 字典数据Hook
 * @param typeCode 字典类型编码
 */
export function useDict(typeCode: string | (() => string)) {
  const dictStore = useDictStore();
  const loading = ref(false);

  const code = computed(() =>
    typeof typeCode === 'function' ? typeCode() : typeCode,
  );

  // 字典数据列表
  const dictData = computed<DictApi.DictData[]>(() => {
    return dictStore.getDict(code.value);
  });

  // 字典选项（用于Select）
  const options = computed(() => {
    return dictStore.getDictOptions(code.value);
  });

  // 根据值获取标签
  const getLabel = (value: string | number): string => {
    return dictStore.getDictLabel(code.value, value);
  };

  // 根据值获取字典项
  const getItem = (value: string | number): DictApi.DictData | undefined => {
    return dictStore.getDictItem(code.value, value);
  };

  // 加载字典数据
  const loadData = async () => {
    if (!code.value) return;
    loading.value = true;
    try {
      await dictStore.loadDict(code.value);
    } finally {
      loading.value = false;
    }
  };

  // 刷新字典数据
  const refresh = async () => {
    if (!code.value) return;
    loading.value = true;
    try {
      await dictStore.refreshDict(code.value);
    } finally {
      loading.value = false;
    }
  };

  // 监听typeCode变化
  watch(code, (newCode) => {
    if (newCode) {
      loadData();
    }
  });

  // 初始化加载
  onMounted(() => {
    loadData();
  });

  return {
    loading,
    dictData,
    options,
    getLabel,
    getItem,
    refresh,
  };
}

/**
 * 批量加载字典数据Hook
 * @param typeCodes 字典类型编码数组
 */
export function useDicts(typeCodes: string[]) {
  const dictStore = useDictStore();
  const loading = ref(false);

  // 获取指定类型的字典数据
  const getDict = (typeCode: string): DictApi.DictData[] => {
    return dictStore.getDict(typeCode);
  };

  // 获取指定类型的选项
  const getOptions = (typeCode: string) => {
    return dictStore.getDictOptions(typeCode);
  };

  // 获取标签
  const getLabel = (typeCode: string, value: string | number): string => {
    return dictStore.getDictLabel(typeCode, value);
  };

  // 加载所有字典
  const loadData = async () => {
    loading.value = true;
    try {
      await dictStore.loadDicts(typeCodes);
    } finally {
      loading.value = false;
    }
  };

  onMounted(() => {
    loadData();
  });

  return {
    loading,
    getDict,
    getOptions,
    getLabel,
  };
}
