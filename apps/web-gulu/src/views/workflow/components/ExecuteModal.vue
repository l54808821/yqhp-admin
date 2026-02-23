<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';

import { createIconifyIcon } from '@vben/icons';
import {
  Alert,
  Badge,
  Button,
  Divider,
  Form,
  message,
  Modal,
  Radio,
  Select,
  Spin,
  Tag,
  Typography,
} from 'ant-design-vue';

import type { Executor, ExecutorConfig, ExecutorStrategy } from '#/api/executor';
import type { Workflow } from '#/api/workflow';
import type { PerformanceConfig } from '#/api/workflow/performance';

import { createExecutionApi } from '#/api/execution';
import { getAvailableExecutorsApi } from '#/api/executor';
import { getPerformanceConfigSummary } from '#/api/workflow/performance';
import { useProjectStore } from '#/store/project';

import PerformanceConfigPanel from './PerformanceConfigPanel.vue';

const Gauge = createIconifyIcon('lucide:gauge');
const Settings = createIconifyIcon('lucide:settings-2');

interface Props {
  open: boolean;
  workflow: Workflow | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'success', executionId: number): void;
}>();

const projectStore = useProjectStore();

const loading = ref(false);
const submitting = ref(false);
const executors = ref<Executor[]>([]);

const formState = ref({
  strategy: 'local' as ExecutorStrategy,
  executor_id: undefined as number | undefined,
});

const showPerfConfigOverride = ref(false);
const perfConfigOverride = ref<PerformanceConfig | null>(null);

const workflowExecutorConfig = computed<ExecutorConfig | null>(() => {
  if (!props.workflow?.definition) return null;
  try {
    const parsed = JSON.parse(props.workflow.definition);
    return parsed.executorConfig || null;
  } catch {
    return null;
  }
});

const workflowPerformanceConfig = computed<PerformanceConfig | null>(() => {
  if (!props.workflow?.definition) return null;
  try {
    const parsed = JSON.parse(props.workflow.definition);
    return parsed.performanceConfig || null;
  } catch {
    return null;
  }
});

const isPerformanceWorkflow = computed(() => {
  return props.workflow?.workflow_type === 'performance';
});

const effectivePerfConfig = computed(() => {
  if (showPerfConfigOverride.value && perfConfigOverride.value) {
    return perfConfigOverride.value;
  }
  return workflowPerformanceConfig.value;
});

const perfConfigSummary = computed(() => {
  const cfg = workflowPerformanceConfig.value;
  if (!cfg) return '';
  return getPerformanceConfigSummary(cfg);
});

const hasDefaultConfig = computed(() => {
  const cfg = workflowExecutorConfig.value;
  return cfg && cfg.strategy && cfg.strategy !== 'local';
});

const strategyLabel = computed(() => {
  const s = formState.value.strategy;
  if (s === 'local') return '本地执行';
  if (s === 'auto') return '自动分配';
  if (s === 'manual') return '指定执行机';
  return s;
});

watch(
  () => props.open,
  async (open) => {
    if (open) {
      const cfg = workflowExecutorConfig.value;
      if (cfg) {
        formState.value.strategy = cfg.strategy || 'local';
        formState.value.executor_id = cfg.executor_id ?? undefined;
      } else {
        formState.value.strategy = 'local';
        formState.value.executor_id = undefined;
      }
      showPerfConfigOverride.value = false;
      perfConfigOverride.value = workflowPerformanceConfig.value
        ? { ...workflowPerformanceConfig.value }
        : null;
      await loadData();
    }
  },
);

onMounted(async () => {
  if (props.open) {
    await loadData();
  }
});

