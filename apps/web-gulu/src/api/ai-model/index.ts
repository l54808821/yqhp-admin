import { requestClient } from '#/api/request';
import type { PageResult } from '#/api/types';

/** 预定义能力标签 */
export const CAPABILITY_TAG_OPTIONS = [
  '对话',
  'FIM',
  'Prefix',
  'Tools',
  '视觉',
  'MoE',
  'Math',
  'Coder',
  '推理',
  '语音',
  '联入',
  '生图',
  '视频',
  '重排序',
];

/** 预置模型信息 */
export interface PresetModel {
  /** 模型标识符（调用 API 用） */
  model_id: string;
  /** 显示名称 */
  name: string;
  /** 上下文长度 */
  context_length?: number;
  /** 参数量 */
  param_size?: string;
  /** 能力标签 */
  capability_tags?: string[];
  /** 描述 */
  description?: string;
}

/** 厂商预置配置 */
export interface ProviderPreset {
  /** 厂商名称 */
  name: string;
  /** API Base URL */
  api_base_url: string;
  /** 是否需要 API Key（如 Ollama 本地不需要） */
  require_api_key: boolean;
  /** 预置模型列表 */
  models: PresetModel[];
}

/** 厂商预置配置表 */
export const PROVIDER_PRESETS: Record<string, ProviderPreset> = {
  Ollama: {
    name: 'Ollama',
    api_base_url: 'http://localhost:11434/v1',
    require_api_key: false,
    models: [
      { model_id: 'llama3.1', name: 'Llama 3.1', param_size: '8B', context_length: 131072, capability_tags: ['对话', 'Tools'] },
      { model_id: 'qwen2.5', name: 'Qwen 2.5', param_size: '7B', context_length: 131072, capability_tags: ['对话', 'Coder', 'Math'] },
      { model_id: 'deepseek-r1', name: 'DeepSeek R1', param_size: '7B', context_length: 131072, capability_tags: ['对话', '推理'] },
      { model_id: 'codellama', name: 'Code Llama', param_size: '7B', context_length: 16384, capability_tags: ['对话', 'Coder', 'FIM'] },
      { model_id: 'gemma2', name: 'Gemma 2', param_size: '9B', context_length: 8192, capability_tags: ['对话'] },
      { model_id: 'mistral', name: 'Mistral', param_size: '7B', context_length: 32768, capability_tags: ['对话', 'Tools'] },
    ],
  },
  DeepSeek: {
    name: 'DeepSeek',
    api_base_url: 'https://api.deepseek.com/v1',
    require_api_key: true,
    models: [
      { model_id: 'deepseek-chat', name: 'DeepSeek-V3', context_length: 65536, capability_tags: ['对话', 'Tools', 'FIM', 'Prefix', 'Coder'], description: 'DeepSeek 最新对话模型，支持 64K 上下文' },
      { model_id: 'deepseek-reasoner', name: 'DeepSeek-R1', context_length: 65536, capability_tags: ['对话', '推理', 'Math', 'Coder'], description: 'DeepSeek 推理模型，擅长数学和复杂推理' },
    ],
  },
  '智谱AI': {
    name: '智谱AI',
    api_base_url: 'https://open.bigmodel.cn/api/paas/v4',
    require_api_key: true,
    models: [
      { model_id: 'glm-4-plus', name: 'GLM-4-Plus', context_length: 131072, capability_tags: ['对话', 'Tools', '推理'], description: 'GLM-4 旗舰版，128K 上下文' },
      { model_id: 'glm-4-flash', name: 'GLM-4-Flash', context_length: 131072, capability_tags: ['对话', 'Tools'], description: 'GLM-4 高速版，免费使用' },
      { model_id: 'glm-4v-plus', name: 'GLM-4V-Plus', context_length: 8192, capability_tags: ['对话', '视觉', 'Tools'], description: 'GLM-4 多模态版本，支持图像理解' },
      { model_id: 'glm-4-long', name: 'GLM-4-Long', context_length: 1048576, capability_tags: ['对话'], description: '支持 1M 超长上下文' },
    ],
  },
  Kimi: {
    name: 'Kimi',
    api_base_url: 'https://api.moonshot.cn/v1',
    require_api_key: true,
    models: [
      { model_id: 'moonshot-v1-8k', name: 'Kimi 8K', context_length: 8192, capability_tags: ['对话', 'Tools'], description: '月之暗面 Kimi，8K 上下文' },
      { model_id: 'moonshot-v1-32k', name: 'Kimi 32K', context_length: 32768, capability_tags: ['对话', 'Tools'], description: '月之暗面 Kimi，32K 上下文' },
      { model_id: 'moonshot-v1-128k', name: 'Kimi 128K', context_length: 131072, capability_tags: ['对话', 'Tools'], description: '月之暗面 Kimi，128K 上下文' },
    ],
  },
  '百度千帆': {
    name: '百度千帆',
    api_base_url: 'https://qianfan.baidubce.com/v2',
    require_api_key: true,
    models: [
      { model_id: 'ernie-4.0-8k', name: 'ERNIE 4.0', context_length: 8192, capability_tags: ['对话', 'Tools', '推理'], description: '百度文心一言旗舰模型' },
      { model_id: 'ernie-3.5-8k', name: 'ERNIE 3.5', context_length: 8192, capability_tags: ['对话', 'Tools'], description: '百度文心一言主力模型' },
      { model_id: 'ernie-speed-128k', name: 'ERNIE Speed', context_length: 131072, capability_tags: ['对话'], description: '高速推理，128K 上下文' },
    ],
  },
  '阿里通义': {
    name: '阿里通义',
    api_base_url: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    require_api_key: true,
    models: [
      { model_id: 'qwen-max', name: 'Qwen Max', context_length: 32768, capability_tags: ['对话', 'Tools', '推理', 'Coder'], description: '通义千问旗舰模型' },
      { model_id: 'qwen-plus', name: 'Qwen Plus', context_length: 131072, capability_tags: ['对话', 'Tools', 'Coder'], description: '通义千问增强版，128K 上下文' },
      { model_id: 'qwen-turbo', name: 'Qwen Turbo', context_length: 131072, capability_tags: ['对话', 'Tools'], description: '通义千问高速版' },
      { model_id: 'qwen-vl-max', name: 'Qwen VL Max', context_length: 32768, capability_tags: ['对话', '视觉'], description: '通义千问视觉理解模型' },
    ],
  },
  MiniMax: {
    name: 'MiniMax',
    api_base_url: 'https://api.minimax.chat/v1',
    require_api_key: true,
    models: [
      { model_id: 'MiniMax-Text-01', name: 'MiniMax-Text-01', context_length: 1048576, param_size: '456B', capability_tags: ['对话', 'Tools', 'MoE', 'Coder'], description: 'MiniMax 旗舰文本模型，1M 上下文' },
      { model_id: 'abab6.5s-chat', name: 'ABAB 6.5s', context_length: 245760, capability_tags: ['对话', 'Tools'], description: 'MiniMax 高速对话模型' },
    ],
  },
  OpenAI: {
    name: 'OpenAI',
    api_base_url: 'https://api.openai.com/v1',
    require_api_key: true,
    models: [
      { model_id: 'gpt-4o', name: 'GPT-4o', context_length: 131072, capability_tags: ['对话', 'Tools', '视觉', 'Coder', '推理'], description: 'OpenAI 旗舰多模态模型' },
      { model_id: 'gpt-4o-mini', name: 'GPT-4o Mini', context_length: 131072, capability_tags: ['对话', 'Tools', '视觉'], description: 'GPT-4o 轻量版' },
      { model_id: 'o1', name: 'o1', context_length: 200000, capability_tags: ['对话', '推理', 'Math', 'Coder'], description: 'OpenAI 推理模型' },
      { model_id: 'o1-mini', name: 'o1 Mini', context_length: 131072, capability_tags: ['对话', '推理', 'Math', 'Coder'], description: 'o1 轻量推理模型' },
    ],
  },
  'Azure OpenAI': {
    name: 'Azure OpenAI',
    api_base_url: '',
    require_api_key: true,
    models: [
      { model_id: 'gpt-4o', name: 'GPT-4o', context_length: 131072, capability_tags: ['对话', 'Tools', '视觉', 'Coder'] },
      { model_id: 'gpt-4o-mini', name: 'GPT-4o Mini', context_length: 131072, capability_tags: ['对话', 'Tools', '视觉'] },
    ],
  },
  '硅基流动': {
    name: '硅基流动',
    api_base_url: 'https://api.siliconflow.cn/v1',
    require_api_key: true,
    models: [
      { model_id: 'deepseek-ai/DeepSeek-V3', name: 'DeepSeek-V3', context_length: 65536, capability_tags: ['对话', 'Tools', 'Coder'], description: 'DeepSeek-V3 on SiliconFlow' },
      { model_id: 'deepseek-ai/DeepSeek-R1', name: 'DeepSeek-R1', context_length: 65536, capability_tags: ['对话', '推理', 'Math', 'Coder'], description: 'DeepSeek-R1 推理模型' },
      { model_id: 'Qwen/Qwen2.5-72B-Instruct', name: 'Qwen2.5-72B', param_size: '72B', context_length: 131072, capability_tags: ['对话', 'Tools', 'Coder'], description: '通义千问 2.5 72B' },
      { model_id: 'Qwen/Qwen2.5-7B-Instruct', name: 'Qwen2.5-7B', param_size: '7B', context_length: 131072, capability_tags: ['对话', 'Tools'], description: '通义千问 2.5 7B' },
      { model_id: 'THUDM/glm-4-9b-chat', name: 'GLM-4-9B', param_size: '9B', context_length: 131072, capability_tags: ['对话', 'Tools'], description: 'GLM-4 开源版' },
      { model_id: 'meta-llama/Meta-Llama-3.1-8B-Instruct', name: 'Llama-3.1-8B', param_size: '8B', context_length: 131072, capability_tags: ['对话', 'Tools'], description: 'Meta Llama 3.1 8B' },
    ],
  },
  '自定义': {
    name: '自定义',
    api_base_url: '',
    require_api_key: true,
    models: [],
  },
};

