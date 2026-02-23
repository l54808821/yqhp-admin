export type ExecutionMode =
  | 'constant-vus'
  | 'ramping-vus'
  | 'constant-arrival-rate'
  | 'ramping-arrival-rate'
  | 'per-vu-iterations'
  | 'shared-iterations';

export interface Stage {
  duration: string;
  target: number;
  name?: string;
}

export interface Threshold {
  metric: string;
  condition: string;
}

export interface PerformanceConfig {
  mode: ExecutionMode;
  vus?: number;
  duration?: string;
  iterations?: number;
  stages?: Stage[];
  thresholds?: Threshold[];
  httpEngine?: 'fasthttp' | 'standard';
  tags?: Record<string, string>;
}

export const EXECUTION_MODE_OPTIONS: {
  value: ExecutionMode;
  label: string;
  desc: string;
  icon: string;
}[] = [
  {
    value: 'constant-vus',
    label: '恒定并发',
    desc: '固定数量的虚拟用户持续施压',
    icon: 'lucide:minus',
  },
  {
    value: 'ramping-vus',
    label: '阶梯并发',
    desc: '按阶段递增/递减虚拟用户数',
    icon: 'lucide:trending-up',
  },
  {
    value: 'per-vu-iterations',
    label: '按 VU 迭代',
    desc: '每个虚拟用户执行固定次数',
    icon: 'lucide:repeat',
  },
  {
    value: 'shared-iterations',
    label: '共享迭代',
    desc: '所有虚拟用户共享总迭代次数',
    icon: 'lucide:share-2',
  },
  {
    value: 'constant-arrival-rate',
    label: '恒定到达率',
    desc: '维持固定的请求到达速率 (RPS)',
    icon: 'lucide:gauge',
  },
  {
    value: 'ramping-arrival-rate',
    label: '阶梯到达率',
    desc: '按阶段调整请求到达速率',
    icon: 'lucide:activity',
  },
];

export const THRESHOLD_METRIC_OPTIONS = [
  { value: 'http_req_duration', label: '请求耗时 (http_req_duration)' },
  { value: 'http_req_failed', label: '请求失败率 (http_req_failed)' },
  { value: 'http_reqs', label: '请求数 (http_reqs)' },
  { value: 'iteration_duration', label: '迭代耗时 (iteration_duration)' },
  { value: 'iterations', label: '迭代数 (iterations)' },
];

export const STAGE_PRESETS: {
  key: string;
  label: string;
  desc: string;
  stages: Stage[];
}[] = [
  {
    key: 'spike',
    label: '峰值测试',
    desc: '模拟突发流量',
    stages: [
      { duration: '10s', target: 5, name: '预热' },
      { duration: '5s', target: 100, name: '冲刺' },
      { duration: '30s', target: 100, name: '保持峰值' },
      { duration: '5s', target: 5, name: '回落' },
      { duration: '10s', target: 5, name: '恢复' },
    ],
  },
  {
    key: 'stress',
    label: '压力测试',
    desc: '逐步增加负载直到极限',
    stages: [
      { duration: '2m', target: 50, name: '阶段1' },
      { duration: '5m', target: 50, name: '保持' },
      { duration: '2m', target: 100, name: '阶段2' },
      { duration: '5m', target: 100, name: '保持' },
      { duration: '2m', target: 200, name: '极限' },
      { duration: '5m', target: 200, name: '保持' },
      { duration: '2m', target: 0, name: '恢复' },
    ],
  },
  {
    key: 'soak',
    label: '浸泡测试',
    desc: '长时间稳定负载，检测内存泄漏',
    stages: [
      { duration: '5m', target: 50, name: '预热' },
      { duration: '30m', target: 50, name: '持续负载' },
      { duration: '5m', target: 0, name: '恢复' },
    ],
  },
  {
    key: 'ramp-up',
    label: '阶梯递增',
    desc: '从低到高逐步增加',
    stages: [
      { duration: '1m', target: 10 },
      { duration: '1m', target: 20 },
      { duration: '1m', target: 30 },
      { duration: '1m', target: 50 },
      { duration: '2m', target: 0 },
    ],
  },
];

export function getDefaultPerformanceConfig(): PerformanceConfig {
  return {
    mode: 'constant-vus',
    vus: 10,
    duration: '30s',
  };
}

export function getPerformanceConfigSummary(config: PerformanceConfig): string {
  switch (config.mode) {
    case 'constant-vus':
      return `恒定 ${config.vus ?? 0} VU, ${config.duration || '-'}`;
    case 'ramping-vus':
      return `阶梯 VU, ${config.stages?.length ?? 0} 个阶段`;
    case 'per-vu-iterations':
      return `${config.vus ?? 0} VU x ${config.iterations ?? 0} 次迭代`;
    case 'shared-iterations':
      return `${config.vus ?? 0} VU 共享 ${config.iterations ?? 0} 次迭代`;
    case 'constant-arrival-rate':
      return `恒定到达率 ${config.iterations ?? 0}/s, ${config.duration || '-'}`;
    case 'ramping-arrival-rate':
      return `阶梯到达率, ${config.stages?.length ?? 0} 个阶段`;
    default:
      return '未配置';
  }
}
