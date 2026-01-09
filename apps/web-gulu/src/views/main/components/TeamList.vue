<script setup lang="ts">
import { Plus } from '@vben/icons';
import { Users } from '#/components/icons';
import { Button, Input, List, Modal, Form, message } from 'ant-design-vue';
import { ref, computed } from 'vue';

import type { Team } from '#/api/team';

import { useTeamStore } from '#/store/team';

const teamStore = useTeamStore();

const teams = computed(() => teamStore.teams);
const currentTeam = computed(() => teamStore.currentTeam);
const loading = computed(() => teamStore.loading);

// 创建团队弹框
const createModalVisible = ref(false);
const createForm = ref({
  name: '',
  description: '',
});
const creating = ref(false);

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
    <div class="team-list-header">
      <span class="title">我的团队</span>
      <Button type="primary" size="small" @click="showCreateModal">
        <Plus class="size-4" />
        新建
      </Button>
    </div>
    <List
      :loading="loading"
      :data-source="teams"
      class="team-items"
    >
      <template #renderItem="{ item }">
        <List.Item
          :class="['team-item', { active: currentTeam?.id === item.id }]"
          @click="selectTeam(item)"
        >
          <div class="team-item-content">
            <Users class="team-icon size-5" />
            <span class="team-name">{{ item.name }}</span>
          </div>
        </List.Item>
      </template>
    </List>

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
          <Input.TextArea v-model:value="createForm.description" placeholder="请输入团队描述" :rows="3" />
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
}

.team-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.title {
  font-weight: 600;
  font-size: 16px;
}

.team-items {
  flex: 1;
  overflow-y: auto;
}

.team-item {
  cursor: pointer;
  padding: 12px 16px !important;
  border-bottom: none !important;
}

.team-item:hover {
  background-color: #f5f5f5;
}

.team-item.active {
  background-color: #e6f7ff;
}

.team-item-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.team-icon {
  font-size: 18px;
  color: #1890ff;
}

.team-name {
  font-size: 14px;
}
</style>
