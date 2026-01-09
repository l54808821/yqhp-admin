import { computed, ref } from 'vue';

import { defineStore } from 'pinia';

import type { Team, TeamMember } from '#/api/team';

import {
  createTeamApi,
  deleteTeamApi,
  getTeamMembersApi,
  getUserTeamsApi,
  updateTeamApi,
} from '#/api/team';

const TEAM_STORAGE_KEY = 'gulu_current_team';

export const useTeamStore = defineStore('team', () => {
  // 用户的团队列表
  const teams = ref<Team[]>([]);
  // 当前团队
  const currentTeam = ref<Team | null>(null);
  // 当前团队的成员列表
  const members = ref<TeamMember[]>([]);
  // 加载状态
  const loading = ref(false);

  // 当前团队ID
  const currentTeamId = computed(() => currentTeam.value?.id ?? 0);

  /**
   * 加载用户的团队列表
   */
  async function loadTeams() {
    try {
      loading.value = true;
      teams.value = await getUserTeamsApi();

      // 尝试从本地存储恢复上次选择的团队
      const savedTeamId = localStorage.getItem(TEAM_STORAGE_KEY);
      if (savedTeamId) {
        const team = teams.value.find((t) => t.id === Number(savedTeamId));
        if (team) {
          await setCurrentTeam(team);
          return;
        }
      }

      // 如果没有保存的团队或团队不存在，选择第一个
      if (teams.value.length > 0) {
        await setCurrentTeam(teams.value[0]!);
      }
    } finally {
      loading.value = false;
    }
  }

  /**
   * 设置当前团队
   */
  async function setCurrentTeam(team: Team | null) {
    currentTeam.value = team;
    members.value = [];

    if (team) {
      localStorage.setItem(TEAM_STORAGE_KEY, String(team.id));
      // 加载团队成员
      await loadMembers(team.id);
    } else {
      localStorage.removeItem(TEAM_STORAGE_KEY);
    }
  }

  /**
   * 加载团队成员
   */
  async function loadMembers(teamId: number) {
    try {
      members.value = await getTeamMembersApi(teamId);
    } catch {
      members.value = [];
    }
  }

  /**
   * 创建团队
   */
  async function createTeam(params: { name: string; description?: string }) {
    const team = await createTeamApi(params);
    teams.value.push(team);
    return team;
  }

  /**
   * 更新团队
   */
  async function updateTeam(id: number, params: { name?: string; description?: string; status?: number }) {
    await updateTeamApi(id, params);
    const index = teams.value.findIndex((t) => t.id === id);
    if (index !== -1) {
      teams.value[index] = { ...teams.value[index]!, ...params };
    }
    if (currentTeam.value?.id === id) {
      currentTeam.value = { ...currentTeam.value, ...params };
    }
  }

  /**
   * 删除团队
   */
  async function deleteTeam(id: number) {
    await deleteTeamApi(id);
    teams.value = teams.value.filter((t) => t.id !== id);
    if (currentTeam.value?.id === id) {
      currentTeam.value = teams.value[0] ?? null;
    }
  }

  /**
   * 刷新团队列表
   */
  async function refreshTeams() {
    const currentId = currentTeam.value?.id;
    await loadTeams();
    if (currentId) {
      const team = teams.value.find((t) => t.id === currentId);
      if (team) {
        await setCurrentTeam(team);
      }
    }
  }

  /**
   * 刷新成员列表
   */
  async function refreshMembers() {
    if (currentTeam.value) {
      await loadMembers(currentTeam.value.id);
    }
  }

  /**
   * 重置状态
   */
  function $reset() {
    teams.value = [];
    currentTeam.value = null;
    members.value = [];
    loading.value = false;
  }

  return {
    // State
    teams,
    currentTeam,
    members,
    loading,
    // Computed
    currentTeamId,
    // Actions
    loadTeams,
    setCurrentTeam,
    loadMembers,
    createTeam,
    updateTeam,
    deleteTeam,
    refreshTeams,
    refreshMembers,
    $reset,
  };
});
