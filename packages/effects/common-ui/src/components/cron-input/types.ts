export type CronFieldType = 'day' | 'hour' | 'minute' | 'month' | 'week';

export type CronMode = 'every' | 'interval' | 'range' | 'specific';

export interface CronFieldState {
  mode: CronMode;
  rangeStart: number;
  rangeEnd: number;
  intervalStart: number;
  intervalStep: number;
  specificValues: number[];
}

export interface CronFields {
  minute: CronFieldState;
  hour: CronFieldState;
  day: CronFieldState;
  month: CronFieldState;
  week: CronFieldState;
}

export interface CronFieldConfig {
  key: CronFieldType;
  label: string;
  min: number;
  max: number;
  defaultStep: number;
}

export interface CronInputProps {
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  allowClear?: boolean;
}

export interface CronInputEmits {
  (e: 'change', value: string): void;
  (e: 'update:value', value: string): void;
}

export const CRON_FIELD_CONFIGS: CronFieldConfig[] = [
  { key: 'minute', label: '分钟', min: 0, max: 59, defaultStep: 5 },
  { key: 'hour', label: '小时', min: 0, max: 23, defaultStep: 1 },
  { key: 'day', label: '日', min: 1, max: 31, defaultStep: 1 },
  { key: 'month', label: '月', min: 1, max: 12, defaultStep: 1 },
  { key: 'week', label: '周', min: 0, max: 6, defaultStep: 1 },
];

export const WEEK_LABELS: Record<number, string> = {
  0: '日',
  1: '一',
  2: '二',
  3: '三',
  4: '四',
  5: '五',
  6: '六',
};
