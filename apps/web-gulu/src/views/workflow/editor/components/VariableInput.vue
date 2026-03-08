<script setup lang="ts">
import { ref, toRef } from 'vue';

import { Input } from 'ant-design-vue';

import type { VariableInfo } from '../utils/variable-collector';
import { useVariableCompletion } from '../composables/useVariableCompletion';
import VariablePopover from './VariablePopover.vue';

interface Props {
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  variables?: VariableInfo[];
}

const props = withDefaults(defineProps<Props>(), {
  value: '',
  placeholder: '',
  disabled: false,
});

const emit = defineEmits<{
  (e: 'update:value', value: string): void;
  (e: 'change', value: string): void;
  (e: 'blur'): void;
}>();

const inputRef = ref<InstanceType<typeof Input> | null>(null);

function getNativeInput(): HTMLInputElement | null {
  const comp = inputRef.value as any;
  if (!comp) return null;
  const el = comp.$el || comp;
  if (el instanceof HTMLInputElement) return el;
  return el?.querySelector?.('input') ?? null;
}

const {
  wrapperRef,
  popoverRef,
  showPopover,
  popoverStyle,
  searchText,
  activeIndex,
  groupedVariables,
  flatFiltered,
  handleInput,
  handleKeydown,
  selectVariable,
} = useVariableCompletion({
  getValue: () => props.value || '',
  variables: toRef(props, 'variables'),
  getElement: getNativeInput,
  getPopoverPosition(el) {
    const rect = el.getBoundingClientRect();
    return { left: rect.left, top: rect.bottom + 4 };
  },
  onValueChange(val) {
    emit('update:value', val);
    emit('change', val);
  },
});
</script>

<template>
  <div ref="wrapperRef" class="variable-input-wrapper">
    <Input
      ref="inputRef"
      :value="value"
      :placeholder="placeholder"
      :disabled="disabled"
      @input="handleInput"
      @keydown="handleKeydown"
      @blur="emit('blur')"
    />
    <VariablePopover
      v-if="showPopover"
      ref="popoverRef"
      :style="popoverStyle"
      :grouped-variables="groupedVariables"
      :flat-filtered="flatFiltered"
      :active-index="activeIndex"
      :search-text="searchText"
      @select="selectVariable"
      @update:active-index="activeIndex = $event"
      @update:search-text="searchText = $event"
      @keydown="handleKeydown"
    />
  </div>
</template>

<style scoped>
.variable-input-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
}

.variable-input-wrapper :deep(.ant-input) {
  width: 100%;
  height: 100%;
}
</style>
