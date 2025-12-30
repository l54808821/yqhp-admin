import type { TableColumnType } from 'ant-design-vue';

// 搜索字段配置
export interface SearchFieldConfig {
  // 字段名
  field: string;
  // 显示标签
  label: string;
  // 组件类型
  type: 'input' | 'select' | 'date' | 'dateRange' | 'dict' | 'custom';
  // 占位符
  placeholder?: string;
  // 宽度
  width?: number | string;
  // 默认值
  defaultValue?: any;
  // 选项（select类型）
  options?: { label: string; value: any }[];
  // 字典编码（dict类型）
  dictCode?: string;
  // 是否默认显示（折叠时）
  defaultShow?: boolean;
}

// 列配置扩展
export interface ColumnConfig extends TableColumnType {
  // 是否默认显示
  defaultShow?: boolean;
  // 是否可排序调整
  sortable?: boolean;
  // 锁定固定位置（不允许用户修改）
  fixedLock?: boolean;
}

// 列固定配置
export interface ColumnFixedConfig {
  key: string;
  fixed?: 'left' | 'right' | false;
}

// 视图配置
export interface ViewConfig {
  // 视图ID（数据库主键，0表示新建）
  id: number;
  // 视图名称
  name: string;
  // 是否系统视图
  isSystem?: boolean;
  // 是否默认视图
  isDefault?: boolean;
  // 显示的列（按顺序）
  columns: string[];
  // 列固定配置
  columnFixed?: ColumnFixedConfig[];
  // 搜索条件
  searchParams?: Record<string, any>;
}

// 组件属性
export interface SearchTableProps {
  // 唯一标识（用于存储视图配置）
  tableKey: string;
  // 搜索字段配置
  searchFields?: SearchFieldConfig[];
  // 表格列配置
  columns: ColumnConfig[];
  // 数据源
  dataSource: any[];
  // 加载状态
  loading?: boolean;
  // 总数
  total?: number;
  // 当前页
  page?: number;
  // 每页条数
  pageSize?: number;
  // 行键
  rowKey?: string;
  // 横向滚动宽度
  scrollX?: number;
  // 是否显示分页
  showPagination?: boolean;
  // 是否显示新增按钮
  showAdd?: boolean;
  // 新增按钮文字
  addText?: string;
  // 是否使用卡片包裹
  useCard?: boolean;
  // 默认展开所有行（树形表格）
  defaultExpandAllRows?: boolean;
  // 默认折叠搜索区域的行数
  defaultCollapsedRows?: number;
}
