<script setup lang="ts">
import { computed, ref } from 'vue';

import { createIconifyIcon, Plus } from '@vben/icons';

import {
  Button,
  Divider,
  Empty,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Select,
  Spin,
  Tag,
} from 'ant-design-vue';

import type { ConfigItem } from '#/api/env';

import {
  createConfigDefinitionApi,
  updateConfigDefinitionApi,
  updateConfigValueApi,
} from '#/api/env';

import { useConfigTab } from '#/hooks/useConfigTab';

const Trash2 = createIconifyIcon('lucide:trash-2');
const GripVertical = createIconifyIcon('lucide:grip-vertical');
const Pencil = createIconifyIcon('lucide:pencil');

interface Props {
  envId: number;
  projectId: number;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'updated'): void;
}>();

const cardListRef = ref<HTMLElement | null>(null);

// 弹窗状态
const modalVisible = ref(false);
const modalMode = ref<'add' | 'edit'>('add');
const modalLoading = ref(false);
const editingCode = ref('');

const modalForm = ref({
  name: '',
  dbType: 'mysql',
  host: '',
  port: 3306,
  database: '',
  username: '',
  password: '',
  options: '',
});

// 使用公共 composable
const {
  loading,
  configs,
  loadConfigs,
  removeConfig,
} = useConfigTab({
  envId: () => props.envId,
  projectId: () => props.projectId,
  configType: 'database',
  getSortableElement: () => cardListRef.value,
  sortableOptions: {
    ghostClass: 'card-ghost',
    chosenClass: 'card-chosen',
    dragClass: 'card-drag',
  },
  loadErrorMessage: '加载数据库配置失败',
  onEnvChange: () => {
    modalVisible.value = false;
  },
});

// 数据库类型选项
const dbTypeOptions = [
  { label: 'MySQL', value: 'mysql' },
  { label: 'PostgreSQL', value: 'postgresql' },
  { label: 'Redis', value: 'redis' },
  { label: 'MongoDB', value: 'mongodb' },
];

// 默认端口映射
const defaultPorts: Record<string, number> = {
  mysql: 3306,
  postgresql: 5432,
  redis: 6379,
  mongodb: 27017,
};

// 是否显示数据库名字段（Redis 不需要）
const showDatabaseField = computed(() => {
  return modalForm.value.dbType !== 'redis';
});

// ==================== 展示辅助 ====================

// 获取连接摘要
function getConnectionSummary(config: ConfigItem): string {
  const host = config?.value?.host || '';
  const port = config?.value?.port || '';
  const database = config?.value?.database || '';
  const username = config?.value?.username || '';

  if (!host) return '未配置连接信息';

  let summary = '';
  if (username) summary += `${username}@`;
  summary += host;
  if (port) summary += `:${port}`;
  if (database) summary += `/${database}`;

  return summary;
}

// 获取数据库类型标签颜色
function getDbTypeColor(dbType: string): string {
  const colors: Record<string, string> = {
    mysql: 'blue',
    postgresql: 'cyan',
    redis: 'red',
    mongodb: 'green',
  };
  return colors[dbType] || 'default';
}

// 获取数据库类型显示名称
function getDbTypeLabel(dbType: string): string {
  const labels: Record<string, string> = {
    mysql: 'MySQL',
    postgresql: 'PostgreSQL',
    redis: 'Redis',
    mongodb: 'MongoDB',
  };
  return labels[dbType] || dbType;
}

// ==================== 弹窗操作 ====================

// 打开新增弹窗
function openAddModal() {
  modalMode.value = 'add';
  editingCode.value = '';
  modalForm.value = {
    name: '',
    dbType: 'mysql',
    host: '',
    port: 3306,
    database: '',
    username: '',
    password: '',
    options: '',
  };
  modalVisible.value = true;
}