async function loadData() {
  try {
    loading.value = true;
    executors.value = await getAvailableExecutorsApi();
  } catch {
    message.error('加载执行机列表失败');
  } finally {
    loading.value = false;
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

async function handleOk() {
  if (!props.workflow) return;

  if (!projectStore.currentEnvId) {
    message.warning('请先在右上角选择执行环境');
    return;
  }

  if (formState.value.strategy === 'manual' && !formState.value.executor_id) {
    message.warning('请选择执行机');
    return;
  }

  try {
    submitting.value = true;
    const execution = await createExecutionApi({
      workflow_id: props.workflow.id,
      env_id: projectStore.currentEnvId,
      executor_id:
        formState.value.strategy === 'manual'
          ? formState.value.executor_id
          : undefined,
      mode: 'execute',
      performance_config: effectivePerfConfig.value || undefined,
    });
    message.success('执行已提交');
    emit('update:open', false);
    emit('success', execution.id);
  } catch {
    message.error('提交执行失败');
  } finally {
    submitting.value = false;
  }
}

function handleCancel() {
  emit('update:open', false);
}

function handlePerfConfigOverrideUpdate(config: PerformanceConfig | null) {
  perfConfigOverride.value = config;
}
</script>

<template>
  <Modal
    :open="open"
    title="执行工作流"
    :confirm-loading="submitting"
    :width="isPerformanceWorkflow ? 640 : 480"
    @ok="handleOk"
    @cancel="handleCancel"
  >
    <Spin :spinning="loading">
      <Form :model="formState" layout="vertical">
        <!-- 默认策略提示 -->
        <Alert
          v-if="hasDefaultConfig"
          type="info"
          show-icon
          class="strategy-alert"
        >
          <template #message>
            该工作流已配置默认执行策略：<strong>{{ strategyLabel }}</strong>
          </template>
          <template #description>
            <Typography.Text type="secondary" style="font-size: 12px">
              你可以在下方修改本次执行的策略
            </Typography.Text>
          </template>
        </Alert>

        <Form.Item label="执行策略">
          <Radio.Group v-model:value="formState.strategy">
            <Radio.Button value="local">本地执行</Radio.Button>
            <Radio.Button value="auto">自动分配</Radio.Button>
            <Radio.Button value="manual">指定执行机</Radio.Button>
          </Radio.Group>
        </Form.Item>

        <!-- 自动分配提示 -->
        <div v-if="formState.strategy === 'auto'" class="strategy-hint">
          <Typography.Text type="secondary">
            系统将自动选择负载最低的在线执行机
          </Typography.Text>
          <div class="available-count">
            当前可用执行机：{{ executors.filter((e) => e.state === 'online').length }} 台
          </div>
        </div>

        <!-- 指定执行机 -->
        <Form.Item
          v-if="formState.strategy === 'manual'"
          label="执行机"
          required
        >
          <Select
            v-model:value="formState.executor_id"
            placeholder="请选择执行机"
            :loading="loading"
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
                <Typography.Text type="secondary" class="executor-detail">
                  {{ getStateText(executor.state) }}
                  <template v-if="executor.load">
                    · {{ Math.round((executor.load || 0) * 100) }}%
                  </template>
                </Typography.Text>
              </div>
            </Select.Option>
          </Select>
          <div v-if="executors.length === 0" class="no-executor-tip">
            暂无可用执行机
          </div>
        </Form.Item>

        <!-- 压测配置区域 -->
        <template v-if="isPerformanceWorkflow">
          <Divider class="perf-divider">
            <Gauge class="size-3.5" />
            压测配置
          </Divider>

          <!-- 默认配置摘要 -->
          <div v-if="perfConfigSummary && !showPerfConfigOverride" class="perf-summary">
            <div class="perf-summary-content">
              <Tag color="orange">{{ perfConfigSummary }}</Tag>
              <Typography.Text type="secondary" class="perf-summary-hint">
                使用工作流默认配置
              </Typography.Text>
            </div>
            <Button
              type="link"
              size="small"
              @click="showPerfConfigOverride = true"
            >
              <template #icon><Settings class="size-3.5" /></template>
              修改本次配置
            </Button>
          </div>

          <div v-if="!perfConfigSummary && !showPerfConfigOverride" class="perf-no-config">
            <Typography.Text type="secondary">
              未配置压测参数，将使用默认值
            </Typography.Text>
            <Button
              type="link"
              size="small"
              @click="showPerfConfigOverride = true"
            >
              配置压测参数
            </Button>
          </div>

          <!-- 覆盖配置面板 -->
          <div v-if="showPerfConfigOverride" class="perf-override">
            <div class="perf-override-header">
              <Typography.Text strong>本次执行配置</Typography.Text>
              <Button
                type="link"
                size="small"
                @click="showPerfConfigOverride = false"
              >
                恢复默认
              </Button>
            </div>
            <PerformanceConfigPanel
              :config="perfConfigOverride"
              @update:config="handlePerfConfigOverrideUpdate"
            />
          </div>
        </template>
      </Form>
    </Spin>
  </Modal>
</template>

<style scoped>
.strategy-alert {
  margin-bottom: 16px;
}

.strategy-hint {
  padding: 8px 12px;
  margin-bottom: 16px;
  border-radius: 6px;
  background: var(--ant-color-fill-quaternary, #fafafa);
}

.available-count {
  margin-top: 4px;
  font-size: 12px;
  color: var(--ant-color-text-secondary);
}

.executor-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.executor-detail {
  font-size: 11px;
}

.no-executor-tip {
  margin-top: 4px;
  font-size: 12px;
  color: #fa8c16;
}

.perf-divider {
  margin: 16px 0 12px;
  font-size: 13px;
}

.perf-divider :deep(.ant-divider-inner-text) {
  display: flex;
  align-items: center;
  gap: 6px;
}

.perf-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-radius: 8px;
  background: var(--ant-color-fill-quaternary, #fafafa);
  border: 1px solid var(--ant-color-border, #d9d9d9);
}

.perf-summary-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.perf-summary-hint {
  font-size: 12px;
}

.perf-no-config {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-radius: 8px;
  background: var(--ant-color-fill-quaternary, #fafafa);
  border: 1px dashed var(--ant-color-border, #d9d9d9);
}

.perf-override {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid var(--ant-color-primary-border, #91d5ff);
  background: var(--ant-color-primary-bg, #e6f7ff);
}

.perf-override-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
