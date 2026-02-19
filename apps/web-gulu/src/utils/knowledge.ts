/**
 * 知识库模块公共工具函数和常量
 * 消除各组件中的重复代码
 */

// -----------------------------------------------
// 常量
// -----------------------------------------------

export const PROCESSING_STATUSES = [
  'waiting',
  'parsing',
  'cleaning',
  'splitting',
  'indexing',
] as const;

export type ProcessingStatus = (typeof PROCESSING_STATUSES)[number];

export const INDEXING_STATUS_MAP: Record<string, { text: string; color: string }> = {
  waiting:   { text: '待处理', color: 'default' },
  parsing:   { text: '解析中', color: 'processing' },
  cleaning:  { text: '清洗中', color: 'processing' },
  splitting: { text: '分块中', color: 'processing' },
  indexing:  { text: '索引中', color: 'processing' },
  completed: { text: '已完成', color: 'success' },
  error:     { text: '失败',   color: 'error' },
  paused:    { text: '已暂停', color: 'warning' },
};

export const RETRIEVAL_MODE_LABELS: Record<string, string> = {
  vector:       '向量检索',
  keyword:      '关键词检索',
  hybrid:       '混合检索',
  graph:        '图谱检索',
  hybrid_graph: '向量+图谱',
};

export const KB_TYPE_OPTIONS = [
  { label: '普通知识库（向量检索）', value: 'normal' },
  { label: '图知识库（知识图谱 + 向量检索）', value: 'graph' },
];

export const POLL_INTERVAL_MS = 3000;

// -----------------------------------------------
// 格式化工具
// -----------------------------------------------

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function formatTime(dateStr?: string): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateTime(dateStr?: string): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// -----------------------------------------------
// 状态工具
// -----------------------------------------------

export function getStatusInfo(status: string) {
  return INDEXING_STATUS_MAP[status] ?? { text: status, color: 'default' };
}

export function isProcessingStatus(status: string): boolean {
  return PROCESSING_STATUSES.includes(status as ProcessingStatus);
}

// -----------------------------------------------
// 召回结果渲染
// -----------------------------------------------

/**
 * 将分块内容中的 Markdown 图片语法渲染为 <img> 标签
 * 支持 https:// 和 /api/ 路径
 */
export function renderChunkContent(content: string): string {
  if (!content) return '';
  return content
    .replace(
      /!\[([^\]]*)\]\(((?:https?:\/\/|\/api\/)[^)]+)\)/g,
      '<img src="$2" alt="$1" class="inline-result-image" loading="lazy" />',
    )
    .replace(/\n/g, '<br />');
}
