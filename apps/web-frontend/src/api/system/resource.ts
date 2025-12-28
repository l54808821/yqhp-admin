import { requestClient } from '#/api/request';

export namespace ResourceApi {
  export interface Resource {
    id: number;
    appId: number;
    parentId: number;
    name: string;
    code: string;
    type: number; // 1:目录 2:菜单 3:按钮
    path: string;
    component: string;
    redirect: string;
    icon: string;
    sort: number;
    isHidden: boolean;
    isCache: boolean;
    isFrame: boolean;
    status: number;
    remark: string;
    createdAt: string;
    updatedAt: string;
    children?: Resource[];
  }

  export interface CreateParams {
    appId: number;
    parentId?: number;
    name: string;
    code?: string;
    type: number;
    path?: string;
    component?: string;
    redirect?: string;
    icon?: string;
    sort?: number;
    isHidden?: boolean;
    isCache?: boolean;
    isFrame?: boolean;
    status?: number;
    remark?: string;
  }

  export interface UpdateParams {
    id: number;
    parentId?: number;
    name?: string;
    code?: string;
    type?: number;
    path?: string;
    component?: string;
    redirect?: string;
    icon?: string;
    sort?: number;
    isHidden?: boolean;
    isCache?: boolean;
    isFrame?: boolean;
    status?: number;
    remark?: string;
  }
}

/**
 * 获取资源树
 * @param appId 应用ID
 * @param includeDisabled 是否包含禁用的资源（角色权限配置时需要设为 true）
 */
export function getResourceTreeApi(appId?: number, includeDisabled?: boolean) {
  const params: Record<string, any> = {};
  if (appId) params.appId = appId;
  if (includeDisabled) params.includeDisabled = 'true';
  return requestClient.get<ResourceApi.Resource[]>('/system/resources/tree', {
    params,
  });
}

/**
 * 获取所有资源
 */
export function getAllResourcesApi(appId?: number) {
  const params = appId ? { appId } : {};
  return requestClient.get<ResourceApi.Resource[]>('/system/resources/all', {
    params,
  });
}

/**
 * 获取资源详情
 */
export function getResourceApi(id: number) {
  return requestClient.get<ResourceApi.Resource>(`/system/resources/${id}`);
}

/**
 * 创建资源
 */
export function createResourceApi(data: ResourceApi.CreateParams) {
  return requestClient.post<ResourceApi.Resource>('/system/resources', data);
}

/**
 * 更新资源
 */
export function updateResourceApi(data: ResourceApi.UpdateParams) {
  return requestClient.put('/system/resources', data);
}

/**
 * 删除资源
 */
export function deleteResourceApi(id: number) {
  return requestClient.delete(`/system/resources/${id}`);
}

/**
 * 获取用户菜单
 */
export function getUserMenusApi() {
  return requestClient.get<ResourceApi.Resource[]>('/menus');
}
