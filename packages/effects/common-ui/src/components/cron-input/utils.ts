import type {
  CronFieldConfig,
  CronFields,
  CronFieldState,
  CronFieldType,
  CronMode,
} from './types';

import { CRON_FIELD_CONFIGS, WEEK_LABELS } from './types';

export function createDefaultFieldState(
  config: CronFieldConfig,
): CronFieldState {
  return {
    mode: 'every',
    rangeStart: config.min,
    rangeEnd: config.max,
    intervalStart: config.min,
    intervalStep: config.defaultStep,
    specificValues: [],
  };
}

export function createDefaultFields(): CronFields {
  const fields = {} as CronFields;
  for (const config of CRON_FIELD_CONFIGS) {
    fields[config.key] = createDefaultFieldState(config);
  }
  return fields;
}

export function fieldStateToExpression(state: CronFieldState): string {
  switch (state.mode) {
    case 'every': {
      return '*';
    }
    case 'range': {
      return `${state.rangeStart}-${state.rangeEnd}`;
    }
    case 'interval': {
      return `${state.intervalStart}/${state.intervalStep}`;
    }
    case 'specific': {
      if (state.specificValues.length === 0) return '*';
      return [...state.specificValues].sort((a, b) => a - b).join(',');
    }
    default: {
      return '*';
    }
  }
}

export function generateCronExpression(fields: CronFields): string {
  const order: CronFieldType[] = ['second', 'minute', 'hour', 'day', 'month', 'week'];
  return order.map((key) => fieldStateToExpression(fields[key])).join(' ');
}

function parseFieldExpression(
  expr: string,
  config: CronFieldConfig,
): CronFieldState {
  const state = createDefaultFieldState(config);

  if (expr === '*') {
    state.mode = 'every';
    return state;
  }

  if (expr.includes('/')) {
    const parts = expr.split('/');
    state.mode = 'interval';
    state.intervalStart = parts[0] === '*' ? config.min : Number(parts[0]);
    state.intervalStep = Number(parts[1]);
    return state;
  }

  if (expr.includes('-') && !expr.includes(',')) {
    const parts = expr.split('-');
    state.mode = 'range';
    state.rangeStart = Number(parts[0]);
    state.rangeEnd = Number(parts[1]);
    return state;
  }

  if (expr.includes(',') || /^\d+$/.test(expr)) {
    state.mode = 'specific';
    state.specificValues = expr.split(',').map(Number);
    return state;
  }

  return state;
}

export function parseCronExpression(expr: string): CronFields | null {
  if (!expr) return null;
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 6) return null;

  const order: CronFieldType[] = ['second', 'minute', 'hour', 'day', 'month', 'week'];
  const fields = {} as CronFields;

  for (let i = 0; i < 6; i++) {
    const key = order[i]!;
    const config = CRON_FIELD_CONFIGS.find((c) => c.key === key)!;
    fields[key] = parseFieldExpression(parts[i]!, config);
  }

  return fields;
}

function isValidFieldPart(part: string, min: number, max: number): boolean {
  if (part === '*') return true;

  if (part.includes('/')) {
    const [base, step] = part.split('/');
    if (!base || !step) return false;
    const stepNum = Number(step);
    if (Number.isNaN(stepNum) || stepNum < 1) return false;
    if (base === '*') return true;
    const baseNum = Number(base);
    return !Number.isNaN(baseNum) && baseNum >= min && baseNum <= max;
  }

  if (part.includes('-')) {
    const [start, end] = part.split('-');
    if (!start || !end) return false;
    const s = Number(start);
    const e = Number(end);
    return (
      !Number.isNaN(s) &&
      !Number.isNaN(e) &&
      s >= min &&
      s <= max &&
      e >= min &&
      e <= max
    );
  }

  const values = part.split(',');
  return values.every((v) => {
    const num = Number(v);
    return !Number.isNaN(num) && num >= min && num <= max;
  });
}

export function validateCronExpression(expr: string): boolean {
  if (!expr) return false;
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 6) return false;

  const ranges: Array<[number, number]> = [
    [0, 59],
    [0, 59],
    [0, 23],
    [1, 31],
    [1, 12],
    [0, 6],
  ];

  return parts.every((part, i) => {
    const [min, max] = ranges[i]!;
    return isValidFieldPart(part, min, max);
  });
}

