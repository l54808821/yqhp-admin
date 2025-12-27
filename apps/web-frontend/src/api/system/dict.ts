import { requestClient } from '#/api/request';

export namespace DictApi {
  export interface DictType {
    id: number;
    name: string;
    code: string;
    status: number;
    remark: string;
    createdAt: string;
    updatedAt: string;
    items?: DictData[];
  }

  export interface DictData {
    id: number;
    typeCode: string;
    label: string;
    value: string;
    sort: number;
    status: number;
    isDefault: boolean;
    cssClass: string;
    listClass: string;
    remark: string;
    createdAt: string;
    updatedAt: string;
  }

  export interface ListTypesParams {
    page?: number;
    pageSize?: number;
    name?: string;
    code?: string;
    status?: number;
  }

  export interface ListTypesResult {
    list: DictType[];
    total: number;
    page: number;
    pageSize: number;
  }

  export interface ListDataParams {
    page?: number;
    pageSize?: number;
    typeCode?: string;
    label?: string;
    status?: number;
  }

  export interface ListDataResult {
    list: DictData[];
    total: number;
    page: number;
    pageSize: number;
  }

  export interface CreateTypeParams {
    name: string;
    code: string;
    status?: number;
    remark?: string;
  }

  export interface UpdateTypeParams {
    id: number;
    name?: string;
    status?: number;
    remark?: string;
  }

  export interface CreateDataParams {
    typeCode: string;
    label: string;
    value: string;
    sort?: number;
    status?: number;
    isDefault?: boolean;
    cssClass?: string;
    listClass?: string;
    remark?: string;
  }

  export interface UpdateDataParams {
    id: number;
    label?: string;
    value?: string;
    sort?: number;
    status?: number;
    isDefault?: boolean;
    cssClass?: string;
    listClass?: string;
    remark?: string;
  }
}

/**
 * 获取字典类型列表
 */
export function getDictTypeListApi(data: DictApi.ListTypesParams) {
  return requestClient.post<DictApi.ListTypesResult>(
    '/system/dict/types/list',
    data,
  );
}

/**
 * 获取字典类型详情
 */
export function getDictTypeApi(id: number) {
  return requestClient.get<DictApi.DictType>(`/system/dict/types/${id}`);
}

/**
 * 创建字典类型
 */
export function createDictTypeApi(data: DictApi.CreateTypeParams) {
  return requestClient.post<DictApi.DictType>('/system/dict/types', data);
}

/**
 * 更新字典类型
 */
export function updateDictTypeApi(data: DictApi.UpdateTypeParams) {
  return requestClient.put('/system/dict/types', data);
}

/**
 * 删除字典类型
 */
export function deleteDictTypeApi(id: number) {
  return requestClient.delete(`/system/dict/types/${id}`);
}

/**
 * 获取字典数据列表
 */
export function getDictDataListApi(data: DictApi.ListDataParams) {
  return requestClient.post<DictApi.ListDataResult>(
    '/system/dict/data/list',
    data,
  );
}

/**
 * 根据类型编码获取字典数据
 */
export function getDictDataByTypeCodeApi(typeCode: string) {
  return requestClient.get<DictApi.DictData[]>(
    `/system/dict/data/type/${typeCode}`,
  );
}

/**
 * 创建字典数据
 */
export function createDictDataApi(data: DictApi.CreateDataParams) {
  return requestClient.post<DictApi.DictData>('/system/dict/data', data);
}

/**
 * 更新字典数据
 */
export function updateDictDataApi(data: DictApi.UpdateDataParams) {
  return requestClient.put('/system/dict/data', data);
}

/**
 * 删除字典数据
 */
export function deleteDictDataApi(id: number) {
  return requestClient.delete(`/system/dict/data/${id}`);
}
