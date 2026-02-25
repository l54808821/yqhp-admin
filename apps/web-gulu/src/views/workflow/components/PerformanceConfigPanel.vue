<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { createIconifyIcon } from '@vben/icons';
import {
  Collapse,
  CollapsePanel,
  Input,
  InputNumber,
  Radio,
  Tag,
  Tooltip,
  Typography,
} from 'ant-design-vue';

import type { ExecutionMode, PerformanceConfig } from '#/api/workflow/performance';

import {
  EXECUTION_MODE_OPTIONS,
  getDefaultPerformanceConfig,
} from '#/api/workflow/performance';

import StageEditor from './StageEditor.vue';
import ThresholdEditor from './ThresholdEditor.vue';
import VuProfileChart from './VuProfileChart.vue';

const Settings = createIconifyIcon('lucide:settings-2');

interface Props {
  config: PerformanceConfig | null;
  readonly?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false,
});

const emit = defineEmits<{
  (e: 'update:config', config: PerformanceConfig | null): void;
}>();

const localConfig = ref<PerformanceConfig>(getDefaultPerformanceConfig());

watch(
  () => props.config,
  (newConfig) => {
    if (newConfig) {
      localConfig.value = { ...newConfig };
    } else {
      localConfig.value = getDefaultPerformanceConfig();
    }
  },
  { immediate: true, deep: true },
);

function emitUpdate() {
  emit('update:config', { ...localConfig.value });
}

function handleModeChange(mode: ExecutionMode) {
  localConfig.value.mode = mode;
  // reset fields not relevant to the new mode
  if (mode === 'constant-vus') {
    localConfig.value.stages = undefined;
    localConfig.value.iterations = undefined;
    if (!localConfig.value.vus) localConfig.value.vus = 10;
    if (!localConfig.value.duration) localConfig.value.duration = '30s';
  } else if (mode === 'ramping-vus' || mode === 'ramping-arrival-rate') {
    localConfig.value.vus = undefined;
    localConfig.value.duration = undefined;
    localConfig.value.iterations = undefined;
    if (!localConfig.value.stages?.length) {
      localConfig.value.stages = [
        { duration: '30s', target: 10 },
        { duration: '1m', target: 50 },
        { duration: '30s', target: 0 },
      ];
    }
  } else if (mode === 'per-vu-iterations') {
    localConfig.value.stages = undefined;
    localConfig.value.duration = undefined;
    if (!localConfig.value.vus) localConfig.value.vus = 10;
    if (!localConfig.value.iterations) localConfig.value.iterations = 100;
  } else if (mode === 'shared-iterations') {
    localConfig.value.stages = undefined;
    localConfig.value.duration = undefined;
    if (!localConfig.value.vus) localConfig.value.vus = 10;
    if (!localConfig.value.iterations) localConfig.value.iterations = 1000;
  } else if (mode === 'constant-arrival-rate') {
    localConfig.value.stages = undefined;
    if (!localConfig.value.iterations) localConfig.value.iterations = 100;
    if (!localConfig.value.vus) localConfig.value.vus = 10;
    if (!localConfig.value.duration) localConfig.value.duration = '1m';
  }
  emitUpdate();
}

const needsStages = computed(() => {
  return localConfig.value.mode === 'ramping-vus' || localConfig.value.mode === 'ramping-arrival-rate';
});

const needsVusAndDuration = computed(() => {
  return localConfig.value.mode === 'constant-vus' || localConfig.value.mode === 'constant-arrival-rate';
});

const needsVusOnly = computed(() => {
  return (
    localConfig.value.mode === 'per-vu-iterations' ||
    localConfig.value.mode === 'shared-iterations'
  );
});

const stageTargetLabel = computed(() => {
  return localConfig.value.mode === 'ramping-arrival-rate' ? '目标 RPS' : '目标 VU';
});

const currentModeOption = computed(() => {
  return EXECUTION_MODE_OPTIONS.find((o) => o.value === localConfig.value.mode);
});

const primaryModes = EXECUTION_MODE_OPTIONS.slice(0, 2);
const secondaryModes = EXECUTION_MODE_OPTIONS.slice(2);

const showAdvanced = ref<string[]>([]);
</script>

