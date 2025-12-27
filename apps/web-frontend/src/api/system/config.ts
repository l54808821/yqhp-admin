import { requestClient } from '#/api/request';

export namespace ConfigApi {
  export interface Config {
    id: number;
    name: string;
    key: string;
    value: string;
    type: string;
    isBuilt: boolean;
    remark: string;
    createdAt: string;
    updatedAt: string;
  }

  export interface ListParams {
    page?: number;
    pageSize?: number;
    name?: string;
    key?: string;
  }

  export interface ListResult {
    list: Config[];
    total: number;
    page: number;
    pageSize: number;
  }

  export interface CreateParams {
    name: string;
    key: string;
    value?: string;
    type?: string;
    isBuilt?: boolean;
    remark?: string;
  }

  export interface UpdateParams {
    id: number;
    name?: string;
    value?: string;
    type?: string;
    remark?: string;
  }
}

/**
 * 获取配置列表
 */
export function getConfigListApi(data: ConfigApi.ListParams) {
  return requestClient.post<ConfigApi.ListResult>('/system/configs/list', data);
}

/**
 * 获取配置详情
 */
export function getConfigApi(id: number) {
  return requestClient.get<ConfigApi.Config>(`/system/configs/${id}`);
}

/**
 * 根据Key获取配置
 */
export function getConfigByKeyApi(key: string) {
  return requestClient.get<ConfigApi.Config>(`/system/configs/key/${key}`);
}

/**
 * 创建配置
 */
export function createConfigApi(data: ConfigApi.CreateParams) {
  return requestClient.post<ConfigApi.Config>('/system/configs', data);
}

/**
 * 更新配置
 */
export function updateConfigApi(data: ConfigApi.UpdateParams) {
  return requestClient.put('/system/configs', data);
}

/**
 * 删除配置
 */
export function deleteConfigApi(id: number) {
  return requestClient.delete(`/system/configs/${id}`);
}

/**
 * 刷新配置缓存
 */
export function refreshConfigApi() {
  return requestClient.post('/system/configs/refresh');
}

