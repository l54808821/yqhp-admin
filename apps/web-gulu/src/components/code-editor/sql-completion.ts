/**
 * SQL 自动补全 Provider
 * 支持 SQL 关键字、内置函数、数据类型的补全
 * 以及动态数据库 Schema（表名、字段名）的补全
 */
import * as monaco from 'monaco-editor';

// ==================== 类型定义 ====================

/** 数据库表信息 */
export interface TableInfo {
  name: string;
  comment?: string;
}

/** 数据库字段信息 */
export interface ColumnInfo {
  name: string;
  type: string;
  comment?: string;
  nullable?: boolean;
}

/** Schema 缓存 */
interface SchemaCache {
  tables: TableInfo[];
  columns: Map<string, ColumnInfo[]>; // tableName -> columns
  loadedAt: number;
}

// ==================== SQL 关键字定义 ====================

const SQL_KEYWORDS = [
  // DML
  'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'BETWEEN', 'LIKE',
  'IS', 'NULL', 'AS', 'ON', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'OUTER',
  'CROSS', 'FULL', 'NATURAL', 'USING', 'GROUP', 'BY', 'HAVING', 'ORDER',
  'ASC', 'DESC', 'LIMIT', 'OFFSET', 'UNION', 'ALL', 'INTERSECT', 'EXCEPT',
  'DISTINCT', 'TOP', 'INTO', 'VALUES', 'SET', 'UPDATE', 'DELETE', 'INSERT',
  'REPLACE', 'MERGE', 'TRUNCATE',
  // DDL
  'CREATE', 'ALTER', 'DROP', 'TABLE', 'INDEX', 'VIEW', 'DATABASE', 'SCHEMA',
  'ADD', 'COLUMN', 'MODIFY', 'RENAME', 'PRIMARY', 'KEY', 'FOREIGN',
  'REFERENCES', 'CONSTRAINT', 'UNIQUE', 'CHECK', 'DEFAULT', 'AUTO_INCREMENT',
  'IF', 'EXISTS', 'NOT', 'CASCADE', 'RESTRICT',
  // 控制
  'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'EXISTS',
  // 事务
  'BEGIN', 'COMMIT', 'ROLLBACK', 'SAVEPOINT', 'TRANSACTION',
  // 子查询 / CTE
  'WITH', 'RECURSIVE',
  // 其他
  'EXPLAIN', 'DESCRIBE', 'SHOW', 'USE', 'GRANT', 'REVOKE',
  'TEMPORARY', 'PARTITION', 'WINDOW', 'OVER', 'ROWS', 'RANGE',
  'UNBOUNDED', 'PRECEDING', 'FOLLOWING', 'CURRENT', 'ROW',
];