// 打开编辑弹窗
function openEditModal(config: ConfigItem) {
  modalMode.value = 'edit';
  editingCode.value = config.code;
  const dbType = config?.extra?.db_type || 'mysql';
  modalForm.value = {
    name: config.name,
    dbType,
    host: config?.value?.host || '',
    port: config?.value?.port || defaultPorts[dbType] || 3306,
    database: config?.value?.database || '',
    username: config?.value?.username || '',
    password: config?.value?.password || '',
    options: config?.value?.options || '',
  };
  modalVisible.value = true;
}

// 切换数据库类型时自动更新默认端口（仅新增模式）
function handleDbTypeChange(value: any) {
  const dbType = String(value);
  if (modalMode.value === 'add') {
    modalForm.value.port = defaultPorts[dbType] || 3306;
  }
}

// 确认保存
async function handleConfirm() {
  if (!modalForm.value.name.trim()) {
    message.warning('请输入名称');
    return;
  }

  // 检查名称是否重复（编辑时排除自身）
  const trimmedName = modalForm.value.name.trim();
  const duplicate = configs.value.some(
    (c) => c.name === trimmedName && c.code !== editingCode.value,
  );
  if (duplicate) {
    message.warning('已存在同名数据库配置，请使用不同的名称');
    return;
  }

  try {
    modalLoading.value = true;

    const configValue = {
      host: modalForm.value.host,
      port: modalForm.value.port,
      database: modalForm.value.database,
      username: modalForm.value.username,
      password: modalForm.value.password,
      options: modalForm.value.options,
    };

    if (modalMode.value === 'add') {
      // 新增：创建 definition + 设置初始值
      const definition = await createConfigDefinitionApi(props.projectId, {
        type: 'database',
        name: modalForm.value.name,
        status: 1,
        extra: { db_type: modalForm.value.dbType },
      });

      // 设置当前环境的初始配置值
      await updateConfigValueApi(props.envId, definition.code, {
        value: configValue,
      });

      message.success('添加成功');
    } else {
      // 编辑：更新 definition + 更新配置值
      await updateConfigDefinitionApi(props.projectId, editingCode.value, {
        name: modalForm.value.name,
      });

      await updateConfigValueApi(props.envId, editingCode.value, {
        value: configValue,
      });

      message.success('保存成功');
    }

    modalVisible.value = false;
    await loadConfigs();
    emit('updated');
  } catch (error: any) {
    message.error(
      error?.message ||
        (modalMode.value === 'add' ? '添加失败' : '保存失败'),
    );
  } finally {
    modalLoading.value = false;
  }
}

// 暴露给父组件的方法（保持兼容，数据库配置已改为弹窗内即时保存）
defineExpose({
  saveConfigs: () => Promise.resolve(),
  loadConfigs,
});
</script>

