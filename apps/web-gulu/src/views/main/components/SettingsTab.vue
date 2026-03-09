<script setup lang="ts">
import { Button, Input, message, Popconfirm, Switch, Modal, Select } from 'ant-design-vue';
import { ref, computed, watch } from 'vue';

import { useTeamStore } from '#/store/team';

const teamStore = useTeamStore();
const currentTeam = computed(() => teamStore.currentTeam);
const members = computed(() => teamStore.members);

const editingName = ref(false);
const editingNickname = ref(false);
const nameInput = ref('');
const nicknameInput = ref('');
const saving = ref(false);

const transferModalVisible = ref(false);
const transferTarget = ref<number | undefined>(undefined);

watch(
  () => currentTeam.value,
  (team) => {
    if (team) {
      nameInput.value = team.name;
    }
    editingName.value = false;
    editingNickname.value = false;
  },
  { immediate: true },
);

function startEditName() {
  nameInput.value = currentTeam.value?.name || '';
  editingName.value = true;
}

async function saveName() {
  if (!nameInput.value.trim()) {
    message.error('团队名称不能为空');
    return;
  }
  if (!currentTeam.value) return;
  try {
    saving.value = true;
    await teamStore.updateTeam(currentTeam.value.id, { name: nameInput.value });
    editingName.value = false;
    message.success('保存成功');
  } catch (error: any) {
    message.error(error.message || '保存失败');
  } finally {
    saving.value = false;
  }
}

function cancelEditName() {
  editingName.value = false;
  nameInput.value = currentTeam.value?.name || '';
}

function startEditNickname() {
  nicknameInput.value = '';
  editingNickname.value = true;
}

function cancelEditNickname() {
  editingNickname.value = false;
}

function saveNickname() {
  editingNickname.value = false;
  message.success('昵称保存成功');
}

function copyTeamId() {
  if (!currentTeam.value) return;
  navigator.clipboard.writeText(String(currentTeam.value.id));
  message.success('已复制团队 ID');
}

function showTransferModal() {
  transferTarget.value = undefined;
  transferModalVisible.value = true;
}

function handleTransfer() {
  if (!transferTarget.value) {
    message.error('请选择移交目标');
    return;
  }
  transferModalVisible.value = false;
  message.success('移交成功');
}

async function handleDissolve() {
  if (!currentTeam.value) return;
  try {
    await teamStore.deleteTeam(currentTeam.value.id);
    message.success('团队已解散');
  } catch (error: any) {
    message.error(error.message || '操作失败');
  }
}
</script>

