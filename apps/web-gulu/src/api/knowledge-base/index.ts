import { requestClient } from '#/api/request';
import type { PageResult } from '#/api/types';

/** 知识库类型 */
export type KnowledgeBaseType = 'normal' | 'graph';

/** 知识库信息 */
export interface KnowledgeBase {
  id: number;
  created_at?: string;
  updated_at?: string;
  created_by?: number;
  name: string;
  description: string;
  type: KnowledgeBaseType;
  status: number;
  embedding_model_id?: number;
  embedding_model_name: string;
  embedding_dimension: number;
  chunk_size: number;
  chunk_overlap: number;
  similarity_threshold: number;
  top_k: number;
  qdrant_collection: string;
  document_count: number;
  chunk_count: number;
}

/** 创建知识库参数 */
export interface CreateKnowledgeBaseParams {
  name: string;
  description?: string;
  type?: KnowledgeBaseType;
  embedding_model_id?: number;
  embedding_model_name?: string;
  embedding_dimension?: number;
  chunk_size?: number;
  chunk_overlap?: number;
  similarity_threshold?: number;
  top_k?: number;
}

/** 更新知识库参数 */
export interface UpdateKnowledgeBaseParams {
  name?: string;
  description?: string;
  embedding_model_id?: number;
  embedding_model_name?: string;
  embedding_dimension?: number;
  chunk_size?: number;
  chunk_overlap?: number;
  similarity_threshold?: number;
  top_k?: number;
}

/** 知识库列表查询参数 */
export interface KnowledgeBaseListParams {
  page?: number;
  pageSize?: number;
  name?: string;
  type?: string;
  status?: number;
}

/** 知识库文档信息 */
export interface KnowledgeDocument {
  id: number;
  created_at?: string;
  updated_at?: string;
  knowledge_base_id: number;
  name: string;
  file_type: string;
  file_size: number;
  status: string;
  error_message: string;
  chunk_count: number;
  token_count: number;
}

/** 创建文档参数（文本模式） */
export interface CreateDocumentParams {
  name: string;
  file_type?: string;
  content?: string;
}

/** 文档分块信息 */
export interface DocumentChunk {
  chunk_index: number;
  content: string;
  char_count: number;
  enabled: boolean;
}

/** 分段设置 */
export interface ChunkSetting {
  separator?: string;
  chunk_size?: number;
  chunk_overlap?: number;
  clean_whitespace?: boolean;
  remove_urls?: boolean;
}

/** 分块预览请求 */
export interface PreviewChunksParams {
  document_id?: number;
  content?: string;
  chunk_setting?: ChunkSetting;
}

/** 分块预览结果 */
export interface PreviewChunkItem {
  index: number;
  content: string;
  char_count: number;
}

/** 处理文档请求 */
export interface ProcessDocumentParams {
  chunk_setting?: ChunkSetting;
}

/** 知识库检索参数 */
export interface KnowledgeSearchParams {
  query: string;
  top_k?: number;
  score?: number;
}

/** 知识库检索结果 */
export interface KnowledgeSearchResult {
  content: string;
  score: number;
  document_id: number;
  document_name: string;
  chunk_index: number;
  metadata?: Record<string, unknown>;
}

// -----------------------------------------------
// API 方法
// -----------------------------------------------

/**
 * 创建知识库
 */
export async function createKnowledgeBaseApi(params: CreateKnowledgeBaseParams) {
  return requestClient.post<KnowledgeBase>('/knowledge-bases', params);
}

/**
 * 获取知识库列表
 */
export async function getKnowledgeBaseListApi(params?: KnowledgeBaseListParams) {
  return requestClient.get<PageResult<KnowledgeBase>>('/knowledge-bases', { params });
}

/**
 * 获取知识库详情
 */
export async function getKnowledgeBaseApi(id: number) {
  return requestClient.get<KnowledgeBase>(`/knowledge-bases/${id}`);
}

/**
 * 更新知识库
 */
export async function updateKnowledgeBaseApi(id: number, params: UpdateKnowledgeBaseParams) {
  return requestClient.put(`/knowledge-bases/${id}`, params);
}

/**
 * 删除知识库
 */
export async function deleteKnowledgeBaseApi(id: number) {
  return requestClient.delete(`/knowledge-bases/${id}`);
}

/**
 * 更新知识库状态
 */
export async function updateKnowledgeBaseStatusApi(id: number, status: number) {
  return requestClient.put(`/knowledge-bases/${id}/status`, { status });
}

/**
 * 上传知识库文档（文件模式）
 */
export async function uploadKnowledgeDocumentApi(kbId: number, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return requestClient.post<KnowledgeDocument>(`/knowledge-bases/${kbId}/documents`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

/**
 * 创建知识库文档（文本模式）
 */
export async function createKnowledgeDocumentApi(kbId: number, params: CreateDocumentParams) {
  return requestClient.post<KnowledgeDocument>(`/knowledge-bases/${kbId}/documents`, params);
}

/**
 * 获取知识库文档列表
 */
export async function getKnowledgeDocumentListApi(kbId: number) {
  return requestClient.get<KnowledgeDocument[]>(`/knowledge-bases/${kbId}/documents`);
}

/**
 * 删除知识库文档
 */
export async function deleteKnowledgeDocumentApi(kbId: number, docId: number) {
  return requestClient.delete(`/knowledge-bases/${kbId}/documents/${docId}`);
}

/**
 * 预览文档分块（不保存到 Qdrant）
 */
export async function previewDocumentChunksApi(kbId: number, params: PreviewChunksParams) {
  return requestClient.post<PreviewChunkItem[]>(`/knowledge-bases/${kbId}/documents/preview-chunks`, params);
}

/**
 * 确认分段参数并开始处理文档
 */
export async function processDocumentApi(kbId: number, docId: number, params: ProcessDocumentParams) {
  return requestClient.put(`/knowledge-bases/${kbId}/documents/${docId}/process`, params);
}

/**
 * 获取文档分块列表
 */
export async function getDocumentChunksApi(kbId: number, docId: number) {
  return requestClient.get<DocumentChunk[]>(`/knowledge-bases/${kbId}/documents/${docId}/chunks`);
}

/**
 * 重新处理知识库文档
 */
export async function reprocessKnowledgeDocumentApi(kbId: number, docId: number) {
  return requestClient.post(`/knowledge-bases/${kbId}/documents/${docId}/reprocess`);
}

/**
 * 知识库检索测试
 */
export async function searchKnowledgeBaseApi(kbId: number, params: KnowledgeSearchParams) {
  return requestClient.post<KnowledgeSearchResult[]>(`/knowledge-bases/${kbId}/search`, params);
}
