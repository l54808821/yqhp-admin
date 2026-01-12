/**
 * 关键字处理器相关类型定义
 * 用于前置处理器和后置处理器
 */

// ==================== 关键字类型 ====================

/**
 * 前置处理器关键字类型
 */
export type PreProcessorKeywordType =
  | 'set_variable'
  | 'js_script'
  | 'db_query'
  | 'wait';

/**
 * 后置处理器关键字类型
 */
export type PostProcessorKeywordType =
  | 'assertion'
  | 'extract_param'
  | 'set_variable'
  | 'js_script';

/**
 * 所有关键字类型
 */
export type KeywordType = PreProcessorKeywordType | PostProcessorKeywordType;

// ==================== 关键字配置基础结构 ====================

/**
 * 关键字配置基础接口
 */
export interface KeywordConfigBase {
  id: string;
  type: KeywordType;
  enabled: boolean;
  name?: string;
}

/**
 * 关键字配置（带具体配置）
 */
export interface KeywordConfig extends KeywordConfigBase {
  config: KeywordConfigData;
}

/**
 * 关键字配置数据联合类型
 */
export type KeywordConfigData =
  | AssertionConfig
  | ExtractParamConfig
  | JsScriptConfig
  | SetVariableConfig
  | DbQueryConfig
  | WaitConfig;

// ==================== 断言关键字 ====================

/**
 * 断言类型
 */
export type AssertionType =
  | 'status_code'
  | 'response_body'
  | 'jsonpath'
  | 'header'
  | 'response_time';

/**
 * 比较操作符
 */
export type ComparisonOperator =
  | 'eq'        // 等于
  | 'ne'        // 不等于
  | 'contains'  // 包含
  | 'not_contains' // 不包含
  | 'gt'        // 大于
  | 'lt'        // 小于
  | 'gte'       // 大于等于
  | 'lte'       // 小于等于
  | 'regex'     // 正则匹配
  | 'empty'     // 为空
  | 'not_empty'; // 不为空

/**
 * 断言关键字配置
 */
export interface AssertionConfig {
  assertType: AssertionType;
  operator: ComparisonOperator;
  expression?: string; // JSONPath 或响应头名称
  expected?: string;   // 期望值
}

/**
 * 创建默认断言配置
 */
export function createAssertionConfig(): AssertionConfig {
  return {
    assertType: 'status_code',
    operator: 'eq',
    expected: '200',
  };
}

/**
 * 断言类型选项
 */
export const ASSERTION_TYPE_OPTIONS = [
  { label: '状态码', value: 'status_code' },
  { label: '响应体', value: 'response_body' },
  { label: 'JSONPath', value: 'jsonpath' },
  { label: '响应头', value: 'header' },
  { label: '响应时间', value: 'response_time' },
];

/**
 * 比较操作符选项
 */
export const COMPARISON_OPERATOR_OPTIONS = [
  { label: '等于', value: 'eq' },
  { label: '不等于', value: 'ne' },
  { label: '包含', value: 'contains' },
  { label: '不包含', value: 'not_contains' },
  { label: '大于', value: 'gt' },
  { label: '小于', value: 'lt' },
  { label: '大于等于', value: 'gte' },
  { label: '小于等于', value: 'lte' },
  { label: '正则匹配', value: 'regex' },
  { label: '为空', value: 'empty' },
  { label: '不为空', value: 'not_empty' },
];

// ==================== 提取参数关键字 ====================

/**
 * 提取方式
 */
export type ExtractType =
  | 'jsonpath'
  | 'xpath'
  | 'regex'
  | 'header'
  | 'cookie';

/**
 * 提取参数关键字配置
 */
export interface ExtractParamConfig {
  extractType: ExtractType;
  expression: string;
  variableName: string;
  index?: number;        // 多个匹配时的索引，-1 表示全部
  defaultValue?: string; // 提取失败时的默认值
}

/**
 * 创建默认提取参数配置
 */
export function createExtractParamConfig(): ExtractParamConfig {
  return {
    extractType: 'jsonpath',
    expression: '',
    variableName: '',
    index: 0,
    defaultValue: '',
  };
}

/**
 * 提取方式选项
 */
export const EXTRACT_TYPE_OPTIONS = [
  { label: 'JSONPath', value: 'jsonpath' },
  { label: 'XPath', value: 'xpath' },
  { label: '正则表达式', value: 'regex' },
  { label: '响应头', value: 'header' },
  { label: 'Cookie', value: 'cookie' },
];

// ==================== JS 脚本关键字 ====================

/**
 * JS 脚本关键字配置
 */
export interface JsScriptConfig {
  script: string;
  stopOnError?: boolean; // 出错时是否停止执行
}

/**
 * 创建默认 JS 脚本配置
 */
export function createJsScriptConfig(): JsScriptConfig {
  return {
    script: '',
    stopOnError: true,
  };
}

