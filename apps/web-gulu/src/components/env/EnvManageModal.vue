<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';

import { Plus, X } from '@vben/icons';
import {
  Button,
  Empty,
  Input,
  List,
  message,
  Modal,
  Popconfirm,
  Spin,
} from 'ant-design-vue';

import type { Env } from '#/api/env';

import {
  createEnvApi,
  deleteEnvApi,
  getEnvsByProjectApi,
} from '#/api/env';

import EnvDetailForm from './EnvDetailForm.vue';

interface Props {
  visible: boolean;
  projectId: number;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'close'): void;
}>();

const loading = ref(false);
const envs = ref<Env[]>([]);
const selectedEnv = ref<Env | null>(null);
const createModalVisible = ref(false);
const newEnvForm = ref({ name: '', code: '' });

watch(
  () => props.visible,
  async (visible) => {
    if (visible && props.projectId) {
      await loadEnvs();
    }
  },
);

onMounted(async () => {
  if (props.visible && props.projectId) {
    await loadEnvs();
  }
});

async function loadEnvs() {
  if (!props.projectId) return;
  try {
    loading.value = true;
    envs.value = await getEnvsByProjectApi(props.projectId);
    // 默认选中第一个
    if (envs.value.length > 0 && !selectedEnv.value) {
      selectedEnv.value = envs.value[0]!;
    }
  } finally {
    loading.value = false;
  }
}

function handleClose() {
  emit('update:visible', false);
  emit('close');
}

function handleSelectEnv(env: Env) {
  selectedEnv.value = env;
}

function handleCreateEnv() {
  newEnvForm.value = { name: '', code: '' };
  createModalVisible.value = true;
}

async function handleConfirmCreate() {
  if (!newEnvForm.value.name.trim()) {
    message.warning('请输入环境名称');
    return;
  }
  if (!newEnvForm.value.code.trim()) {
    message.warning('请输入环境代码');
    return;
  }

  try {
    const newEnv = await createEnvApi({
      project_id: props.projectId,
      name: newEnvForm.value.name,
      code: newEnvForm.value.code,
    });
    message.success('创建成功');
    createModalVisible.value = false;
    await loadEnvs();
    selectedEnv.value = newEnv;
  } catch {
    message.error('创建失败');
  }
}

async function handleDeleteEnv(env: Env) {
  try {
    await deleteEnvApi(env.id);
    message.success('删除成功');
    if (selectedEnv.value?.id === env.id) {
      selectedEnv.value = null;
    }
    await loadEnvs();
  } catch {
    message.error('删除失败');
  }
}

function handleEnvUpdated() {
  loadEnvs();
}
</script>

<template>
  <Modal
    :open="visible"
    title="环境管理"
    width="900px"
    :footer="null"
    @cancel="handleClose"
  >
    <Spin :spinning="loading">
      <div class="env-manage-layout">
        <!-- 左侧环境列表 -->
        <div class="env-list-panel">
          <div class="panel-header">
            <span class="panel-title">环境列表</span>
            <Button type="primary" size="small" @click="handleCreateEnv">
              <template #icon><Plus class="size-4" /></template>
              新建
            </Button>
          </div>
          <div class="env-list">
            <List
              v-if="envs.length > 0"
              :data-source="envs"
              size="small"
            >
              <template #renderItem="{ item }">
                <List.Item
                  :class="['env-item', { active: selectedEnv?.id === item.id }]"
                  @click="handleSelectEnv(item)"
                >
                  <div class="env-item-content">
                    <div class="env-name">{{ item.name }}</div>
                    <div class="env-code">{{ item.code }}</div>
                  </div>
                  <template #actions>
                    <Popconfirm
                      title="确定删除此环境？"
                      @confirm="handleDeleteEnv(item)"
                    >
                      <Button
                        type="text"
                        size="small"
                        danger
                        @click.stop
                      >
                        <X class="size-4" />
                      </Button>
                    </Popconfirm>
                  </template>
                </List.Item>
              </template>
            </List>
            <Empty v-else description="暂无环境" />
          </div>
        </div>

        <!-- 右侧环境详情 -->
        <div class="env-detail-panel">
          <EnvDetailForm
            v-if="selectedEnv"
            :env="selectedEnv"
            @updated="handleEnvUpdated"
          />
          <Empty v-else description="请选择一个环境" />
        </div>
      </div>
    </Spin>

    <!-- 新建环境弹框 -->
    <Modal
      v-model:open="createModalVisible"
      title="新建环境"
      @ok="handleConfirmCreate"
    >
      <div class="create-form">
        <div class="form-item">
          <label>环境名称</label>
          <Input
            v-model:value="newEnvForm.name"
            placeholder="如：开发环境"
          />
        </div>
        <div class="form-item">
          <label>环境代码</label>
          <Input
            v-model:value="newEnvForm.code"
            placeholder="如：dev"
          />
        </div>
      </div>
    </Modal>
  </Modal>
</template>

<style scoped>
.env-manage-layout {
  display: flex;
  height: 500px;
  gap: 16px;
}

.env-list-panel {
  width: 280px;
  border: 1px solid #f0f0f0;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.panel-title {
  font-weight: 500;
}

.env-list {
  flex: 1;
  overflow: auto;
  padding: 8px;
}

.env-item {
  cursor: pointer;
  border-radius: 4px;
  margin-bottom: 4px;
}

.env-item:hover {
  background: #f5f5f5;
}

.env-item.active {
  background: #e6f4ff;
}

.env-item-content {
  flex: 1;
}

.env-name {
  font-weight: 500;
}

.env-code {
  font-size: 12px;
  color: #999;
}

.env-detail-panel {
  flex: 1;
  border: 1px solid #f0f0f0;
  border-radius: 4px;
  padding: 16px;
  overflow: auto;
}

.create-form {
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