const SQL_FUNCTIONS = [
  // 聚合函数
  { name: 'COUNT', detail: '聚合 - 计数', insertText: 'COUNT(${1:*})' },
  { name: 'SUM', detail: '聚合 - 求和', insertText: 'SUM(${1:column})' },
  { name: 'AVG', detail: '聚合 - 平均值', insertText: 'AVG(${1:column})' },
  { name: 'MAX', detail: '聚合 - 最大值', insertText: 'MAX(${1:column})' },
  { name: 'MIN', detail: '聚合 - 最小值', insertText: 'MIN(${1:column})' },
  { name: 'GROUP_CONCAT', detail: '聚合 - 连接字符串', insertText: 'GROUP_CONCAT(${1:column})' },
  // 字符串函数
  { name: 'CONCAT', detail: '字符串 - 拼接', insertText: 'CONCAT(${1:str1}, ${2:str2})' },
  { name: 'SUBSTRING', detail: '字符串 - 截取子串', insertText: 'SUBSTRING(${1:str}, ${2:pos}, ${3:len})' },
  { name: 'LENGTH', detail: '字符串 - 长度', insertText: 'LENGTH(${1:str})' },
  { name: 'UPPER', detail: '字符串 - 大写', insertText: 'UPPER(${1:str})' },
  { name: 'LOWER', detail: '字符串 - 小写', insertText: 'LOWER(${1:str})' },
  { name: 'TRIM', detail: '字符串 - 去空格', insertText: 'TRIM(${1:str})' },
  { name: 'REPLACE', detail: '字符串 - 替换', insertText: 'REPLACE(${1:str}, ${2:from}, ${3:to})' },
  { name: 'LPAD', detail: '字符串 - 左填充', insertText: 'LPAD(${1:str}, ${2:len}, ${3:pad})' },
  { name: 'RPAD', detail: '字符串 - 右填充', insertText: 'RPAD(${1:str}, ${2:len}, ${3:pad})' },
  { name: 'LEFT', detail: '字符串 - 左截取', insertText: 'LEFT(${1:str}, ${2:len})' },
  { name: 'RIGHT', detail: '字符串 - 右截取', insertText: 'RIGHT(${1:str}, ${2:len})' },
  { name: 'REVERSE', detail: '字符串 - 反转', insertText: 'REVERSE(${1:str})' },
  // 数值函数
  { name: 'ABS', detail: '数值 - 绝对值', insertText: 'ABS(${1:num})' },
  { name: 'CEIL', detail: '数值 - 向上取整', insertText: 'CEIL(${1:num})' },
  { name: 'FLOOR', detail: '数值 - 向下取整', insertText: 'FLOOR(${1:num})' },
  { name: 'ROUND', detail: '数值 - 四舍五入', insertText: 'ROUND(${1:num}, ${2:decimals})' },
  { name: 'MOD', detail: '数值 - 取模', insertText: 'MOD(${1:num}, ${2:divisor})' },
  { name: 'RAND', detail: '数值 - 随机数', insertText: 'RAND()' },
  // 日期时间函数
  { name: 'NOW', detail: '日期 - 当前时间', insertText: 'NOW()' },
  { name: 'CURDATE', detail: '日期 - 当前日期', insertText: 'CURDATE()' },
  { name: 'CURTIME', detail: '日期 - 当前时间', insertText: 'CURTIME()' },
  { name: 'DATE', detail: '日期 - 提取日期', insertText: 'DATE(${1:expr})' },
  { name: 'TIME', detail: '日期 - 提取时间', insertText: 'TIME(${1:expr})' },
  { name: 'YEAR', detail: '日期 - 提取年', insertText: 'YEAR(${1:date})' },
  { name: 'MONTH', detail: '日期 - 提取月', insertText: 'MONTH(${1:date})' },
  { name: 'DAY', detail: '日期 - 提取日', insertText: 'DAY(${1:date})' },
  { name: 'HOUR', detail: '日期 - 提取小时', insertText: 'HOUR(${1:time})' },
  { name: 'MINUTE', detail: '日期 - 提取分钟', insertText: 'MINUTE(${1:time})' },
  { name: 'SECOND', detail: '日期 - 提取秒', insertText: 'SECOND(${1:time})' },
  { name: 'DATE_FORMAT', detail: '日期 - 格式化', insertText: "DATE_FORMAT(${1:date}, '${2:%Y-%m-%d}')" },
  { name: 'DATE_ADD', detail: '日期 - 加法', insertText: 'DATE_ADD(${1:date}, INTERVAL ${2:1} ${3:DAY})' },
  { name: 'DATE_SUB', detail: '日期 - 减法', insertText: 'DATE_SUB(${1:date}, INTERVAL ${2:1} ${3:DAY})' },
  { name: 'DATEDIFF', detail: '日期 - 差值', insertText: 'DATEDIFF(${1:date1}, ${2:date2})' },
  { name: 'TIMESTAMPDIFF', detail: '日期 - 时间差', insertText: 'TIMESTAMPDIFF(${1:SECOND}, ${2:start}, ${3:end})' },
  { name: 'UNIX_TIMESTAMP', detail: '日期 - Unix 时间戳', insertText: 'UNIX_TIMESTAMP(${1:date})' },
  { name: 'FROM_UNIXTIME', detail: '日期 - 从时间戳转换', insertText: 'FROM_UNIXTIME(${1:timestamp})' },
  // 条件函数
  { name: 'IF', detail: '条件 - 三元判断', insertText: 'IF(${1:condition}, ${2:true_val}, ${3:false_val})' },
  { name: 'IFNULL', detail: '条件 - NULL 替换', insertText: 'IFNULL(${1:expr}, ${2:default_val})' },
  { name: 'NULLIF', detail: '条件 - 相等返回 NULL', insertText: 'NULLIF(${1:expr1}, ${2:expr2})' },
  { name: 'COALESCE', detail: '条件 - 首个非 NULL', insertText: 'COALESCE(${1:expr1}, ${2:expr2})' },
  // 类型转换
  { name: 'CAST', detail: '转换 - 类型转换', insertText: 'CAST(${1:expr} AS ${2:type})' },
  { name: 'CONVERT', detail: '转换 - 类型/字符集', insertText: 'CONVERT(${1:expr}, ${2:type})' },
  // JSON 函数
  { name: 'JSON_EXTRACT', detail: 'JSON - 提取', insertText: "JSON_EXTRACT(${1:json}, '${2:\\$.key}')" },
  { name: 'JSON_SET', detail: 'JSON - 设置', insertText: "JSON_SET(${1:json}, '${2:\\$.key}', ${3:value})" },
  { name: 'JSON_OBJECT', detail: 'JSON - 创建对象', insertText: "JSON_OBJECT('${1:key}', ${2:value})" },
  { name: 'JSON_ARRAY', detail: 'JSON - 创建数组', insertText: 'JSON_ARRAY(${1:val1}, ${2:val2})' },
];