<template>
  <div class="st">
    <!-- 基础信息 -->
    <section class="st-section">
      <h3 class="st-section__title">基础信息</h3>

      <!-- 团队名称 -->
      <div class="st-row">
        <div class="st-row__info">
          <div class="st-row__label">团队名称</div>
          <template v-if="!editingName">
            <div class="st-row__value">{{ currentTeam?.name }}</div>
          </template>
          <template v-else>
            <div class="st-row__edit">
              <Input
                v-model:value="nameInput"
                size="small"
                style="width: 240px"
                @press-enter="saveName"
              />
              <Button size="small" type="primary" :loading="saving" @click="saveName">保存</Button>
              <Button size="small" @click="cancelEditName">取消</Button>
            </div>
          </template>
        </div>
        <Button v-if="!editingName" @click="startEditName">编 辑</Button>
      </div>

      <div class="st-divider" />

      <!-- 团队 ID -->
      <div class="st-row">
        <div class="st-row__info">
          <div class="st-row__label">团队 ID</div>
          <div class="st-row__value st-row__value--mono">{{ currentTeam?.id }}</div>
        </div>
        <Button @click="copyTeamId">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px">
            <rect x="4" y="4" width="8" height="8" rx="1.5" />
            <path d="M10 4V2.5A1.5 1.5 0 008.5 1h-6A1.5 1.5 0 001 2.5v6A1.5 1.5 0 002.5 10H4" />
          </svg>
          复制
        </Button>
      </div>

      <div class="st-divider" />

      <!-- 我的团队内昵称 -->
      <div class="st-row">
        <div class="st-row__info">
          <div class="st-row__label">我的团队内昵称</div>
          <template v-if="!editingNickname">
            <div class="st-row__value st-row__value--empty">未设置</div>
          </template>
          <template v-else>
            <div class="st-row__edit">
              <Input
                v-model:value="nicknameInput"
                size="small"
                style="width: 240px"
                placeholder="输入昵称"
                @press-enter="saveNickname"
              />
              <Button size="small" type="primary" @click="saveNickname">保存</Button>
              <Button size="small" @click="cancelEditNickname">取消</Button>
            </div>
          </template>
        </div>
        <Button v-if="!editingNickname" @click="startEditNickname">编 辑</Button>
      </div>
    </section>

    <!-- AI 功能（预留） -->
    <section class="st-section">
      <h3 class="st-section__title">AI 功能</h3>

      <div class="st-row">
        <div class="st-row__info">
          <div class="st-row__label">开启 AI 功能</div>
          <div class="st-row__desc">如果关闭，团队中的全部项目都会隐藏 AI 功能入口，所有成员都不可使用 AI 功能</div>
        </div>
        <Switch default-checked />
      </div>
    </section>

    <!-- 身份认证安全（预留） -->
    <section class="st-section">
      <h3 class="st-section__title">身份认证安全</h3>

      <div class="st-row">
        <div class="st-row__info">
          <div class="st-row__label">IP 允许访问名单</div>
          <div class="st-row__desc">通过配置指定的 IP 地址白名单，以确保只有这些 IP 地址可以访问当前团队里的内容。</div>
        </div>
        <Switch />
      </div>
    </section>

    <!-- 危险区域 -->
    <section class="st-section st-section--danger">
      <h3 class="st-section__title st-section__title--danger">危险区域</h3>

      <div class="st-row">
        <div class="st-row__info">
          <div class="st-row__label">移交</div>
          <div class="st-row__desc">将团队的所有者权限移交给其他成员</div>
        </div>
        <Button @click="showTransferModal">移 交</Button>
      </div>

      <div class="st-divider" />

      <div class="st-row">
        <div class="st-row__info">
          <div class="st-row__label">解散团队</div>
          <div class="st-row__desc">务必谨慎，解散后无法找回</div>
        </div>
        <Popconfirm
          title="确定要解散该团队吗？此操作不可恢复！"
          ok-text="确定解散"
          cancel-text="取消"
          ok-type="danger"
          @confirm="handleDissolve"
        >
          <Button danger type="link" class="st-danger-btn">解 散</Button>
        </Popconfirm>
      </div>
    </section>

    <!-- 移交弹框 -->
    <Modal
      v-model:open="transferModalVisible"
      title="移交团队"
      @ok="handleTransfer"
    >
      <div style="margin-bottom: 8px; color: #666; font-size: 13px">
        选择要移交给的成员：
      </div>
      <Select
        v-model:value="transferTarget"
        style="width: 100%"
        placeholder="请选择成员"
        :options="
          members
            .filter((m) => m.role !== 'owner')
            .map((m) => ({ value: m.user_id, label: `用户 ${m.user_id}` }))
        "
      />
    </Modal>
  </div>
</template>

<style scoped>
.st {
  padding: 20px 24px;
  max-width: 720px;
}

.st-section {
  margin-bottom: 32px;
}

.st-section__title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary, #1a1a1a);
  margin: 0 0 20px 0;
}

.st-section__title--danger {
  color: #ff4d4f;
}

.st-section--danger {
  border: 1px solid #ffccc7;
  border-radius: 10px;
  padding: 20px;
}

.st-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  padding: 8px 0;
}

.st-row__info {
  flex: 1;
  min-width: 0;
}

.st-row__label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #333);
  margin-bottom: 4px;
}

.st-row__value {
  font-size: 14px;
  color: var(--text-secondary, #666);
}

.st-row__value--mono {
  font-family: 'SF Mono', 'Fira Code', monospace;
  color: var(--text-tertiary, #999);
}

.st-row__value--empty {
  color: var(--text-tertiary, #bbb);
  font-style: italic;
}

.st-row__desc {
  font-size: 12px;
  color: var(--text-tertiary, #999);
  margin-top: 2px;
  line-height: 1.5;
}

.st-row__edit {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.st-divider {
  height: 1px;
  background: var(--border-color, #f0f0f0);
  margin: 12px 0;
}

.st-danger-btn {
  font-weight: 500;
  padding: 4px 12px;
}
</style>
