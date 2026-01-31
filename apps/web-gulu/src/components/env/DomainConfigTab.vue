<script setup lang="ts">
import { ref, watch } from 'vue';

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

import type { ConfigItem } from '#/api/env';

import {
  batchUpdateConfigValuesApi,
  createConfigDefinitionApi,
  deleteConfigDefinitionApi,
  getConfigsApi,
  updateConfigDefinitionApi,
} from '#/api/env';

const Trash2 = createIconifyIcon('lucide:trash-2');

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

// 添加弹窗状态
const addModalVisible = ref(false);
const addModalForm = ref({ name: '' });
const addModalLoading = ref(false);

// 表格列定义
const columns = [
  { title: '名称', dataIndex: 'name', key: 'name', width: 150 },
  { title: 'URL 地址', dataIndex: 'base_url', key: 'base_url' },
  { title: '状态', dataIndex: 'status', key: 'status', width: 80 },
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
    const data = await getConfigsApi(props.envId, 'domain');
    configs.value = data || [];
  } catch {
    message.error('加载域名配置失败');
  } finally {
    loading.value = false;
  }
}

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
  addModalForm.value = { name: '' };
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
      type: 'domain',
      name: addModalForm.value.name,
      status: 1,
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

// 更新配置定义
async function updateDefinition(config: any, field: string, value: any) {
  try {
    await updateConfigDefinitionApi(props.projectId, config.code, {
      [field]: value,
    });
  } catch (error: any) {
    message.error(error?.message || '更新失败');
    await loadConfigs();
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
    const values = configs.value.map((c) => ({
      code: c.code,
      value: c.value || {},
    }));
    await batchUpdateConfigValuesApi(props.envId, { values });
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
        添加域名
      </Button>
      <span class="toolbar-hint">配置此环境下的服务域名地址（域名定义是项目级别的，所有环境共享）</span>
    </div>
    
    <Table
      v-if="configs.length > 0"
      :columns="columns"
      :data-source="configs"
      :pagination="false"
      :loading="loading"
      size="middle"
      :scroll="{ y: 320 }"
      row-key="code"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'name'">
          <Input 
            :value="record.name" 
            @blur="(e: any) => updateDefinition(record, 'name', e.target.value)"
            @pressEnter="(e: any) => updateDefinition(record, 'name', e.target.value)"
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
            @change="(checked: any) => updateDefinition(record, 'status', checked ? 1 : 0)"
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
</style>
