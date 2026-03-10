<script setup lang="ts">
import type { CronFieldType, CronFields } from './types';

import { computed, reactive, watch } from 'vue';

import {
  Button,
  Checkbox,
  CheckboxGroup,
  Col,
  InputNumber,
  Radio,
  RadioGroup,
  Row,
  TabPane,
  Tabs,
  Tag,
} from 'ant-design-vue';

import { CRON_FIELD_CONFIGS, WEEK_LABELS } from './types';
import {
  createDefaultFields,
  describeCron,
  formatDate,
  generateCronExpression,
  getFieldConfig,
  getNextExecutions,
  parseCronExpression,
} from './utils';

const props = defineProps<{
  value?: string;
}>();

const emit = defineEmits<{
  confirm: [value: string];
}>();

const fields: CronFields = reactive(createDefaultFields());
const activeTab = reactive({ key: 'second' as CronFieldType });

watch(
  () => props.value,
  (val) => {
    if (!val) return;
    const parsed = parseCronExpression(val);
    if (!parsed) return;
    for (const config of CRON_FIELD_CONFIGS) {
      Object.assign(fields[config.key], parsed[config.key]);
    }
  },
  { immediate: true },
);

const expression = computed(() => generateCronExpression(fields));
const description = computed(() => describeCron(expression.value));

const nextExecutions = computed(() => {
  const dates = getNextExecutions(expression.value, 5);
  if (!dates) return [];
  return dates.map((d) => formatDate(d));
});

function getCheckboxOptions(key: CronFieldType) {
  const config = getFieldConfig(key);
  const options: Array<{ label: string; value: number }> = [];
  for (let i = config.min; i <= config.max; i++) {
    const label =
      key === 'week' ? `周${WEEK_LABELS[i] ?? i}` : String(i);
    options.push({ label, value: i });
  }
  return options;
}

function handleConfirm() {
  emit('confirm', expression.value);
}
</script>

<template>
  <div class="cron-generator" style="width: 520px">
    <Tabs v-model:activeKey="activeTab.key" size="small">
      <TabPane
        v-for="config in CRON_FIELD_CONFIGS"
        :key="config.key"
        :tab="config.label"
      >
        <div style="padding: 8px 0">
          <RadioGroup
            v-model:value="fields[config.key].mode"
            style="display: flex; flex-direction: column; gap: 12px"
          >
            <Radio value="every">
              每{{ config.label }}
            </Radio>

            <Radio value="range">
              <span style="display: inline-flex; align-items: center; gap: 6px">
                从
                <InputNumber
                  v-model:value="fields[config.key].rangeStart"
                  :min="config.min"
                  :max="config.max"
                  size="small"
                  style="width: 80px"
                  @focus="fields[config.key].mode = 'range'"
                />
                到
                <InputNumber
                  v-model:value="fields[config.key].rangeEnd"
                  :min="config.min"
                  :max="config.max"
                  size="small"
                  style="width: 80px"
                  @focus="fields[config.key].mode = 'range'"
                />
                {{ config.label }}
              </span>
            </Radio>

            <Radio value="interval">
              <span style="display: inline-flex; align-items: center; gap: 6px">
                从第
                <InputNumber
                  v-model:value="fields[config.key].intervalStart"
                  :min="config.min"
                  :max="config.max"
                  size="small"
                  style="width: 80px"
                  @focus="fields[config.key].mode = 'interval'"
                />
                {{ config.label }}开始，每
                <InputNumber
                  v-model:value="fields[config.key].intervalStep"
                  :min="1"
                  :max="config.max - config.min + 1"
                  size="small"
                  style="width: 80px"
                  @focus="fields[config.key].mode = 'interval'"
                />
                {{ config.label }}执行
              </span>
            </Radio>

            <Radio value="specific">
              指定{{ config.label }}
            </Radio>
          </RadioGroup>

          <div
            v-if="fields[config.key].mode === 'specific'"
            style="
              margin-top: 8px;
              padding: 8px;
              border: 1px solid #d9d9d9;
              border-radius: 6px;
              max-height: 160px;
              overflow-y: auto;
            "
          >
            <CheckboxGroup
              v-model:value="fields[config.key].specificValues"
            >
              <Row :gutter="[4, 4]">
                <Col
                  v-for="opt in getCheckboxOptions(config.key)"
                  :key="opt.value"
                  :span="config.key === 'week' ? 6 : 4"
                >
                  <Checkbox :value="opt.value">
                    {{ opt.label }}
                  </Checkbox>
                </Col>
              </Row>
            </CheckboxGroup>
          </div>
        </div>
      </TabPane>
    </Tabs>

    <div
      style="
        border-top: 1px solid #f0f0f0;
        padding-top: 12px;
        margin-top: 4px;
      "
    >
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px">
        <span style="color: rgba(0, 0, 0, 0.45); font-size: 13px">表达式：</span>
        <Tag color="blue" style="font-family: monospace; font-size: 13px">
          {{ expression }}
        </Tag>
      </div>

      <div
        v-if="description"
        style="margin-bottom: 8px; color: rgba(0, 0, 0, 0.65); font-size: 13px"
      >
        含义：{{ description }}
      </div>

      <div v-if="nextExecutions.length > 0" style="margin-bottom: 12px">
        <div style="color: rgba(0, 0, 0, 0.45); font-size: 12px; margin-bottom: 4px">
          最近 5 次执行时间：
        </div>
        <div
          v-for="(time, index) in nextExecutions"
          :key="index"
          style="
            color: rgba(0, 0, 0, 0.65);
            font-size: 12px;
            font-family: monospace;
            line-height: 1.8;
          "
        >
          {{ index + 1 }}. {{ time }}
        </div>
      </div>

      <div style="display: flex; justify-content: flex-end">
        <Button type="primary" size="small" @click="handleConfirm">
          确定
        </Button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cron-generator :deep(.ant-tabs-nav) {
  margin-bottom: 0;
}

.cron-generator :deep(.ant-radio-wrapper) {
  margin-right: 0;
}

.cron-generator :deep(.ant-checkbox-wrapper) {
  font-size: 12px;
}
</style>
