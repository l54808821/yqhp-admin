<script setup lang="ts">
import type { ContentBlock } from '../types';

import TextBlockComp from './TextBlock.vue';
import ThinkingBlockComp from './ThinkingBlock.vue';
import ToolCallBlockComp from './ToolCallBlock.vue';
import PlanBlockComp from './PlanBlock.vue';
import StepExecBlockComp from './StepExecBlock.vue';
import ErrorBlockComp from './ErrorBlock.vue';
import ImageBlockComp from './ImageBlock.vue';
import FileBlockComp from './FileBlock.vue';
import VerificationBlockComp from './VerificationBlock.vue';

defineProps<{
  blocks: ContentBlock[];
  streaming?: boolean;
}>();

const emit = defineEmits<{
  (e: 'plan-visible', visible: boolean): void;
}>();

const componentMap: Record<string, any> = {
  text: TextBlockComp,
  thinking: ThinkingBlockComp,
  tool_call: ToolCallBlockComp,
  plan: PlanBlockComp,
  step_exec: StepExecBlockComp,
  error: ErrorBlockComp,
  image: ImageBlockComp,
  file: FileBlockComp,
  verification: VerificationBlockComp,
};
</script>

<template>
  <div class="content-blocks">
    <template v-for="(block, i) in blocks" :key="i">
      <component
        :is="componentMap[block.type]"
        v-if="componentMap[block.type]"
        :block="block"
        :streaming="streaming && i === blocks.length - 1 && block.type === 'text'"
        @plan-visible="emit('plan-visible', $event)"
      />
    </template>
  </div>
</template>

<style scoped>
.content-blocks {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
