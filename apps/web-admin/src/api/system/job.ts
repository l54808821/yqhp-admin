import { requestClient } from '#/api/request';

export namespace JobApi {
  export interface Job {
    id: number;
    name: string;
    jobGroup: string;
    handlerName: string;
    cronExpression: string;
    params: string;
    status: number;
    source: string;
    sourceId: number;
    misfirePolicy: number;
    concurrent: number;
    retryCount: number;
    retryInterval: number;
    remark: string;
    createdBy: number;
    updatedBy: number;
    createdAt: string;
    updatedAt: string;
  }

  export interface ListParams {
    page?: number;
    pageSize?: number;
    name?: string;
    jobGroup?: string;
    status?: number | null;
  }

  export interface ListResult {
    list: Job[];
    total: number;
    page: number;
    pageSize: number;
  }

  export interface CreateParams {
    name: string;
    handlerName: string;
    cronExpression: string;
    jobGroup?: string;
    params?: string;
    status?: number;
    misfirePolicy?: number;
    concurrent?: number;
    retryCount?: number;
    retryInterval?: number;
    remark?: string;
  }

  export interface UpdateParams {
    id: number;
    name?: string;
    handlerName?: string;
    cronExpression?: string;
    jobGroup?: string;
    params?: string;
    misfirePolicy?: number;
    concurrent?: number;
    retryCount?: number;
    retryInterval?: number;
    remark?: string;
  }

  export interface ChangeStatusParams {
    status: number;
  }
}

/**
 * 获取定时任务列表
 */
export function getJobListApi(data: JobApi.ListParams) {
  return requestClient.post<JobApi.ListResult>('/system/jobs/list', data);
}

/**
 * 获取定时任务详情
 */
export function getJobApi(id: number) {
  return requestClient.get<JobApi.Job>(`/system/jobs/${id}`);
}

/**
 * 创建定时任务
 */
export function createJobApi(data: JobApi.CreateParams) {
  return requestClient.post<JobApi.Job>('/system/jobs', data);
}

/**
 * 更新定时任务
 */
export function updateJobApi(data: JobApi.UpdateParams) {
  return requestClient.put('/system/jobs', data);
}

/**
 * 删除定时任务
 */
export function deleteJobApi(id: number) {
  return requestClient.delete(`/system/jobs/${id}`);
}

/**
 * 变更任务状态
 */
export function changeJobStatusApi(id: number, data: JobApi.ChangeStatusParams) {
  return requestClient.put(`/system/jobs/${id}/status`, data);
}

/**
 * 立即执行一次
 */
export function runJobOnceApi(id: number) {
  return requestClient.post(`/system/jobs/${id}/run`);
}
