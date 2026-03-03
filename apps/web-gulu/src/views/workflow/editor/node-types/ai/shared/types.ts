/**
 * 统一 AI Agent 类型定义
 */
export { type AIConfig as UnifiedAgentConfig, createDefaultAIConfig as createDefaultUnifiedAgentConfig, builtinTools } from '../types';

// 兼容旧引用
export type { AIConfig as BaseAIConfig } from '../types';
