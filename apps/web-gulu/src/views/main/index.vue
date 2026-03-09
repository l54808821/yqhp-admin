<script setup lang="ts">
import { onMounted } from 'vue';

import SplitPane from '#/components/SplitPane.vue';
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
    <div class="main-page__card">
      <SplitPane
        :default-width="300"
        :min-width="220"
        :max-width="360"
      >
        <template #left>
          <TeamList />
        </template>
        <template #right>
          <TeamDetail />
        </template>
      </SplitPane>
    </div>
  </div>
</template>

<style scoped>
.main-page {
  height: 100%;
  padding: 16px;
  background: #f0f2f5;
  box-sizing: border-box;
}

.main-page__card {
  height: 100%;
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}
</style>
