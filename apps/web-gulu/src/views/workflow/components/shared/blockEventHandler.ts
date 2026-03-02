/**
 * SSE 事件 → ContentBlock[] 的统一构建逻辑
 * 单步调试和对话调试共用，避免重复代码
 */
import type {
  ContentBlock,
  TextBlock,
  ThinkingBlock,
  ToolCallBlock,
  PlanBlock,
  StepExecBlock,
} from './types';

// ========== Block 数组辅助函数 ==========

export function findLastBlock<T extends ContentBlock>(
  blocks: ContentBlock[],
  type: string,
): T | undefined {
  for (let i = blocks.length - 1; i >= 0; i--) {
    if (blocks[i]!.type === type) return blocks[i] as T;
  }
  return undefined;
}

export function findPlanBlock(blocks: ContentBlock[]): PlanBlock | undefined {
  return findLastBlock<PlanBlock>(blocks, 'plan');
}

export function ensureTextBlock(blocks: ContentBlock[]): TextBlock {
  const last = blocks[blocks.length - 1];
  if (last?.type === 'text') return last as TextBlock;
  const tb: TextBlock = { type: 'text', content: '' };
  blocks.push(tb);
  return tb;
}

// ========== SSE 事件 → Block 构建 ==========

/**
 * 处理 SSE 事件并更新 blocks 数组（原地修改）。
 * 只负责 block 构建，不处理外部状态（loading、metadata、interaction 等）。
 * 返回 true 表示 blocks 发生了变化。
 */
