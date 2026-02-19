import { requestClient } from '#/api/request';
import type { PageResult } from '#/api/types';

/** 知识库类型 */
export type KnowledgeBaseType = 'normal' | 'graph';

/** 检索模式 */
export type RetrievalMode = 'vector' | 'keyword' | 'hybrid' | 'graph' | 'hybrid_graph';

/** 文档索引状态 */
export type IndexingStatus = 'waiting' | 'parsing' | 'cleaning' | 'splitting' | 'indexing' | 'completed' | 'error' | 'paused';

/** 知识库信息 */
export interface KnowledgeBase {
  id: number;
  created_at?: string;
  updated_at?: string;
  created_by?: number;
  name: string;
  description?: string;
  type: KnowledgeBaseType;
  status: number;
  embedding_model_id?: number;
  embedding_model_name?: string;
  multimodal_enabled: boolean;
  multimodal_model_id?: number;
  graph_extract_model_id?: number;
  qdrant_collection: string;
  document_count: number;
  chunk_count: number;
  // 配置字段（来自 config JSON，服务端展开返回）
  chunk_size: number;
  chunk_overlap: number;
  similarity_threshold: number;
  top_k: number;
  retrieval_mode: RetrievalMode;
  rerank_enabled: boolean;
  rerank_model_id?: number;
  embedding_dimension?: number;
  multimodal_dimension?: number;
}

/** 创建知识库参数 */
export interface CreateKnowledgeBaseParams {
  name: string;
  description?: string;
  type?: KnowledgeBaseType;
  embedding_model_id?: number;
  embedding_model_name?: string;
  multimodal_enabled?: boolean;
  multimodal_model_id?: number;
  multimodal_model_name?: string;
  chunk_size?: number;
  chunk_overlap?: number;
  similarity_threshold?: number;
  top_k?: number;
  retrieval_mode?: RetrievalMode;
  graph_extract_model_id?: number;
}

