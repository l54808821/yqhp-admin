<script setup lang="ts">
import type { SearchFieldConfig } from './types';

import { Button, Input, Select } from 'ant-design-vue';

import { Dict } from '#/components/dict';

interface Props {
  searchFields: SearchFieldConfig[];
  searchParams: Record<string, any>;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:searchParams': [params: Record<string, any>];
}>();

function updateParam(field: string, value: any) {
  emit('update:searchParams', { ...props.searchParams, [field]: value });
}

function clearAll() {
  const cleared: Record<string, any> = {};
  props.searchFields.forEach((field) => {
    cleared[field.field] = field.defaultValue;
  });
  emit('update:searchParams', cleared);
}

function getFieldWidth(field: SearchFieldConfig) {
  if (field.width) {
    return typeof field.width === 'number' ? `${field.width}px` : field.width;
  }
  return '100%';
}
</script>

<template>
  <div class="h-full flex flex-col">
    <div class="flex items-center justify-end mb-3">
      <Button size="small" @click="clearAll">清空</Button>
    </div>

    <div class="flex-1 overflow-auto space-y-3">
      <div
        v-for="field in searchFields"
        :key="field.field"
        class="flex items-center gap-3"
      >
        <span class="w-20 text-gray-600 text-sm text-right flex-shrink-0">
          {{ field.label }}
        </span>
        <div class="flex-1">
          <Input
            v-if="field.type === 'input'"
            :value="searchParams[field.field]"
            :placeholder="field.placeholder || `请输入${field.label}`"
            :style="{ width: getFieldWidth(field) }"
            allow-clear
            @update:value="(v: any) => updateParam(field.field, v)"
          />
          <Select
            v-else-if="field.type === 'select'"
            :value="searchParams[field.field]"
            :placeholder="field.placeholder || `请选择${field.label}`"
            :style="{ width: getFieldWidth(field) }"
            :options="field.options"
            allow-clear
            @update:value="(v: any) => updateParam(field.field, v)"
          />
          <Dict
            v-else-if="field.type === 'dict'"
            :value="searchParams[field.field]"
            type="select"
            :code="field.dictCode!"
            :placeholder="field.placeholder || `请选择${field.label}`"
            :style="{ width: getFieldWidth(field) }"
            @update:value="(v: any) => updateParam(field.field, v)"
          />
        </div>
      </div>
    </div>
  </div>
</template>
