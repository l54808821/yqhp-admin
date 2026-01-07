import { requestClient } from '#/api/request';

export namespace DeptApi {
  export interface Dept {
    id: number;
    parentId: number;
    name: string;
    code: string;
    leader: string;
    phone: string;
    email: string;
    sort: number;
    status: number;
    remark: string;
    createdAt: string;
    updatedAt: string;
    children?: Dept[];
  }

  export interface CreateParams {
    parentId?: number;
    name: string;
    code?: string;
    leader?: string;
    phone?: string;
    email?: string;
    sort?: number;
    status?: number;
    remark?: string;
  }

  export interface UpdateParams {
    id: number;
    parentId?: number;
    name?: string;
    code?: string;
    leader?: string;
    phone?: string;
    email?: string;
    sort?: number;
    status?: number;
    remark?: string;
  }
}

/**
 * 获取部门树
 */
export function getDeptTreeApi() {
  return requestClient.get<DeptApi.Dept[]>('/system/depts/tree');
}

/**
 * 获取所有部门
 */
export function getAllDeptsApi() {
  return requestClient.get<DeptApi.Dept[]>('/system/depts/all');
}

/**
 * 获取部门详情
 */
export function getDeptApi(id: number) {
  return requestClient.get<DeptApi.Dept>(`/system/depts/${id}`);
}

/**
 * 创建部门
 */
export function createDeptApi(data: DeptApi.CreateParams) {
  return requestClient.post<DeptApi.Dept>('/system/depts', data);
}

/**
 * 更新部门
 */
export function updateDeptApi(data: DeptApi.UpdateParams) {
  return requestClient.put('/system/depts', data);
}

/**
 * 删除部门
 */
export function deleteDeptApi(id: number) {
  return requestClient.delete(`/system/depts/${id}`);
}
