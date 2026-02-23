<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';

import {
  Badge,
  Button,
  Input,
  Radio,
  Select,
  Space,
  Tag,
  Typography,
} from 'ant-design-vue';

import type { Executor, ExecutorConfig, ExecutorStrategy } from '#/api/executor';

import { getAvailableExecutorsApi } from '#/api/executor';

interface Props {
  config: ExecutorConfig | null;
  readonly?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false,
});

const emit = defineEmits<{
  (e: 'update:config', config: ExecutorConfig | null): void;
}>();

const localConfig = ref<ExecutorConfig>({
  strategy: 'local',
  executor_id: null,
  labels: {},
});

const executors = ref<Executor[]>([]);
const executorLoading = ref(false);
const labelInput = ref({ key: '', value: '' });

watch(
  () => props.config,
  (newConfig) => {
    if (newConfig) {
      localConfig.value = { ...newConfig };
    } else {
      localConfig.value = { strategy: 'local', executor_id: null, labels: {} };
    }
  },
  { immediate: true },
);

onMounted(async () => {
  await loadExecutors();
});

async function loadExecutors() {
  try {
    executorLoading.value = true;
    executors.value = await getAvailableExecutorsApi();
  } catch {
    // silent
  } finally {
    executorLoading.value = false;
  }
}

function handleStrategyChange(strategy: ExecutorStrategy) {
  localConfig.value.strategy = strategy;
  if (strategy === 'local') {
    localConfig.value.executor_id = null;
    localConfig.value.labels = {};
  } else if (strategy === 'auto') {
    localConfig.value.executor_id = null;
  }
  emitUpdate();
}

function handleExecutorChange(executorId: number) {
  localConfig.value.executor_id = executorId;
  emitUpdate();
}

function addLabel() {
  if (labelInput.value.key && labelInput.value.value) {
    if (!localConfig.value.labels) {
      localConfig.value.labels = {};
    }
    localConfig.value.labels[labelInput.value.key] = labelInput.value.value;
    labelInput.value = { key: '', value: '' };
    emitUpdate();
  }
}

function removeLabel(key: string) {
  if (localConfig.value.labels) {
    delete localConfig.value.labels[key];
    emitUpdate();
  }
}

function emitUpdate() {
  if (localConfig.value.strategy === 'local') {
    emit('update:config', null);
  } else {
    emit('update:config', { ...localConfig.value });
  }
}

function getStateColor(state?: string) {
  switch (state) {
    case 'online':
      return 'success';
    case 'busy':
      return 'processing';
    case 'draining':
      return 'warning';
    default:
      return 'error';
  }
}

function getStateText(state?: string) {
  switch (state) {
    case 'online':
      return '在线';
    case 'busy':
      return '繁忙';
    case 'draining':
      return '下线中';
    default:
      return '离线';
  }
}

const strategyOptions = [
  { value: 'local', label: '本地执行', desc: '使用内置引擎直接执行' },
  {
    value: 'auto',
    label: '自动分配',
    desc: '根据负载和标签自动选择最优执行机',
  },
  {
    value: 'manual',
    label: '指定执行机',
    desc: '手动指定远程执行机执行',
  },
];
</script>

<template>
  <div class="executor-config-panel">
    <div class="strategy-section">
      <div class="section-title">执行策略</div>
      <Radio.Group
        :value="localConfig.strategy"
        :disabled="readonly"
        @change="(e: any) => handleStrategyChange(e.target.value)"
      >
        <div class="strategy-options">
          <div
            v-for="opt in strategyOptions"
            :key="opt.value"
            class="strategy-option"
            :class="{ active: localConfig.strategy === opt.value }"
          >
            <Radio :value="opt.value">
              <span class="option-label">{{ opt.label }}</span>
            </Radio>
            <Typography.Text type="secondary" class="option-desc">
              {{ opt.desc }}
            </Typography.Text>
          </div>
        </div>
      </Radio.Group>
    </div>

    <!-- 指定执行机模式 -->
    <div v-if="localConfig.strategy === 'manual'" class="detail-section">
      <div class="section-title">选择执行机</div>
      <Select
        :value="localConfig.executor_id ?? undefined"
        placeholder="请选择执行机"
        :disabled="readonly"
        :loading="executorLoading"
        style="width: 100%"
        @change="(val: any) => handleExecutorChange(val as number)"
      >
        <Select.Option
          v-for="executor in executors"
          :key="executor.id"
          :value="executor.id"
          :disabled="executor.state === 'offline'"
        >
          <div class="executor-option">
            <Badge
              :status="getStateColor(executor.state)"
              :text="executor.name"
            />
            <Typography.Text type="secondary" class="executor-state-text">
              {{ getStateText(executor.state) }}
              <template v-if="executor.load">
                · {{ Math.round((executor.load || 0) * 100) }}%
              </template>
            </Typography.Text>
          </div>
        </Select.Option>
      </Select>
      <Button
        type="link"
        size="small"
        class="refresh-btn"
        @click="loadExecutors"
      >
        刷新列表
      </Button>
    </div>

    <!-- 自动分配模式 - 标签过滤 -->
    <div v-if="localConfig.strategy === 'auto'" class="detail-section">
      <div class="section-title">标签匹配（可选）</div>
      <Typography.Text type="secondary" class="filter-desc">
        配置标签后，系统只会在匹配标签的执行机中自动选择
      </Typography.Text>
      <div v-if="localConfig.labels && Object.keys(localConfig.labels).length > 0" class="label-list">
        <Tag
          v-for="(value, key) in localConfig.labels"
          :key="key"
          :closable="!readonly"
          color="blue"
          @close="removeLabel(key as string)"
        >
          {{ key }}={{ value }}
        </Tag>
      </div>
      <Space v-if="!readonly" class="label-input-row">
        <Input
          v-model:value="labelInput.key"
          placeholder="Key"
          style="width: 100px"
          size="small"
        />
        <Input
          v-model:value="labelInput.value"
          placeholder="Value"
          style="width: 100px"
          size="small"
        />
        <Button type="dashed" size="small" @click="addLabel">添加</Button>
      </Space>
    </div>
  </div>
</template>

<style scoped>
.executor-config-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-title {
  font-size: 12px;
  font-weight: 500;
  color: hsl(var(--muted-foreground));
  margin-bottom: 8px;
}

.strategy-options {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.strategy-option {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid transparent;
  transition: all 0.2s;
}

.strategy-option.active {
  background: var(--ant-color-primary-bg, #e6f7ff);
  border-color: var(--ant-color-primary-border, #91d5ff);
}

.option-label {
  font-weight: 500;
}

.option-desc {
  font-size: 11px;
  margin-left: 24px;
}

.detail-section {
  padding-left: 4px;
}

.executor-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.executor-state-text {
  font-size: 11px;
}

.refresh-btn {
  padding: 0;
  margin-top: 4px;
  font-size: 12px;
}

.filter-desc {
  display: block;
  font-size: 11px;
  margin-bottom: 8px;
}

.label-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 8px;
}

.label-input-row {
  margin-top: 4px;
}
</style>
