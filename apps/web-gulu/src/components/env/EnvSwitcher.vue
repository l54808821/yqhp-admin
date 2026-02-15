<script setup lang="ts">
import type { SelectValue } from 'ant-design-vue/es/select';

import { ref } from 'vue';

import { createIconifyIcon, Menu } from '@vben/icons';
import { Button, Input, Select } from 'ant-design-vue';

import { useProjectStore } from '#/store/project';

import EnvManageModal from './EnvManageModal.vue';

const Server = createIconifyIcon('lucide:server');

const projectStore = useProjectStore();

const manageModalVisible = ref(false);

function handleEnvChange(value: SelectValue) {
  const envId = value as number;
  if (!envId) return;
  const env = projectStore.envs.find((e) => e.id === envId);
  if (env) {
    projectStore.setCurrentEnv(env);
  }
}

function openManageModal() {
  manageModalVisible.value = true;
}

function handleModalClose() {
  manageModalVisible.value = false;
  projectStore.refreshEnvs();
  // 刷新环境配置（域名、变量、数据库、MQ），确保各选择器数据同步
  projectStore.refreshEnvConfigs();
}
</script>

<template>
  <div class="env-switcher-wrapper">
    <Input.Group compact>
      <Select
        :value="projectStore.currentEnv?.id"
        :disabled="!projectStore.currentProject"
        placeholder="选择环境"
        style="width: 140px"
        @change="handleEnvChange"
      >
        <Select.Option
          v-for="env in projectStore.envs"
          :key="env.id"
          :value="env.id"
        >
          <span class="env-option">
            <Server class="env-icon" />
            {{ env.name }}
          </span>
        </Select.Option>
      </Select>
      <Button
        :disabled="!projectStore.currentProject"
        @click="openManageModal"
      >
        <template #icon><Menu class="size-4" /></template>
      </Button>
    </Input.Group>

    <EnvManageModal
      v-model:visible="manageModalVisible"
      :project-id="projectStore.currentProjectId"
      @close="handleModalClose"
    />
  </div>
</template>

<style scoped>
.env-switcher-wrapper {
  display: inline-block;
}

/* 让 Button 左移 1px 覆盖 Select 的右边框 */
.env-switcher-wrapper :deep(.ant-btn) {
  margin-left: -1px;
}

/* 悬浮时提升层级，确保边框完整显示 */
.env-switcher-wrapper :deep(.ant-select:hover),
.env-switcher-wrapper :deep(.ant-select-focused) {
  z-index: 1;
}

.env-switcher-wrapper :deep(.ant-btn:hover),
.env-switcher-wrapper :deep(.ant-btn:focus) {
  z-index: 1;
}

/* 环境选项样式 */
.env-option {
  display: inline-flex;
  align-items: center;
}

/* 环境图标样式 */
.env-icon {
  width: 14px;
  height: 14px;
  margin-right: 6px;
  color: var(--primary-color, #1890ff);
}
</style>
