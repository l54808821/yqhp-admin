<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  Form,
  message,
  Select,
  Space,
  Spin,
} from 'ant-design-vue';

import type { Env } from '#/api/env';
import type { Executor } from '#/api/executor';
import type { Workflow } from '#/api/workflow';

import { getEnvsByProjectApi } from '#/api/env';
import { createExecutionApi } from '#/api/execution';
import { getExecutorsByProjectApi } from '#/api/executor';
import { getWorkflowApi } from '#/api/workflow';
import { useProjectStore } from '#/store/project';

const route = useRoute();
const router = useRouter();
const projectStore = useProjectStore();

const loading = ref(false);
const submitting = ref(false);
const workflow = ref<Workflow | null>(null);
const envs = ref<Env[]>([]);
const executors = ref<Executor[]>([]);

const formState = ref({
  env_id: undefined as number | undefined,
  executor_id: undefined as number | undefined,
});

const workflowId = computed(() => Number(route.params.id));

onMounted(async () => {
  await loadData();
});

async function loadData() {
  if (!workflowId.value || !projectStore.currentProjectId) return;

  try {
    loading.value = true;
    const [wf, envList, executorList] = await Promise.all([
      getWorkflowApi(workflowId.value),
      getEnvsByProjectApi(projectStore.currentProjectId),
      getExecutorsByProjectApi(projectStore.currentProjectId),
    ]);
    workflow.value = wf;
    envs.value = envList;
    executors.value = executorList.filter((e) => e.status === 1);

    // 默认选择当前环境
    if (projectStore.currentEnvId) {
      formState.value.env_id = projectStore.currentEnvId;
    }
  } catch {
    message.error('加载数据失败');
  } finally {
    loading.value = false;
  }
}

async function handleSubmit() {
  if (!formState.value.env_id) {
    message.warning('请选择执行环境');
    return;
  }
  if (!formState.value.executor_id) {
    message.warning('请选择执行机');
    return;
  }

  try {
    submitting.value = true;
    const execution = await createExecutionApi({
      workflow_id: workflowId.value,
      env_id: formState.value.env_id,
      executor_id: formState.value.executor_id,
    });
    message.success('执行已提交');
    router.push({ name: 'ExecutionDetail', params: { id: execution.id } });
  } catch {
    message.error('提交执行失败');
  } finally {
    submitting.value = false;
  }
}

function handleCancel() {
  router.back();
}
</script>

<template>
  <Page title="执行工作流" :description="workflow?.name">
    <Spin :spinning="loading">
      <Card style="max-width: 600px; margin: 0 auto">
        <Form :model="formState" layout="vertical">
          <Form.Item label="工作流">
            <div class="text-lg">{{ workflow?.name }}</div>
            <div class="text-gray-400 text-sm">{{ workflow?.code }} - v{{ workflow?.version }}</div>
          </Form.Item>

          <Form.Item label="执行环境" required>
            <Select
              v-model:value="formState.env_id"
              placeholder="请选择执行环境"
              :options="envs.map(e => ({ label: e.name, value: e.id }))"
            />
          </Form.Item>

          <Form.Item label="执行机" required>
            <Select
              v-model:value="formState.executor_id"
              placeholder="请选择执行机"
              :options="executors.map(e => ({ label: `${e.name} (${e.address || e.slave_id})`, value: e.id }))"
            />
            <div v-if="executors.length === 0" class="text-orange-500 text-sm mt-1">
              暂无可用执行机，请先配置执行机
            </div>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" :loading="submitting" @click="handleSubmit">
                提交执行
              </Button>
              <Button @click="handleCancel">取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </Spin>
  </Page>
</template>
