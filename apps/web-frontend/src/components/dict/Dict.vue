<script setup lang="ts">
import { computed } from 'vue';

import { Radio, RadioGroup, Select, Tag } from 'ant-design-vue';

import { useDict } from '#/hooks/useDict';

type DictType = 'select' | 'radio' | 'tag';

interface Props {
  /** 字典类型编码 */
  code: string;
  /** 渲染类型: select-下拉框, radio-单选, tag-标签 */
  type?: DictType;
  /** 绑定值 */
  value?: number | string | (number | string)[];
  /** 占位符 (select) */
  placeholder?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否允许清除 (select) */
  allowClear?: boolean;
  /** 多选模式 (select): multiple-多选, tags-标签 */
  mode?: 'multiple' | 'tags';
  /** 按钮样式 (radio) */
  buttonStyle?: boolean;
  /** 空值显示文本 (tag) */
  emptyText?: string;
  /** 是否将值转换为数字 */
  valueAsNumber?: boolean;
  /** 样式 */
  style?: Record<string, string> | string;
}

const props = withDefaults(defineProps<Props>(), {
  type: 'tag',
  placeholder: '请选择',
  disabled: false,
  allowClear: true,
  mode: undefined,
  buttonStyle: false,
  emptyText: '-',
  valueAsNumber: true,
  value: undefined,
  style: undefined,
});

const emit = defineEmits<{
  'update:value': [value: number | string | (number | string)[] | undefined];
  change: [value: number | string | (number | string)[] | undefined];
}>();

const { options, getItem, getLabel, loading } = useDict(props.code);

// 转换选项值为数字
const convertedOptions = computed(() => {
  if (!props.valueAsNumber) return options.value;
  return options.value.map((opt) => ({
    ...opt,
    value: isNaN(Number(opt.value)) ? opt.value : Number(opt.value),
  }));
});

// 双向绑定
const innerValue = computed({
  get: () => props.value,
  set: (val) => {
    emit('update:value', val ?? undefined);
    emit('change', val ?? undefined);
  },
});

// Tag 相关
const isEmpty = computed(
  () => props.value === undefined || props.value === null || props.value === '',
);

const tagLabel = computed(() => {
  if (isEmpty.value) return props.emptyText;
  return getLabel(props.value as string | number);
});

const tagColor = computed(() => {
  if (isEmpty.value || loading.value) return 'default';
  const item = getItem(props.value as string | number);
  return item?.listClass || 'default';
});
</script>

<template>
  <!-- Tag 模式 -->
  <template v-if="type === 'tag'">
    <span v-if="isEmpty">{{ emptyText }}</span>
    <Tag v-else :color="tagColor">{{ tagLabel }}</Tag>
  </template>

  <!-- Select 模式 -->
  <Select
    v-else-if="type === 'select'"
    v-model:value="innerValue"
    :options="convertedOptions"
    :placeholder="placeholder"
    :disabled="disabled"
    :allow-clear="allowClear"
    :loading="loading"
    :mode="mode"
    :style="style"
  />

  <!-- Radio 模式 -->
  <RadioGroup
    v-else-if="type === 'radio'"
    v-model:value="innerValue"
    :disabled="disabled"
  >
    <template v-if="buttonStyle">
      <Radio.Button
        v-for="opt in convertedOptions"
        :key="String(opt.value)"
        :value="opt.value"
      >
        {{ opt.label }}
      </Radio.Button>
    </template>
    <template v-else>
      <Radio
        v-for="opt in convertedOptions"
        :key="String(opt.value)"
        :value="opt.value"
      >
        {{ opt.label }}
      </Radio>
    </template>
  </RadioGroup>
</template>
