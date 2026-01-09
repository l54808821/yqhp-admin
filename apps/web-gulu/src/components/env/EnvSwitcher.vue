<script setup lang="ts">
import { ref } from 'vue';

import { Settings } from '@vben/icons';
import { Button, Select, Space } from 'ant-design-vue';

import { useProjectStore } from '#/store/project';

import EnvManageModal from './EnvManageModal.vue';

const projectStore = useProjectStore();

const manageModalVisible = ref(false);

function handleEnvChange(envId: number | undefined) {
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
  // 刷新环境列表
  projectStore.refreshEnvs();
}
</script>

<template>
  <Space>
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
        {{ env.name }}
      </Select.Option>
    </Select>
    <Button
      type="text"
      :disabled="!projectStore.currentProject"
      @click="openManageModal"
    >
      <template #icon><Settings class="size-4" /></template>
    </Button>

    <EnvManageModal
      v-model:visible="manageModalVisible"
      :project-id="projectStore.currentProjectId"
      @close="handleModalClose"
    />
  </Space>
</template>
