import { requestClient } from '#/api/request';
import type { PageResult } from '#/api/types';

/** Skill 分类选项 */
export const SKILL_CATEGORY_OPTIONS = [
  '编程',
  '测试',
  '写作',
  '翻译',
  '分析',
  '设计',
  '运维',
  '其他',
];

/** Skill 图标选项 */
export const SKILL_ICON_OPTIONS = [
  { label: '代码搜索', value: 'lucide:search-code' },
  { label: '试管', value: 'lucide:test-tubes' },
  { label: '数据库', value: 'lucide:database' },
  { label: '文件文本', value: 'lucide:file-text' },
  { label: '语言', value: 'lucide:languages' },
  { label: '柱状图', value: 'lucide:bar-chart-3' },
  { label: '笔', value: 'lucide:pen-line' },
  { label: '活动', value: 'lucide:activity' },
  { label: '大脑', value: 'lucide:brain' },
  { label: '火箭', value: 'lucide:rocket' },
  { label: '盾牌', value: 'lucide:shield-check' },
  { label: '齿轮', value: 'lucide:settings' },
  { label: '魔术棒', value: 'lucide:wand-2' },
  { label: '灯泡', value: 'lucide:lightbulb' },
  { label: '工具箱', value: 'lucide:wrench' },
  { label: '终端', value: 'lucide:terminal' },
];

/** 变量声明 */
export interface SkillVariable {
  name: string;
  label: string;
  required: boolean;
  default: string;
}

/** 推荐模型参数 */
export interface RecommendedModelParams {
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
}

/** Skill 信息 */
export interface Skill {
  id: number;
  created_at?: string;
  updated_at?: string;
  created_by?: number;
  name: string;
  description: string;
  icon: string;
  category: string;
  tags: string[];
  type: number;
  is_public: number;
  version: string;
  sort: number;
  status: number;
  slug: string;
  license: string;
  compatibility: string;
  metadata_json: Record<string, string>;
  allowed_tools: string;
  author: string;
  source_url: string;
  install_count: number;
}

/** 创建 Skill 参数 */
export interface CreateSkillParams {
  name: string;
  description?: string;
  icon?: string;
  category?: string;
  tags?: string[];
  sort?: number;
  status?: number;
  slug?: string;
  license?: string;
  compatibility?: string;
  metadata_json?: Record<string, string>;
  allowed_tools?: string;
  author?: string;
  source_url?: string;
  skill_md?: string;
}

/** 更新 Skill 参数 */
export interface UpdateSkillParams {
  name?: string;
  description?: string;
  icon?: string;
  category?: string;
  tags?: string[];
  sort?: number;
  status?: number;
  slug?: string;
  license?: string;
  compatibility?: string;
  metadata_json?: Record<string, string>;
  allowed_tools?: string;
  author?: string;
  source_url?: string;
}

/** Skill 文件信息 */
export interface SkillResource {
  id: number;
  skill_id: number;
  path: string;
  content_type: string;
  size: number;
  created_at?: string;
}

/** 创建/更新文件参数 */
export interface CreateResourceParams {
  path: string;
  content: string;
  content_type?: string;
}

/** 更新文件内容参数 */
export interface UpdateResourceParams {
  content: string;
  content_type?: string;
}

/** Skill 列表查询参数 */
export interface SkillListParams {
  page?: number;
  pageSize?: number;
  name?: string;
  category?: string;
  type?: number;
  status?: number;
}

/**
 * 创建 Skill
 */
export async function createSkillApi(params: CreateSkillParams) {
  return requestClient.post<Skill>('/skills', params);
}

/**
 * 获取 Skill 列表
 */
export async function getSkillListApi(params?: SkillListParams) {
  return requestClient.get<PageResult<Skill>>('/skills', { params });
}

/**
 * 获取 Skill 详情
 */
export async function getSkillApi(id: number) {
  return requestClient.get<Skill>(`/skills/${id}`);
}

/**
 * 更新 Skill
 */
export async function updateSkillApi(id: number, params: UpdateSkillParams) {
  return requestClient.put(`/skills/${id}`, params);
}

