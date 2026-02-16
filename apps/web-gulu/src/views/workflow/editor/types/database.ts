/**
 * 数据库节点相关类型定义
 * 参考 HTTP 节点风格，提供丰富的数据库操作配置
 */

import type { KeywordConfig } from './keyword';
import type { ParamItem } from './http';

// ==================== 数据库操作类型 ====================

/**
 * 数据库操作类型
 */
export type DatabaseAction = 'query' | 'execute' | 'count' | 'exists';

/**
 * 数据库操作颜色映射
 */
export const DB_ACTION_COLORS: Record<DatabaseAction, string> = {
  query: '#61affe',
  execute: '#49cc90',
  count: '#fca130',
  exists: '#9012fe',
};

/**
 * 数据库操作选项
 */
export const DB_ACTION_OPTIONS: { label: string; value: DatabaseAction; color: string; description: string }[] = [
  { label: 'Query', value: 'query', color: '#61affe', description: '查询数据，返回结果集' },
  { label: 'Execute', value: 'execute', color: '#49cc90', description: '执行语句（INSERT/UPDATE/DELETE）' },
  { label: 'Count', value: 'count', color: '#fca130', description: '统计记录数' },
  { label: 'Exists', value: 'exists', color: '#9012fe', description: '检查记录是否存在' },
];

// ==================== 数据库设置 ====================

/**
 * 数据库执行设置
 */
export interface DatabaseSettings {
  timeout?: number;        // 查询超时，毫秒
  maxRows?: number;        // 最大返回行数
  saveToVariable?: string; // 将结果保存到变量
}

/**
 * 创建默认数据库设置
 */
export function createDatabaseSettings(): DatabaseSettings {
  return {
    timeout: 30000,
    maxRows: 1000,
    saveToVariable: '',
  };
}

// ==================== 数据库配置 ====================

/**
 * 数据库节点配置
 */
export interface DatabaseConfig {
  datasourceCode: string;     // 数据库配置 code（从下拉选择）
  action: DatabaseAction;     // 操作类型
  sql: string;                // SQL 语句
  params: ParamItem[];        // SQL 参数（复用 ParamItem，key 作为参数名备注，value 作为参数值）
  settings: DatabaseSettings; // 执行设置
}

/**
 * 创建默认数据库配置
 */
export function createDatabaseConfig(): DatabaseConfig {
  return {
    datasourceCode: '',
    action: 'query',
    sql: '',
    params: [],
    settings: createDatabaseSettings(),
  };
}

// ==================== 数据库步骤节点 ====================

/**
 * 数据库步骤节点
 */
export interface DatabaseStepNode {
  id: string;
  type: 'database';
  name: string;
  config: DatabaseConfig;
  preProcessors?: KeywordConfig[];
  postProcessors?: KeywordConfig[];
}

// ==================== 数据库响应类型 ====================

import type { ConsoleLogEntry, AssertionResult } from '../../components/shared/types';

/**
 * 数据库响应数据
 */
export interface DatabaseResponseData {
  success: boolean;
  action: string;
  durationMs: number;

  // 请求元信息
  driver?: string;          // 数据库类型 (mysql, postgres)
  actualSql?: string;       // 变量替换后的实际 SQL

  // 查询结果
  data?: Record<string, any>[];
  columns?: string[];
  rowCount?: number;

  // 执行结果
  rowsAffected?: number;

  // count 结果
  count?: number;

  // exists 结果
  exists?: boolean;

  // 错误
  error?: string;

  // 控制台日志 & 断言
  consoleLogs?: ConsoleLogEntry[];
  assertions?: AssertionResult[];
}