/** 更新知识库参数 */
export interface UpdateKnowledgeBaseParams {
  name?: string;
  description?: string;
  embedding_model_id?: number;
  embedding_model_name?: string;
  multimodal_enabled?: boolean;
  multimodal_model_id?: number;
  multimodal_model_name?: string;
  chunk_size?: number;
  chunk_overlap?: number;
  similarity_threshold?: number;
  top_k?: number;
  retrieval_mode?: RetrievalMode;
  rerank_model_id?: number;
  rerank_enabled?: boolean;
  graph_extract_model_id?: number;
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
  word_count: number;
  indexing_status: IndexingStatus;
  error_message: string;
  chunk_count: number;
  token_count: number;
  parsing_completed_at?: string;
  indexing_completed_at?: string;
  chunk_setting?: ChunkSetting;
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

/** 分块信息 */
export interface SegmentInfo {
  id: number;
  document_id: number;
  document_name: string;
  content: string;
  content_type: 'text' | 'image';
  image_path?: string;
  position: number;
  word_count: number;
  enabled: boolean;
  hit_count: number;
  status: string;
  created_at?: string;
}

/** 更新分块参数 */
export interface UpdateSegmentParams {
  content?: string;
  enabled?: boolean;
}

/** 知识库检索参数 */
export interface KnowledgeSearchParams {
  query: string;
  query_type?: 'text' | 'image';
  top_k?: number;
  score?: number;
  retrieval_mode?: RetrievalMode;
  search_fields?: 'text' | 'image' | 'all';
}

/** 知识库检索结果 */
export interface KnowledgeSearchResult {
  segment_id: number;
  content: string;
  content_type: 'text' | 'image';
  image_path?: string;
  score: number;
  document_id: number;
  document_name: string;
  chunk_index: number;
  word_count: number;
  hit_count: number;
  metadata?: Record<string, unknown>;
}

/** 查询历史 */
export interface QueryHistoryItem {
  id: number;
  query_text: string;
  retrieval_mode: string;
  result_count: number;
  created_at?: string;
}

// -----------------------------------------------
// 知识库 CRUD
// -----------------------------------------------

export async function createKnowledgeBaseApi(params: CreateKnowledgeBaseParams) {
  return requestClient.post<KnowledgeBase>('/knowledge-bases', params);
}

export async function getKnowledgeBaseListApi(params?: KnowledgeBaseListParams) {
  return requestClient.get<PageResult<KnowledgeBase>>('/knowledge-bases', { params });
}

export async function getKnowledgeBaseApi(id: number) {
  return requestClient.get<KnowledgeBase>(`/knowledge-bases/${id}`);
}

export async function updateKnowledgeBaseApi(id: number, params: UpdateKnowledgeBaseParams) {
  return requestClient.put(`/knowledge-bases/${id}`, params);
}

export async function deleteKnowledgeBaseApi(id: number) {
  return requestClient.delete(`/knowledge-bases/${id}`);
}

export async function updateKnowledgeBaseStatusApi(id: number, status: number) {
  return requestClient.put(`/knowledge-bases/${id}/status`, { status });
}

// -----------------------------------------------
// 文档管理
// -----------------------------------------------

export async function uploadKnowledgeDocumentApi(kbId: number, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return requestClient.post<KnowledgeDocument>(`/knowledge-bases/${kbId}/documents`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export interface KnowledgeDocumentListParams {
  keyword?: string;
  status?: string;
}

export async function getKnowledgeDocumentListApi(
  kbId: number,
  params?: KnowledgeDocumentListParams,
) {
  return requestClient.get<KnowledgeDocument[]>(
    `/knowledge-bases/${kbId}/documents`,
    { params },
  );
}

export async function deleteKnowledgeDocumentApi(kbId: number, docId: number) {
  return requestClient.delete(`/knowledge-bases/${kbId}/documents/${docId}`);
}

export async function reprocessKnowledgeDocumentApi(kbId: number, docId: number) {
  return requestClient.post(`/knowledge-bases/${kbId}/documents/${docId}/reprocess`);
}

export async function previewDocumentChunksApi(kbId: number, params: PreviewChunksParams) {
  return requestClient.post<PreviewChunkItem[]>(`/knowledge-bases/${kbId}/documents/preview-chunks`, params);
}

export async function processDocumentApi(kbId: number, docId: number, params: ProcessDocumentParams) {
  return requestClient.put(`/knowledge-bases/${kbId}/documents/${docId}/process`, params);
}

// -----------------------------------------------
// 批量操作
// -----------------------------------------------

export async function batchDeleteDocumentsApi(kbId: number, documentIds: number[]) {
  return requestClient.post(`/knowledge-bases/${kbId}/documents/batch-delete`, { document_ids: documentIds });
}

export async function batchReprocessDocumentsApi(kbId: number, documentIds: number[]) {
  return requestClient.post(`/knowledge-bases/${kbId}/documents/batch-reprocess`, { document_ids: documentIds });
}

export async function getIndexingStatusApi(kbId: number) {
  return requestClient.get<KnowledgeDocument[]>(`/knowledge-bases/${kbId}/indexing-status`);
}

// -----------------------------------------------
// 分块管理
// -----------------------------------------------

export async function getDocumentSegmentsApi(kbId: number, docId: number, page = 1, pageSize = 20) {
  return requestClient.get<PageResult<SegmentInfo>>(`/knowledge-bases/${kbId}/documents/${docId}/segments`, {
    params: { page, pageSize },
  });
}

export async function updateSegmentApi(kbId: number, segId: number, params: UpdateSegmentParams) {
  return requestClient.patch(`/knowledge-bases/${kbId}/segments/${segId}`, params);
}

// -----------------------------------------------
// 检索与查询历史
// -----------------------------------------------

export async function searchKnowledgeBaseApi(kbId: number, params: KnowledgeSearchParams) {
  return requestClient.post<KnowledgeSearchResult[]>(`/knowledge-bases/${kbId}/search`, params);
}

export async function getQueryHistoryApi(kbId: number, limit = 20) {
  return requestClient.get<QueryHistoryItem[]>(`/knowledge-bases/${kbId}/queries`, { params: { limit } });
}
