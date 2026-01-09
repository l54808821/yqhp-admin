import { ref } from 'vue';

import { defineStore } from 'pinia';

import type { CategoryTreeNode, CategoryWorkflow, CreateCategoryParams, MoveCategoryParams } from '#/api/category';

import {
  createCategoryApi,
  deleteCategoryApi,
  getCategoryTreeApi,
  moveCategoryApi,
  searchCategoriesApi,
  updateCategoryApi,
} from '#/api/category';

export type { CategoryWorkflow };

export const useCategoryStore = defineStore('category', () => {
  // 分类树
  const categories = ref<CategoryTreeNode[]>([]);
  // 当前选中的分类
  const selectedCategory = ref<CategoryTreeNode | null>(null);
  // 搜索结果
  const searchResults = ref<CategoryTreeNode[]>([]);
  // 加载状态
  const loading = ref(false);
  // 搜索关键词
  const searchKeyword = ref('');

  /**
   * 加载分类树
   */
  async function loadCategories(projectId: number) {
    try {
      loading.value = true;
      categories.value = await getCategoryTreeApi(projectId);
    } finally {
      loading.value = false;
    }
  }

  /**
   * 创建分类
   */
  async function createCategory(projectId: number, params: CreateCategoryParams) {
    const category = await createCategoryApi(projectId, params);
    // 重新加载树
    await loadCategories(projectId);
    return category;
  }

  /**
   * 更新分类
   */
  async function updateCategory(id: number, params: { name?: string }, projectId: number) {
    await updateCategoryApi(id, params);
    await loadCategories(projectId);
  }

  /**
   * 删除分类
   */
  async function deleteCategory(id: number, projectId: number) {
    await deleteCategoryApi(id);
    await loadCategories(projectId);
    if (selectedCategory.value?.id === id) {
      selectedCategory.value = null;
    }
  }

  /**
   * 移动分类
   */
  async function moveCategory(id: number, params: MoveCategoryParams, projectId: number) {
    await moveCategoryApi(id, params);
    await loadCategories(projectId);
  }

  /**
   * 搜索工作流
   */
  async function search(projectId: number, keyword: string) {
    searchKeyword.value = keyword;
    if (!keyword) {
      searchResults.value = [];
      return;
    }
    const results = await searchCategoriesApi(projectId, keyword);
    searchResults.value = results.map((r) => ({
      ...r,
      children: [],
    }));
  }

  /**
   * 清除搜索
   */
  function clearSearch() {
    searchKeyword.value = '';
    searchResults.value = [];
  }

  /**
   * 设置选中的分类
   */
  function setSelectedCategory(category: CategoryTreeNode | null) {
    selectedCategory.value = category;
  }

  /**
   * 在树中查找节点
   */
  function findNodeById(id: number, nodes: CategoryTreeNode[] = categories.value): CategoryTreeNode | null {
    for (const node of nodes) {
      if (node.id === id) {
        return node;
      }
      if (node.children?.length) {
        const found = findNodeById(id, node.children);
        if (found) {
          return found;
        }
      }
    }
    return null;
  }

  /**
   * 重置状态
   */
  function $reset() {
    categories.value = [];
    selectedCategory.value = null;
    searchResults.value = [];
    searchKeyword.value = '';
    loading.value = false;
  }

  return {
    // State
    categories,
    selectedCategory,
    searchResults,
    searchKeyword,
    loading,
    // Actions
    loadCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    moveCategory,
    search,
    clearSearch,
    setSelectedCategory,
    findNodeById,
    $reset,
  };
});
