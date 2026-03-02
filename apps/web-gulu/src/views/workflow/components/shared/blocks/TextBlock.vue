<script setup lang="ts">
import type { TextBlock } from '../types';
import { AiBubbleContent } from '#/components/ai-chat';

defineProps<{
  block: TextBlock;
  streaming?: boolean;
}>();
</script>

<template>
  <div class="text-block" v-if="block.content">
    <AiBubbleContent
      :content="block.content"
      :streaming="streaming"
    />
  </div>
</template>

<style scoped>
.text-block {
  line-height: 1.6;
}
</style>
