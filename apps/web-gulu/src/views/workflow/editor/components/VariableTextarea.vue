<script setup lang="ts">
import { ref, toRef } from 'vue';

import { Input } from 'ant-design-vue';

import type { VariableInfo } from '../utils/variable-collector';
import { useVariableCompletion } from '../composables/useVariableCompletion';
import VariablePopover from './VariablePopover.vue';

interface Props {
  value?: string;
  rows?: number;
  placeholder?: string;
  variables?: VariableInfo[];
}

const props = withDefaults(defineProps<Props>(), {
  value: '',
  rows: 4,
  placeholder: '',
});

const emit = defineEmits<{
  (e: 'update:value', value: string): void;
  (e: 'blur'): void;
}>();

const textareaRef = ref<InstanceType<typeof Input.TextArea> | null>(null);

function getNativeTextarea(): HTMLTextAreaElement | null {
  const comp = textareaRef.value as any;
  if (!comp) return null;
  const el = comp.$el || comp;
  if (el instanceof HTMLTextAreaElement) return el;
  return el?.querySelector?.('textarea') ?? null;
}

/**
 * 计算 textarea 中光标的像素坐标（mirror div 技术）
 */
function getCaretCoordinates(
  element: HTMLTextAreaElement,
  position: number,
): { top: number; left: number; height: number } {
  const div = document.createElement('div');
  const style = getComputedStyle(element);

  const properties = [
    'direction', 'boxSizing', 'width', 'height', 'overflowX', 'overflowY',
    'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
    'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'fontStyle', 'fontVariant', 'fontWeight', 'fontStretch', 'fontSize',
    'fontSizeAdjust', 'lineHeight', 'fontFamily', 'textAlign', 'textTransform',
    'textIndent', 'textDecoration', 'letterSpacing', 'wordSpacing',
    'tabSize', 'MozTabSize', 'whiteSpace', 'wordWrap', 'wordBreak',
  ] as const;

  div.id = 'variable-textarea-mirror';
  document.body.appendChild(div);

  const divStyle = div.style;
  divStyle.whiteSpace = 'pre-wrap';
  divStyle.wordWrap = 'break-word';
  divStyle.position = 'absolute';
  divStyle.visibility = 'hidden';
  divStyle.overflow = 'hidden';

  for (const prop of properties) {
    (divStyle as any)[prop] = style.getPropertyValue(
      prop.replace(/([A-Z])/g, '-$1').toLowerCase(),
    );
  }

  div.textContent = element.value.substring(0, position);

  const span = document.createElement('span');
  span.textContent = element.value.substring(position) || '.';
  div.appendChild(span);

  const rect = {
    top: span.offsetTop - element.scrollTop,
    left: span.offsetLeft - element.scrollLeft,
    height: parseInt(style.lineHeight) || parseInt(style.fontSize) * 1.2,
  };

  document.body.removeChild(div);
  return rect;
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
  getElement: getNativeTextarea,
  getPopoverPosition(el, cursorPos) {
    const ta = el as HTMLTextAreaElement;
    const coords = getCaretCoordinates(ta, cursorPos);
    const taRect = ta.getBoundingClientRect();
    return {
      left: taRect.left + coords.left,
      top: taRect.top + coords.top + coords.height + 4,
    };
  },
  onValueChange(val) {
    emit('update:value', val);
  },
});
</script>

<template>
  <div ref="wrapperRef" class="variable-input-wrapper">
    <Input.TextArea
      ref="textareaRef"
      :value="value"
      :rows="rows"
      :placeholder="placeholder"
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
}
</style>
