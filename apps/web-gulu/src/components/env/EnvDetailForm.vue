<script setup lang="ts">
import { ref, watch, computed } from 'vue';

import { createIconifyIcon } from '@vben/icons';

import { Database, Globe } from '#/components/icons';

const Settings = createIconifyIcon('lucide:settings');
const Variable = createIconifyIcon('lucide:variable');
const MessageSquare = createIconifyIcon('lucide:message-square');

import {
  Badge,
  Button,
  Form,
  Input,
  message,
  Switch,
  Tabs,
} from 'ant-design-vue';

import type { Env } from '#/api/env';

import { updateEnvApi } from '#/api/env';

import DomainConfigTab from './DomainConfigTab.vue';
import VariableConfigTab from './VariableConfigTab.vue';
import DatabaseConfigTab from './DatabaseConfigTab.vue';
import MQConfigTab from './MQConfigTab.vue';

interface Props {
  env: Env;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'updated'): void;
}>();

const saving = ref(false);
const activeTab = ref('basic');
const formData = ref({
  name: '',
  description: '',
  status: 1,
});

// 子组件引用
const domainTabRef = ref<InstanceType<typeof DomainConfigTab>>();
const variableTabRef = ref<InstanceType<typeof VariableConfigTab>>();
const databaseTabRef = ref<InstanceType<typeof DatabaseConfigTab>>();
const mqTabRef = ref<InstanceType<typeof MQConfigTab>>();

// 当前环境的项目ID
const projectId = computed(() => props.env?.project_id);

// 是否显示顶部保存按钮（数据库和 MQ Tab 已改为弹窗内即时保存，不需要顶部保存按钮）
const showSaveButton = computed(() => {
  return !['databases', 'mq'].includes(activeTab.value);
});

watch(
  () => props.env,
  async (env) => {
    if (env) {
      formData.value = {
        name: env.name,
        description: env.description || '',
        status: env.status,
      };
    }
  },
  { immediate: true },
);

async function handleSave() {
  try {
    saving.value = true;
    
    // 根据当前 Tab 决定保存哪些内容
    if (activeTab.value === 'basic') {
      await updateEnvApi(props.env.id, formData.value);
      message.success('保存成功');
      emit('updated');
    } else if (activeTab.value === 'domains') {
      await domainTabRef.value?.saveConfigs();
    } else if (activeTab.value === 'variables') {
      await variableTabRef.value?.saveConfigs();
    } else if (activeTab.value === 'databases') {
      await databaseTabRef.value?.saveConfigs();
    } else if (activeTab.value === 'mq') {
      await mqTabRef.value?.saveConfigs();
    }
  } catch (error: any) {
    message.error(error?.message || '保存失败');
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="env-detail-form">
    <!-- 头部 -->
    <div class="detail-header">
      <div class="env-title">
        <span class="env-name">{{ props.env.name }}</span>
        <Badge 
          :status="props.env.status === 1 ? 'success' : 'default'" 
          :text="props.env.status === 1 ? '启用' : '禁用'" 
        />
      </div>
      <Button v-if="showSaveButton" type="primary" :loading="saving" @click="handleSave">
        保存配置
      </Button>
    </div>

    <!-- Tabs -->
    <Tabs v-model:activeKey="activeTab" class="detail-tabs">
      <!-- 基本信息 Tab -->
      <Tabs.TabPane key="basic">
        <template #tab>
          <span class="tab-label">
            <Settings class="size-4" />
            <span>基本信息</span>
          </span>
        </template>
        <div class="tab-content basic-form">
          <Form layout="vertical">
            <Form.Item label="环境名称">
              <Input v-model:value="formData.name" />
            </Form.Item>
            <Form.Item label="描述">
              <Input.TextArea 
                v-model:value="formData.description" 
                :rows="3" 
                placeholder="请输入环境描述"
              />
            </Form.Item>
            <Form.Item label="状态">
              <Switch
                :checked="formData.status === 1"
                checked-children="启用"
                un-checked-children="禁用"
                @change="(checked: any) => formData.status = checked ? 1 : 0"
              />
              <span class="status-hint">
                {{ formData.status === 1 ? '环境处于启用状态，可用于测试执行' : '环境已禁用，无法用于测试执行' }}
              </span>
            </Form.Item>
          </Form>
        </div>
      </Tabs.TabPane>

      <!-- 域名配置 Tab -->
      <Tabs.TabPane key="domains">
        <template #tab>
          <span class="tab-label">
            <Globe class="size-4" />
            <span>域名配置</span>
          </span>
        </template>
        <div class="tab-content">
          <DomainConfigTab
            ref="domainTabRef"
            :env-id="props.env.id"
            :project-id="projectId"
            @updated="emit('updated')"
          />
        </div>
      </Tabs.TabPane>

      <!-- 变量配置 Tab -->
      <Tabs.TabPane key="variables">
        <template #tab>
          <span class="tab-label">
            <Variable class="size-4" />
            <span>变量配置</span>
          </span>
        </template>
        <div class="tab-content">
          <VariableConfigTab
            ref="variableTabRef"
            :env-id="props.env.id"
            :project-id="projectId"
            @updated="emit('updated')"
          />
        </div>
      </Tabs.TabPane>

      <!-- 数据库配置 Tab -->
      <Tabs.TabPane key="databases">
        <template #tab>
          <span class="tab-label">
            <Database class="size-4" />
            <span>数据库</span>
          </span>
        </template>
        <div class="tab-content">
          <DatabaseConfigTab
            ref="databaseTabRef"
            :env-id="props.env.id"
            :project-id="projectId"
            @updated="emit('updated')"
          />
        </div>
      </Tabs.TabPane>

      <!-- MQ 配置 Tab -->
      <Tabs.TabPane key="mq">
        <template #tab>
          <span class="tab-label">
            <MessageSquare class="size-4" />
            <span>MQ 配置</span>
          </span>
        </template>
        <div class="tab-content">
          <MQConfigTab
            ref="mqTabRef"
            :env-id="props.env.id"
            :project-id="projectId"
            @updated="emit('updated')"
          />
        </div>
      </Tabs.TabPane>
    </Tabs>
  </div>
</template>

<style scoped>
.env-detail-form {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
}

.env-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.env-name {
  font-size: 16px;
  font-weight: 500;
}

.detail-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.detail-tabs :deep(.ant-tabs-nav) {
  padding: 0 16px;
  margin-bottom: 0;
}

.detail-tabs :deep(.ant-tabs-content-holder) {
  flex: 1;
  overflow: auto;
}

.detail-tabs :deep(.ant-tabs-content) {
  height: 100%;
}

.detail-tabs :deep(.ant-tabs-tabpane) {
  height: 100%;
}

.tab-label {
  display: flex;
  align-items: center;
  gap: 6px;
}

.tab-content {
  padding: 16px;
  height: 100%;
  overflow: auto;
}

.basic-form {
  max-width: 500px;
}

.status-hint {
  margin-left: 12px;
  font-size: 12px;
  color: #999;
}
</style>
