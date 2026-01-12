/**
 * 变量解析工具函数
 * 支持 ${variable} 格式的变量表达式解析
 */

/**
 * 变量上下文类型
 */
export type VariableContext = Record<string, any>;

/**
 * 变量表达式正则
 * 匹配 ${variableName} 或 ${variableName:defaultValue} 格式
 */
const VARIABLE_REGEX = /\$\{([^}:]+)(?::([^}]*))?\}/g;

/**
 * 解析变量表达式
 * @param template 包含变量表达式的字符串
 * @param context 变量上下文
 * @returns 解析后的字符串
 *
 * @example
 * resolveVariables('Hello ${name}!', { name: 'World' }) // 'Hello World!'
 * resolveVariables('${missing:default}', {}) // 'default'
 * resolveVariables('${a.b.c}', { a: { b: { c: 'value' } } }) // 'value'
 */
export function resolveVariables(template: string, context: VariableContext): string {
  if (!template || typeof template !== 'string') {
    return template;
  }

  return template.replace(VARIABLE_REGEX, (match, variablePath, defaultValue) => {
    const value = getNestedValue(context, variablePath.trim());

    if (value === undefined || value === null) {
      return defaultValue !== undefined ? defaultValue : match;
    }

    // 将值转换为字符串
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  });
}

/**
 * 获取嵌套对象的值
 * @param obj 对象
 * @param path 路径，支持点号分隔，如 'a.b.c'
 * @returns 值
 *
 * @example
 * getNestedValue({ a: { b: { c: 1 } } }, 'a.b.c') // 1
 * getNestedValue({ arr: [1, 2, 3] }, 'arr.1') // 2
 */
export function getNestedValue(obj: any, path: string): any {
  if (!obj || !path) {
    return undefined;
  }

  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }

    // 支持数组索引访问
    if (Array.isArray(current)) {
      const index = parseInt(key, 10);
      if (!isNaN(index)) {
        current = current[index];
        continue;
      }
    }

    current = current[key];
  }

  return current;
}

/**
 * 设置嵌套对象的值
 * @param obj 对象
 * @param path 路径，支持点号分隔
 * @param value 要设置的值
 *
 * @example
 * const obj = {};
 * setNestedValue(obj, 'a.b.c', 1) // obj = { a: { b: { c: 1 } } }
 */
export function setNestedValue(obj: any, path: string, value: any): void {
  if (!obj || !path) {
    return;
  }

  const keys = path.split('.');
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]!;
    if (current[key] === undefined || current[key] === null) {
      // 判断下一个 key 是否是数字，决定创建数组还是对象
      const nextKey = keys[i + 1]!;
      current[key] = /^\d+$/.test(nextKey) ? [] : {};
    }
    current = current[key];
  }

  const lastKey = keys[keys.length - 1]!;
  current[lastKey] = value;
}

/**
 * 检查字符串是否包含变量表达式
 * @param str 要检查的字符串
 * @returns 是否包含变量表达式
 */
export function hasVariables(str: string): boolean {
  if (!str || typeof str !== 'string') {
    return false;
  }
  return VARIABLE_REGEX.test(str);
}

/**
 * 提取字符串中的所有变量名
 * @param str 要提取的字符串
 * @returns 变量名数组
 *
 * @example
 * extractVariableNames('${a} and ${b.c}') // ['a', 'b.c']
 */
export function extractVariableNames(str: string): string[] {
  if (!str || typeof str !== 'string') {
    return [];
  }

  const names: string[] = [];
  const regex = new RegExp(VARIABLE_REGEX.source, 'g');
  let match;

  while ((match = regex.exec(str)) !== null) {
    names.push(match[1]!.trim());
  }

  return names;
}

/**
 * 高亮变量表达式
 * 用于在 UI 中显示变量表达式的高亮效果
 * @param str 要高亮的字符串
 * @returns 包含高亮标记的 HTML 字符串
 */
export function highlightVariables(str: string): string {
  if (!str || typeof str !== 'string') {
    return str;
  }

  return str.replace(VARIABLE_REGEX, (match) => {
    return `<span class="variable-highlight">${escapeHtml(match)}</span>`;
  });
}

/**
 * 转义 HTML 特殊字符
 */
function escapeHtml(str: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return str.replace(/[&<>"']/g, (char) => htmlEntities[char] || char);
}

/**
 * 验证变量名是否有效
 * @param name 变量名
 * @returns 是否有效
 */
export function isValidVariableName(name: string): boolean {
  if (!name || typeof name !== 'string') {
    return false;
  }
  // 变量名只能包含字母、数字、下划线和点号，且不能以数字开头
  return /^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(name);
}

/**
 * 创建变量表达式
 * @param name 变量名
 * @param defaultValue 默认值（可选）
 * @returns 变量表达式字符串
 */
export function createVariableExpression(name: string, defaultValue?: string): string {
  if (defaultValue !== undefined && defaultValue !== '') {
    return `\${${name}:${defaultValue}}`;
  }
  return `\${${name}}`;
}
