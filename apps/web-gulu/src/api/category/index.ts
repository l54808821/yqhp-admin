import { requestClient } from '#/api/request';

export interface Category {
  id: number;
  project_id: number;
  parent_id: number;
  name: string;
  type: 'folder' | 'workflow';
  source_id?: number;
  sort: number;
  created_at?: string;
  updated_at?: string;
}

export interface CategoryTreeNode {
  id: number;
  project_id: number;
  parent_id: number;
  name: string;
  type: 'folder' | 'workflow';
  source_id?: number;
  sort: number;
  children?: CategoryTreeNode[];
}

// 别名，用于组件中使用
export type CategoryWorkflow = CategoryTreeNode;

export interface CreateCategoryParams {
  parent_id?: number;
  name: string;
  type: 'folder' | 'workflow';
  source_id?: number;
}

export interface UpdateCategoryParams {
  name?: string;
}

export interface MoveCategoryParams {
  target_id: number;
  position: 'before' | 'after' | 'inside';
}

export interface SortItem {
  id: number;
  sort: number;
}

/**
 * 创建分类
 */
export async function createCategoryApi(projectId: number, params: CreateCategoryParams) {
  return requestClient.post<Category>(`/projects/${projectId}/categories`, params);
}

/**
 * 获取分类树
 */
export async function getCategoryTreeApi(projectId: number) {
  return requestClient.get<CategoryTreeNode[]>(`/projects/${projectId}/categories`);
}

/**
 * 搜索工作流
 */
export async function searchCategoriesApi(projectId: number, keyword: string) {
  return requestClient.get<Category[]>(`/projects/${projectId}/categories/search`, {
    params: { keyword },
  });
}

/**
 * 获取分类详情
 */
export async function getCategoryApi(id: number) {
  return requestClient.get<Category>(`/categories/${id}`);
}

/**
 * 更新分类
 */
export async function updateCategoryApi(id: number, params: UpdateCategoryParams) {
  return requestClient.put(`/categories/${id}`, params);
}

/**
 * 删除分类
 */
export async function deleteCategoryApi(id: number) {
  return requestClient.delete(`/categories/${id}`);
}

/**
 * 移动分类
 */
export async function moveCategoryApi(id: number, params: MoveCategoryParams) {
  return requestClient.put(`/categories/${id}/move`, params);
}

/**
 * 批量更新排序
 */
export async function updateCategorySortApi(items: SortItem[]) {
  return requestClient.put('/categories/sort', items);
}
