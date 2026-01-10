<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';

import { Form, message, Modal, Select, Spin } from 'ant-design-vue';

import type { Executor } from '#/api/executor';
import type { Workflow } from '#/api/workflow';

import { createExecutionApi } from '#/api/execution';
import { getExecutorListApi } from '#/api/executor';
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
  executor_id: undefined as number | undefined,
});

watch(
  () => props.open,
  async (open) => {
    if (open) {
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
    const result = await getExecutorListApi({ status: 1 });
    executors.value = result.list || [];
  } catch {
    message.error('加载执行机列表失败');
  } finally {
    loading.value = false;
  }
}

async function handleOk() {
  if (!props.workflow) return;

  if (!projectStore.currentEnvId) {
    message.warning('请先在右上角选择执行环境');
    return;
  }
  if (!formState.value.executor_id) {
    message.warning('请选择执行机');
    return;
  }

  try {
    submitting.value = true;
    const execution = await createExecutionApi({
      workflow_id: props.workflow.id,
      env_id: projectStore.currentEnvId,
      executor_id: formState.value.executor_id,
      mode: 'execute', // 正式执行模式
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
    :width="400"
    @ok="handleOk"
    @cancel="handleCancel"
  >
    <Spin :spinning="loading">
      <Form :model="formState" layout="vertical">
        <Form.Item label="执行机" required>
          <Select
            v-model:value="formState.executor_id"
            placeholder="请选择执行机"
            :options="
              executors.map((e) => ({
                label: `${e.name} (${e.address || e.slave_id})`,
                value: e.id,
              }))
            "
          />
          <div v-if="executors.length === 0" class="no-executor-tip">
            暂无可用执行机
          </div>
        </Form.Item>
      </Form>
    </Spin>
  </Modal>
</template>

<style scoped>
.no-executor-tip {
  margin-top: 4px;
  font-size: 12px;
  color: #fa8c16;
}
</style>
