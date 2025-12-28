import { requestClient } from '#/api/request';

export namespace ApplicationApi {
  export interface Application {
    id: number;
    name: string;
    code: string;
    description: string;
    icon: string;
    sort: number;
    status: number;
    createdAt: string;
    updatedAt: string;
  }

  export interface ListParams {
    page?: number;
    pageSize?: number;
    name?: string;
    code?: string;
    status?: number;
  }

  export interface ListResult {
    list: Application[];
    total: number;
    page: number;
    pageSize: number;
  }

  export interface CreateParams {
    name: string;
    code: string;
    description?: string;
    icon?: string;
    sort?: number;
    status?: number;
  }

  export interface UpdateParams {
    id: number;
    name?: string;
    description?: string;
    icon?: string;
    sort?: number;
    status?: number;
  }
}

/**
 * 获取应用列表
 */
export function getApplicationListApi(data: ApplicationApi.ListParams) {
  return requestClient.post<ApplicationApi.ListResult>(
    '/system/applications/list',
    data,
  );
}

/**
 * 获取所有应用
 */
export function getAllApplicationsApi() {
  return requestClient.get<ApplicationApi.Application[]>(
    '/system/applications/all',
  );
}

/**
 * 获取应用详情
 */
export function getApplicationApi(id: number) {
  return requestClient.get<ApplicationApi.Application>(
    `/system/applications/${id}`,
  );
}

/**
 * 创建应用
 */
export function createApplicationApi(data: ApplicationApi.CreateParams) {
  return requestClient.post<ApplicationApi.Application>(
    '/system/applications',
    data,
  );
}

/**
 * 更新应用
 */
export function updateApplicationApi(data: ApplicationApi.UpdateParams) {
  return requestClient.put('/system/applications', data);
}

/**
 * 删除应用
 */
export function deleteApplicationApi(id: number) {
  return requestClient.delete(`/system/applications/${id}`);
}