function expandField(part: string, min: number, max: number): number[] {
  if (part === '*') {
    return Array.from({ length: max - min + 1 }, (_, i) => min + i);
  }

  if (part.includes('/')) {
    const [base, step] = part.split('/');
    const stepNum = Number(step);
    const start = base === '*' ? min : Number(base);
    const result: number[] = [];
    for (let i = start; i <= max; i += stepNum) {
      result.push(i);
    }
    return result;
  }

  if (part.includes('-')) {
    const [start, end] = part.split('-');
    const s = Number(start);
    const e = Number(end);
    if (s <= e) {
      return Array.from({ length: e - s + 1 }, (_, i) => s + i);
    }
    // wrap-around for weekday ranges
    const result: number[] = [];
    for (let i = s; i <= max; i++) result.push(i);
    for (let i = min; i <= e; i++) result.push(i);
    return result;
  }

  return part.split(',').map(Number);
}

export function getNextExecutions(
  expr: string,
  count: number = 5,
): Date[] | null {
  if (!validateCronExpression(expr)) return null;

  const parts = expr.trim().split(/\s+/);
  const seconds = expandField(parts[0]!, 0, 59);
  const minutes = expandField(parts[1]!, 0, 59);
  const hours = expandField(parts[2]!, 0, 23);
  const days = expandField(parts[3]!, 1, 31);
  const months = expandField(parts[4]!, 1, 12);
  const weekdays = expandField(parts[5]!, 0, 6);

  const dayIsWildcard = parts[3] === '*';
  const weekIsWildcard = parts[5] === '*';

  const results: Date[] = [];
  const now = new Date();
  const current = new Date(now);
  current.setMilliseconds(0);
  current.setSeconds(current.getSeconds() + 1);

  const maxIterations = 31_557_600; // ~1 year of seconds
  let iterations = 0;

  while (results.length < count && iterations < maxIterations) {
    iterations++;

    const month = current.getMonth() + 1;
    const day = current.getDate();
    const weekday = current.getDay();
    const hour = current.getHours();
    const minute = current.getMinutes();
    const second = current.getSeconds();

    if (!months.includes(month)) {
      current.setMonth(current.getMonth() + 1, 1);
      current.setHours(0, 0, 0, 0);
      continue;
    }

    let dayMatches: boolean;
    if (dayIsWildcard && weekIsWildcard) {
      dayMatches = true;
    } else if (dayIsWildcard) {
      dayMatches = weekdays.includes(weekday);
    } else if (weekIsWildcard) {
      dayMatches = days.includes(day);
    } else {
      dayMatches = days.includes(day) || weekdays.includes(weekday);
    }

    if (!dayMatches) {
      current.setDate(current.getDate() + 1);
      current.setHours(0, 0, 0, 0);
      continue;
    }

    if (!hours.includes(hour)) {
      current.setHours(current.getHours() + 1, 0, 0, 0);
      continue;
    }

    if (!minutes.includes(minute)) {
      current.setMinutes(current.getMinutes() + 1, 0, 0);
      continue;
    }

    if (!seconds.includes(second)) {
      current.setSeconds(current.getSeconds() + 1, 0);
      continue;
    }

    results.push(new Date(current));
    current.setSeconds(current.getSeconds() + 1, 0);
  }

  return results;
}

function describeFieldPart(
  part: string,
  label: string,
  config: CronFieldConfig,
): string {
  if (part === '*') return `每${label}`;

  if (part.includes('/')) {
    const [base, step] = part.split('/');
    const start = base === '*' ? config.min : Number(base);
    return `从第${start}${label}起，每${step}${label}`;
  }

  if (part.includes('-') && !part.includes(',')) {
    const [start, end] = part.split('-');
    if (config.key === 'week') {
      return `周${WEEK_LABELS[Number(start)] ?? start}到周${WEEK_LABELS[Number(end)] ?? end}`;
    }
    return `${start}-${end}${label}`;
  }

  const values = part.split(',');
  if (config.key === 'week') {
    return values.map((v) => `周${WEEK_LABELS[Number(v)] ?? v}`).join('、');
  }
  return `第${values.join('、')}${label}`;
}

export function describeCron(expr: string): string {
  if (!expr || !validateCronExpression(expr)) return '';

  const parts = expr.trim().split(/\s+/);
  const labels = ['秒', '分', '时', '日', '月', ''];
  const descriptions: string[] = [];

  // Build from high to low: month -> week -> day -> hour -> minute -> second
  const order = [4, 5, 3, 2, 1, 0];
  for (const i of order) {
    const part = parts[i]!;
    if (part === '*') continue;
    const config = CRON_FIELD_CONFIGS[i]!;
    descriptions.push(describeFieldPart(part, labels[i]!, config));
  }

  if (descriptions.length === 0) return '每秒';
  return descriptions.join('，');
}

export function formatDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function getFieldConfig(key: CronFieldType): CronFieldConfig {
  return CRON_FIELD_CONFIGS.find((c) => c.key === key)!;
}

export function clampValue(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export type { CronMode };
