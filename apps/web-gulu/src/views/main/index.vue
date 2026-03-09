<script setup lang="ts">
import { onMounted } from 'vue';

import { useTeamStore } from '#/store/team';

import TeamDetail from './components/TeamDetail.vue';
import TeamList from './components/TeamList.vue';

const teamStore = useTeamStore();

onMounted(async () => {
  await teamStore.loadTeams();
});
</script>

<template>
  <div class="main-page">
    <div class="team-sidebar">
      <TeamList />
    </div>
    <div class="team-content">
      <TeamDetail />
    </div>
  </div>
</template>

<style scoped>
.main-page {
  display: flex;
  height: 100%;
  background: var(--content-bg, #fff);
}

.team-sidebar {
  width: 240px;
  border-right: 1px solid var(--border-color, #eee);
  flex-shrink: 0;
  background: var(--sidebar-bg, #f7f8fa);
}

.team-content {
  flex: 1;
  overflow: hidden;
  background: var(--content-bg, #fff);
}
</style>
