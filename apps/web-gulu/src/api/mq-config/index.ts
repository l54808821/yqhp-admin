import { requestClient } from '#/api/request';
import type { PageResult } from '#/api/types';

export interface MQConfig {
  id: number;
  project_id: number;
  env_id: number;
  name: string;
  code: string;
  type: 'kafka' | 'rabbitmq' | 'rocketmq';
  brokers: string;
  topic?: string;
  group_id?: string;
  username?: string;
  password?: string;
  options?: string;
  description?: string;
  status: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreateMQConfigParams {
  project_id: number;
  env_id: number;
  name: string;
  code: string;
  type: string;
  brokers: string;
  topic?: string;
  group_id?: string;
  username?: string;
  password?: string;
  options?: string;
  description?: string;
  status?: number;
}

export interface UpdateMQConfigParams {
  name?: string;
  type?: string;
  brokers?: string;
  topic?: string;
  group_id?: string;
  username?: string;
  password?: string;
  options?: string;
  description?: string;
  status?: number;
}

/**
 * 创建MQ配置
 */
export async function createMQConfigApi(params: CreateMQConfigParams) {
  return requestClient.post<MQConfig>('/mq-configs', params);
}

/**
 * 获取MQ配置列表
 */
export async function getMQConfigListApi(params?: any) {
  return requestClient.get<PageResult<MQConfig>>('/mq-configs', { params });
}

/**
 * 根据环境ID获取MQ配置列表
 */
export async function getMQConfigsByEnvApi(envId: number) {
  return requestClient.get<MQConfig[]>(`/mq-configs/env/${envId}`);
}

/**
 * 获取MQ配置详情
 */
export async function getMQConfigApi(id: number) {
  return requestClient.get<MQConfig>(`/mq-configs/${id}`);
}

/**
 * 更新MQ配置
 */
export async function updateMQConfigApi(id: number, params: UpdateMQConfigParams) {
  return requestClient.put(`/mq-configs/${id}`, params);
}

/**
 * 删除MQ配置
 */
export async function deleteMQConfigApi(id: number) {
  return requestClient.delete(`/mq-configs/${id}`);
}
