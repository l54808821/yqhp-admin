<script setup lang="ts">
/**
 * 复合气泡内容渲染器
 * 组合：思考块 + 工具调用卡片 + Markdown 内容 + 消息操作栏
 * 可在 BubbleList 的 messageRender 中使用，也可独立用于 AIResponsePanel
 */
import { Spin } from 'ant-design-vue';
import type { ToolCallRecord, ThinkingBlock } from './types';
import AiMarkdownRenderer from './AiMarkdownRenderer.vue';
import AiToolCallCard from './AiToolCallCard.vue';
import AiThinkingBlock from './AiThinkingBlock.vue';
import AiMessageActions from './AiMessageActions.vue';

defineProps<{
  content: string;
  thinking?: ThinkingBlock;
  toolCalls?: ToolCallRecord[];
  loading?: boolean;
  streaming?: boolean;
  error?: string;
  showActions?: boolean;
  showRegenerate?: boolean;
}>();

const emit = defineEmits<{
  regenerate: [];
}>();
</script>

<template>
  <div class="ai-bubble-content">
    <!-- 加载状态 -->
    <div v-if="loading && !content" class="bubble-loading">
      <Spin size="small" />
      <span class="loading-text">AI 思考中...</span>
    </div>

    <template v-else>
      <!-- 思考过程 -->
      <AiThinkingBlock
        v-if="thinking?.content"
        :content="thinking.content"
        :is-complete="thinking.isComplete"
      />

      <!-- 工具调用 -->
      <div v-if="toolCalls?.length" class="tool-calls-list">
        <AiToolCallCard
          v-for="(tc, idx) in toolCalls"
          :key="idx"
          :tool-call="tc"
        />
      </div>

      <!-- 错误信息 -->
      <div v-if="error" class="bubble-error">
        {{ error }}
      </div>

      <!-- Markdown 内容 -->
      <AiMarkdownRenderer
        v-if="content"
        :content="content"
        :streaming="streaming"
      />

      <!-- 消息操作 -->
      <AiMessageActions
        v-if="showActions && content && !loading && !streaming"
        :content="content"
        :show-regenerate="showRegenerate"
        @regenerate="emit('regenerate')"
      />
    </template>
  </div>
</template>

<style scoped>
.ai-bubble-content {
  min-width: 0;
}

.bubble-loading {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 4px 0;
}

.loading-text {
  font-size: 13px;
  color: hsl(var(--foreground) / 50%);
}

.tool-calls-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 8px;
}

.bubble-error {
  padding: 8px 12px;
  margin-bottom: 8px;
  font-size: 13px;
  color: #ff4d4f;
  background: #fff2f0;
  border-radius: 6px;
}
</style>
