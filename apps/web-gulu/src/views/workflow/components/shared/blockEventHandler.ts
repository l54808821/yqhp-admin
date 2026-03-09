/**
 * SSE 事件 → ContentBlock[] 的统一构建逻辑
 * 通过 blockId 精确匹配，所有消费者共用
 */
import type {
  ContentBlock,
  TextBlock,
  ThinkingBlock,
  ToolCallBlock,
  PlanBlock,
  StepExecBlock,
  ArtifactBlock,
  ArtifactFileType,
} from './types';

let localBlockSeq = 0;
function localBlockId(): string {
  return `local_${++localBlockSeq}`;
}

// ========== Block 查找 ==========

export function findBlockById(
  blocks: ContentBlock[],
  id: string,
): ContentBlock | undefined {
  for (const block of blocks) {
    if (block.id === id) return block;
    if (block.type === 'plan') {
      for (const step of (block as PlanBlock).steps) {
        const tc = step.toolCalls?.find((t) => t.id === id);
        if (tc) return tc;
      }
    }
  }
  return undefined;
}

export function findPlanBlock(blocks: ContentBlock[]): PlanBlock | undefined {
  for (let i = blocks.length - 1; i >= 0; i--) {
    if (blocks[i]!.type === 'plan') return blocks[i] as PlanBlock;
  }
  return undefined;
}

export function ensureTextBlock(
  blocks: ContentBlock[],
  blockId: string,
): TextBlock {
  const existing = findBlockById(blocks, blockId);
  if (existing?.type === 'text') return existing as TextBlock;
  const tb: TextBlock = { type: 'text', id: blockId, content: '' };
  blocks.push(tb);
  return tb;
}

// ========== SSE 事件 → Block 构建 ==========

