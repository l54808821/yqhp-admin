<script setup lang="ts">
import { Plus, X } from '@vben/icons';
import { Users } from '#/components/icons';
import { Button, Table, Tag, Modal, Input, Select, message, Popconfirm } from 'ant-design-vue';
import { ref, computed, watch } from 'vue';

import type { TeamMember } from '#/api/team';

import { addTeamMemberApi, removeTeamMemberApi, updateMemberRoleApi } from '#/api/team';
import { useTeamStore } from '#/store/team';

const teamStore = useTeamStore();

const currentTeam = computed(() => teamStore.currentTeam);
const members = computed(() => teamStore.members);

// 添加成员弹框
const addModalVisible = ref(false);
const addForm = ref({
  user_id: undefined as number | undefined,
  role: 'member' as 'owner' | 'admin' | 'member',
});
const adding = ref(false);

const roleOptions = [
  { value: 'owner', label: '所有者' },
  { value: 'admin', label: '管理员' },
  { value: 'member', label: '成员' },
];

const roleColors: Record<string, string> = {
  owner: 'gold',
  admin: 'blue',
  member: 'default',
};

const roleLabels: Record<string, string> = {
  owner: '所有者',
  admin: '管理员',
  member: '成员',
};

const columns = [
  {
    title: '用户ID',
    dataIndex: 'user_id',
    key: 'user_id',
  },
  {
    title: '角色',
    dataIndex: 'role',
    key: 'role',
  },
  {
    title: '加入时间',
    dataIndex: 'created_at',
    key: 'created_at',
  },
  {
    title: '操作',
    key: 'action',
    width: 150,
  },
];

watch(
  () => currentTeam.value?.id,
  async (teamId) => {
    if (teamId) {
      await teamStore.loadMembers(teamId);
    }
  },
  { immediate: true }
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
  if (!currentTeam.value) {
    return;
  }
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
  if (!currentTeam.value) {
    return;
  }
  try {
    await removeTeamMemberApi(currentTeam.value.id, member.user_id);
    await teamStore.refreshMembers();
    message.success('移除成功');
  } catch (error: any) {
    message.error(error.message || '移除失败');
  }
}

async function handleRoleChange(member: TeamMember, role: 'owner' | 'admin' | 'member') {
  if (!currentTeam.value) {
    return;
  }
  try {
    await updateMemberRoleApi(currentTeam.value.id, member.user_id, { role });
    await teamStore.refreshMembers();
    message.success('更新成功');
  } catch (error: any) {
    message.error(error.message || '更新失败');
  }
}
</script>

<template>
  <div class="members-tab">
    <div class="members-header">
      <Button type="primary" @click="showAddModal">
        <Plus class="size-4" />
        添加成员
      </Button>
    </div>
    <Table :columns="columns" :data-source="members" row-key="id">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'user_id'">
          <Users class="size-4" /> {{ record.user_id }}
        </template>
        <template v-else-if="column.key === 'role'">
          <Select
            :value="record.role"
            style="width: 100px"
            :options="roleOptions"
            @change="(val: any) => handleRoleChange(record, val)"
          />
        </template>
        <template v-else-if="column.key === 'action'">
          <Popconfirm
            title="确定要移除该成员吗？"
            @confirm="handleRemove(record)"
          >
            <Button type="link" danger :disabled="record.role === 'owner'">
              <X class="size-4" />
              移除
            </Button>
          </Popconfirm>
        </template>
      </template>
    </Table>

    <Modal
      v-model:open="addModalVisible"
      title="添加成员"
      :confirm-loading="adding"
      @ok="handleAdd"
    >
      <div class="add-form">
        <div class="form-item">
          <label>用户ID</label>
          <Input v-model:value="addForm.user_id" type="number" placeholder="请输入用户ID" />
        </div>
        <div class="form-item">
          <label>角色</label>
          <Select v-model:value="addForm.role" :options="roleOptions" style="width: 100%" />
        </div>
      </div>
    </Modal>
  </div>
</template>

<style scoped>
.members-tab {
  padding: 16px;
}

.members-header {
  margin-bottom: 16px;
}

.add-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-item label {
  font-weight: 500;
}
</style>
