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
  Switch,
  Table,
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
const addModalForm = ref({ name: '', baseUrl: '' });
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
  configType: 'domain',
  getSortableElement: () =>
    tableRef.value?.querySelector('.ant-table-tbody') as HTMLElement | null,
  sortableOptions: { ghostClass: 'row-ghost', chosenClass: 'row-chosen' },
  loadErrorMessage: '加载域名配置失败',
  onEnvChange: () => {
    addModalVisible.value = false;
  },
});

// 表格列定义
const columns = [
  { title: '', key: 'drag', width: 40, align: 'center' as const },
  { title: '名称', dataIndex: 'name', key: 'name', width: 150 },
  { title: 'URL 地址', dataIndex: 'base_url', key: 'base_url' },
  { title: '状态', dataIndex: 'status', key: 'status', width: 80 },
  { title: '操作', key: 'action', width: 80, align: 'center' as const },
];

// 获取域名 URL
function getBaseUrl(config: any): string {
  return config?.value?.base_url || '';
}

// 设置域名 URL
function setBaseUrl(config: any, value: string) {
  if (!config.value) config.value = {};
  config.value.base_url = value;
}

// 打开添加弹窗
function openAddModal() {
  addModalForm.value = { name: '', baseUrl: '' };
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
    message.warning('已存在同名域名配置，请使用不同的名称');
    return;
  }
  
  try {
    addModalLoading.value = true;

    // 创建配置定义
    const definition = await createConfigDefinitionApi(props.projectId, {
      type: 'domain',
      name: addModalForm.value.name,
      status: 1,
    });

    // 如果填写了 URL，立即设置当前环境的配置值
    if (addModalForm.value.baseUrl) {
      await updateConfigValueApi(props.envId, definition.code, {
        value: {
          base_url: addModalForm.value.baseUrl,
          headers: [],
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
        添加域名
      </Button>
      <span class="toolbar-hint">配置此环境下的服务域名地址（域名定义是项目级别的，所有环境共享）</span>
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
          <template v-else-if="column.key === 'base_url'">
            <Input 
              :value="getBaseUrl(record)" 
              placeholder="如：https://api.example.com"
              @input="(e: any) => setBaseUrl(record, e.target.value)"
            />
          </template>
          <template v-else-if="column.key === 'status'">
            <Switch
              :checked="record.status === 1"
              size="small"
              @change="(checked: any) => record.status = checked ? 1 : 0"
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
    
    <Empty v-else description="暂无域名配置" class="empty-state">
      <Button type="primary" @click="openAddModal">
        <template #icon><Plus class="size-4" /></template>
        添加第一个域名
      </Button>
    </Empty>
    
    <!-- 添加弹窗 -->
    <Modal
      v-model:open="addModalVisible"
      title="添加域名"
      :confirm-loading="addModalLoading"
      @ok="confirmAdd"
    >
      <Form layout="vertical" style="margin-top: 16px;">
        <Form.Item label="名称" required>
          <Input 
            v-model:value="addModalForm.name" 
            placeholder="如：主服务" 
          />
        </Form.Item>
        <Form.Item label="URL 地址">
          <Input 
            v-model:value="addModalForm.baseUrl" 
            placeholder="如：https://api.example.com" 
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
