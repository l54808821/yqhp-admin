<script setup lang="ts">
import { ref } from 'vue';

import { createIconifyIcon, Plus } from '@vben/icons';

import {
  Button,
  Empty,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Select,
  Switch,
  Table,
  Tag,
} from 'ant-design-vue';

import {
  createConfigDefinitionApi,
  updateConfigValueApi,
} from '#/api/env';

import { useConfigTab } from '#/hooks/useConfigTab';

const Trash2 = createIconifyIcon('lucide:trash-2');
const GripVertical = createIconifyIcon('lucide:grip-vertical');

interface Props {
  envId: number;
  projectId: number;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'updated'): void;
}>();

const tableRef = ref<HTMLElement | null>(null);

// 添加弹窗状态
const addModalVisible = ref(false);
const addModalForm = ref({ 
  name: '', 
  varType: 'string',
  isSensitive: false,
  value: '',
});
const addModalLoading = ref(false);

// 使用公共 composable
const {
  loading,
  configs,
  loadConfigs,
  removeConfig,
  saveAll,
  setName,
} = useConfigTab({
  envId: () => props.envId,
  projectId: () => props.projectId,
  configType: 'variable',
  getSortableElement: () =>
    tableRef.value?.querySelector('.ant-table-tbody') as HTMLElement | null,
  sortableOptions: { ghostClass: 'row-ghost', chosenClass: 'row-chosen' },
  loadErrorMessage: '加载变量配置失败',
  onEnvChange: () => {
    addModalVisible.value = false;
  },
});

// 变量类型选项
const varTypeOptions = [
  { label: '字符串', value: 'string' },
  { label: '数字', value: 'number' },
  { label: '布尔值', value: 'boolean' },
  { label: 'JSON', value: 'json' },
];

// 表格列定义
const columns = [
  { title: '', key: 'drag', width: 40, align: 'center' as const },
  { title: '名称', dataIndex: 'name', key: 'name', width: 150 },
  { title: '变量值', dataIndex: 'value', key: 'value' },
  { title: '类型', dataIndex: 'var_type', key: 'var_type', width: 90 },
  { title: '敏感', dataIndex: 'is_sensitive', key: 'is_sensitive', width: 70 },
  { title: '操作', key: 'action', width: 80, align: 'center' as const },
];

// 获取变量值
function getVariableValue(config: any): string {
  return config?.value?.value || '';
}

// 设置变量值
function setVariableValue(config: any, value: string) {
  if (!config.value) config.value = {};
  config.value.value = value;
}

// 获取变量类型
function getVarType(config: any): string {
  return config?.extra?.var_type || 'string';
}

// 判断是否敏感
function isSensitive(config: any): boolean {
  return config?.extra?.is_sensitive || false;
}

// 打开添加弹窗
function openAddModal() {
  addModalForm.value = { name: '', varType: 'string', isSensitive: false, value: '' };
  addModalVisible.value = true;
}

// 确认添加
async function confirmAdd() {
  if (!addModalForm.value.name) {
    message.error('请填写名称');
    return;
  }

  // 检查名称是否重复
  const duplicate = configs.value.some(
    (c) => c.name === addModalForm.value.name.trim(),
  );
  if (duplicate) {
    message.warning('已存在同名变量配置，请使用不同的名称');
    return;
  }
  
  try {
    addModalLoading.value = true;

    // 创建配置定义
    const definition = await createConfigDefinitionApi(props.projectId, {
      type: 'variable',
      name: addModalForm.value.name,
      status: 1,
      extra: {
        var_type: addModalForm.value.varType,
        is_sensitive: addModalForm.value.isSensitive,
      },
    });

    // 如果填写了变量值，立即设置当前环境的配置值
    if (addModalForm.value.value) {
      await updateConfigValueApi(props.envId, definition.code, {
        value: {
          value: addModalForm.value.value,
        },
      });
    }

    message.success('添加成功');
    addModalVisible.value = false;
    await loadConfigs();
  } catch (error: any) {
    message.error(error?.message || '添加失败');
  } finally {
    addModalLoading.value = false;
  }
}

