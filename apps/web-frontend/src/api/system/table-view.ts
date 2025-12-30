import { requestClient } from '#/api/request';

export namespace TableViewApi {
  // 列固定配置
  export interface ColumnFixedConfig {
    key: string;
    fixed?: 'left' | 'right' | false;
  }

  // 视图信息
  export interface ViewInfo {
    id: number;
    name: string;
    isSystem: boolean;
    isDefault: boolean;
    columns: string[];
    columnFixed?: ColumnFixedConfig[];
    searchParams?: Record<string, any>;
    sort: number;
    createdBy?: number;
  }

  // 获取视图列表响应
  export interface GetViewsResponse {
    views: ViewInfo[];
  }

  // 保存视图请求
  export interface SaveViewRequest {
    id?: number; // 0或不传表示新建，>0表示更新
    tableKey: string;
    name: string;
    isSystem?: boolean;
    isDefault?: boolean;
    columns: string[];
    columnFixed?: ColumnFixedConfig[];
    searchParams?: Record<string, any>;
  }
}

/**
 * 获取表格视图列表
 */
export function getTableViewsApi(tableKey: string) {
  return requestClient.get<TableViewApi.GetViewsResponse>(
    `/system/table-views/${tableKey}`,
  );
}

/**
 * 保存表格视图
 */
export function saveTableViewApi(data: TableViewApi.SaveViewRequest) {
  return requestClient.post<TableViewApi.ViewInfo>('/system/table-views', data);
}

/**
 * 删除表格视图
 */
export function deleteTableViewApi(id: number) {
  return requestClient.delete(`/system/table-views/${id}`);
}

/**
 * 设置默认视图
 */
export function setDefaultViewApi(tableKey: string, viewId: number) {
  return requestClient.put(`/system/table-views/${tableKey}/default/${viewId}`);
}

/**
 * 更新视图排序
 */
export function updateViewSortApi(tableKey: string, viewIds: number[]) {
  return requestClient.put(`/system/table-views/${tableKey}/sort`, { viewIds });
}
