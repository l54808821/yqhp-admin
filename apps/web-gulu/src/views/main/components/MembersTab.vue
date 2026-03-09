<script setup lang="ts">
import { Button, Table, Tag, Modal, Input, Select, message, Popconfirm } from 'ant-design-vue';
import { ref, computed, watch } from 'vue';

import type { TeamMember } from '#/api/team';

import { addTeamMemberApi, removeTeamMemberApi, updateMemberRoleApi } from '#/api/team';
import { useTeamStore } from '#/store/team';

const teamStore = useTeamStore();

const currentTeam = computed(() => teamStore.currentTeam);
const members = computed(() => teamStore.members);

const subTab = ref('members');
const searchKeyword = ref('');

const filteredMembers = computed(() => {
  if (!searchKeyword.value.trim()) return members.value;
  const kw = searchKeyword.value.toLowerCase();
  return members.value.filter(
    (m) => String(m.user_id).includes(kw) || m.role.includes(kw),
  );
});

const stats = computed(() => ({
  members: members.value.length,
  guests: 0,
  pending: 0,
}));

const addModalVisible = ref(false);
const addForm = ref({
  user_id: undefined as number | undefined,
  role: 'member' as 'admin' | 'member' | 'owner',
});
const adding = ref(false);

const roleOptions = [
  { value: 'owner', label: '所有者' },
  { value: 'admin', label: '管理员' },
  { value: 'member', label: '成员' },
];

const roleColors: Record<string, string> = {
  owner: 'orange',
  admin: 'blue',
  member: 'default',
};

const roleLabels: Record<string, string> = {
  owner: '团队所有者',
  admin: '管理员',
  member: '成员',
};

const AVATAR_COLORS = [
  '#7c5cfc', '#f56a00', '#1890ff', '#52c41a',
  '#eb2f96', '#fa8c16', '#13c2c2', '#722ed1',
];

function getAvatarColor(id: number) {
  return AVATAR_COLORS[Math.abs(id) % AVATAR_COLORS.length]!;
}

const columns = [
  { title: '昵称', dataIndex: 'user_id', key: 'user_id' },
  { title: '邮箱', key: 'email', width: 200 },
  { title: '团队权限', dataIndex: 'role', key: 'role', width: 140 },
  { title: '最近活跃', dataIndex: 'created_at', key: 'created_at', width: 140 },
  { title: '', key: 'action', width: 50, align: 'center' as const },
];

watch(
  () => currentTeam.value?.id,
  async (teamId) => {
    if (teamId) {
      await teamStore.loadMembers(teamId);
    }
  },
  { immediate: true },
);

function showAddModal() {
  addForm.value = { user_id: undefined, role: 'member' };
  addModalVisible.value = true;
}

async function handleAdd() {
  if (!addForm.value.user_id) {
    message.error('请输入用户ID');
    return;
  }
  if (!currentTeam.value) return;
  try {
    adding.value = true;
    await addTeamMemberApi(currentTeam.value.id, {
      user_id: addForm.value.user_id,
      role: addForm.value.role,
    });
    addModalVisible.value = false;
    await teamStore.refreshMembers();
    message.success('添加成功');
  } catch (error: any) {
    message.error(error.message || '添加失败');
  } finally {
    adding.value = false;
  }
}

async function handleRemove(member: TeamMember) {
  if (!currentTeam.value) return;
  try {
    await removeTeamMemberApi(currentTeam.value.id, member.user_id);
    await teamStore.refreshMembers();
    message.success('移除成功');
  } catch (error: any) {
    message.error(error.message || '移除失败');
  }
}

async function handleRoleChange(member: TeamMember, role: 'admin' | 'member' | 'owner') {
  if (!currentTeam.value) return;
  try {
    await updateMemberRoleApi(currentTeam.value.id, member.user_id, { role });
    await teamStore.refreshMembers();
    message.success('更新成功');
  } catch (error: any) {
    message.error(error.message || '更新失败');
  }
}

function formatTime(time?: string) {
  if (!time) return '-';
  const d = new Date(time);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  return d.toLocaleDateString();
}
</script>

