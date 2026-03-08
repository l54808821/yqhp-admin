import type { StepNode } from '../WorkflowTreeEditor.vue';
import type { WorkflowParam } from '../../components/WorkflowParamsPanel.vue';

export interface VariableInfo {
  name: string;
  label: string;
  type: string;
  group: VariableGroup;
  description?: string;
}

export type VariableGroup =
  | 'userinput'
  | 'variable'
  | 'env'
  | 'sys'
  | 'step';

export const VARIABLE_GROUP_LABELS: Record<VariableGroup, string> = {
  userinput: '用户输入',
  variable: '工作流变量',
  env: '环境变量',
  sys: '系统变量',
  step: '步骤变量',
};

const SYSTEM_VARIABLES: VariableInfo[] = [
  { name: 'sys.dialogue_count', label: 'sys.dialogue_count', type: 'Number', group: 'sys', description: '对话轮次' },
  { name: 'sys.conversation_id', label: 'sys.conversation_id', type: 'String', group: 'sys', description: '会话 ID' },
  { name: 'sys.user_id', label: 'sys.user_id', type: 'String', group: 'sys', description: '用户 ID' },
  { name: 'sys.app_id', label: 'sys.app_id', type: 'String', group: 'sys', description: '应用 ID' },
  { name: 'sys.workflow_id', label: 'sys.workflow_id', type: 'String', group: 'sys', description: '工作流 ID' },
  { name: 'sys.workflow_run_id', label: 'sys.workflow_run_id', type: 'String', group: 'sys', description: '工作流运行 ID' },
];

export interface CollectVariablesOptions {
  params?: WorkflowParam[];
  variables?: Record<string, any>;
  steps?: StepNode[];
  currentNodeId?: string;
}

/**
 * 收集当前节点可用的所有变量
 */
export function collectAvailableVariables(opts: CollectVariablesOptions): VariableInfo[] {
  const result: VariableInfo[] = [];

  if (opts.params?.length) {
    for (const p of opts.params) {
      if (!p.name.trim()) continue;
      result.push({
        name: `userinput.${p.name}`,
        label: `userinput.${p.name}`,
        type: p.type || 'String',
        group: 'userinput',
        description: p.description || '',
      });
    }
  }

  if (opts.variables) {
    for (const [key, value] of Object.entries(opts.variables)) {
      result.push({
        name: key,
        label: key,
        type: inferType(value),
        group: 'variable',
      });
    }
  }

  result.push(...SYSTEM_VARIABLES);

  if (opts.steps?.length && opts.currentNodeId) {
    const stepVars = collectStepVariables(opts.steps, opts.currentNodeId);
    result.push(...stepVars);
  }

  return result;
}

function inferType(value: any): string {
  if (value === null || value === undefined) return 'String';
  if (typeof value === 'number') return 'Number';
  if (typeof value === 'boolean') return 'Boolean';
  if (typeof value === 'object') return 'JSON';
  return 'String';
}

/**
 * 遍历当前节点之前的所有步骤，收集通过 extract_param / set_variable 产生的变量
 */
function collectStepVariables(steps: StepNode[], currentNodeId: string): VariableInfo[] {
  const vars: VariableInfo[] = [];
  collectFromStepList(steps, currentNodeId, vars);
  return vars;
}

/**
 * 递归遍历步骤列表，遇到 currentNodeId 时停止
 * 返回 true 表示已找到当前节点（停止收集）
 */
function collectFromStepList(steps: StepNode[], currentNodeId: string, vars: VariableInfo[]): boolean {
  for (const step of steps) {
    if (step.id === currentNodeId) return true;

    collectProcessorVariables(step.preProcessors, step.name, vars);
    collectProcessorVariables(step.postProcessors, step.name, vars);

    if (step.config?.settings?.saveToVariable) {
      vars.push({
        name: step.config.settings.saveToVariable,
        label: step.config.settings.saveToVariable,
        type: 'String',
        group: 'step',
        description: `来自 ${step.name}`,
      });
    }

    if (step.children?.length) {
      if (collectFromStepList(step.children, currentNodeId, vars)) return true;
    }

    if (step.type === 'condition' && step.branches?.length) {
      for (const br of step.branches) {
        if (br.steps?.length) {
          if (collectFromStepList(br.steps, currentNodeId, vars)) return true;
        }
      }
    }
  }
  return false;
}

function collectProcessorVariables(
  processors: Array<{ type: string; enabled: boolean; config: any }> | undefined,
  stepName: string,
  vars: VariableInfo[],
) {
  if (!processors?.length) return;

  for (const proc of processors) {
    if (!proc.enabled) continue;
    const cfg = proc.config;
    if (!cfg) continue;

    if (proc.type === 'extract_param' && cfg.variableName) {
      vars.push({
        name: cfg.variableName,
        label: cfg.variableName,
        type: 'String',
        group: 'step',
        description: `提取自 ${stepName}`,
      });
    }

    if (proc.type === 'set_variable' && cfg.variableName) {
      vars.push({
        name: cfg.variableName,
        label: cfg.variableName,
        type: 'String',
        group: 'step',
        description: `设置于 ${stepName}`,
      });
    }
  }
}
