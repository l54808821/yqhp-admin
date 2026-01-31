<script setup lang="ts">
import type Sortable from 'sortablejs';

import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

import { createIconifyIcon, Plus } from '@vben/icons';

const Trash2 = createIconifyIcon('lucide:trash-2');
const GripVertical = createIconifyIcon('lucide:grip-vertical');

import {
  Badge,
  Button,
  Empty,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Spin,
  Tooltip,
} from 'ant-design-vue';

import SplitPane from '#/components/SplitPane.vue';

import type { Env } from '#/api/env';

import {
  createEnvApi,
  deleteEnvApi,
  getEnvsByProjectApi,
  updateEnvSortApi,
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
const newEnvForm = ref({ name: '', description: '' });
const envListRef = ref<HTMLElement | null>(null);
let sortableInstance: Sortable | null = null;

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
    // 初始化拖拽排序
    await nextTick();
    initSortable();
  } finally {
    loading.value = false;
  }
}

async function initSortable() {
  if (sortableInstance) {
    sortableInstance.destroy();
    sortableInstance = null;
  }

  if (!envListRef.value) return;

  const SortableModule = await import('sortablejs');
  const Sortable = SortableModule.default;

  sortableInstance = Sortable.create(envListRef.value, {
    animation: 200,
    delay: 0,
    handle: '.drag-handle',
    ghostClass: 'env-card-ghost',
    chosenClass: 'env-card-chosen',
    dragClass: 'env-card-drag',
    onEnd: handleSortEnd,
  });
}

onUnmounted(() => {
  if (sortableInstance) {
    sortableInstance.destroy();
    sortableInstance = null;
  }
});