const SQL_DATA_TYPES = [
  // 整数
  'INT', 'INTEGER', 'TINYINT', 'SMALLINT', 'MEDIUMINT', 'BIGINT',
  // 浮点
  'FLOAT', 'DOUBLE', 'DECIMAL', 'NUMERIC',
  // 字符串
  'CHAR', 'VARCHAR', 'TEXT', 'TINYTEXT', 'MEDIUMTEXT', 'LONGTEXT',
  'BLOB', 'TINYBLOB', 'MEDIUMBLOB', 'LONGBLOB', 'BINARY', 'VARBINARY',
  // 日期
  'DATE', 'TIME', 'DATETIME', 'TIMESTAMP', 'YEAR',
  // 其他
  'BOOLEAN', 'BOOL', 'ENUM', 'SET', 'JSON', 'UUID',
];

// ==================== Schema 缓存管理 ====================

const schemaMap = new Map<string, SchemaCache>();
const CACHE_TTL = 5 * 60 * 1000; // 5 分钟

/** 获取 schema 缓存 */
function getSchemaCache(datasourceCode: string): SchemaCache | null {
  const cache = schemaMap.get(datasourceCode);
  if (!cache) return null;
  if (Date.now() - cache.loadedAt > CACHE_TTL) {
    schemaMap.delete(datasourceCode);
    return null;
  }
  return cache;
}

/** 设置表列表缓存 */
export function setTablesCache(datasourceCode: string, tables: TableInfo[]) {
  let cache = schemaMap.get(datasourceCode);
  if (!cache) {
    cache = { tables: [], columns: new Map(), loadedAt: Date.now() };
    schemaMap.set(datasourceCode, cache);
  }
  cache.tables = tables;
  cache.loadedAt = Date.now();
}

/** 设置字段列表缓存 */
export function setColumnsCache(datasourceCode: string, tableName: string, columns: ColumnInfo[]) {
  let cache = schemaMap.get(datasourceCode);
  if (!cache) {
    cache = { tables: [], columns: new Map(), loadedAt: Date.now() };
    schemaMap.set(datasourceCode, cache);
  }
  cache.columns.set(tableName.toLowerCase(), columns);
}

/** 清除 schema 缓存 */
export function clearSchemaCache(datasourceCode?: string) {
  if (datasourceCode) {
    schemaMap.delete(datasourceCode);
  } else {
    schemaMap.clear();
  }
}

// ==================== 上下文分析 ====================

/** 判断是否在表名上下文（FROM / JOIN / INTO / UPDATE / TABLE 之后） */
function isTableContext(textBeforeCursor: string): boolean {
  const upper = textBeforeCursor.toUpperCase().trimEnd();
  return /\b(FROM|JOIN|INTO|UPDATE|TABLE|TRUNCATE)\s*$/i.test(upper)
    || /\b(FROM|JOIN|INTO|UPDATE|TABLE|TRUNCATE)\s+[\w,\s]*,\s*$/i.test(upper);
}

/** 提取当前正在引用的表名（表名.字段 的场景） */
function getTablePrefix(textBeforeCursor: string): string | null {
  const match = textBeforeCursor.match(/(\w+)\.\s*$/);
  return match ? (match[1] ?? null) : null;
}

// ==================== 补全 Provider ====================