/** 获取所有厂商名称列表 */
export const PROVIDER_NAMES = Object.keys(PROVIDER_PRESETS);

/** AI 模型信息 */
export interface AiModel {
  id: number;
  created_at?: string;
  updated_at?: string;
  created_by?: number;
  name: string;
  provider: string;
  model_id: string;
  version?: string;
  description?: string;
  api_base_url: string;
  api_key_masked?: string;
  context_length?: number;
  param_size?: string;
  capability_tags: string[];
  custom_tags: string[];
  sort?: number;
  status: number;
}

/** 创建 AI 模型参数 */
export interface CreateAiModelParams {
  name: string;
  provider: string;
  model_id: string;
  version?: string;
  description?: string;
  api_base_url: string;
  api_key: string;
  context_length?: number;
  param_size?: string;
  capability_tags?: string[];
  custom_tags?: string[];
  sort?: number;
  status?: number;
}

/** 更新 AI 模型参数 */
export interface UpdateAiModelParams {
  name?: string;
  provider?: string;
  model_id?: string;
  version?: string;
  description?: string;
  api_base_url?: string;
  api_key?: string;
  context_length?: number;
  param_size?: string;
  capability_tags?: string[];
  custom_tags?: string[];
  sort?: number;
  status?: number;
}

/** AI 模型列表查询参数 */
export interface AiModelListParams {
  page?: number;
  pageSize?: number;
  name?: string;
  provider?: string | string[];
  status?: number;
}

