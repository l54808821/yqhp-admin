<script setup lang="ts">
import type Sortable from 'sortablejs';

import { nextTick, onUnmounted, ref, watch } from 'vue';

import { createIconifyIcon, Plus } from '@vben/icons';

import {
  Button,
  Empty,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Select,
  Table,
} from 'ant-design-vue';

import type { ConfigItem } from '#/api/env';

import {
  batchUpdateConfigValuesApi,
  createConfigDefinitionApi,
  deleteConfigDefinitionApi,
  getConfigsApi,
  updateConfigDefinitionSortApi,
} from '#/api/env';

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

const loading = ref(false);
const configs = ref<ConfigItem[]>([]);
const tableRef = ref<HTMLElement | null>(null);
let sortableInstance: Sortable | null = null;

// 添加弹窗状态
const addModalVisible = ref(false);
const addModalForm = ref({ 
  name: '', 
  mqType: 'rabbitmq',
});
const addModalLoading = ref(false);

// MQ 类型选项
const mqTypeOptions = [
  { label: 'RabbitMQ', value: 'rabbitmq' },
  { label: 'Kafka', value: 'kafka' },
  { label: 'RocketMQ', value: 'rocketmq' },
];

// 表格列定义
const columns = [
  { title: '', key: 'drag', width: 40, align: 'center' as const },
  { title: '名称', dataIndex: 'name', key: 'name', width: 120 },
  { title: '类型', dataIndex: 'mq_type', key: 'mq_type', width: 90 },
  { title: '主机地址', dataIndex: 'host', key: 'host', width: 160 },
  { title: '端口', dataIndex: 'port', key: 'port', width: 80 },
  { title: 'VHost', dataIndex: 'vhost', key: 'vhost', width: 100 },
  { title: '用户名', dataIndex: 'username', key: 'username', width: 100 },
  { title: '操作', key: 'action', width: 80, align: 'center' as const },
];

// 监听环境变化，重新加载数据
watch(
  () => props.envId,
  async () => {
    addModalVisible.value = false;
    await loadConfigs();
  },
  { immediate: true },
);

async function loadConfigs() {
  try {
    loading.value = true;
    const data = await getConfigsApi(props.envId, 'mq');
    configs.value = data || [];
    await nextTick();
    initSortable();
  } catch {
    message.error('加载 MQ 配置失败');
  } finally {
    loading.value = false;
  }
}

// 初始化拖拽排序
async function initSortable() {
  if (sortableInstance) {
    sortableInstance.destroy();
    sortableInstance = null;
  }

  const tbody = tableRef.value?.querySelector('.ant-table-tbody');
  if (!tbody) return;

  const SortableModule = await import('sortablejs');
  const SortableClass = SortableModule.default;

  sortableInstance = SortableClass.create(tbody as HTMLElement, {
    animation: 200,
    handle: '.drag-handle',
    ghostClass: 'row-ghost',
    chosenClass: 'row-chosen',
    onEnd: handleSortEnd,
  });
}

// 处理排序结束
async function handleSortEnd(event: { oldIndex?: number; newIndex?: number }) {
  const { oldIndex, newIndex } = event;
  if (oldIndex === undefined || newIndex === undefined || oldIndex === newIndex) {
    return;
  }

  const draggedConfig = configs.value[oldIndex];
  if (!draggedConfig) return;

  let targetConfig: ConfigItem;
  let position: 'before' | 'after';

  if (newIndex > oldIndex) {
    targetConfig = configs.value[newIndex]!;
    position = 'after';
  } else {
    targetConfig = configs.value[newIndex]!;
    position = 'before';
  }

  try {
    await updateConfigDefinitionSortApi(props.projectId, 'mq', {
      code: draggedConfig.code,
      target_code: targetConfig.code,
      position,
    });
    await loadConfigs();
  } catch {
    message.error('排序更新失败');
    await loadConfigs();
  }
}

onUnmounted(() => {
  if (sortableInstance) {
    sortableInstance.destroy();
    sortableInstance = null;
  }
});