let providerDisposable: monaco.IDisposable | null = null;

/**
 * 注册 SQL 补全 Provider（全局注册一次）
 */
export function registerSqlCompletionProvider(datasourceCode?: string) {
  // 如果已注册，先注销
  if (providerDisposable) {
    providerDisposable.dispose();
  }

  // 当前活跃的 datasourceCode（通过闭包引用）
  let activeDatasourceCode = datasourceCode || '';

  providerDisposable = monaco.languages.registerCompletionItemProvider('sql', {
    triggerCharacters: ['.', ' ', '\n'],
    provideCompletionItems(model, position) {
      const word = model.getWordUntilPosition(position);
      const range: monaco.IRange = {
        startLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endLineNumber: position.lineNumber,
        endColumn: word.endColumn,
      };

      const textBeforeCursor = model.getValueInRange({
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      });

      const suggestions: monaco.languages.CompletionItem[] = [];

      // 1. 表名.字段 补全
      const tablePrefix = getTablePrefix(textBeforeCursor);
      if (tablePrefix && activeDatasourceCode) {
        const cache = getSchemaCache(activeDatasourceCode);
        if (cache) {
          const columns = cache.columns.get(tablePrefix.toLowerCase());
          if (columns) {
            for (const col of columns) {
              suggestions.push({
                label: {
                  label: col.name,
                  description: col.type,
                  detail: col.comment ? ` ${col.comment}` : undefined,
                },
                kind: monaco.languages.CompletionItemKind.Field,
                insertText: col.name,
                range,
                detail: `${col.type}${col.nullable ? ' (nullable)' : ''}`,
                documentation: col.comment || undefined,
                sortText: '0_' + col.name,
              });
            }
            return { suggestions };
          }
        }
      }

      // 2. 表名补全（FROM / JOIN / INTO 等之后）
      if (isTableContext(textBeforeCursor) && activeDatasourceCode) {
        const cache = getSchemaCache(activeDatasourceCode);
        if (cache && cache.tables.length > 0) {
          for (const table of cache.tables) {
            suggestions.push({
              label: {
                label: table.name,
                detail: table.comment ? ` ${table.comment}` : undefined,
              },
              kind: monaco.languages.CompletionItemKind.Struct,
              insertText: table.name,
              range,
              detail: table.comment || '表',
              sortText: '0_' + table.name,
            });
          }
        }
      }

      // 3. SQL 关键字
      const input = word.word.toUpperCase();
      for (const kw of SQL_KEYWORDS) {
        if (!input || kw.startsWith(input)) {
          suggestions.push({
            label: kw,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: kw,
            range,
            sortText: '1_' + kw,
          });
        }
      }

      // 4. SQL 内置函数
      for (const fn of SQL_FUNCTIONS) {
        if (!input || fn.name.startsWith(input)) {
          suggestions.push({
            label: { label: fn.name, detail: ` ${fn.detail}` },
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: fn.insertText,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
            detail: fn.detail,
            sortText: '2_' + fn.name,
          });
        }
      }

      // 5. 数据类型
      for (const dt of SQL_DATA_TYPES) {
        if (!input || dt.startsWith(input)) {
          suggestions.push({
            label: dt,
            kind: monaco.languages.CompletionItemKind.TypeParameter,
            insertText: dt,
            range,
            detail: '数据类型',
            sortText: '3_' + dt,
          });
        }
      }

      // 6. 表名补全（非上下文时，优先级较低）
      if (!tablePrefix && activeDatasourceCode) {
        const cache = getSchemaCache(activeDatasourceCode);
        if (cache) {
          for (const table of cache.tables) {
            if (!input || table.name.toUpperCase().startsWith(input)) {
              suggestions.push({
                label: {
                  label: table.name,
                  detail: table.comment ? ` ${table.comment}` : undefined,
                },
                kind: monaco.languages.CompletionItemKind.Struct,
                insertText: table.name,
                range,
                detail: table.comment || '表',
                sortText: '4_' + table.name,
              });
            }
          }
        }
      }

      return { suggestions };
    },
  });

  // 返回更新 datasourceCode 的函数
  return {
    updateDatasourceCode(code: string) {
      activeDatasourceCode = code;
    },
    dispose() {
      providerDisposable?.dispose();
      providerDisposable = null;
    },
  };
}
