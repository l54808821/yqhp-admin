import { requestClient } from '#/api/request';
import type { PageResult } from '#/api/types';

// 工作流类型
export type WorkflowType = 'normal' | 'performance' | 'data_generation';

// 工作流类型选项
export const WORKFLOW_TYPE_OPTIONS = [
  { label: '普通流程', value: 'normal' },
  { label: '压测流程', value: 'performance' },
  { label: '造数流程', value: 'data_generation' },
];

// 工作流类型标签颜色
export const WORKFLOW_TYPE_COLORS: Record<WorkflowType, string> = {
  normal: 'default',
  performance: 'orange',
  data_generation: 'purple',
};

// 工作流类型标签文本
export const WORKFLOW_TYPE_LABELS: Record<WorkflowType, string> = {
  normal: '普通',
  performance: '压测',
  data_generation: '造数',
};

export interface Workflow {
  id: number;
  project_id: number;
  name: string;
  code?: string;
  description?: string;
  workflow_type?: WorkflowType;
  version: number;
  definition: string;
  status: number;
  created_at?: string;
  updated_at?: string;
  created_by?: number;
  updated_by?: number;
}

export interface CreateWorkflowParams {
  project_id: number;
  name: string;
  code?: string;
  description?: string;
  workflow_type?: WorkflowType;
  definition: string;
  status?: number;
}

export interface UpdateWorkflowParams {
  name?: string;
  code?: string;
  description?: string;
  workflow_type?: WorkflowType;
  definition?: string;
  status?: number;
}

export interface WorkflowListParams {
  page?: number;
  pageSize?: number;
  projectId?: number;
  name?: string;
  code?: string;
  status?: number;
}

export interface CopyWorkflowParams {
  name: string;
  code?: string;
}

export interface ImportWorkflowParams {
  project_id: number;
  yaml_content: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors?: ValidationError[];
}

/**
 * 创建工作流
 */
export async function createWorkflowApi(params: CreateWorkflowParams) {
  return requestClient.post<Workflow>('/workflows', params);
}

/**
 * 获取工作流列表
 */
export async function getWorkflowListApi(params?: WorkflowListParams) {
  return requestClient.get<PageResult<Workflow>>('/workflows', { params });
}

/**
 * 根据项目ID获取工作流列表
 */
export async function getWorkflowsByProjectApi(projectId: number) {
  return requestClient.get<Workflow[]>(`/workflows/project/${projectId}`);
}

/**
 * 获取工作流详情
 */
export async function getWorkflowApi(id: number) {
  return requestClient.get<Workflow>(`/workflows/${id}`);
}

/**
 * 更新工作流
 */
export async function updateWorkflowApi(id: number, params: UpdateWorkflowParams) {
  return requestClient.put(`/workflows/${id}`, params);
}

/**
 * 删除工作流
 */
export async function deleteWorkflowApi(id: number) {
  return requestClient.delete(`/workflows/${id}`);
}

/**
 * 复制工作流
 */
export async function copyWorkflowApi(id: number, params: CopyWorkflowParams) {
  return requestClient.post<Workflow>(`/workflows/${id}/copy`, params);
}

/**
 * 导出工作流为 YAML
 */
export async function exportWorkflowYamlApi(id: number) {
  return requestClient.get<string>(`/workflows/${id}/yaml`, {
    responseType: 'text',
  });
}

/**
 * 导入 YAML 工作流
 */
export async function importWorkflowYamlApi(params: ImportWorkflowParams) {
  return requestClient.post<Workflow>('/workflows/import', params);
}

/**
 * 验证工作流
 */
export async function validateWorkflowApi(id: number) {
  return requestClient.post<ValidationResult>(`/workflows/${id}/validate`);
}

/**
 * 验证工作流定义
 */
export async function validateWorkflowDefinitionApi(definition: string) {
  return requestClient.post<ValidationResult>('/workflows/validate', {
    definition,
  });
}

/**
 * 更新工作流状态
 */
export async function updateWorkflowStatusApi(id: number, status: number) {
  return requestClient.put(`/workflows/${id}/status`, { status });
}
