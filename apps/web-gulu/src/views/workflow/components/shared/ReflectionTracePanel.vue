<script setup lang="ts">
/**
 * Reflection 反思过程面板
 * 展示：起草 → (审视 → 改进) × N → 最终输出
 */
import { computed } from 'vue';

import { createIconifyIcon } from '@vben/icons';
import { Tag } from 'ant-design-vue';

import type { ReflectionTrace } from './types';

const PenIcon = createIconifyIcon('lucide:pen-line');
const SearchIcon = createIconifyIcon('lucide:search');
const CheckCircleIcon = createIconifyIcon('lucide:check-circle-2');
const SparklesIcon = createIconifyIcon('lucide:sparkles');

interface Props {
  trace: ReflectionTrace;
  finalContent?: string;
  isStreaming?: boolean;
}

const props = defineProps<Props>();

const hasRounds = computed(() => props.trace.rounds && props.trace.rounds.length > 0);

const isLGTM = computed(() => {
  if (!hasRounds.value) return false;
  const lastRound = props.trace.rounds[props.trace.rounds.length - 1];
  if (!lastRound?.critique) return false;
  const trimmed = lastRound.critique.trim().toUpperCase();
  return trimmed === 'LGTM' || trimmed.startsWith('LGTM') ||
    lastRound.critique.includes('无需改进') || lastRound.critique.includes('已经足够好');
});
</script>

<template>
  <div class="reflection-panel">
    <div v-if="!hasRounds && !isStreaming" class="trace-empty">
      暂无反思过程数据
    </div>

    <div v-if="hasRounds" class="reflection-timeline">
      <div
        v-for="(round, idx) in trace.rounds"
        :key="round.round"
        class="reflection-round"
      >
        <!-- 轮次标题 -->
        <div class="round-header">
          <span class="round-badge">第 {{ round.round }} 轮反思</span>
        </div>

        <!-- 草稿 -->
        <div class="trace-step draft-step">
          <div class="step-indicator">
            <div class="step-dot draft-dot">
              <PenIcon class="step-icon" />
            </div>
            <div class="step-line" />
          </div>
          <div class="step-content">
            <div class="step-label">
              <Tag color="blue" class="step-tag">
                {{ idx === 0 ? 'Draft' : 'Improved' }}
              </Tag>
              <span class="step-label-text">
                {{ idx === 0 ? '初稿' : `第 ${idx} 次改进` }}
              </span>
            </div>
            <pre class="draft-text">{{ round.draft }}</pre>
          </div>
        </div>

        <!-- 审视 -->
        <div class="trace-step critique-step">
          <div class="step-indicator">
            <div
              class="step-dot"
              :class="idx === trace.rounds.length - 1 && isLGTM ? 'lgtm-dot' : 'critique-dot'"
            >
              <SearchIcon class="step-icon" />
            </div>
            <div
              v-if="idx < trace.rounds.length - 1 || finalContent"
              class="step-line"
            />
          </div>
          <div class="step-content">
            <div class="step-label">
              <Tag
                :color="idx === trace.rounds.length - 1 && isLGTM ? 'green' : 'orange'"
                class="step-tag"
              >
                Critique
              </Tag>
              <span class="step-label-text">审视评估</span>
              <Tag
                v-if="idx === trace.rounds.length - 1 && isLGTM"
                color="green"
                size="small"
                class="lgtm-tag"
              >
                LGTM
              </Tag>
            </div>
            <pre class="critique-text" :class="{ 'lgtm-text': idx === trace.rounds.length - 1 && isLGTM }">{{ round.critique }}</pre>
          </div>
        </div>
      </div>

      <!-- 最终回答 -->
      <div v-if="finalContent" class="trace-step final-step">
        <div class="step-indicator">
          <div class="step-dot final-dot">
            <CheckCircleIcon class="step-icon" />
          </div>
        </div>
        <div class="step-content">
          <div class="step-label">
            <Tag color="green" class="step-tag">
              <SparklesIcon class="inline-icon" />
              Final Answer
            </Tag>
            <span class="step-label-text">最终回答</span>
          </div>
          <pre class="final-text">{{ finalContent }}</pre>
        </div>
      </div>
    </div>

    <!-- 流式中 -->
    <div v-if="isStreaming" class="streaming-indicator">
      <span class="streaming-dot" />
      <span>AI 正在反思改进中...</span>
    </div>
  </div>
</template>

<style scoped>
.reflection-panel {
  padding: 8px 0;
  height: 100%;
  overflow-y: auto;
}

.trace-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: hsl(var(--foreground) / 35%);
  font-size: 13px;
  padding: 32px;
}

/* 时间线 */
.reflection-timeline {
  display: flex;
  flex-direction: column;
}

.reflection-round {
  margin-bottom: 4px;
}

.round-header {
  padding: 4px 0 6px 20px;
}

.round-badge {
  font-size: 11px;
  font-weight: 600;
  color: hsl(var(--foreground) / 50%);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* 步骤 */
.trace-step {
  display: flex;
  gap: 12px;
  padding: 0 0 0 8px;
}

.step-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  width: 28px;
}

.step-dot {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  flex-shrink: 0;
}

.step-icon {
  width: 14px;
  height: 14px;
  color: white;
}

.draft-dot {
  background: linear-gradient(135deg, #4f6ef7, #7c3aed);
}

.critique-dot {
  background: linear-gradient(135deg, #f59e0b, #ea580c);
}

.lgtm-dot {
  background: linear-gradient(135deg, #10b981, #059669);
}

.final-dot {
  background: linear-gradient(135deg, #10b981, #059669);
}

.step-line {
  width: 2px;
  flex: 1;
  min-height: 12px;
  background: hsl(var(--border));
  margin: 4px 0;
}

.step-content {
  flex: 1;
  min-width: 0;
  padding-bottom: 12px;
}

.step-label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.step-tag {
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  border-radius: 4px;
}

.step-label-text {
  font-size: 12px;
  color: hsl(var(--foreground) / 55%);
}

.inline-icon {
  width: 12px;
  height: 12px;
  vertical-align: -2px;
  margin-right: 2px;
}

.lgtm-tag {
  margin: 0;
  font-size: 10px;
  font-weight: 700;
}

/* 草稿文本 */
.draft-text {
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 13px;
  line-height: 1.6;
  color: hsl(var(--foreground) / 85%);
  margin: 0;
  padding: 10px 12px;
  background: hsl(var(--primary) / 6%);
  border-radius: 8px;
  border: 1px solid hsl(var(--primary) / 15%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* 审视文本 */
.critique-text {
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 13px;
  line-height: 1.6;
  color: hsl(var(--foreground) / 85%);
  margin: 0;
  padding: 10px 12px;
  background: hsl(30 100% 50% / 6%);
  border-radius: 8px;
  border: 1px solid hsl(30 100% 50% / 15%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.critique-text.lgtm-text {
  background: hsl(142 76% 36% / 6%);
  border-color: hsl(142 76% 36% / 15%);
  color: #059669;
  font-weight: 500;
}

/* 最终回答 */
.final-text {
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 13px;
  line-height: 1.7;
  color: hsl(var(--foreground));
  margin: 0;
  padding: 10px 12px;
  background: hsl(142 76% 36% / 6%);
  border-radius: 8px;
  border: 1px solid hsl(142 76% 36% / 15%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* 流式指示器 */
.streaming-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 8px;
  font-size: 13px;
  color: hsl(var(--foreground) / 55%);
}

.streaming-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #1677ff;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
</style>
