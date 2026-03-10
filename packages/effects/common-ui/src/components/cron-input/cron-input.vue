<script setup lang="ts">
import type { CronInputProps } from './types';

import { computed, ref, watch } from 'vue';

import { Input, Popover, Tooltip } from 'ant-design-vue';

import CronGenerator from './cron-generator.vue';
import { describeCron, validateCronExpression } from './utils';

const ClockIcon = {
  template: `<svg viewBox="64 64 896 896" width="1em" height="1em" fill="currentColor"><path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm0 820c-205.4 0-372-166.6-372-372s166.6-372 372-372 372 166.6 372 372-166.6 372-372 372z"/><path d="M686.7 638.6L544.1 535.5V288c0-4.4-3.6-8-8-8H488c-4.4 0-8 3.6-8 8v275.4c0 2.6 1.2 5 3.3 6.5l165.4 120.6c3.6 2.6 8.6 1.8 11.2-1.7l28.6-39c2.6-3.7 1.8-8.7-1.8-11.2z"/></svg>`,
};

const props = withDefaults(defineProps<CronInputProps>(), {
  value: '',
  placeholder: '请输入或选择 Cron 表达式',
  disabled: false,
  allowClear: true,
});

const emit = defineEmits<{
  change: [value: string];
  'update:value': [value: string];
}>();

const popoverOpen = ref(false);
const inputValue = ref(props.value || '');

watch(
  () => props.value,
  (val) => {
    inputValue.value = val || '';
  },
);

const isValid = computed(() => {
  if (!inputValue.value) return true;
  return validateCronExpression(inputValue.value);
});

const cronDescription = computed(() => {
  if (!inputValue.value || !isValid.value) return '';
  return describeCron(inputValue.value);
});

function handleInputChange(e: Event) {
  const target = e.target as HTMLInputElement;
  inputValue.value = target.value;
  emit('update:value', target.value);
  emit('change', target.value);
}

function handleConfirm(value: string) {
  inputValue.value = value;
  emit('update:value', value);
  emit('change', value);
  popoverOpen.value = false;
}

function handleClear() {
  inputValue.value = '';
  emit('update:value', '');
  emit('change', '');
}
</script>

<template>
  <div style="width: 100%">
    <Popover
      v-model:open="popoverOpen"
      trigger="click"
      placement="bottomLeft"
      :overlay-style="{ maxWidth: '560px' }"
      :destroy-tooltip-on-hide="false"
    >
      <template #content>
        <CronGenerator :value="inputValue" @confirm="handleConfirm" />
      </template>
      <Tooltip
        :title="cronDescription"
        :open="cronDescription && !popoverOpen ? undefined : false"
        placement="topLeft"
      >
        <Input
          :value="inputValue"
          :placeholder="placeholder"
          :disabled="disabled"
          :allow-clear="allowClear"
          style="font-family: monospace"
          @change="handleInputChange"
          @clear="handleClear"
        >
          <template #suffix>
            <component
              :is="ClockIcon"
              v-if="!disabled"
              style="
                cursor: pointer;
                color: rgba(0, 0, 0, 0.45);
                font-size: 14px;
                display: inline-flex;
                align-items: center;
              "
              title="Cron 表达式生成器"
              @click.stop="popoverOpen = !popoverOpen"
            />
          </template>
        </Input>
      </Tooltip>
    </Popover>
    <div
      v-if="inputValue && !isValid"
      style="color: #ff4d4f; font-size: 12px; margin-top: 2px"
    >
      Cron 表达式格式不正确
    </div>
  </div>
</template>