<template>
  <div class="mt">
    <!-- 子 Tab -->
    <div class="mt-sub-tabs">
      <div
        v-for="tab in [
          { key: 'members', label: '成员' },
          { key: 'pending', label: '待定邀请' },
          { key: 'roles', label: '角色与权限' },
        ]"
        :key="tab.key"
        :class="['mt-sub-tab', { 'mt-sub-tab--active': subTab === tab.key }]"
        @click="subTab = tab.key"
      >
        {{ tab.label }}
      </div>
    </div>

    <template v-if="subTab === 'members'">
      <!-- 统计概览 -->
      <div class="mt-stats">
        <div class="mt-stat">
          <div class="mt-stat__value" style="color: #52c41a">{{ stats.members }}</div>
          <div class="mt-stat__label">成员</div>
        </div>
        <div class="mt-stat">
          <div class="mt-stat__value">{{ stats.guests }}</div>
          <div class="mt-stat__label">
            游客
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" style="vertical-align: -2px; margin-left: 2px; color: #bbb">
              <circle cx="7" cy="7" r="6" />
              <path d="M7 4.5v3M7 9.5v0" />
            </svg>
          </div>
        </div>
        <div class="mt-stat">
          <div class="mt-stat__value">{{ stats.pending }}</div>
          <div class="mt-stat__label">待定</div>
        </div>
      </div>

      <!-- 搜索 + 邀请 -->
      <div class="mt-toolbar">
        <Input
          v-model:value="searchKeyword"
          placeholder="搜索"
          allow-clear
          class="mt-search"
        >
          <template #prefix>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="6" cy="6" r="4.5" />
              <path d="M9.5 9.5L13 13" />
            </svg>
          </template>
        </Input>
        <Button type="primary" class="mt-invite-btn" @click="showAddModal">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 2a3 3 0 110 6 3 3 0 010-6zM1 12c0-2.2 1.8-4 4-4h2" />
            <line x1="11" y1="9" x2="11" y2="13" />
            <line x1="9" y1="11" x2="13" y2="11" />
          </svg>
          邀请成员
        </Button>
      </div>

      <!-- 成员列表 -->
      <Table
        :columns="columns"
        :data-source="filteredMembers"
        :pagination="false"
        row-key="id"
        class="mt-table"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'user_id'">
            <div class="mt-user-cell">
              <div
                class="mt-user-avatar"
                :style="{ backgroundColor: getAvatarColor(record.user_id) }"
              >
                {{ String(record.user_id).charAt(0) }}
              </div>
              <span class="mt-user-name">{{ record.user_id }}</span>
            </div>
          </template>
          <template v-else-if="column.key === 'email'">
            <span class="mt-email">{{ record.user_id }}@example.com</span>
          </template>
          <template v-else-if="column.key === 'role'">
            <Select
              v-if="record.role !== 'owner'"
              :value="record.role"
              size="small"
              style="width: 120px"
              :options="roleOptions"
              @change="(val: any) => handleRoleChange(record as TeamMember, val)"
            />
            <Tag v-else :color="roleColors[record.role]">
              {{ roleLabels[record.role] || record.role }}
            </Tag>
          </template>
          <template v-else-if="column.key === 'created_at'">
            <span class="mt-time">{{ formatTime(record.created_at) }}</span>
          </template>
          <template v-else-if="column.key === 'action'">
            <Popconfirm
              v-if="record.role !== 'owner'"
              title="确定要移除该成员吗？"
              @confirm="handleRemove(record as TeamMember)"
            >
              <button class="mt-action-btn" title="设置">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="8" cy="8" r="2" />
                  <path d="M13.5 8a5.5 5.5 0 01-.3 1.8l1.3 1-1.5 2.6-1.5-.6a5.5 5.5 0 01-3.1 0l-1.5.6-1.5-2.6 1.3-1A5.5 5.5 0 016.4 8c0-.6.1-1.2.3-1.8l-1.3-1L6.9 2.6l1.5.6a5.5 5.5 0 013.1 0l1.5-.6 1.5 2.6-1.3 1c.2.6.3 1.2.3 1.8z" />
                </svg>
              </button>
            </Popconfirm>
          </template>
        </template>
      </Table>
    </template>

    <template v-else-if="subTab === 'pending'">
      <div class="mt-placeholder">
        <Empty description="暂无待定邀请" />
      </div>
    </template>

    <template v-else-if="subTab === 'roles'">
      <div class="mt-placeholder">
        <Empty description="角色与权限管理（即将推出）" />
      </div>
    </template>

    <!-- 添加成员弹框 -->
    <Modal
      v-model:open="addModalVisible"
      title="邀请成员"
      :confirm-loading="adding"
      @ok="handleAdd"
    >
      <div class="mt-add-form">
        <div class="mt-form-item">
          <label>用户ID</label>
          <Input v-model:value="addForm.user_id" type="number" placeholder="请输入用户ID" />
        </div>
        <div class="mt-form-item">
          <label>角色</label>
          <Select v-model:value="addForm.role" :options="roleOptions" style="width: 100%" />
        </div>
      </div>
    </Modal>
  </div>
</template>

<style scoped>
.mt {
  padding: 20px 32px;
}

/* 子 Tab */
.mt-sub-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 20px;
}

.mt-sub-tab {
  padding: 5px 14px;
  font-size: 13px;
  border-radius: 6px;
  cursor: pointer;
  color: var(--text-secondary, #666);
  border: 1px solid var(--border-color, #e5e5e5);
  transition: all 0.15s;
  background: var(--card-bg, #fff);
}

.mt-sub-tab:hover {
  color: var(--primary-color, #7c5cfc);
  border-color: var(--primary-color, #7c5cfc);
}

.mt-sub-tab--active {
  background: var(--primary-color, #7c5cfc);
  color: #fff;
  border-color: var(--primary-color, #7c5cfc);
}

/* 统计 */
.mt-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 24px;
  border: 1px solid var(--border-color, #f0f0f0);
  border-radius: 10px;
  padding: 20px;
}

.mt-stat {
  text-align: center;
}

.mt-stat__value {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary, #1a1a1a);
  line-height: 1.2;
  margin-bottom: 4px;
}

.mt-stat__label {
  font-size: 13px;
  color: var(--text-tertiary, #999);
}

/* 搜索工具栏 */
.mt-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.mt-search {
  width: 220px;
}

.mt-invite-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 6px;
  background: #52c41a;
  border-color: #52c41a;
}

.mt-invite-btn:hover {
  background: #73d13d !important;
  border-color: #73d13d !important;
}

/* 用户单元格 */
.mt-user-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.mt-user-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  flex-shrink: 0;
}

.mt-user-name {
  font-weight: 500;
  color: var(--text-primary, #333);
}

.mt-email {
  color: var(--text-secondary, #666);
  font-size: 13px;
}

.mt-time {
  color: var(--text-tertiary, #999);
  font-size: 13px;
}

/* 操作按钮 */
.mt-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  color: var(--text-tertiary, #999);
  transition: all 0.15s;
}

.mt-action-btn:hover {
  background: var(--hover-bg, #f5f5f5);
  color: var(--text-primary, #333);
}

/* 占位 */
.mt-placeholder {
  padding: 60px 0;
}

/* 添加成员表单 */
.mt-add-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mt-form-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mt-form-item label {
  font-weight: 500;
}
</style>