// 保存配置（定义变更 + 配置值）
async function saveConfigs() {
  await saveAll(() => emit('updated'));
}

// 暴露给父组件的方法
defineExpose({
  saveConfigs,
  loadConfigs,
});
</script>

<template>
  <div class="config-tab">
    <div class="config-toolbar">
      <Button type="primary" @click="openAddModal">
        <template #icon><Plus class="size-4" /></template>
        添加变量
      </Button>
      <span class="toolbar-hint">配置此环境下的全局变量，可在测试用例中引用</span>
    </div>
    
    <div v-if="configs.length > 0" ref="tableRef">
      <Table
        :columns="columns"
        :data-source="configs"
        :pagination="false"
        :loading="loading"
        size="middle"
        :scroll="{ y: 320 }"
        row-key="code"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'drag'">
            <GripVertical class="drag-handle size-4 cursor-move text-gray-400" />
          </template>
          <template v-else-if="column.key === 'name'">
          <Input 
            :value="record.name" 
            @input="(e: any) => setName(record, e.target.value)"
          />
        </template>
        <template v-else-if="column.key === 'value'">
          <Input.Password
            v-if="isSensitive(record)"
            :value="getVariableValue(record)"
            placeholder="敏感变量值"
            @input="(e: any) => setVariableValue(record, e.target.value)"
          />
          <Input 
            v-else 
            :value="getVariableValue(record)" 
            placeholder="变量值"
            @input="(e: any) => setVariableValue(record, e.target.value)"
          />
        </template>
        <template v-else-if="column.key === 'var_type'">
          <Tag>{{ getVarType(record) }}</Tag>
        </template>
        <template v-else-if="column.key === 'is_sensitive'">
          <Switch
            :checked="isSensitive(record)"
            size="small"
            disabled
          />
        </template>
        <template v-else-if="column.key === 'action'">
          <Popconfirm title="确定删除？删除后所有环境的该配置都会被删除" @confirm="removeConfig(record)">
            <Button type="text" size="small" danger>
              <Trash2 class="size-4" />
            </Button>
          </Popconfirm>
        </template>
      </template>
    </Table>
    </div>
    
    <Empty v-else description="暂无变量配置" class="empty-state">
      <Button type="primary" @click="openAddModal">
        <template #icon><Plus class="size-4" /></template>
        添加第一个变量
      </Button>
    </Empty>
    
    <!-- 添加弹窗 -->
    <Modal
      v-model:open="addModalVisible"
      title="添加变量"
      :confirm-loading="addModalLoading"
      @ok="confirmAdd"
    >
      <Form layout="vertical" style="margin-top: 16px;">
        <Form.Item label="名称" required>
          <Input 
            v-model:value="addModalForm.name" 
            placeholder="如：接口密钥" 
          />
        </Form.Item>
        <Form.Item label="变量值">
          <Input.Password
            v-if="addModalForm.isSensitive"
            v-model:value="addModalForm.value"
            placeholder="输入敏感变量值"
          />
          <Input
            v-else
            v-model:value="addModalForm.value"
            placeholder="输入变量值"
          />
        </Form.Item>
        <Form.Item label="类型">
          <Select
            v-model:value="addModalForm.varType"
            :options="varTypeOptions"
          />
        </Form.Item>
        <Form.Item label="敏感变量">
          <Switch v-model:checked="addModalForm.isSensitive" />
          <span class="sensitive-hint">敏感变量值会加密存储</span>
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
  margin-bottom: 12px;
}

.toolbar-hint {
  font-size: 12px;
  color: #999;
}

.empty-state {
  padding: 60px 0;
}

.sensitive-hint {
  margin-left: 8px;
  font-size: 12px;
  color: #999;
}

/* 拖拽样式 */
.drag-handle {
  opacity: 0.5;
  transition: opacity 0.2s;
}

.drag-handle:hover {
  opacity: 1;
}

:deep(.row-ghost) {
  opacity: 0.5;
  background: #e6f7ff;
}

:deep(.row-chosen) {
  background: #f0f0f0;
}
</style>