/**
 * 删除 Skill
 */
export async function deleteSkillApi(id: number) {
  return requestClient.delete(`/skills/${id}`);
}

/**
 * 更新 Skill 状态
 */
export async function updateSkillStatusApi(id: number, status: number) {
  return requestClient.put(`/skills/${id}/status`, { status });
}

/**
 * 获取分类列表
 */
export async function getSkillCategoriesApi() {
  return requestClient.get<string[]>('/skills/categories');
}

/**
 * 导入 Skill（Agent Skills 标准 zip 格式）
 */
export async function importSkillApi(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return requestClient.post<Skill>('/skills/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

/**
 * 导出 Skill（Agent Skills 标准 zip 格式）
 * 绕过 requestClient 的 JSON 响应拦截器，直接用 fetch 下载二进制
 */
export async function exportSkillApi(
  id: number,
  options: { baseURL?: string; token?: string },
): Promise<Blob> {
  const baseURL = options.baseURL || '/api';
  const url = `${baseURL}/skills/${id}/export`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: options.token ? `Bearer ${options.token}` : '',
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `导出失败 (${response.status})`);
  }

  return response.blob();
}

/**
 * 获取 Skill 资源文件列表
 */
export async function getSkillResourcesApi(skillId: number) {
  return requestClient.get<SkillResource[]>(`/skills/${skillId}/resources`);
}

/**
 * 上传 Skill 资源文件
 */
export async function createSkillResourceApi(
  skillId: number,
  params: CreateResourceParams,
) {
  return requestClient.post<SkillResource>(`/skills/${skillId}/resources`, params);
}

/**
 * 获取 Skill 文件内容
 */
export async function getSkillResourceContentApi(
  skillId: number,
  resourceId: number,
) {
  return requestClient.get<{ content: string }>(
    `/skills/${skillId}/resources/${resourceId}/content`,
  );
}

/**
 * 更新 Skill 文件内容
 */
export async function updateSkillResourceApi(
  skillId: number,
  resourceId: number,
  params: UpdateResourceParams,
) {
  return requestClient.put(`/skills/${skillId}/resources/${resourceId}`, params);
}

/**
 * 删除 Skill 文件
 */
export async function deleteSkillResourceApi(
  skillId: number,
  resourceId: number,
) {
  return requestClient.delete(`/skills/${skillId}/resources/${resourceId}`);
}

// ============ Skills.sh 市场 API ============

/** skills.sh 搜索结果 */
export interface SkillshubSearchResult {
  name: string;
  slug: string;
  description: string;
  repository: string;
  owner: string;
  installs: number;
  weekly_installs: number;
  stars: number;
  first_seen: string;
  skill_path: string;
}

/** skills.sh 详情 */
export interface SkillshubDetail {
  name: string;
  description: string;
  repository: string;
  owner: string;
  installs: number;
  weekly_installs: number;
  stars: number;
  first_seen: string;
  skill_md_content: string;
  skill_md_preview: string;
  skill_path: string;
  install_command: string;
}

/**
 * 搜索 skills.sh 市场
 */
export async function searchSkillshubApi(query: string) {
  return requestClient.get<SkillshubSearchResult[]>('/skillshub/search', {
    params: { q: query },
  });
}

/**
 * 获取 skills.sh skill 详情
 */
export async function getSkillshubDetailApi(path: string) {
  return requestClient.get<SkillshubDetail>('/skillshub/detail', {
    params: { path },
    timeout: 30_000,
  });
}

/**
 * 从 skills.sh / GitHub 安装 skill（需要从 GitHub 下载多个文件，超时设长）
 */
export async function installFromSkillshubApi(path: string) {
  return requestClient.post<Skill>('/skillshub/install', { path }, {
    timeout: 120_000,
  });
}

/**
 * 从 URL 导入 skill
 */
export async function installFromUrlApi(url: string) {
  return requestClient.post<Skill>('/skillshub/install-url', { url }, {
    timeout: 60_000,
  });
}