<template>
  <div class="performance-config-panel">
    <!-- 执行模式选择 -->
    <div class="section">
      <div class="section-title">执行模式</div>
      <div class="mode-grid">
        <div
          v-for="opt in primaryModes"
          :key="opt.value"
          class="mode-card"
          :class="{ active: localConfig.mode === opt.value, readonly }"
          @click="!readonly && handleModeChange(opt.value)"
        >
          <div class="mode-card-header">
            <span class="mode-label">{{ opt.label }}</span>
            <Tag v-if="localConfig.mode === opt.value" color="blue" class="mode-active-tag">
              当前
            </Tag>
          </div>
          <Typography.Text type="secondary" class="mode-desc">
            {{ opt.desc }}
          </Typography.Text>
        </div>
      </div>

      <Collapse
        v-model:active-key="showAdvanced"
        ghost
        class="more-modes-collapse"
      >
        <CollapsePanel key="advanced" header="更多模式">
          <div class="mode-grid">
            <div
              v-for="opt in secondaryModes"
              :key="opt.value"
              class="mode-card"
              :class="{ active: localConfig.mode === opt.value, readonly }"
              @click="!readonly && handleModeChange(opt.value)"
            >
              <div class="mode-card-header">
                <span class="mode-label">{{ opt.label }}</span>
                <Tag v-if="localConfig.mode === opt.value" color="blue" class="mode-active-tag">
                  当前
                </Tag>
              </div>
              <Typography.Text type="secondary" class="mode-desc">
                {{ opt.desc }}
              </Typography.Text>
            </div>
          </div>
        </CollapsePanel>
      </Collapse>
    </div>

    <!-- 负载曲线预览 -->
    <VuProfileChart
      :mode="localConfig.mode"
      :vus="localConfig.vus"
      :duration="localConfig.duration"
      :iterations="localConfig.iterations"
      :stages="localConfig.stages"
    />

    <!-- 基础参数 -->
    <div class="section">
      <div class="section-title">
        基础参数
        <Typography.Text type="secondary" class="section-hint">
          {{ currentModeOption?.label }}
        </Typography.Text>
      </div>

      <!-- constant-vus / constant-arrival-rate -->
      <template v-if="needsVusAndDuration">
        <div class="param-grid">
          <div class="param-item">
            <label class="param-label">
              {{ localConfig.mode === 'constant-arrival-rate' ? '预分配 VU' : '虚拟用户数 (VUs)' }}
            </label>
            <InputNumber
              :value="localConfig.vus"
              :min="1"
              :max="10000"
              :disabled="readonly"
              style="width: 100%"
              @change="(val: any) => { localConfig.vus = val; emitUpdate(); }"
            />
          </div>
          <div class="param-item">
            <label class="param-label">持续时间</label>
            <Tooltip title="如 30s, 2m, 1h">
              <Input
                :value="localConfig.duration"
                placeholder="如 30s, 2m"
                :disabled="readonly"
                @change="(e: any) => { localConfig.duration = e.target.value; emitUpdate(); }"
              />
            </Tooltip>
          </div>
        </div>
        <div v-if="localConfig.mode === 'constant-arrival-rate'" class="param-grid" style="margin-top: 8px;">
          <div class="param-item">
            <label class="param-label">到达率 (次/秒)</label>
            <InputNumber
              :value="localConfig.iterations"
              :min="1"
              :disabled="readonly"
              style="width: 100%"
              @change="(val: any) => { localConfig.iterations = val; emitUpdate(); }"
            />
          </div>
        </div>
      </template>

      <!-- per-vu-iterations / shared-iterations -->
      <template v-if="needsVusOnly">
        <div class="param-grid">
          <div class="param-item">
            <label class="param-label">虚拟用户数 (VUs)</label>
            <InputNumber
              :value="localConfig.vus"
              :min="1"
              :max="10000"
              :disabled="readonly"
              style="width: 100%"
              @change="(val: any) => { localConfig.vus = val; emitUpdate(); }"
            />
          </div>
          <div class="param-item">
            <label class="param-label">
              {{ localConfig.mode === 'per-vu-iterations' ? '每 VU 迭代次数' : '总迭代次数' }}
            </label>
            <InputNumber
              :value="localConfig.iterations"
              :min="1"
              :disabled="readonly"
              style="width: 100%"
              @change="(val: any) => { localConfig.iterations = val; emitUpdate(); }"
            />
          </div>
        </div>
      </template>

      <!-- ramping-vus / ramping-arrival-rate -->
      <template v-if="needsStages">
        <StageEditor
          :stages="localConfig.stages || []"
          :readonly="readonly"
          :target-label="stageTargetLabel"
          @update:stages="(stages) => { localConfig.stages = stages; emitUpdate(); }"
        />
      </template>
    </div>

    <!-- 阈值配置 -->
    <div class="section">
      <div class="section-title">
        <Settings class="size-3.5" />
        阈值配置
      </div>
      <ThresholdEditor
        :thresholds="localConfig.thresholds || []"
        :readonly="readonly"
        @update:thresholds="(thresholds) => { localConfig.thresholds = thresholds; emitUpdate(); }"
      />
    </div>

    <!-- 高级选项 -->
    <div class="section">
      <Collapse ghost class="advanced-collapse">
        <CollapsePanel key="1" header="高级选项">
          <div class="advanced-options">
            <div class="option-row">
              <label class="param-label">HTTP 引擎</label>
              <Radio.Group
                :value="localConfig.httpEngine || 'fasthttp'"
                :disabled="readonly"
                @change="(e: any) => { localConfig.httpEngine = e.target.value; emitUpdate(); }"
              >
                <Radio.Button value="fasthttp">FastHTTP (高性能)</Radio.Button>
                <Radio.Button value="standard">Standard</Radio.Button>
              </Radio.Group>
            </div>
            <div class="option-row">
              <label class="param-label">采样设置</label>
              <Radio.Group
                :value="localConfig.samplingMode || 'none'"
                :disabled="readonly"
                @change="(e: any) => { localConfig.samplingMode = e.target.value; emitUpdate(); }"
              >
                <Radio.Button value="none">不采样</Radio.Button>
                <Radio.Button value="errors">采样错误</Radio.Button>
                <Radio.Button value="smart">智能采样</Radio.Button>
              </Radio.Group>
              <Typography.Text type="secondary" style="font-size: 11px">
                {{ localConfig.samplingMode === 'errors' ? '仅记录失败/超时的请求详情' : localConfig.samplingMode === 'smart' ? '记录所有错误 + 按比例采样成功请求（上限 1000 条）' : '不记录请求/响应详情' }}
              </Typography.Text>
            </div>
          </div>
        </CollapsePanel>
      </Collapse>
    </div>
  </div>
