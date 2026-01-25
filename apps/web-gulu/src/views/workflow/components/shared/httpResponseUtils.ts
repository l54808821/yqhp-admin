/**
 * HTTP 响应数据统一转换工具
 * 将不同来源的响应数据转换为统一的 HttpResponseData 格式
 */

import type {
  HttpResponseData,
  DebugStepApiResponse,
  StepResultOutput,
  ConsoleLogEntry,
  AssertionResult,
} from './types';

/**
 * 从单步调试 API 响应转换
 */
export function fromDebugStepResponse(
  response: DebugStepApiResponse
): HttpResponseData | null {
  if (!response.success || !response.response) {
    return {
      statusCode: 0,
      statusText: 'Error',
      duration: 0,
      size: 0,
      headers: {},
      body: response.error || '请求失败',
      bodyType: 'text',
      error: response.error,
      consoleLogs: response.consoleLogs,
    };
  }

  const resp = response.response;

  return {
    statusCode: resp.statusCode,
    statusText: resp.statusText,
    duration: resp.duration,
    size: resp.size,
    headers: resp.headers || {},
    cookies: resp.cookies,
    body: resp.body,
    bodyType: resp.bodyType as HttpResponseData['bodyType'],
    consoleLogs: response.consoleLogs,
    assertions: response.assertionResults,
    actualRequest: response.actualRequest,
  };
}

/**
 * 从流程执行步骤结果转换
 */
export function fromStepResultOutput(
  output: StepResultOutput,
  durationMs?: number
): HttpResponseData {
  const bodyRaw = output.body_raw;
  const body = output.body;
  const bodyStr = bodyRaw || (typeof body === 'string' ? body : JSON.stringify(body, null, 2)) || '';

  // 转换 headers（处理数组值）
  const headers: Record<string, string | string[]> = {};
  if (output.headers) {
    for (const [key, value] of Object.entries(output.headers)) {
      headers[key] = value;
    }
  }

  return {
    statusCode: output.status_code || output.statusCode || 0,
    statusText: output.status || '',
    duration: durationMs || 0,
    size: typeof bodyStr === 'string' ? bodyStr.length : 0,
    headers,
    cookies: output.cookies,
    body: bodyStr,
    bodyType: detectBodyType(bodyStr),
    consoleLogs: output.console_logs,
    assertions: output.assertions,
    actualRequest: output.request,
  };
}

/**
 * 检测响应体类型
 */
function detectBodyType(body: string): HttpResponseData['bodyType'] {
  if (!body) return 'text';
  if (body.startsWith('{') || body.startsWith('[')) return 'json';
  if (body.startsWith('<?xml') || body.startsWith('<')) {
    if (body.includes('<!DOCTYPE html') || body.includes('<html')) return 'html';
    return 'xml';
  }
  return 'text';
}

// 重新导出类型
export type { HttpResponseData, ConsoleLogEntry, AssertionResult, StepResultOutput };
