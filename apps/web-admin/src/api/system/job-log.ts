import { requestClient } from '#/api/request';

export namespace JobLogApi {
  export interface JobLog {
    id: number;
    jobId: number;
    jobName: string;
    handlerName: string;
    params: string;
    status: number;
    errorMessage: string;
    startTime: string;
    endTime: string;
    duration: number;
    createdAt: string;
  }

  export interface ListParams {
    page?: number;
    pageSize?: number;
    jobId?: number;
    jobName?: string;
    status?: number | null;
  }

  export interface ListResult {
    list: JobLog[];
    total: number;
    page: number;
    pageSize: number;
  }
}

/**
 * 获取任务执行日志列表
 */
export function getJobLogListApi(data: JobLogApi.ListParams) {
  return requestClient.post<JobLogApi.ListResult>('/system/job-logs/list', data);
}

/**
 * 获取任务日志详情
 */
export function getJobLogApi(id: number) {
  return requestClient.get<JobLogApi.JobLog>(`/system/job-logs/${id}`);
}

/**
 * 清空任务日志
 */
export function cleanJobLogsApi(jobId?: number) {
  return requestClient.delete('/system/job-logs', { params: { jobId } });
}
