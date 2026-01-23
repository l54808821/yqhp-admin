import type {
  DebugSummary,
  ProgressData,
  StepResult,
} from '#/api/debug';
import type {
  SSEState,
  AIInteractionData,
} from '#/utils/sse';

// 树节点类型（动态构建）
export interface TreeNode {
  key: string;
  title: string;
  type: string;
  status?: string;
  duration?: number;
  children?: TreeNode[];
  stepResult?: StepResult;
  iteration?: number;
  branchName?: string; // 条件节点命中的分支名称
}

// 工作流定义类型
export interface WorkflowDefinition {
  name: string;
  steps: any[];
}

// 执行面板 Props
export interface ExecutionPanelProps {
  workflowId: number;
  envId: number;
  visible?: boolean;
  executorType?: 'local' | 'remote';
  slaveId?: string;
  definition?: WorkflowDefinition;
  selectedSteps?: string[];
  persist?: boolean; // 是否持久化执行记录
}

// 执行状态
export interface ExecutionState {
  loading: boolean;
  stopping: boolean;
  sessionId: string | null;
  sseState: SSEState;
  stepResults: StepResult[];
  currentProgress: ProgressData | null;
  executionSummary: ExecutionSummary | null;
  logs: string[];
  errorMessage: string | null;
  selectedStepKey: string | null;
  expandedKeys: string[];
}

// 连接状态
export interface ConnectionState {
  disconnected: boolean;
  reconnecting: boolean;
  reconnectAttempts: number;
}

// AI 交互状态
export interface AIInteractionState {
  open: boolean;
  data: AIInteractionData | null;
  value: string;
  countdown: number;
}

// AI 内容状态
export interface AIContentState {
  content: Map<string, string>;
  currentStepId: string | null;
}

// 执行汇总类型（重命名）
export type ExecutionSummary = DebugSummary;

// 重导出常用类型
export type { DebugSummary, ProgressData, StepResult } from '#/api/debug';
export type { SSEState, AIInteractionData } from '#/utils/sse';
