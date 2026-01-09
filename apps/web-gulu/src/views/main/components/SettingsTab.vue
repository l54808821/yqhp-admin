<script setup lang="ts">
import { Button, Form, Input, message, Popconfirm } from 'ant-design-vue';
import { ref, computed, watch } from 'vue';

import { useTeamStore } from '#/store/team';

const teamStore = useTeamStore();

const currentTeam = computed(() => teamStore.currentTeam);

const form = ref({
  name: '',
  description: '',
});
const saving = ref(false);

watch(
  () => currentTeam.value,
  (team) => {
    if (team) {
      form.value = {
        name: team.name,
        description: team.description || '',
      };
    }
  },
  { immediate: true }
);

async function handleSave() {
  if (!form.value.name.trim()) {
    message.error('请输入团队名称');
    return;
  }
  if (!currentTeam.value) {
    return;
  }
  try {
    saving.value = true;
    await teamStore.updateTeam(currentTeam.value.id, form.value);
    message.success('保存成功');
  } catch (error: any) {
    message.error(error.message || '保存失败');
  } finally {
    saving.value = false;
  }
}

async function handleDelete() {
  if (!currentTeam.value) {
    return;
  }
  try {
    await teamStore.deleteTeam(currentTeam.value.id);
    message.success('删除成功');
  } catch (error: any) {
    message.error(error.message || '删除失败');
  }
}
</script>

<template>
  <div class="settings-tab">
    <Form layout="vertical" class="settings-form">
      <Form.Item label="团队名称" required>
        <Input v-model:value="form.name" placeholder="请输入团队名称" />
      </Form.Item>
      <Form.Item label="团队描述">
        <Input.TextArea v-model:value="form.description" placeholder="请输入团队描述" :rows="4" />
      </Form.Item>
      <Form.Item>
        <Button type="primary" :loading="saving" @click="handleSave">
          保存设置
        </Button>
      </Form.Item>
    </Form>

    <div class="danger-zone">
      <h3>危险操作</h3>
      <div class="danger-item">
        <div class="danger-info">
          <div class="danger-title">删除团队</div>
          <div class="danger-desc">删除团队后，所有项目和数据将被永久删除，无法恢复。</div>
        </div>
        <Popconfirm
          title="确定要删除该团队吗？此操作不可恢复！"
          ok-text="确定删除"
          cancel-text="取消"
          ok-type="danger"
          @confirm="handleDelete"
        >
          <Button danger>删除团队</Button>
        </Popconfirm>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-tab {
  padding: 16px;
  max-width: 600px;
}

.settings-form {
  margin-bottom: 32px;
}

.danger-zone {
  border: 1px solid #ff4d4f;
  border-radius: 8px;
  padding: 16px;
}

.danger-zone h3 {
  color: #ff4d4f;
  margin-bottom: 16px;
}

.danger-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.danger-info {
  flex: 1;
}

.danger-title {
  font-weight: 500;
  margin-bottom: 4px;
}

.danger-desc {
  color: #666;
  font-size: 12px;
}
</style>
