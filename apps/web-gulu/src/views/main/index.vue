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
  background: #fff;
}

.team-sidebar {
  width: 260px;
  border-right: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.team-content {
  flex: 1;
  overflow: hidden;
}
</style>