<template>
  <div class="config-tab">
    <div class="config-toolbar">
      <Button type="primary" @click="openAddModal">
        <template #icon><Plus class="size-4" /></template>
        添加数据库
      </Button>
      <span class="toolbar-hint">配置此环境下的数据库连接信息，点击卡片可编辑</span>
    </div>

    <Spin :spinning="loading">
      <div v-if="configs.length > 0" ref="cardListRef" class="config-card-list">
        <div
          v-for="config in configs"
          :key="config.code"
          class="config-card"
          @click="openEditModal(config)"
        >
          <div class="drag-handle" @click.stop>
            <GripVertical class="size-4 text-gray-400" />
          </div>
          <div class="card-body">
            <div class="card-header">
              <span class="card-name">{{ config.name }}</span>
              <Tag :color="getDbTypeColor(config?.extra?.db_type || 'mysql')" class="card-tag">
                {{ getDbTypeLabel(config?.extra?.db_type || 'mysql') }}
              </Tag>
            </div>
            <div class="card-summary">{{ getConnectionSummary(config) }}</div>
          </div>
          <div class="card-actions" @click.stop>
            <Button type="text" size="small" @click="openEditModal(config)">
              <Pencil class="size-4 text-gray-500" />
            </Button>
            <Popconfirm
              title="确定删除？删除后所有环境的该配置都会被删除"
              @confirm="removeConfig(config)"
            >
              <Button type="text" size="small" danger>
                <Trash2 class="size-4" />
              </Button>
            </Popconfirm>
          </div>
        </div>
      </div>

      <Empty v-else description="暂无数据库配置" class="empty-state">
        <Button type="primary" @click="openAddModal">
          <template #icon><Plus class="size-4" /></template>
          添加第一个数据库
        </Button>
      </Empty>
    </Spin>

    <!-- 新增/编辑弹窗 -->
    <Modal
      v-model:open="modalVisible"
      :title="modalMode === 'add' ? '添加数据库' : '编辑数据库'"
      :confirm-loading="modalLoading"
      :width="520"
      @ok="handleConfirm"
    >
      <Form layout="vertical" class="modal-form">
        <Form.Item label="名称" required>
          <Input
            v-model:value="modalForm.name"
            placeholder="如：主数据库、缓存服务"
          />
        </Form.Item>
        <Form.Item label="数据库类型">
          <Select
            v-model:value="modalForm.dbType"
            :options="dbTypeOptions"
            :disabled="modalMode === 'edit'"
            @change="handleDbTypeChange"
          />
        </Form.Item>
        <Divider style="margin: 16px 0 12px">连接信息</Divider>
        <div class="form-row">
          <Form.Item label="主机地址" class="flex-1">
            <Input
              v-model:value="modalForm.host"
              placeholder="如：192.168.1.100"
            />
          </Form.Item>
          <Form.Item label="端口" class="port-field">
            <InputNumber
              v-model:value="modalForm.port"
              :min="1"
              :max="65535"
              style="width: 100%"
            />
          </Form.Item>
        </div>
        <Form.Item v-if="showDatabaseField" label="数据库名">
          <Input
            v-model:value="modalForm.database"
            placeholder="如：mydb"
          />
        </Form.Item>
        <div class="form-row">
          <Form.Item label="用户名" class="flex-1">
            <Input
              v-model:value="modalForm.username"
              placeholder="用户名"
            />
          </Form.Item>
          <Form.Item label="密码" class="flex-1">
            <Input.Password
              v-model:value="modalForm.password"
              placeholder="密码"
            />
          </Form.Item>
        </div>
        <Form.Item label="额外选项">
          <Input.TextArea
            v-model:value="modalForm.options"
            placeholder="如：charset=utf8mb4&parseTime=true"
            :rows="2"
          />
        </Form.Item>
      </Form>
    </Modal>
  </div>
</template>

<style scoped>
.config-tab {
  height: 100%;
}

.config-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.toolbar-hint {
  font-size: 12px;
  color: #999;
}

.config-card-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.config-card {
  display: flex;
  align-items: center;
  padding: 12px 14px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.config-card:hover {
  background: #f5f5f5;
  border-color: #d9d9d9;
}

.config-card:hover .card-actions {
  opacity: 1;
}

.config-card:hover .drag-handle {
  opacity: 1;
}

.drag-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 10px;
  cursor: grab;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.drag-handle:active {
  cursor: grabbing;
}

.card-body {
  flex: 1;
  min-width: 0;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.card-name {
  font-weight: 500;
  font-size: 14px;
  color: #1f1f1f;
}

.card-tag {
  margin-right: 0;
}

.card-summary {
  font-size: 12px;
  color: #999;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.2s ease;
  flex-shrink: 0;
}

.card-ghost {
  opacity: 0.5;
  background: #e6f7ff;
}

.card-chosen {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.card-drag {
  opacity: 0.9;
}

.empty-state {
  padding: 60px 0;
}

.modal-form {
  padding-top: 12px;
}

.form-row {
  display: flex;
  gap: 12px;
}

.flex-1 {
  flex: 1;
}

.port-field {
  width: 120px;
}
</style>
