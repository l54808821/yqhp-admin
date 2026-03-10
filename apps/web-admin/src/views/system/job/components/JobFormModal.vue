<script setup lang="ts">
import type { JobApi } from '#/api/system/job';

import { ref } from 'vue';

import {
  Form,
  FormItem,
  Input,
  InputNumber,
  message,
  Modal,
  Radio,
  RadioGroup,
  Select,
} from 'ant-design-vue';

import { createJobApi, getJobApi, updateJobApi } from '#/api';

const emit = defineEmits<{
  success: [];
}>();

const visible = ref(false);
const loading = ref(false);
const isEdit = ref(false);

const formData = ref<Partial<JobApi.CreateParams & { id?: number }>>({});

const groupOptions = [
  { value: 'DEFAULT', label: '默认' },
  { value: 'SYSTEM', label: '系统' },
  { value: 'BUSINESS', label: '业务' },
];

function resetFormData() {
  formData.value = {
    name: '',
    handlerName: '',
    cronExpression: '',
    jobGroup: 'DEFAULT',
    params: '',
    status: 0,
    misfirePolicy: 0,
    concurrent: 0,
    retryCount: 0,
    retryInterval: 0,
    remark: '',
  };
}

async function open(id?: number) {
  resetFormData();

  if (id) {
    isEdit.value = true;
    const record = await getJobApi(id);
    formData.value = {
      id: record.id,
      name: record.name,
      handlerName: record.handlerName,
      cronExpression: record.cronExpression,
      jobGroup: record.jobGroup,
      params: record.params,
      status: record.status,
      misfirePolicy: record.misfirePolicy,
      concurrent: record.concurrent,
      retryCount: record.retryCount,
      retryInterval: record.retryInterval,
      remark: record.remark,
    };
  } else {
    isEdit.value = false;
  }

  visible.value = true;
}

async function handleSubmit() {
  if (!formData.value.name) {
    message.error('请输入任务名称');
    return;
  }
  if (!formData.value.handlerName) {
    message.error('请输入处理器名称');
    return;
  }
  if (!formData.value.cronExpression) {
    message.error('请输入Cron表达式');
    return;
  }

  loading.value = true;
  try {
    if (isEdit.value) {
      await updateJobApi(formData.value as JobApi.UpdateParams);
      message.success('更新成功');
    } else {
      await createJobApi(formData.value as JobApi.CreateParams);
      message.success('创建成功');
    }
    visible.value = false;
    emit('success');
  } finally {
    loading.value = false;
  }
}

defineExpose({ open });
</script>

<template>
  <Modal
    v-model:open="visible"
    :title="isEdit ? '编辑定时任务' : '新增定时任务'"
    :confirm-loading="loading"
    width="650px"
    @ok="handleSubmit"
  >
    <Form :label-col="{ span: 5 }" :wrapper-col="{ span: 18 }">
      <FormItem label="任务名称" required>
        <Input v-model:value="formData.name" placeholder="请输入任务名称" />
      </FormItem>
      <FormItem label="处理器名称" required>
        <Input
          v-model:value="formData.handlerName"
          :disabled="isEdit"
          placeholder="请输入处理器名称 (如: clean-expired-token)"
        />
      </FormItem>
      <FormItem label="Cron表达式" required>
        <Input
          v-model:value="formData.cronExpression"
          placeholder="请输入Cron表达式 (如: 0 2 * * *)"
        />
      </FormItem>
      <FormItem label="任务分组">
        <Select
          v-model:value="formData.jobGroup"
          :options="groupOptions"
          placeholder="请选择任务分组"
        />
      </FormItem>
      <FormItem label="任务参数">
        <Input.TextArea
          v-model:value="formData.params"
          placeholder="请输入任务参数 (JSON格式)"
          :rows="3"
        />
      </FormItem>
      <FormItem label="错过策略">
        <RadioGroup v-model:value="formData.misfirePolicy">
          <Radio :value="0">忽略</Radio>
          <Radio :value="1">立即执行</Radio>
        </RadioGroup>
      </FormItem>
      <FormItem label="是否并发">
        <RadioGroup v-model:value="formData.concurrent">
          <Radio :value="0">禁止</Radio>
          <Radio :value="1">允许</Radio>
        </RadioGroup>
      </FormItem>
      <FormItem label="重试次数">
        <InputNumber
          v-model:value="formData.retryCount"
          :min="0"
          :max="10"
          placeholder="失败重试次数"
          style="width: 200px"
        />
      </FormItem>
      <FormItem label="重试间隔(秒)">
        <InputNumber
          v-model:value="formData.retryInterval"
          :min="0"
          :max="3600"
          placeholder="重试间隔"
          style="width: 200px"
        />
      </FormItem>
      <FormItem label="备注">
        <Input.TextArea
          v-model:value="formData.remark"
          placeholder="请输入备注"
          :rows="2"
        />
      </FormItem>
    </Form>
  </Modal>
</template>
