// 从全局 common-ui 导出基础组件和类型
export {
  AutoHeightTable,
  useView,
} from '@vben/common-ui';

export type {
  ColumnConfig,
  ColumnFixedConfig,
  SearchFieldConfig,
  SearchTableProps,
  ViewApi,
  ViewConfig,
} from '@vben/common-ui';

// 导出应用层包装的 SearchTable（自动注入 viewApi 和处理 dict）
export { default as SearchTable } from './AppSearchTable.vue';

// 导出预配置的视图 API
export { viewApi } from './viewApi';
