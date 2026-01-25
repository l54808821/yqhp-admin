/**
 * HTTP 节点相关类型定义
 * ApiFox 风格的 HTTP 请求配置
 */

// ==================== 参数相关类型 ====================

/**
 * 参数项
 */
export interface ParamItem {
  id: string;
  enabled: boolean;
  key: string;
  value: string;
  type?: 'text' | 'file';
  description?: string;
}

/**
 * 创建新的参数项
 */
export function createParamItem(partial?: Partial<ParamItem>): ParamItem {
  return {
    id: `param_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    enabled: true,
    key: '',
    value: '',
    type: 'text',
    description: '',
    ...partial,
  };
}

// ==================== 请求体相关类型 ====================

/**
 * 请求体类型
 */
export type BodyType =
  | 'none'
  | 'form-data'
  | 'x-www-form-urlencoded'
  | 'json'
  | 'xml'
  | 'text'
  | 'binary'
  | 'graphql'
  | 'msgpack';

/**
 * 请求体配置
 */
export interface BodyConfig {
  type: BodyType;
  formData?: ParamItem[];
  urlencoded?: ParamItem[];
  raw?: string;
  binary?: {
    filename: string;
    content?: string;
  };
  graphql?: {
    query: string;
    variables?: string;
  };
}

/**
 * 创建默认请求体配置
 */
export function createBodyConfig(): BodyConfig {
  return {
    type: 'none',
    formData: [],
    urlencoded: [],
    raw: '',
  };
}

// ==================== 认证相关类型 ====================

/**
 * 认证类型
 */
export type AuthType = 'none' | 'basic' | 'bearer' | 'apikey';

/**
 * Basic Auth 配置
 */
export interface BasicAuthConfig {
  username: string;
  password: string;
}

/**
 * Bearer Token 配置
 */
export interface BearerAuthConfig {
  token: string;
}

/**
 * API Key 配置
 */
export interface ApiKeyAuthConfig {
  key: string;
  value: string;
  addTo: 'header' | 'query';
}

/**
 * 认证配置
 */
export interface AuthConfig {
  type: AuthType;
  basic?: BasicAuthConfig;
  bearer?: BearerAuthConfig;
  apikey?: ApiKeyAuthConfig;
}

/**
 * 创建默认认证配置
 */
export function createAuthConfig(): AuthConfig {
  return {
    type: 'none',
  };
}

// ==================== HTTP 设置相关类型 ====================

/**
 * HTTP 设置
 */
export interface HttpSettings {
  connectTimeout?: number; // 连接超时，毫秒
  readTimeout?: number; // 读取超时，毫秒
  followRedirects?: boolean; // 是否跟随重定向
  maxRedirects?: number; // 最大重定向次数
  verifySsl?: boolean; // 是否验证 SSL
  saveCookies?: boolean; // 是否保存 Cookie
}

/**
 * 创建默认 HTTP 设置
 */
export function createHttpSettings(): HttpSettings {
  return {
    connectTimeout: 30000,
    readTimeout: 30000,
    followRedirects: true,
    maxRedirects: 10,
    verifySsl: true,
    saveCookies: true,
  };
}

// ==================== HTTP 请求方法 ====================

/**
 * HTTP 请求方法
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

/**
 * HTTP 方法颜色映射
 */
export const HTTP_METHOD_COLORS: Record<HttpMethod, string> = {
  GET: '#61affe',
  POST: '#49cc90',
  PUT: '#fca130',
  DELETE: '#f93e3e',
  PATCH: '#50e3c2',
  HEAD: '#9012fe',
  OPTIONS: '#0d5aa7',
};

// ==================== HTTP 配置 ====================

/**
 * HTTP 配置
 */
export interface HttpConfig {
  method: HttpMethod;
  url: string;
  domainCode?: string;
  params?: ParamItem[];
  headers?: ParamItem[];
  cookies?: ParamItem[];
  body?: BodyConfig;
  auth?: AuthConfig;
  settings?: HttpSettings;
}

/**
 * 创建默认 HTTP 配置
 */
export function createHttpConfig(): HttpConfig {
  return {
    method: 'GET',
    url: '',
    domainCode: '',
    params: [],
    headers: [],
    cookies: [],
    body: createBodyConfig(),
    auth: createAuthConfig(),
    settings: createHttpSettings(),
  };
}

// ==================== HTTP 步骤节点 ====================

/**
 * HTTP 步骤节点
 */
export interface HttpStepNode {
  id: string;
  type: 'http';
  name: string;
  config: HttpConfig;
  preProcessors?: KeywordConfig[];
  postProcessors?: KeywordConfig[];
}

// ==================== 响应相关类型 ====================

/**
 * 响应体类型
 */
export type ResponseBodyType = 'json' | 'xml' | 'html' | 'text' | 'binary';

// 从共享模块导入类型
import type {
  ConsoleLogEntry,
  AssertionResult as SharedAssertionResult,
} from '../../components/shared/types';

/**
 * 断言结果（扩展共享类型）
 */
export interface AssertionResult extends SharedAssertionResult {
  id: string;
  expected?: string;
  actual?: string;
}

export interface ResponseData {
  statusCode: number;
  statusText: string;
  duration: number; // 毫秒
  size: number; // 字节
  headers: Record<string, string>;
  cookies: Record<string, string>;
  body: string;
  bodyType: ResponseBodyType;
  assertions?: AssertionResult[];
  consoleLogs?: ConsoleLogEntry[];
  actualRequest?: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: string;
  };
}

// ==================== 关键字相关类型（导入） ====================

import type { KeywordConfig } from './keyword';
export type { KeywordConfig };