export function handleBlockEvent(
  blocks: ContentBlock[],
  eventType: string,
  data: any,
): boolean {
  switch (eventType) {
    case 'ai_chunk': {
      const tb = ensureTextBlock(blocks, data.blockId);
      tb.content += data.chunk || '';
      return true;
    }

    case 'ai_thinking': {
      const blockId = data.blockId;
      const existing = findBlockById(blocks, blockId);
      if (existing?.type === 'thinking') {
        if (data.isComplete) {
          (existing as ThinkingBlock).isComplete = true;
        } else {
          (existing as ThinkingBlock).content += data.chunk || '';
        }
      } else if (!data.isComplete) {
        blocks.push({
          type: 'thinking',
          id: blockId,
          content: data.chunk || '',
          isComplete: false,
        } as ThinkingBlock);
      }
      return true;
    }

    case 'ai_tool_call_start': {
      const tcBlock: ToolCallBlock = {
        type: 'tool_call',
        id: data.blockId,
        name: data.toolName || '',
        arguments: data.arguments || '',
        status: 'running',
      };

      blocks.push(tcBlock);
      return true;
    }

    case 'ai_tool_call_complete': {
      const tc = findBlockById(blocks, data.blockId) as
        | ToolCallBlock
        | undefined;
      if (tc && tc.type === 'tool_call') {
        tc.result = data.result ?? '';
        tc.isError = data.isError || false;
        tc.durationMs = data.durationMs;
        tc.status = data.isError ? 'error' : 'completed';
      }

      if (data.forUser && !data.isError) {
        const artifact = tryParseArtifact(blocks, data.forUser, data.blockId);
        if (artifact) {
          blocks.push(artifact);
        }
      }
      return true;
    }

    case 'ai_artifact_start': {
      return handleArtifactStart(blocks, data);
    }

    case 'ai_artifact_chunk': {
      return handleArtifactChunk(blocks, data);
    }

    case 'ai_artifact_complete': {
      return handleArtifactComplete(blocks, data);
    }

    case 'ai_plan_update': {
      return handlePlanUpdate(blocks, data);
    }

    case 'message_complete': {
      if (data.content) {
        let textBlock: TextBlock | undefined;
        for (let i = blocks.length - 1; i >= 0; i--) {
          if (blocks[i]!.type === 'text') {
            textBlock = blocks[i] as TextBlock;
            break;
          }
        }
        if (textBlock) {
          textBlock.content = data.content;
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
        id: data.stepId || localBlockId(),
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
          b.type === 'step_exec' &&
          (b as StepExecBlock).stepId === data.stepId,
      );
      if (se) {
        se.status = data.status || 'success';
        se.durationMs = data.durationMs;
        se.result = data.result;
        if (data.error) se.reason = data.error;
      }
      return true;
    }

    case 'error': {
      blocks.push({
        type: 'error',
        id: localBlockId(),
        message: data.message || '执行出错',
      });
      return true;
    }

    default:
      return false;
  }
}

// ========== Artifact 流式处理 ==========

function tryParseArtifact(
  blocks: ContentBlock[],
  forUser: string,
  blockId: string,
): ArtifactBlock | null {
  try {
    const parsed = JSON.parse(forUser);
    if (!parsed.artifact) return null;

    const fileType = parsed.type as ArtifactFileType;
    if (!fileType || !['html', 'ppt', 'markdown'].includes(fileType)) {
      return null;
    }

    const hasStreamingArtifact = blocks.some(
      (b) => b.type === 'artifact',
    );
    if (hasStreamingArtifact) {
      const existing = blocks.find(
        (b): b is ArtifactBlock => b.type === 'artifact',
      );
      if (existing) {
        if (parsed.url && !existing.url) {
          existing.url = parsed.url;
        }
        if (!existing.title && parsed.title) {
          existing.title = parsed.title;
        }
        existing.streaming = false;
        if (!existing.url && existing.content) {
          existing.inline = true;
        }
      }
      return null;
    }

    return {
      type: 'artifact',
      id: `artifact_${blockId}`,
      fileType,
      title: parsed.title || '',
      url: parsed.url || undefined,
      content: parsed.content || undefined,
      inline: parsed.inline || false,
    };
  } catch {
    return null;
  }
}

function handleArtifactStart(
  blocks: ContentBlock[],
  data: any,
): boolean {
  const blockId = data.blockId;
  const existing = findBlockById(blocks, blockId);
  if (existing) return true;

  const artifact: ArtifactBlock = {
    type: 'artifact',
    id: blockId,
    fileType: data.fileType || 'html',
    title: data.title || '',
    content: '',
    streaming: true,
  };
  blocks.push(artifact);
  return true;
}

function handleArtifactChunk(
  blocks: ContentBlock[],
  data: any,
): boolean {
  const artifact = findBlockById(blocks, data.blockId) as
    | ArtifactBlock
    | undefined;
  if (artifact && artifact.type === 'artifact') {
    artifact.content = (artifact.content || '') + (data.chunk || '');
    return true;
  }
  return false;
}

function handleArtifactComplete(
  blocks: ContentBlock[],
  data: any,
): boolean {
  const artifact = findBlockById(blocks, data.blockId) as
    | ArtifactBlock
    | undefined;
  if (artifact && artifact.type === 'artifact') {
    artifact.streaming = false;
    if (data.url) {
      artifact.url = data.url;
    }
    if (!artifact.url && artifact.content) {
      artifact.inline = true;
    }
    return true;
  }
  return false;
}

// ========== Plan 更新子分发 ==========

function handlePlanUpdate(blocks: ContentBlock[], data: any): boolean {
  const blockId = data.blockId;

  switch (data.action) {
    case 'started': {
      const stepsData = (data.steps || []).map((s: any) => ({
        index: s.index,
        task: s.task,
        status: 'pending' as const,
      }));
      const existing = findBlockById(blocks, blockId) as
        | PlanBlock
        | undefined;
      if (existing?.type === 'plan') {
        existing.reason = data.reason || existing.reason;
        existing.steps = stepsData;
        existing.status = 'executing';
      } else {
        blocks.push({
          type: 'plan',
          id: blockId,
          reason: data.reason || '',
          steps: stepsData,
          status: 'executing',
        } as PlanBlock);
      }
      return true;
    }

    case 'step_update': {
      const pb = findBlockById(blocks, blockId) as PlanBlock | undefined;
      if (pb?.type === 'plan') {
        const stepIdx = data.stepIndex;
        const existing = pb.steps.find((s) => s.index === stepIdx);
        if (existing) {
          existing.status = data.status || 'running';
          if (data.result) existing.result = data.result;
          if (data.error) existing.error = data.error;
        }
        return true;
      }
      return false;
    }

    case 'modified': {
      const pb = findBlockById(blocks, blockId) as PlanBlock | undefined;
      if (pb?.type === 'plan') {
        const fromIdx: number = data.fromStepIndex || 1;
        const newSteps = (data.newSteps || []).map((s: any) => ({
          index: s.index,
          task: s.task,
          status: s.status || 'pending',
        }));
        const kept = pb.steps.filter((s) => s.index < fromIdx);
        pb.steps = [
          ...kept,
          ...newSteps.filter((s: any) => s.index >= fromIdx),
        ];
        pb.status = 'executing';
        if (data.reason) pb.reason = data.reason;
        return true;
      }
      return false;
    }

    case 'completed': {
      const pb = findBlockById(blocks, blockId) as PlanBlock | undefined;
      if (pb?.type === 'plan') {
        pb.status = 'completed';
        if (data.synthesis) pb.synthesis = data.synthesis;
        for (const s of pb.steps) {
          if (s.status !== 'completed' && s.status !== 'failed') {
            s.status = 'completed';
          }
        }
        return true;
      }
      return false;
    }

    default:
      return false;
  }
}
