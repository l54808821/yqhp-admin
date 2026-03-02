<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';

import { createIconifyIcon } from '@vben/icons';
import type { PlanBlock } from '../types';

import ToolCallBlockComp from './ToolCallBlock.vue';

const ListChecks = createIconifyIcon('lucide:list-checks');
const CheckCircle = createIconifyIcon('lucide:check-circle-2');
const Circle = createIconifyIcon('lucide:circle');
const LoaderIcon = createIconifyIcon('lucide:loader-2');
const XCircle = createIconifyIcon('lucide:x-circle');

const props = defineProps<{
  block: PlanBlock;
}>();

const emit = defineEmits<{
  (e: 'plan-visible', visible: boolean): void;
}>();

onMounted(() => emit('plan-visible', true));
onUnmounted(() => emit('plan-visible', false));

const completedCount = computed(() => props.block.steps.filter(s => s.status === 'completed').length);
const totalCount = computed(() => props.block.steps.length);
const progress = computed(() => totalCount.value > 0 ? Math.round(completedCount.value / totalCount.value * 100) : 0);

function stepIcon(status: string) {
  switch (status) {
    case 'completed': return CheckCircle;
    case 'running': return LoaderIcon;
    case 'failed': return XCircle;
    default: return Circle;
  }
}

function stepColor(status: string) {
  switch (status) {
    case 'completed': return '#52c41a';
    case 'running': return 'hsl(var(--primary))';
    case 'failed': return '#ff4d4f';
    default: return 'hsl(var(--muted-foreground))';
  }
}
</script>

<template>
  <div class="plan-block">
    <div class="plan-header">
      <ListChecks class="plan-icon" />
      <span class="plan-title">执行计划</span>
      <span class="plan-progress">{{ completedCount }}/{{ totalCount }}</span>
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: `${progress}%` }" />
      </div>
    </div>

    <div v-if="block.reason" class="plan-reason">
      {{ block.reason }}
    </div>

    <div class="plan-steps">
      <div
        v-for="step in block.steps"
        :key="step.index"
        class="plan-step"
        :class="step.status"
      >
        <div class="step-header">
          <component
            :is="stepIcon(step.status)"
            class="step-icon"
            :class="{ spinning: step.status === 'running' }"
            :style="{ color: stepColor(step.status) }"
          />
          <span class="step-index">{{ step.index }}.</span>
          <span class="step-task">{{ step.task }}</span>
        </div>

        <!-- Tool calls within step -->
        <div v-if="step.toolCalls?.length" class="step-tools">
          <ToolCallBlockComp
            v-for="(tc, j) in step.toolCalls"
            :key="j"
            :block="tc"
            compact
          />
        </div>

        <div v-if="step.result && step.status === 'completed'" class="step-result">
          {{ step.result.length > 100 ? step.result.slice(0, 100) + '...' : step.result }}
        </div>
      </div>
    </div>

    <div v-if="block.status === 'planning'" class="plan-loading">
      <LoaderIcon class="spinning" />
      <span>正在制定计划...</span>
    </div>
  </div>
</template>

<style scoped>
.plan-block {
  border: 1px solid hsl(var(--primary) / 30%);
  border-radius: 8px;
  overflow: hidden;
  background: hsl(var(--primary) / 3%);
}

.plan-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: hsl(var(--primary) / 8%);
  border-bottom: 1px solid hsl(var(--primary) / 15%);
}

.plan-icon {
  width: 16px;
  height: 16px;
  color: hsl(var(--primary));
}

.plan-title {
  font-weight: 600;
  font-size: 13px;
  color: hsl(var(--foreground));
}

.plan-progress {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  margin-left: auto;
}

.progress-bar {
  width: 60px;
  height: 4px;
  background: hsl(var(--muted));
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: hsl(var(--primary));
  border-radius: 2px;
  transition: width 0.3s ease;
}

.plan-reason {
  padding: 8px 12px;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  border-bottom: 1px solid hsl(var(--border));
}

.plan-steps {
  padding: 8px 12px;
}

.plan-step {
  padding: 6px 0;
}

.plan-step + .plan-step {
  border-top: 1px dashed hsl(var(--border));
}

.step-header {
  display: flex;
  align-items: flex-start;
  gap: 6px;
}

.step-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  margin-top: 2px;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.step-index {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  font-weight: 500;
  flex-shrink: 0;
}

.step-task {
  font-size: 12px;
  color: hsl(var(--foreground));
  line-height: 1.5;
}

.step-tools {
  margin-left: 20px;
  margin-top: 4px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.step-result {
  margin-left: 20px;
  margin-top: 4px;
  font-size: 11px;
  color: hsl(var(--muted-foreground));
  line-height: 1.5;
}

.plan-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  font-size: 13px;
  color: hsl(var(--muted-foreground));
}
</style>
