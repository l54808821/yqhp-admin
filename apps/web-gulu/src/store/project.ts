import { computed, ref } from 'vue';

import { useAccessStore } from '@vben/stores';

import { defineStore } from 'pinia';

import type { Env } from '#/api/env';
import type { Project } from '#/api/project';

import { getEnvsByProjectApi } from '#/api/env';
import { getAllProjectsApi } from '#/api/project';
import { replaceProjectIdInMenus } from '#/utils/menu';

const PROJECT_STORAGE_KEY = 'gulu_current_project';
const ENV_STORAGE_KEY = 'gulu_current_env';

export const useProjectStore = defineStore('project', () => {
  // 所有项目列表
  const projects = ref<Project[]>([]);
  // 当前项目
  const currentProject = ref<Project | null>(null);
  // 当前项目的环境列表
  const envs = ref<Env[]>([]);
  // 当前环境
  const currentEnv = ref<Env | null>(null);
  // 加载状态
  const loading = ref(false);
  // 原始菜单（未替换projectId）
  const originalMenus = ref<any[]>([]);

  // 当前项目ID
  const currentProjectId = computed(() => currentProject.value?.id ?? 0);
  // 当前环境ID
  const currentEnvId = computed(() => currentEnv.value?.id ?? 0);

  /**
   * 更新菜单中的项目ID
   */
  function updateMenusWithProjectId(projectId: number) {
    const accessStore = useAccessStore();
    // 保存原始菜单（如果还没保存）
    if (originalMenus.value.length === 0 && accessStore.accessMenus.length > 0) {
      // 深拷贝原始菜单
      originalMenus.value = JSON.parse(JSON.stringify(accessStore.accessMenus));
    }
    // 如果有原始菜单，用它来替换；否则用当前菜单
    const menusToReplace = originalMenus.value.length > 0
      ? originalMenus.value
      : accessStore.accessMenus;

    if (menusToReplace.length > 0 && projectId > 0) {
      const updatedMenus = replaceProjectIdInMenus(menusToReplace, projectId);
      accessStore.setAccessMenus(updatedMenus);
    }
  }

  /**
   * 加载所有项目
   */
  async function loadProjects() {
    try {
      loading.value = true;
      projects.value = await getAllProjectsApi();

      // 尝试从本地存储恢复上次选择的项目
      const savedProjectId = localStorage.getItem(PROJECT_STORAGE_KEY);
      if (savedProjectId) {
        const project = projects.value.find(
          (p) => p.id === Number(savedProjectId),
        );
        if (project) {
          await setCurrentProject(project);
          return;
        }
      }

      // 如果没有保存的项目或项目不存在，选择第一个
      if (projects.value.length > 0) {
        await setCurrentProject(projects.value[0]!);
      }
    } finally {
      loading.value = false;
    }
  }

  /**
   * 设置当前项目
   */
  async function setCurrentProject(project: Project | null) {
    currentProject.value = project;
    currentEnv.value = null;
    envs.value = [];

    if (project) {
      localStorage.setItem(PROJECT_STORAGE_KEY, String(project.id));
      // 更新菜单中的项目ID
      updateMenusWithProjectId(project.id);
      // 加载项目的环境列表
      await loadEnvs(project.id);
    } else {
      localStorage.removeItem(PROJECT_STORAGE_KEY);
      localStorage.removeItem(ENV_STORAGE_KEY);
    }
  }

  /**
   * 加载项目的环境列表
   */
  async function loadEnvs(projectId: number) {
    try {
      envs.value = await getEnvsByProjectApi(projectId);

      // 尝试从本地存储恢复上次选择的环境
      const savedEnvId = localStorage.getItem(ENV_STORAGE_KEY);
      if (savedEnvId) {
        const env = envs.value.find((e) => e.id === Number(savedEnvId));
        if (env) {
          setCurrentEnv(env);
          return;
        }
      }

      // 如果没有保存的环境或环境不存在，选择第一个
      if (envs.value.length > 0) {
        setCurrentEnv(envs.value[0]!);
      }
    } catch {
      envs.value = [];
    }
  }

  /**
   * 设置当前环境
   */
  function setCurrentEnv(env: Env | null) {
    currentEnv.value = env;
    if (env) {
      localStorage.setItem(ENV_STORAGE_KEY, String(env.id));
    } else {
      localStorage.removeItem(ENV_STORAGE_KEY);
    }
  }

  /**
   * 刷新项目列表
   */
  async function refreshProjects() {
    const currentId = currentProject.value?.id;
    await loadProjects();
    // 如果之前选择的项目还存在，保持选择
    if (currentId) {
      const project = projects.value.find((p) => p.id === currentId);
      if (project) {
        await setCurrentProject(project);
      }
    }
  }

  /**
   * 刷新环境列表
   */
  async function refreshEnvs() {
    if (currentProject.value) {
      const currentId = currentEnv.value?.id;
      await loadEnvs(currentProject.value.id);
      // 如果之前选择的环境还存在，保持选择
      if (currentId) {
        const env = envs.value.find((e) => e.id === currentId);
        if (env) {
          setCurrentEnv(env);
        }
      }
    }
  }

  /**
   * 重置状态
   */
  function $reset() {
    projects.value = [];
    currentProject.value = null;
    envs.value = [];
    currentEnv.value = null;
    loading.value = false;
    originalMenus.value = [];
  }

  return {
    // State
    projects,
    currentProject,
    envs,
    currentEnv,
    loading,
    // Computed
    currentProjectId,
    currentEnvId,
    // Actions
    loadProjects,
    setCurrentProject,
    loadEnvs,
    setCurrentEnv,
    refreshProjects,
    refreshEnvs,
    updateMenusWithProjectId,
    $reset,
  };
});
