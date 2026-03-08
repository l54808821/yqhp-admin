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
  | 'variable'
  | 'env'
  | 'sys';

export const VARIABLE_GROUP_LABELS: Record<VariableGroup, string> = {
  variable: '变量',
  env: '环境变量',
  sys: '系统变量',
};

// 内置的特殊参数（始终存在）
const BUILTIN_VARIABLES: VariableInfo[] = [
  { name: 'userinput.query', label: 'userinput.query', type: 'String', group: 'variable', description: '用户输入文本（内置）' },
  { name: 'userinput.files', label: 'userinput.files', type: 'Array', group: 'variable', description: '用户上传文件（内置）' },
];

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
  envVariables?: Array<{ name: string; type?: string; description?: string }>;
}

/**
 * 收集当前节点可用的所有变量
 * 
 * 变量优先级（后面的覆盖前面的）：
 * 1. 内置变量（userinput.query, userinput.files）
 * 2. 参数（转换为变量，但会被同名变量覆盖）
 * 3. 工作流变量
 * 4. 步骤变量（后面的步骤会覆盖前面的同名变量）
 * 
 * 最终保留三种变量：
 * - 变量（合并了用户输入、工作流变量、步骤变量）
 * - 环境变量（env.xxx）
 * - 系统变量（sys.xxx）
 */
export function collectAvailableVariables(opts: CollectVariablesOptions): VariableInfo[] {
  // 使用 Map 来去重，后面的变量会覆盖前面的同名变量
  const variableMap = new Map<string, VariableInfo>();

  // 1. 添加参数（转换为变量，但会被同名变量覆盖）
  if (opts.params?.length) {
    for (const p of opts.params) {
      if (!p.name.trim()) continue;
      const varName = p.name; // 参数名直接作为变量名，不再加 userinput. 前缀
      // 如果已经有同名变量，跳过（变量会覆盖参数）
      if (!variableMap.has(varName)) {
        variableMap.set(varName, {
          name: varName,
          label: varName,
          type: p.type || 'String',
          group: 'variable',
          description: p.description || '',
        });
      }
    }
  }

  // 2. 添加工作流变量（会覆盖同名参数）
  if (opts.variables) {
    for (const [key, value] of Object.entries(opts.variables)) {
      variableMap.set(key, {
        name: key,
        label: key,
        type: inferType(value),
        group: 'variable',
      });
    }
  }

  // 3. 添加步骤变量（后面的步骤会覆盖前面的同名变量）
  if (opts.steps?.length && opts.currentNodeId) {
    const stepVars = collectStepVariables(opts.steps, opts.currentNodeId);
    for (const v of stepVars) {
      variableMap.set(v.name, v); // 后面的步骤变量会覆盖前面的
    }
  }

  // 转换为数组
  const result = Array.from(variableMap.values());

  // 4. 添加环境变量（格式：env.xxx）
  if (opts.envVariables?.length) {
    for (const envVar of opts.envVariables) {
      if (!envVar.name.trim()) continue;
      result.push({
        name: `env.${envVar.name}`,
        label: `env.${envVar.name}`,
        type: envVar.type || 'String',
        group: 'env',
        description: envVar.description || '',
      });
    }
  }

  // 5. 添加系统变量
  result.push(...SYSTEM_VARIABLES);

  // 6. 最后添加内置变量
  result.push(...BUILTIN_VARIABLES);

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
        group: 'variable',
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
        group: 'variable',
        description: `提取自 ${stepName}`,
      });
    }

    if (proc.type === 'set_variable' && cfg.variableName) {
      vars.push({
        name: cfg.variableName,
        label: cfg.variableName,
        type: 'String',
        group: 'variable',
        description: `设置于 ${stepName}`,
      });
    }
  }
}
