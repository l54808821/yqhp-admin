<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';

import {
  Alert,
  Badge,
  Form,
  message,
  Modal,
  Radio,
  Select,
  Spin,
  Typography,
} from 'ant-design-vue';

import type { Executor, ExecutorConfig, ExecutorStrategy } from '#/api/executor';
import type { Workflow } from '#/api/workflow';

import { createExecutionApi } from '#/api/execution';
import { getAvailableExecutorsApi } from '#/api/executor';
import { useProjectStore } from '#/store/project';

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

const workflowExecutorConfig = computed<ExecutorConfig | null>(() => {
  if (!props.workflow?.definition) return null;
  try {
    const parsed = JSON.parse(props.workflow.definition);
    return parsed.executorConfig || null;
  } catch {
    return null;
  }
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
      // 初始化：读取工作流的默认执行策略
      const cfg = workflowExecutorConfig.value;
      if (cfg) {
        formState.value.strategy = cfg.strategy || 'local';
        formState.value.executor_id = cfg.executor_id ?? undefined;
      } else {
        formState.value.strategy = 'local';
        formState.value.executor_id = undefined;
      }
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
</script>

<template>
  <Modal
    :open="open"
    title="执行工作流"
    :confirm-loading="submitting"
    :width="480"
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
</style>
