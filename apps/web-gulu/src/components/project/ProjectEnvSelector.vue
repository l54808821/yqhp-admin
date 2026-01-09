<script setup lang="ts">
import { onMounted } from 'vue';

import { Select, Space } from 'ant-design-vue';

import { useProjectStore } from '#/store/project';

const projectStore = useProjectStore();

onMounted(async () => {
  if (projectStore.projects.length === 0) {
    await projectStore.loadProjects();
  }
});

function handleProjectChange(projectId: number | undefined) {
  if (!projectId) return;
  const project = projectStore.projects.find((p) => p.id === projectId);
  if (project) {
    projectStore.setCurrentProject(project);
  }
}

function handleEnvChange(envId: number | undefined) {
  if (!envId) return;
  const env = projectStore.envs.find((e) => e.id === envId);
  if (env) {
    projectStore.setCurrentEnv(env);
  }
}
</script>

<template>
  <Space>
    <Select
      :value="projectStore.currentProject?.id"
      :loading="projectStore.loading"
      placeholder="选择项目"
      style="width: 160px"
      @change="handleProjectChange"
    >
      <Select.Option
        v-for="project in projectStore.projects"
        :key="project.id"
        :value="project.id"
      >
        {{ project.name }}
      </Select.Option>
    </Select>
    <Select
      :value="projectStore.currentEnv?.id"
      :disabled="!projectStore.currentProject"
      placeholder="选择环境"
      style="width: 120px"
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
  </Space>
</template>
