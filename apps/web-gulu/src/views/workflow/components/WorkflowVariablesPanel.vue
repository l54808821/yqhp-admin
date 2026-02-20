<script setup lang="ts">
import { ref, watch } from 'vue';

import { createIconifyIcon } from '@vben/icons';
import {
  Button,
  Input,
  Popconfirm,
  Select,
  SelectOption,
} from 'ant-design-vue';

const Plus = createIconifyIcon('lucide:plus');
const Trash = createIconifyIcon('lucide:trash-2');

export interface VariableItem {
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'json';
}

interface Props {
  variables: Record<string, any>;
  readonly?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false,
});

const emit = defineEmits<{
  (e: 'update:variables', variables: Record<string, any>): void;
}>();

function inferType(value: any): VariableItem['type'] {
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'object') return 'json';
  return 'string';
}

function propsToList(vars: Record<string, any>): VariableItem[] {
  return Object.entries(vars || {}).map(([key, value]) => ({
    key,
    value: typeof value === 'object' ? JSON.stringify(value) : String(value),
    type: inferType(value),
  }));
}

const localList = ref<VariableItem[]>(propsToList(props.variables));

watch(
  () => props.variables,
  (newVars) => {
    const incoming = propsToList(newVars);
    const empties = localList.value.filter((item) => !item.key.trim());
    localList.value = [...incoming, ...empties];
  },
);

function convertValue(value: string, type: VariableItem['type']): any {
  switch (type) {
    case 'number': {
      const num = Number(value);
      return Number.isNaN(num) ? value : num;
    }
    case 'boolean':
      return value.toLowerCase() === 'true';
    case 'json':
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    default:
      return value;
  }
}

function emitUpdate() {
  const result: Record<string, any> = {};
  for (const item of localList.value) {
    if (item.key.trim()) {
      result[item.key.trim()] = convertValue(item.value, item.type);
    }
  }
  emit('update:variables', result);
}

function handleAdd() {
  localList.value = [...localList.value, { key: '', value: '', type: 'string' }];
}

function handleRemove(index: number) {
  localList.value = localList.value.filter((_, i) => i !== index);
  emitUpdate();
}

function handleKeyChange(index: number, newKey: string) {
  localList.value = localList.value.map((item, i) =>
    i === index ? { ...item, key: newKey } : item,
  );
  emitUpdate();
}

function handleValueChange(index: number, newValue: string) {
  localList.value = localList.value.map((item, i) =>
    i === index ? { ...item, value: newValue } : item,
  );
  emitUpdate();
}

function handleTypeChange(index: number, newType: VariableItem['type']) {
  localList.value = localList.value.map((item, i) =>
    i === index ? { ...item, type: newType } : item,
  );
  emitUpdate();
}

function isDuplicateKey(key: string, currentIndex: number): boolean {
  return localList.value.some(
    (item, i) => i !== currentIndex && item.key.trim() === key.trim() && key.trim() !== '',
  );
}
</script>

<template>
  <div class="variables-panel">
    <div v-if="localList.length === 0" class="empty-row">
      <span class="empty-text">暂无变量</span>
      <Button v-if="!readonly" type="link" size="small" @click="handleAdd">
        <template #icon><Plus class="size-3.5" /></template>
        添加
      </Button>
    </div>
    <template v-else>
      <div class="table-header">
        <span class="col-key">变量名</span>
        <span class="col-value">值</span>
        <span class="col-type">类型</span>
        <span class="col-action"></span>
      </div>
      <div
        v-for="(item, index) in localList"
        :key="index"
        class="table-row"
      >
        <div class="col-key">
          <Input
            :value="item.key"
            placeholder="变量名"
            :status="isDuplicateKey(item.key, index) ? 'error' : undefined"
            :disabled="readonly"
            @change="(e: any) => handleKeyChange(index, e.target.value)"
          />
        </div>
        <div class="col-value">
          <Input
            :value="item.value"
            placeholder="值"
            :disabled="readonly"
            @change="(e: any) => handleValueChange(index, e.target.value)"
          />
        </div>
        <div class="col-type">
          <Select
            :value="item.type"
            :disabled="readonly"
            @change="(val: any) => handleTypeChange(index, val)"
          >
            <SelectOption value="string">string</SelectOption>
            <SelectOption value="number">number</SelectOption>
            <SelectOption value="boolean">boolean</SelectOption>
            <SelectOption value="json">json</SelectOption>
          </Select>
        </div>
        <div class="col-action">
          <Popconfirm
            v-if="!readonly"
            title="确定删除？"
            @confirm="handleRemove(index)"
          >
            <Button type="text" size="small" danger>
              <template #icon><Trash class="size-3.5" /></template>
            </Button>
          </Popconfirm>
        </div>
      </div>
      <div v-if="!readonly" class="add-row">
        <Button type="link" size="small" @click="handleAdd">
          <template #icon><Plus class="size-3.5" /></template>
          添加变量
        </Button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.variables-panel {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.empty-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 4px 0;
}

.empty-text {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.table-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-bottom: 4px;
  font-size: 11px;
  font-weight: 500;
  color: hsl(var(--muted-foreground));
  border-bottom: 1px solid hsl(var(--border) / 0.5);
}

.table-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.col-key {
  flex: 2;
  min-width: 0;
}

.col-value {
  flex: 3;
  min-width: 0;
}

.col-type {
  width: 85px;
  flex-shrink: 0;
}

.col-type :deep(.ant-select) {
  width: 100%;
}

.col-action {
  width: 28px;
  flex-shrink: 0;
  display: flex;
  justify-content: center;
}

.add-row {
  display: flex;
  justify-content: center;
  padding-top: 2px;
}
</style>