// ==================== 设置变量关键字 ====================

/**
 * 变量作用域
 */
export type VariableScope = 'temp' | 'env';

/**
 * 设置变量关键字配置
 */
export interface SetVariableConfig {
  variableName: string;
  value: string;
  scope: VariableScope;
}

/**
 * 创建默认设置变量配置
 */
export function createSetVariableConfig(): SetVariableConfig {
  return {
    variableName: '',
    value: '',
    scope: 'temp',
  };
}

/**
 * 变量作用域选项
 */
export const VARIABLE_SCOPE_OPTIONS = [
  { label: '临时变量', value: 'temp' },
  { label: '环境变量', value: 'env' },
];

// ==================== 数据库查询关键字 ====================

/**
 * 数据库查询关键字配置
 */
export interface DbQueryConfig {
  datasourceId: number;
  sql: string;
  variableName?: string; // 保存结果的变量名
}

/**
 * 创建默认数据库查询配置
 */
export function createDbQueryConfig(): DbQueryConfig {
  return {
    datasourceId: 0,
    sql: '',
    variableName: '',
  };
}

// ==================== 等待关键字 ====================

/**
 * 等待关键字配置
 */
export interface WaitConfig {
  duration: number; // 等待时间，毫秒
}

/**
 * 创建默认等待配置
 */
export function createWaitConfig(): WaitConfig {
  return {
    duration: 1000,
  };
}

// ==================== 关键字工厂函数 ====================

/**
 * 创建新的关键字配置
 */
export function createKeywordConfig(type: KeywordType, name?: string): KeywordConfig {
  const id = `keyword_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  let config: KeywordConfigData;
  let defaultName: string;

  switch (type) {
    case 'assertion':
      config = createAssertionConfig();
      defaultName = '断言';
      break;
    case 'extract_param':
      config = createExtractParamConfig();
      defaultName = '提取参数';
      break;
    case 'js_script':
      config = createJsScriptConfig();
      defaultName = 'JS 脚本';
      break;
    case 'set_variable':
      config = createSetVariableConfig();
      defaultName = '设置变量';
      break;
    case 'db_query':
      config = createDbQueryConfig();
      defaultName = '数据库查询';
      break;
    case 'wait':
      config = createWaitConfig();
      defaultName = '等待';
      break;
    default:
      throw new Error(`Unknown keyword type: ${type}`);
  }

  return {
    id,
    type,
    enabled: true,
    name: name || defaultName,
    config,
  };
}

// ==================== 关键字类型元数据 ====================

/**
 * 关键字类型元数据
 */
export interface KeywordTypeMeta {
  type: KeywordType;
  label: string;
  description: string;
  icon: string;
  color: string;
  applicableTo: ('pre' | 'post')[];
}

/**
 * 关键字类型元数据注册表
 */
export const KEYWORD_TYPE_META: Record<KeywordType, KeywordTypeMeta> = {
  assertion: {
    type: 'assertion',
    label: '断言',
    description: '验证响应是否符合预期',
    icon: 'lucide:check-circle',
    color: '#52c41a',
    applicableTo: ['post'],
  },
  extract_param: {
    type: 'extract_param',
    label: '提取参数',
    description: '从响应中提取数据并保存到变量',
    icon: 'lucide:download',
    color: '#1890ff',
    applicableTo: ['post'],
  },
  js_script: {
    type: 'js_script',
    label: 'JS 脚本',
    description: '执行 JavaScript 脚本',
    icon: 'lucide:code',
    color: '#722ed1',
    applicableTo: ['pre', 'post'],
  },
  set_variable: {
    type: 'set_variable',
    label: '设置变量',
    description: '设置环境变量或临时变量',
    icon: 'lucide:variable',
    color: '#fa8c16',
    applicableTo: ['pre', 'post'],
  },
  db_query: {
    type: 'db_query',
    label: '数据库查询',
    description: '执行 SQL 查询并提取结果',
    icon: 'lucide:database',
    color: '#13c2c2',
    applicableTo: ['pre'],
  },
  wait: {
    type: 'wait',
    label: '等待',
    description: '等待指定时间',
    icon: 'lucide:clock',
    color: '#eb2f96',
    applicableTo: ['pre'],
  },
};

/**
 * 获取前置处理器可用的关键字类型
 */
export function getPreProcessorKeywordTypes(): KeywordTypeMeta[] {
  return Object.values(KEYWORD_TYPE_META).filter(meta =>
    meta.applicableTo.includes('pre')
  );
}

/**
 * 获取后置处理器可用的关键字类型
 */
export function getPostProcessorKeywordTypes(): KeywordTypeMeta[] {
  return Object.values(KEYWORD_TYPE_META).filter(meta =>
    meta.applicableTo.includes('post')
  );
}