/** 多模态内容块 */
export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

/** 对话消息（支持纯文本和多模态） */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | ContentPart[];
}

/** 对话请求参数 */
export interface ChatRequestParams {
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
}

/**
 * 创建 AI 模型
 */
export async function createAiModelApi(params: CreateAiModelParams) {
  return requestClient.post<AiModel>('/ai-models', params);
}

/**
 * 获取 AI 模型列表
 */
export async function getAiModelListApi(params?: AiModelListParams) {
  // 将 provider 数组转为逗号分隔字符串
  const query = params ? { ...params } : {};
  if (Array.isArray(query.provider)) {
    query.provider = query.provider.length > 0 ? query.provider.join(',') : undefined;
  }
  return requestClient.get<PageResult<AiModel>>('/ai-models', { params: query });
}

/**
 * 获取 AI 模型详情
 */
export async function getAiModelApi(id: number) {
  return requestClient.get<AiModel>(`/ai-models/${id}`);
}

/**
 * 更新 AI 模型
 */
export async function updateAiModelApi(
  id: number,
  params: UpdateAiModelParams,
) {
  return requestClient.put(`/ai-models/${id}`, params);
}

/**
 * 删除 AI 模型
 */
export async function deleteAiModelApi(id: number) {
  return requestClient.delete(`/ai-models/${id}`);
}

/**
 * 更新 AI 模型状态
 */
export async function updateAiModelStatusApi(id: number, status: number) {
  return requestClient.put(`/ai-models/${id}/status`, { status });
}

/**
 * 获取厂商列表
 */
export async function getAiModelProvidersApi() {
  return requestClient.get<string[]>('/ai-models/providers');
}


/**
 * 流式对话（SSE）
 * 返回 ReadableStreamDefaultReader 用于逐块读取
 */
export async function chatStreamApi(
  modelId: number,
  params: ChatRequestParams,
  options: {
    baseURL?: string;
    token?: string;
  },
): Promise<ReadableStreamDefaultReader<Uint8Array> | null> {
  const baseURL = options.baseURL || '/api';
  const url = `${baseURL}/ai-models/${modelId}/chat`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Accept': 'text/event-stream',
      'Authorization': options.token ? `Bearer ${options.token}` : '',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`请求失败 (${response.status}): ${errorText}`);
  }

  return response.body?.getReader() ?? null;
}

/**
 * 解析 SSE 数据块
 */
export function parseSSEChunk(chunk: string): string {
  const lines = chunk.split('\n');
  let content = '';

  for (const line of lines) {
    if (!line.startsWith('data: ')) continue;
    const data = line.slice(6);
    if (data === '[DONE]') continue;

    try {
      const parsed = JSON.parse(data);
      const delta = parsed?.choices?.[0]?.delta?.content;
      if (delta) {
        content += delta;
      }
    } catch {
      // 跳过非 JSON 数据
    }
  }

  return content;
}