// 获取 MQ 类型
function getMqType(config: any): string {
  return config?.extra?.mq_type || 'rabbitmq';
}

// 获取字段值
function getField(config: any, field: string): any {
  return config?.value?.[field] || '';
}

// 设置字段值
function setField(config: any, field: string, value: any) {
  if (!config.value) config.value = {};
  config.value[field] = value;
}

// 设置名称（本地更新）
function setName(config: any, value: string) {
  config.name = value;
}

// 打开添加弹窗
function openAddModal() {
  addModalForm.value = { name: '', mqType: 'rabbitmq' };
  addModalVisible.value = true;
}

// 确认添加
async function confirmAdd() {
  if (!addModalForm.value.name) {
    message.error('请填写名称');
    return;
  }
  
  try {
    addModalLoading.value = true;
    await createConfigDefinitionApi(props.projectId, {
      type: 'mq',
      name: addModalForm.value.name,
      status: 1,
      extra: {
        mq_type: addModalForm.value.mqType,
      },
    });
    message.success('添加成功');
    addModalVisible.value = false;
    await loadConfigs();
  } catch (error: any) {
    message.error(error?.message || '添加失败');
  } finally {
    addModalLoading.value = false;
  }
}

// 删除配置
async function removeConfig(config: any) {
  try {
    await deleteConfigDefinitionApi(props.projectId, config.code);
    message.success('删除成功');
    await loadConfigs();
  } catch (error: any) {
    message.error(error?.message || '删除失败');
  }
}

// 保存配置值
async function saveConfigs() {
  try {
    const items = configs.value.map((c) => ({
      code: c.code,
      value: c.value || {},
    }));
    await batchUpdateConfigValuesApi(props.envId, { items });
    message.success('保存成功');
    emit('updated');
  } catch (error: any) {
    message.error(error?.message || '保存失败');
  }
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
        添加 MQ
      </Button>
      <span class="toolbar-hint">配置此环境下的消息队列连接信息</span>
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
        <template v-else-if="column.key === 'mq_type'">
          <span>{{ getMqType(record) }}</span>
        </template>
        <template v-else-if="column.key === 'host'">
          <Input 
            :value="getField(record, 'host')" 
            placeholder="主机地址"
            @input="(e: any) => setField(record, 'host', e.target.value)"
          />
        </template>
        <template v-else-if="column.key === 'port'">
          <InputNumber 
            :value="getField(record, 'port') || 5672" 
            :min="1" 
            :max="65535" 
            style="width: 100%"
            @change="(val: any) => setField(record, 'port', val)"
          />
        </template>
        <template v-else-if="column.key === 'vhost'">
          <Input 
            :value="getField(record, 'vhost') || '/'" 
            placeholder="/"
            @input="(e: any) => setField(record, 'vhost', e.target.value)"
          />
        </template>
        <template v-else-if="column.key === 'username'">
          <Input 
            :value="getField(record, 'username')" 
            placeholder="用户名"
            @input="(e: any) => setField(record, 'username', e.target.value)"
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
    
    <Empty v-else description="暂无 MQ 配置" class="empty-state">
      <Button type="primary" @click="openAddModal">
        <template #icon><Plus class="size-4" /></template>
        添加第一个 MQ
      </Button>
    </Empty>
    
    <!-- 添加弹窗 -->
    <Modal
      v-model:open="addModalVisible"
      title="添加 MQ"
      :confirm-loading="addModalLoading"
      @ok="confirmAdd"
    >
      <Form layout="vertical" style="margin-top: 16px;">
        <Form.Item label="名称" required>
          <Input 
            v-model:value="addModalForm.name" 
            placeholder="如：主消息队列" 
          />
        </Form.Item>
        <Form.Item label="MQ 类型">
          <Select
            v-model:value="addModalForm.mqType"
            :options="mqTypeOptions"
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
  margin-bottom: 12px;
}

.toolbar-hint {
  font-size: 12px;
  color: #999;
}

.empty-state {
  padding: 60px 0;
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
