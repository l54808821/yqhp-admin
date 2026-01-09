<script setup lang="ts">
import { Tabs, Empty } from 'ant-design-vue';
import { computed, ref } from 'vue';

import { useTeamStore } from '#/store/team';

import MembersTab from './MembersTab.vue';
import ProjectsTab from './ProjectsTab.vue';
import SettingsTab from './SettingsTab.vue';

const teamStore = useTeamStore();

const currentTeam = computed(() => teamStore.currentTeam);
const activeKey = ref('projects');
</script>

<template>
  <div class="team-detail">
    <template v-if="currentTeam">
      <div class="team-detail-header">
        <h2>{{ currentTeam.name }}</h2>
        <p v-if="currentTeam.description">{{ currentTeam.description }}</p>
      </div>
      <Tabs v-model:activeKey="activeKey">
        <Tabs.TabPane key="projects" tab="项目">
          <ProjectsTab />
        </Tabs.TabPane>
        <Tabs.TabPane key="members" tab="成员">
          <MembersTab />
        </Tabs.TabPane>
        <Tabs.TabPane key="settings" tab="设置">
          <SettingsTab />
        </Tabs.TabPane>
      </Tabs>
    </template>
    <Empty v-else description="请选择一个团队" class="empty-state" />
  </div>
</template>

<style scoped>
.team-detail {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.team-detail-header {
  padding: 16px 24px;
  border-bottom: 1px solid #f0f0f0;
}

.team-detail-header h2 {
  margin: 0 0 8px 0;
  font-size: 20px;
}

.team-detail-header p {
  margin: 0;
  color: #666;
}

.empty-state {
  margin: auto;
}

:deep(.ant-tabs) {
  flex: 1;
  display: flex;
  flex-direction: column;
}

:deep(.ant-tabs-content) {
  flex: 1;
  overflow-y: auto;
}
</style>