</template>

<style scoped>
.performance-config-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  color: hsl(var(--foreground));
}

.section-hint {
  font-size: 11px;
  font-weight: normal;
}

/* Mode cards */
.mode-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.mode-card {
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--ant-color-border, #d9d9d9);
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mode-card:hover:not(.readonly) {
  border-color: var(--ant-color-primary, #1677ff);
}

.mode-card.active {
  border-color: var(--ant-color-primary, #1677ff);
  background: var(--ant-color-primary-bg, #e6f7ff);
}

.mode-card.readonly {
  cursor: default;
}

.mode-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.mode-label {
  font-weight: 500;
  font-size: 13px;
}

.mode-active-tag {
  margin: 0;
  font-size: 10px;
  line-height: 16px;
  padding: 0 4px;
}

.mode-desc {
  font-size: 11px;
  line-height: 1.4;
}

.more-modes-collapse :deep(.ant-collapse-header) {
  padding: 4px 0 !important;
  font-size: 12px;
  color: var(--ant-color-text-secondary) !important;
}

.more-modes-collapse :deep(.ant-collapse-content-box) {
  padding: 8px 0 0 !important;
}

/* Param grid */
.param-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.param-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.param-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--ant-color-text-secondary);
}

/* Advanced */
.advanced-collapse :deep(.ant-collapse-header) {
  padding: 4px 0 !important;
  font-size: 12px;
}

.advanced-collapse :deep(.ant-collapse-content-box) {
  padding: 8px 0 0 !important;
}

.advanced-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.option-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
</style>
