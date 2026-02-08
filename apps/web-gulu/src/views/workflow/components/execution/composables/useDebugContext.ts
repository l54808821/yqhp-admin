import { computed, reactive } from 'vue';

import type { DebugSummary } from '#/api/debug';

/**
 * 调试上下文：存储工作流调试完成后的变量快照和执行结果
 */
interface DebugContext {
  /** 工作流 ID */
  workflowId: number;
  /** 缓存的变量（所有最终变量） */
  variables: Record<string, unknown>;
  /** 环境变量（从环境配置加载的） */
  envVariables: Record<string, unknown>;
  /** 缓存时间 */
  timestamp: number;
  /** 调试时使用的环境 ID */
  envId: number;
  /** 调试执行汇总（步骤结果等） */
  summary?: DebugSummary;
}

// 全局存储（按工作流 ID 索引）
const contextMap = reactive<Map<number, DebugContext>>(new Map());

/**
 * 调试上下文管理
 *
 * 用于缓存工作流调试产生的变量和执行结果，在单步调试时自动注入变量。
 * 变量存储在内存中，页面刷新后丢失。
 */
export function useDebugContext() {
  /**
   * 保存调试上下文
   */
  function saveContext(
    workflowId: number,
    variables: Record<string, unknown>,
    envId: number,
    summary?: DebugSummary,
    envVariables?: Record<string, unknown>,
  ) {
    contextMap.set(workflowId, {
      workflowId,
      variables: { ...variables },
      envVariables: { ...(envVariables || {}) },
      timestamp: Date.now(),
      envId,
      summary,
    });
  }

  /**
   * 获取缓存的变量（所有变量，包含环境变量和临时变量）
   */
  function getVariables(
    workflowId: number,
  ): Record<string, unknown> | undefined {
    const ctx = contextMap.get(workflowId);
    return ctx?.variables;
  }

  /**
   * 获取环境变量
   */
  function getEnvVariables(
    workflowId: number,
  ): Record<string, unknown> | undefined {
    const ctx = contextMap.get(workflowId);
    return ctx?.envVariables;
  }

  /**
   * 获取临时变量（去除环境变量后的步骤产生变量）
   */
  function getTempVariables(
    workflowId: number,
  ): Record<string, unknown> | undefined {
    const ctx = contextMap.get(workflowId);
    if (!ctx) return undefined;
    const envKeys = new Set(Object.keys(ctx.envVariables));
    const tempVars: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(ctx.variables)) {
      if (!envKeys.has(k)) {
        tempVars[k] = v;
      }
    }
    return tempVars;
  }

  /**
   * 获取完整的调试上下文
   */
  function getContext(workflowId: number): DebugContext | undefined {
    return contextMap.get(workflowId);
  }

  /**
   * 获取调试执行汇总
   */
  function getSummary(workflowId: number): DebugSummary | undefined {
    return contextMap.get(workflowId)?.summary;
  }

  /**
   * 检查是否存在调试上下文
   */
  function hasContext(workflowId: number): boolean {
    return contextMap.has(workflowId);
  }

  /**
   * 清空指定工作流的调试上下文
   */
  function clearContext(workflowId: number) {
    contextMap.delete(workflowId);
  }

  /**
   * 清空所有调试上下文
   */
  function clearAll() {
    contextMap.clear();
  }

  /**
   * 是否有任何活跃的调试上下文
   */
  const hasAnyContext = computed(() => contextMap.size > 0);

  return {
    saveContext,
    getVariables,
    getEnvVariables,
    getTempVariables,
    getContext,
    getSummary,
    hasContext,
    clearContext,
    clearAll,
    hasAnyContext,
  };
}

export type { DebugContext };
