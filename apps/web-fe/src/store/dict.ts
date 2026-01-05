import type { DictApi } from '#/api/system/dict';

import { defineStore } from 'pinia';

import { getDictDataByTypeCodeApi } from '#/api';

interface DictState {
  /** 字典数据缓存 */
  cache: Record<string, DictApi.DictData[]>;
  /** 加载中的Promise缓存（防止重复请求） */
  pending: Record<string, Promise<DictApi.DictData[]>>;
}

export const useDictStore = defineStore('dict', {
  state: (): DictState => ({
    cache: {},
    pending: {},
  }),

  getters: {
    /** 获取字典数据 */
    getDict:
      (state) =>
      (typeCode: string): DictApi.DictData[] => {
        return state.cache[typeCode] || [];
      },

    /** 根据值获取标签 */
    getDictLabel:
      (state) =>
      (typeCode: string, value: string | number): string => {
        const items = state.cache[typeCode] || [];
        const item = items.find((i) => String(i.value) === String(value));
        return item?.label || String(value);
      },

    /** 根据值获取字典项 */
    getDictItem:
      (state) =>
      (
        typeCode: string,
        value: string | number,
      ): DictApi.DictData | undefined => {
        const items = state.cache[typeCode] || [];
        return items.find((i) => String(i.value) === String(value));
      },

    /** 获取字典选项（用于Select组件） */
    getDictOptions:
      (state) =>
      (typeCode: string): { label: string; value: string }[] => {
        const items = state.cache[typeCode] || [];
        return items.map((item) => ({
          label: item.label,
          value: item.value,
        }));
      },
  },

  actions: {
    /** 加载字典数据（自动去重） */
    async loadDict(typeCode: string): Promise<DictApi.DictData[]> {
      // 已缓存则直接返回
      if (this.cache[typeCode]) {
        return this.cache[typeCode];
      }

      // 正在加载中，返回同一个Promise
      if (this.pending[typeCode]) {
        return this.pending[typeCode];
      }

      // 创建新的加载Promise
      const promise = getDictDataByTypeCodeApi(typeCode)
        .then((data) => {
          this.cache[typeCode] = data;
          return data;
        })
        .finally(() => {
          delete this.pending[typeCode];
        });

      this.pending[typeCode] = promise;
      return promise;
    },

    /** 批量加载字典数据 */
    async loadDicts(typeCodes: string[]): Promise<void> {
      await Promise.all(typeCodes.map((code) => this.loadDict(code)));
    },

    /** 刷新字典缓存 */
    async refreshDict(typeCode: string): Promise<DictApi.DictData[]> {
      delete this.cache[typeCode];
      delete this.pending[typeCode];
      return this.loadDict(typeCode);
    },

    /** 清空缓存 */
    clearCache() {
      this.cache = {};
      this.pending = {};
    },
  },
});