export function handleBlockEvent(
  blocks: ContentBlock[],
  eventType: string,
  data: any,
): boolean {
  switch (eventType) {
    case 'ai_chunk': {
      const tb = ensureTextBlock(blocks);
      tb.content += data.chunk || data.content || '';
      return true;
    }

    case 'ai_thinking': {
      const thinking = data.thinking || '';
      if (!thinking) return false;

      if (thinking.startsWith('切换到 Plan 模式')) {
        const reason = thinking.replace('切换到 Plan 模式：', '').trim();
        blocks.push({
          type: 'plan',
          reason,
          steps: [],
          status: 'planning',
        } as PlanBlock);
      } else if (thinking.startsWith('正在制定执行计划')) {
        const pb = findPlanBlock(blocks);
        if (pb) pb.status = 'planning';
      } else if (thinking.startsWith('计划制定完成')) {
        const pb = findPlanBlock(blocks);
        if (pb) pb.status = 'executing';
      } else if (thinking.startsWith('执行步骤')) {
        const pb = findPlanBlock(blocks);
        if (pb) {
          const match = thinking.match(/执行步骤\s*(\d+)\/(\d+):\s*(.*)/);
          if (match) {
            const stepIdx = parseInt(match[1]!, 10);
            const task = match[3] || '';
            for (const s of pb.steps) {
              if (s.status === 'running') s.status = 'completed';
            }
            const existing = pb.steps.find((s) => s.index === stepIdx);
            if (existing) {
              existing.status = 'running';
              existing.task = task || existing.task;
            } else {
              pb.steps.push({ index: stepIdx, task, status: 'running' });
            }
          }
        }
      } else {
        const existingThinking = findLastBlock<ThinkingBlock>(blocks, 'thinking');
        if (existingThinking && !existingThinking.isComplete) {
          existingThinking.content += '\n' + thinking;
        } else {
          blocks.push({
            type: 'thinking',
            content: thinking,
            isComplete: false,
          } as ThinkingBlock);
        }
      }
      return true;
    }

    case 'ai_plan_started': {
      blocks.push({
        type: 'plan',
        reason: data.reason || '',
        planText: data.planText,
        steps: (data.steps || []).map((s: any) => ({
          index: s.index,
          task: s.task,
          status: 'pending' as const,
        })),
        status: 'executing',
      } as PlanBlock);
      return true;
    }

    case 'ai_plan_step_update': {
      const pb = findPlanBlock(blocks);
      if (pb) {
        const stepIdx = data.stepIndex || data.index;
        const existing = pb.steps.find((s) => s.index === stepIdx);
        if (existing) {
          existing.status = data.status || 'running';
          if (data.result) existing.result = data.result;
        }
        return true;
      }
      return false;
    }

    case 'ai_plan_completed': {
      const pb = findPlanBlock(blocks);
      if (pb) {
        pb.status = 'completed';
        if (data.synthesis) pb.synthesis = data.synthesis;
        for (const s of pb.steps) {
          if (s.status === 'running') s.status = 'completed';
        }
        return true;
      }
      return false;
    }

    case 'ai_tool_call_start': {
      const tcBlock: ToolCallBlock = {
        type: 'tool_call',
        name: data.toolName || data.tool_name || '',
        arguments: data.arguments || data.args || '',
        status: 'running',
      };

      const pb = findPlanBlock(blocks);
      if (pb) {
        const runningStep = pb.steps.find((s) => s.status === 'running');
        if (runningStep) {
          runningStep.toolCalls = runningStep.toolCalls || [];
          runningStep.toolCalls.push(tcBlock);
          return true;
        }
      }

      blocks.push(tcBlock);
      return true;
    }

    case 'ai_tool_call_complete': {
      const tcName = data.toolName || data.tool_name || '';
      const isErr = data.isError || data.is_error || false;
      let found = false;

      const pb = findPlanBlock(blocks);
      if (pb) {
        for (const step of pb.steps) {
          const tc = step.toolCalls?.find(
            (t) => t.name === tcName && t.status === 'running',
          );
          if (tc) {
            tc.result = data.result || '';
            tc.isError = isErr;
            tc.durationMs = data.durationMs || data.duration_ms;
            tc.status = isErr ? 'error' : 'completed';
            found = true;
            break;
          }
        }
      }

      if (!found) {
        for (let i = blocks.length - 1; i >= 0; i--) {
          const b = blocks[i]!;
          if (
            b.type === 'tool_call' &&
            (b as ToolCallBlock).name === tcName &&
            (b as ToolCallBlock).status === 'running'
          ) {
            const tb = b as ToolCallBlock;
            tb.result = data.result || '';
            tb.isError = isErr;
            tb.durationMs = data.durationMs || data.duration_ms;
            tb.status = isErr ? 'error' : 'completed';
            break;
          }
        }
      }
      return true;
    }

    case 'ai_complete':
    case 'message_complete': {
      if (data.content) {
        const existingText = findLastBlock<TextBlock>(blocks, 'text');
        if (existingText) {
          existingText.content = data.content;
        } else {
          blocks.push({ type: 'text', content: data.content });
        }
      }
      for (const b of blocks) {
        if (b.type === 'thinking') (b as ThinkingBlock).isComplete = true;
      }
      return true;
    }

    case 'step_started': {
      blocks.push({
        type: 'step_exec',
        stepId: data.stepId,
        stepName: data.stepName,
        stepType: data.stepType,
        status: 'running',
      } as StepExecBlock);
      return true;
    }

    case 'step_completed': {
      const se = blocks.find(
        (b): b is StepExecBlock =>
          b.type === 'step_exec' && (b as StepExecBlock).stepId === data.stepId,
      );
      if (se) {
        se.status = (data.success || data.status === 'success') ? 'completed' : 'failed';
        se.durationMs = data.durationMs;
        se.result = data.result || data.output;
      }
      const pb = findPlanBlock(blocks);
      if (pb && pb.status === 'executing') {
        for (const s of pb.steps) {
          if (s.status === 'running') s.status = 'completed';
        }
        pb.status = 'completed';
      }
      return true;
    }

    case 'step_failed': {
      const se = blocks.find(
        (b): b is StepExecBlock =>
          b.type === 'step_exec' && (b as StepExecBlock).stepId === data.stepId,
      );
      if (se) {
        se.status = 'failed';
        se.durationMs = data.durationMs;
        se.result = data.result;
      }
      return true;
    }

    case 'error': {
      blocks.push({ type: 'error', message: data.message || '执行出错' });
      return true;
    }

    default:
      return false;
  }
}
