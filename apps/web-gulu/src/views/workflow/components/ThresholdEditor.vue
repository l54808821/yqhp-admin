<script setup lang="ts">
import { ref, watch } from 'vue';

import { createIconifyIcon } from '@vben/icons';
import { AutoComplete, Button, Tooltip, Typography } from 'ant-design-vue';

import type { Threshold } from '#/api/workflow/performance';

import { THRESHOLD_METRIC_OPTIONS } from '#/api/workflow/performance';

const Plus = createIconifyIcon('lucide:plus');
const Trash = createIconifyIcon('lucide:trash-2');

interface Props {
  thresholds: Threshold[];
  readonly?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false,
});

const emit = defineEmits<{
  (e: 'update:thresholds', thresholds: Threshold[]): void;
}>();

const localThresholds = ref<Threshold[]>([]);

watch(
  () => props.thresholds,
  (val) => {
    localThresholds.value = (val || []).map((t) => ({ ...t }));
  },
  { immediate: true, deep: true },
);

function emitUpdate() {
  emit('update:thresholds', localThresholds.value.map((t) => ({ ...t })));
}

function addThreshold() {
  localThresholds.value.push({
    metric: 'http_req_duration',
    condition: 'p(95) < 500',
  });
  emitUpdate();
}

function removeThreshold(index: number) {
  localThresholds.value.splice(index, 1);
  emitUpdate();
}

function updateMetric(index: number, value: string) {
  if (localThresholds.value[index]) {
    localThresholds.value[index].metric = value;
    emitUpdate();
  }
}

function updateCondition(index: number, value: string) {
  if (localThresholds.value[index]) {
    localThresholds.value[index].condition = value;
    emitUpdate();
  }
}

const metricOptions = THRESHOLD_METRIC_OPTIONS.map((o) => ({
  value: o.value,
  label: o.label,
}));

const conditionPresets = [
  'p(95) < 500',
  'p(99) < 1000',
  'p(50) < 200',
  'avg < 300',
  'max < 2000',
  'rate < 0.01',
  'rate < 0.05',
  'rate < 0.1',
  'count > 100',
];
</script>

<template>
  <div class="threshold-editor">
    <div class="threshold-header">
      <Typography.Text type="secondary" class="threshold-desc">
        设置性能指标阈值，不满足时测试标记为失败
      </Typography.Text>
    </div>

    <div v-if="localThresholds.length > 0" class="threshold-list">
      <div
        v-for="(threshold, index) in localThresholds"
        :key="index"
        class="threshold-row"
      >
        <Tooltip title="指标名称">
          <AutoComplete
            :value="threshold.metric"
            :options="metricOptions"
            placeholder="指标"
            size="small"
            class="threshold-metric"
            :disabled="readonly"
            :filter-option="(input: string, option: any) => option.value.toLowerCase().includes(input.toLowerCase())"
            @change="(val: any) => updateMetric(index, val)"
          />
        </Tooltip>
        <Tooltip title="条件表达式（如 p(95) < 500）">
          <AutoComplete
            :value="threshold.condition"
            :options="conditionPresets.map((c) => ({ value: c }))"
            placeholder="条件"
            size="small"
            class="threshold-condition"
            :disabled="readonly"
            @change="(val: any) => updateCondition(index, val)"
          />
        </Tooltip>
        <Button
          v-if="!readonly"
          type="text"
          size="small"
          danger
          @click="removeThreshold(index)"
        >
          <template #icon><Trash class="size-3.5" /></template>
        </Button>
      </div>
    </div>

    <div v-else class="empty-hint">
      <Typography.Text type="secondary">暂未设置阈值</Typography.Text>
    </div>

    <Button
      v-if="!readonly"
      type="dashed"
      size="small"
      block
      class="add-threshold-btn"
      @click="addThreshold"
    >
      <template #icon><Plus class="size-3.5" /></template>
      添加阈值
    </Button>
  </div>
</template>

<style scoped>
.threshold-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.threshold-header {
  margin-bottom: 2px;
}

.threshold-desc {
  font-size: 11px;
}

.threshold-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.threshold-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  border-radius: 6px;
  background: var(--ant-color-fill-quaternary, #fafafa);
}

.threshold-row:hover {
  background: var(--ant-color-fill-tertiary, #f0f0f0);
}

.threshold-metric {
  width: 180px;
  flex-shrink: 0;
}

.threshold-condition {
  flex: 1;
  min-width: 120px;
}

.empty-hint {
  padding: 8px 12px;
  text-align: center;
  font-size: 12px;
  background: var(--ant-color-fill-quaternary, #fafafa);
  border-radius: 6px;
}

.add-threshold-btn {
  margin-top: 4px;
}
</style>
