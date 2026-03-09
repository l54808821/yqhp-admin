<script setup lang="ts">
import { Input, Modal, Form, message } from 'ant-design-vue';
import { ref, computed } from 'vue';

import type { Team } from '#/api/team';

import { useTeamStore } from '#/store/team';

const teamStore = useTeamStore();

const teams = computed(() => teamStore.teams);
const currentTeam = computed(() => teamStore.currentTeam);
const loading = computed(() => teamStore.loading);

const teamGroupExpanded = ref(true);

const createModalVisible = ref(false);
const createForm = ref({
  name: '',
  description: '',
});
const creating = ref(false);

const AVATAR_COLORS = [
  '#7c5cfc', '#f56a00', '#1890ff', '#52c41a',
  '#eb2f96', '#fa8c16', '#13c2c2', '#722ed1',
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (const char of name) {
    hash = char.codePointAt(0)! + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]!;
}

function getInitial(name: string) {
  return name.charAt(0).toUpperCase();
}

function selectTeam(team: Team) {
  teamStore.setCurrentTeam(team);
}

function showCreateModal() {
  createForm.value = { name: '', description: '' };
  createModalVisible.value = true;
}

async function handleCreate() {
  if (!createForm.value.name.trim()) {
    message.error('请输入团队名称');
    return;
  }
  try {
    creating.value = true;
    const team = await teamStore.createTeam(createForm.value);
    createModalVisible.value = false;
    teamStore.setCurrentTeam(team);
    message.success('创建成功');
  } catch (error: any) {
    message.error(error.message || '创建失败');
  } finally {
    creating.value = false;
  }
}
</script>

<template>
  <div class="team-list">
    <!-- Logo -->
    <div class="team-list__logo">
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect width="28" height="28" rx="8" fill="#7c5cfc" />
        <text x="14" y="19" text-anchor="middle" fill="#fff" font-size="14" font-weight="700" font-family="Arial">G</text>
      </svg>
      <span class="team-list__logo-text">Gulu</span>
    </div>

    <!-- 团队分组 -->
    <div class="team-group">
      <div
        class="team-group__header"
        @click="teamGroupExpanded = !teamGroupExpanded"
      >
        <div class="team-group__header-left">
          <span
            class="team-group__arrow"
            :class="{ 'team-group__arrow--collapsed': !teamGroupExpanded }"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <path d="M3.5 1.5l4 3.5-4 3.5V1.5z" />
            </svg>
          </span>
          <span class="team-group__title">我的团队</span>
        </div>
        <span
          class="team-group__add"
          title="新建团队"
          @click.stop="showCreateModal"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
            <line x1="7" y1="3" x2="7" y2="11" />
            <line x1="3" y1="7" x2="11" y2="7" />
          </svg>
        </span>
      </div>

      <div v-show="teamGroupExpanded" class="team-group__body">
        <div
          v-if="loading"
          class="team-list__loading"
        >
          <span class="team-list__loading-dot" />
          加载中...
        </div>
        <template v-else>
          <div
            v-for="team in teams"
            :key="team.id"
            :class="[
              'team-item',
              { 'team-item--active': currentTeam?.id === team.id },
            ]"
            @click="selectTeam(team)"
          >
            <div
              class="team-item__avatar"
              :style="{ backgroundColor: getAvatarColor(team.name) }"
            >
              {{ getInitial(team.name) }}
            </div>
            <span class="team-item__name">{{ team.name }}</span>
          </div>

          <div
            class="team-item team-item--add"
            @click="showCreateModal"
          >
            <div class="team-item__avatar team-item__avatar--add">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
                <line x1="7" y1="3" x2="7" y2="11" />
                <line x1="3" y1="7" x2="11" y2="7" />
              </svg>
            </div>
            <span class="team-item__name">新建团队</span>
          </div>
        </template>
      </div>
    </div>

    <!-- 底部区域 -->
    <div class="team-list__footer">
      <div class="team-list__footer-item">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="2" width="5" height="5" rx="1" />
          <rect x="9" y="2" width="5" height="5" rx="1" />
          <rect x="2" y="9" width="5" height="5" rx="1" />
          <rect x="9" y="9" width="5" height="5" rx="1" />
        </svg>
        <span>组织</span>
      </div>
    </div>

    <!-- 创建团队弹框 -->
    <Modal
      v-model:open="createModalVisible"
      title="新建团队"
      :confirm-loading="creating"
      @ok="handleCreate"
    >
      <Form layout="vertical">
        <Form.Item label="团队名称" required>
          <Input v-model:value="createForm.name" placeholder="请输入团队名称" />
        </Form.Item>
        <Form.Item label="团队描述">
          <Input.TextArea
            v-model:value="createForm.description"
            placeholder="请输入团队描述"
            :rows="3"
          />
        </Form.Item>
      </Form>
    </Modal>
  </div>
</template>

<style scoped>
.team-list {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
  user-select: none;
}

/* Logo */
.team-list__logo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 16px 12px;
}

.team-list__logo-text {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
  letter-spacing: -0.3px;
}

/* 团队分组 */
.team-group {
  flex: 1;
  overflow-y: auto;
  padding-top: 4px;
}

.team-group__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 16px;
  cursor: pointer;
  color: #8c8c8c;
}

.team-group__header:hover {
  color: #595959;
}

.team-group__header-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.team-group__arrow {
  display: inline-flex;
  align-items: center;
  transition: transform 0.2s;
  color: #bfbfbf;
}

.team-group__arrow--collapsed {
  transform: rotate(-90deg);
}

.team-group__title {
  font-size: 12px;
  font-weight: 600;
  color: #8c8c8c;
}

.team-group__add {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 4px;
  color: #bfbfbf;
  cursor: pointer;
  transition: all 0.2s;
}

.team-group__add:hover {
  background: #f5f5f5;
  color: #7c5cfc;
}

.team-group__body {
  padding: 2px 8px;
}

/* 团队项 */
.team-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  margin-bottom: 1px;
}

.team-item:hover {
  background: #f5f5f5;
}

.team-item--active {
  background: #ede9fe !important;
}

.team-item--active .team-item__name {
  font-weight: 600;
  color: #7c5cfc;
}

.team-item__avatar {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  flex-shrink: 0;
}

.team-item__avatar--add {
  background: transparent;
  border: 1.5px dashed #d9d9d9;
  color: #bfbfbf;
}

.team-item--add:hover .team-item__avatar--add {
  border-color: #7c5cfc;
  color: #7c5cfc;
}

.team-item__name {
  font-size: 13px;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.team-item--add .team-item__name {
  color: #bfbfbf;
  font-size: 13px;
}

.team-item--add:hover .team-item__name {
  color: #7c5cfc;
}

/* Loading */
.team-list__loading {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  color: #999;
  font-size: 13px;
}

.team-list__loading-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #7c5cfc;
  animation: pulse 1.2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}

/* 底部 */
.team-list__footer {
  border-top: 1px solid #f0f0f0;
  padding: 8px;
}

.team-list__footer-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  color: #8c8c8c;
  transition: all 0.15s;
}

.team-list__footer-item:hover {
  background: #f5f5f5;
  color: #333;
}
</style>
