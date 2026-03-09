<script setup lang="ts">
import { Empty } from 'ant-design-vue';
import { computed, ref } from 'vue';

import { useTeamStore } from '#/store/team';

import MembersTab from './MembersTab.vue';
import ProjectsTab from './ProjectsTab.vue';
import SettingsTab from './SettingsTab.vue';

const teamStore = useTeamStore();

const currentTeam = computed(() => teamStore.currentTeam);
const members = computed(() => teamStore.members);
const activeKey = ref('projects');

const currentUserRole = computed(() => {
  const userId = currentTeam.value?.created_by;
  if (!userId) return 'member';
  const member = members.value.find((m) => m.user_id === userId);
  return member?.role ?? 'owner';
});

const roleLabel = computed(() => {
  const map: Record<string, string> = {
    owner: '团队所有者',
    admin: '管理员',
    member: '成员',
  };
  return map[currentUserRole.value] || '成员';
});

const tabs = [
  { key: 'projects', label: '团队项目' },
  { key: 'members', label: '成员/权限' },
  { key: 'settings', label: '团队设置' },
];
</script>

<template>
  <div class="team-detail">
    <template v-if="currentTeam">
      <div class="td-header">
        <div class="td-header__title-row">
          <h2 class="td-header__name">{{ currentTeam.name }}</h2>
          <span class="td-header__role-tag">{{ roleLabel }}</span>
        </div>

        <div class="td-tabs__nav">
          <div
            v-for="tab in tabs"
            :key="tab.key"
            :class="[
              'td-tabs__item',
              { 'td-tabs__item--active': activeKey === tab.key },
            ]"
            @click="activeKey = tab.key"
          >
            {{ tab.label }}
          </div>
        </div>
      </div>

      <div class="td-tabs__content">
        <ProjectsTab v-if="activeKey === 'projects'" />
        <MembersTab v-else-if="activeKey === 'members'" />
        <SettingsTab v-else-if="activeKey === 'settings'" />
      </div>
    </template>
    <Empty v-else description="请选择一个团队" class="td-empty" />
  </div>
</template>

<style scoped>
.team-detail {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.td-header {
  padding: 20px 24px 0;
  flex-shrink: 0;
}

.td-header__title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.td-header__name {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: #1a1a1a;
}

.td-header__role-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  background: #fff7e6;
  color: #d46b08;
  border: 1px solid #ffd591;
  white-space: nowrap;
}

.td-tabs__nav {
  display: flex;
  gap: 0;
  border-bottom: 1px solid #f0f0f0;
}

.td-tabs__item {
  position: relative;
  padding: 8px 16px;
  font-size: 14px;
  color: #8c8c8c;
  cursor: pointer;
  transition: color 0.2s;
  white-space: nowrap;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}

.td-tabs__item:hover {
  color: #7c5cfc;
}

.td-tabs__item--active {
  color: #7c5cfc;
  font-weight: 600;
  border-bottom-color: #7c5cfc;
}

.td-tabs__content {
  flex: 1;
  overflow-y: auto;
}

.td-empty {
  margin: auto;
}
</style>
