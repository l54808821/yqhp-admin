<script setup lang="ts">
import { ref, watch } from 'vue';

import { createIconifyIcon } from '@vben/icons';
import {
  Button,
  Checkbox,
  Input,
  Popconfirm,
  Select,
  SelectOption,
} from 'ant-design-vue';

const Plus = createIconifyIcon('lucide:plus');
const Trash = createIconifyIcon('lucide:trash-2');

export interface WorkflowParam {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  defaultValue?: string;
  description?: string;
  required: boolean;
}

interface Props {
  params: WorkflowParam[];
  readonly?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false,
});

const emit = defineEmits<{
  (e: 'update:params', params: WorkflowParam[]): void;
}>();

const localList = ref<WorkflowParam[]>([...(props.params || [])]);

watch(
  () => props.params,
  (newParams) => {
    const incoming = [...(newParams || [])];
    const empties = localList.value.filter((item) => !item.name.trim());
    localList.value = [...incoming, ...empties];
  },
);

function emitUpdate() {
  const valid = localList.value.filter((item) => item.name.trim());
  emit('update:params', valid);
}

function handleAdd() {
  localList.value = [
    ...localList.value,
    { name: '', type: 'string', defaultValue: '', description: '', required: false },
  ];
}

function handleRemove(index: number) {
  localList.value = localList.value.filter((_, i) => i !== index);
  emitUpdate();
}

function handleFieldChange(index: number, field: keyof WorkflowParam, value: any) {
  localList.value = localList.value.map((item, i) =>
    i === index ? { ...item, [field]: value } : item,
  );
  emitUpdate();
}

function isDuplicateName(name: string, currentIndex: number): boolean {
  return localList.value.some(
    (item, i) => i !== currentIndex && item.name.trim() === name.trim() && name.trim() !== '',
  );
}
</script>

<template>
  <div class="params-panel">
    <div v-if="localList.length === 0" class="empty-row">
      <span class="empty-text">暂无参数</span>
      <Button v-if="!readonly" type="link" size="small" @click="handleAdd">
        <template #icon><Plus class="size-3.5" /></template>
        添加
      </Button>
    </div>
    <template v-else>
      <div class="table-header">
        <span class="col-name">参数名</span>
        <span class="col-type">类型</span>
        <span class="col-default">默认值</span>
        <span class="col-desc">说明</span>
        <span class="col-required">必填</span>
        <span class="col-action"></span>
      </div>
      <div
        v-for="(item, index) in localList"
        :key="index"
        class="table-row"
      >
        <div class="col-name">
          <Input
            :value="item.name"
            placeholder="参数名"
            :status="isDuplicateName(item.name, index) ? 'error' : undefined"
            :disabled="readonly"
            @change="(e: any) => handleFieldChange(index, 'name', e.target.value)"
          />
        </div>
        <div class="col-type">
          <Select
            :value="item.type"
            :disabled="readonly"
            @change="(val: any) => handleFieldChange(index, 'type', val)"
          >
            <SelectOption value="string">string</SelectOption>
            <SelectOption value="number">number</SelectOption>
            <SelectOption value="boolean">boolean</SelectOption>
            <SelectOption value="json">json</SelectOption>
          </Select>
        </div>
        <div class="col-default">
          <Input
            :value="item.defaultValue"
            placeholder="默认值"
            :disabled="readonly"
            @change="(e: any) => handleFieldChange(index, 'defaultValue', e.target.value)"
          />
        </div>
        <div class="col-desc">
          <Input
            :value="item.description"
            placeholder="说明"
            :disabled="readonly"
            @change="(e: any) => handleFieldChange(index, 'description', e.target.value)"
          />
        </div>
        <div class="col-required">
          <Checkbox
            :checked="item.required"
            :disabled="readonly"
            @change="(e: any) => handleFieldChange(index, 'required', e.target.checked)"
          />
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
          添加参数
        </Button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.params-panel {
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

.col-name {
  flex: 2;
  min-width: 0;
}

.col-type {
  width: 85px;
  flex-shrink: 0;
}

.col-type :deep(.ant-select) {
  width: 100%;
}

.col-default {
  flex: 2;
  min-width: 0;
}

.col-desc {
  flex: 2;
  min-width: 0;
}

.col-required {
  width: 36px;
  flex-shrink: 0;
  display: flex;
  justify-content: center;
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