async function handleSortEnd(event: { oldIndex?: number; newIndex?: number }) {
  const { oldIndex, newIndex } = event;
  if (oldIndex === undefined || newIndex === undefined || oldIndex === newIndex) {
    return;
  }

  // 获取拖动项和目标项的信息
  const draggedEnv = envs.value[oldIndex];
  if (!draggedEnv) return;

  // 计算目标环境和位置
  let targetEnv: typeof draggedEnv;
  let position: 'before' | 'after';

  if (newIndex > oldIndex) {
    // 向下拖动：放到目标位置的后面
    targetEnv = envs.value[newIndex]!;
    position = 'after';
  } else {
    // 向上拖动：放到目标位置的前面
    targetEnv = envs.value[newIndex]!;
    position = 'before';
  }

  // 调用排序接口
  try {
    await updateEnvSortApi({
      id: draggedEnv.id,
      target_id: targetEnv.id,
      position,
    });
    message.success('排序已更新');
    // 重新加载以获取最新顺序
    await loadEnvs();
  } catch {
    message.error('排序更新失败');
    // 重新加载恢复原顺序
    await loadEnvs();
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
  newEnvForm.value = { name: '', description: '' };
  createModalVisible.value = true;
}

async function handleConfirmCreate() {
  if (!newEnvForm.value.name.trim()) {
    message.warning('请输入环境名称');
    return;
  }

  try {
    const newEnv = await createEnvApi({
      project_id: props.projectId,
      name: newEnvForm.value.name,
      description: newEnvForm.value.description,
    });
    message.success('创建成功');
    createModalVisible.value = false;
    await loadEnvs();
    selectedEnv.value = newEnv;
  } catch {
    message.error('创建失败');
  }
}

async function handleDeleteEnv(env: Env, e: Event) {
  e.stopPropagation();
  try {
    await deleteEnvApi(env.id);
    message.success('删除成功');
    if (selectedEnv.value?.id === env.id) {
      selectedEnv.value = envs.value.find((e) => e.id !== env.id) || null;
    }
    await loadEnvs();
  } catch {
    message.error('删除失败');
  }
}

function handleEnvUpdated() {
  loadEnvs();
}

// 获取环境状态颜色
function getEnvStatusColor(env: Env) {
  return env.status === 1 ? '#52c41a' : '#d9d9d9';
}

// 获取环境状态文本
function getEnvStatusText(env: Env) {
  return env.status === 1 ? '启用' : '禁用';
}
</script>

<template>
  <Modal
    :open="visible"
    title="环境管理"
    width="75%"
    :footer="null"
    :body-style="{ padding: '12px', height: 'calc(90vh - 55px)', overflow: 'hidden' }"
    :style="{ top: '5vh' }"
    wrap-class-name="env-manage-modal"
    @cancel="handleClose"
  >
    <Spin :spinning="loading">
      <SplitPane
        class="env-manage-layout"
        :default-width="260"
        :min-width="200"
        :max-width="400"
        storage-key="env-manage-panel"
      >
        <template #left>
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
            <div v-if="envs.length > 0" ref="envListRef" class="env-card-list">
              <div
                v-for="env in envs"
                :key="env.id"
                :data-id="env.id"
                :class="['env-card', { active: selectedEnv?.id === env.id }]"
                @click="handleSelectEnv(env)"
              >
                <div class="drag-handle" @click.stop>
                  <GripVertical class="size-4 text-gray-400" />
                </div>
                <div class="env-card-left">
                  <Tooltip :title="getEnvStatusText(env)">
                    <Badge :color="getEnvStatusColor(env)" />
                  </Tooltip>
                </div>
                <div class="env-card-content">
                  <div class="env-card-name">{{ env.name }}</div>
                </div>
                <div class="env-card-actions">
                  <Popconfirm
                    title="确定删除此环境？"
                    placement="right"
                    @confirm="(e: Event) => handleDeleteEnv(env, e)"
                  >
                    <Button
                      type="text"
                      size="small"
                      class="delete-btn"
                      @click.stop
                    >
                      <Trash2 class="size-4 text-gray-400 hover:text-red-500" />
                    </Button>
                  </Popconfirm>
                </div>
              </div>
            </div>
            <div v-else class="empty-env-list">
              <Empty description="暂无环境">
                <Button type="primary" size="small" @click="handleCreateEnv">
                  <template #icon><Plus class="size-4" /></template>
                  创建第一个环境
                </Button>
              </Empty>
            </div>
          </div>
        </div>
        </template>

        <template #right>
          <!-- 右侧环境详情 -->
          <div class="env-detail-panel">
          <EnvDetailForm
            v-if="selectedEnv"
            :env="selectedEnv"
            @updated="handleEnvUpdated"
          />
          <div v-else class="empty-detail">
            <Empty description="请选择或创建一个环境" />
          </div>
        </div>
        </template>
      </SplitPane>
    </Spin>

    <!-- 新建环境弹框 -->
    <Modal
      v-model:open="createModalVisible"
      title="新建环境"
      :width="480"
      @ok="handleConfirmCreate"
    >
      <Form layout="vertical" class="create-form">
        <Form.Item label="环境名称" required>
          <Input
            v-model:value="newEnvForm.name"
            placeholder="如：开发环境、测试环境"
          />
        </Form.Item>
        <Form.Item label="描述">
          <Input.TextArea
            v-model:value="newEnvForm.description"
            placeholder="环境描述（可选）"
            :rows="2"
          />
        </Form.Item>
      </Form>
    </Modal>
  </Modal>
</template>

<style scoped>
.env-manage-layout {
  height: calc(90vh - 69px);
}

.env-list-panel {
  height: 100%;
  background: #fafafa;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
}

.panel-title {
  font-weight: 600;
  font-size: 14px;
  color: #1f1f1f;
}

.env-list {
  flex: 1;
  overflow: auto;
  padding: 12px;
}

.env-card-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.env-card {
  display: flex;
  align-items: center;
  padding: 8px 10px;
  background: #fff;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid transparent;
}

.env-card:hover {
  background: #f5f5f5;
}

.env-card:hover .delete-btn {
  opacity: 1;
}

.env-card:hover .drag-handle {
  opacity: 1;
}

.env-card.active {
  background: #e6f4ff;
  border-color: #1890ff;
}

.drag-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 8px;
  cursor: grab;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.drag-handle:active {
  cursor: grabbing;
}

.env-card-ghost {
  opacity: 0.5;
  background: #e6f4ff;
}

.env-card-chosen {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.env-card-drag {
  opacity: 0.9;
}

.env-card-left {
  margin-right: 10px;
}

.env-card-content {
  flex: 1;
  min-width: 0;
}

.env-card-name {
  font-weight: 500;
  font-size: 14px;
  color: #1f1f1f;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.env-card-actions {
  opacity: 0;
  transition: opacity 0.2s ease;
}

.delete-btn {
  padding: 4px;
}

.empty-env-list {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40px 20px;
}

.env-detail-panel {
  height: 100%;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.empty-detail {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.create-form {
  padding-top: 8px;
}

.form-hint {
  font-size: 12px;
  color: #8c8c8c;
  margin-top: 4px;
}
</style>

<!-- Modal header 样式覆盖 -->
<style>
.env-manage-modal .ant-modal-header {
  padding: 0 16px 0;
  margin-bottom: 0;
}

.env-manage-modal .ant-modal-title {
  font-size: 15px;
}

</style>
