import { requestClient } from '#/api/request';
import type { PageResult } from '#/api/types';

// 工作流类型
export type WorkflowType = 'normal' | 'performance' | 'data_generation' | 'ai_workflow';

// 工作流类型选项
export const WORKFLOW_TYPE_OPTIONS = [
  { label: '普通流程', value: 'normal' },
  { label: '压测流程', value: 'performance' },
  { label: '造数流程', value: 'data_generation' },
  { label: 'AI工作流', value: 'ai_workflow' },
];

// 工作流类型标签颜色
export const WORKFLOW_TYPE_COLORS: Record<WorkflowType, string> = {
  normal: 'default',
  performance: 'orange',
  data_generation: 'purple',
  ai_workflow: 'blue',
};

// 工作流类型标签文本
export const WORKFLOW_TYPE_LABELS: Record<WorkflowType, string> = {
  normal: '普通',
  performance: '压测',
  data_generation: '造数',
  ai_workflow: 'AI',
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

// ============ AI 工作流会话相关 ============

export interface AIConversation {
  id: number;
  workflow_id: number;
  title: string;
  variables?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
  created_by?: number;
}

export interface AIConversationMessage {
  id: number;
  conversation_id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, any>;
  created_at?: string;
}

export interface AIConversationDetail extends AIConversation {
  messages: AIConversationMessage[];
}

export interface CreateConversationParams {
  title?: string;
  variables?: Record<string, any>;
}

export interface SaveMessageParams {
  role: 'user' | 'assistant';
  content: string;
  metadata?: Record<string, any>;
}

export async function createConversationApi(workflowId: number, params?: CreateConversationParams) {
  return requestClient.post<AIConversation>(`/workflows/${workflowId}/conversations`, params || {});
}

export async function listConversationsApi(workflowId: number) {
  return requestClient.get<AIConversation[]>(`/workflows/${workflowId}/conversations`);
}

export async function getConversationApi(conversationId: number) {
  return requestClient.get<AIConversationDetail>(`/conversations/${conversationId}`);
}

export async function deleteConversationApi(conversationId: number) {
  return requestClient.delete(`/conversations/${conversationId}`);
}

export async function updateConversationTitleApi(conversationId: number, title: string) {
  return requestClient.put(`/conversations/${conversationId}/title`, { title });
}

export async function saveConversationMessageApi(conversationId: number, params: SaveMessageParams) {
  return requestClient.post<AIConversationMessage>(`/conversations/${conversationId}/messages`, params);
}

// ============ 通用附件上传 ============

export interface AttachmentResult {
  url: string;
  name: string;
  size: number;
  mimeType: string;
  type: 'image' | 'audio' | 'video' | 'file';
}

export async function uploadAttachmentApi(file: File, category = 'chat'): Promise<AttachmentResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('category', category);
  return requestClient.post<AttachmentResult>('/attachments/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

// AI 工作流配置（存储在 workflow definition 中）
export interface AIWorkflowConfig {
  opening_statement?: string;
  suggested_questions?: string[];
  conversation_variables?: Array<{
    name: string;
    type: string;
    description?: string;
    required?: boolean;
    default_value?: string;
    options?: string[];
  }>;
}
