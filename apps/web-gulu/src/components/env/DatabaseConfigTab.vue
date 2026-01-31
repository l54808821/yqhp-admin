<script setup lang="ts">
import { ref, watch } from 'vue';

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
const addModalForm = ref({ 
  name: '', 
  dbType: 'mysql',
});
const addModalLoading = ref(false);

// 数据库类型选项
const dbTypeOptions = [
  { label: 'MySQL', value: 'mysql' },
  { label: 'PostgreSQL', value: 'postgresql' },
  { label: 'Redis', value: 'redis' },
  { label: 'MongoDB', value: 'mongodb' },
];

// 表格列定义
const columns = [
  { title: '名称', dataIndex: 'name', key: 'name', width: 120 },
  { title: '类型', dataIndex: 'db_type', key: 'db_type', width: 90 },
  { title: '主机地址', dataIndex: 'host', key: 'host', width: 160 },
  { title: '端口', dataIndex: 'port', key: 'port', width: 80 },
  { title: '数据库名', dataIndex: 'database', key: 'database', width: 120 },
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
    const data = await getConfigsApi(props.envId, 'database');
    configs.value = data || [];
  } catch {
    message.error('加载数据库配置失败');
  } finally {
    loading.value = false;
  }
}

// 获取数据库类型
function getDbType(config: any): string {
  return config?.extra?.db_type || 'mysql';
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

// 打开添加弹窗
function openAddModal() {
  addModalForm.value = { name: '', dbType: 'mysql' };
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
      type: 'database',
      name: addModalForm.value.name,
      status: 1,
      extra: {
        db_type: addModalForm.value.dbType,
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
        添加数据库
      </Button>
      <span class="toolbar-hint">配置此环境下的数据库连接信息</span>
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
        <template v-else-if="column.key === 'db_type'">
          <span>{{ getDbType(record) }}</span>
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
            :value="getField(record, 'port') || 3306" 
            :min="1" 
            :max="65535" 
            style="width: 100%"
            @change="(val: any) => setField(record, 'port', val)"
          />
        </template>
        <template v-else-if="column.key === 'database'">
          <Input 
            :value="getField(record, 'database')" 
            placeholder="数据库名"
            @input="(e: any) => setField(record, 'database', e.target.value)"
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
    
    <Empty v-else description="暂无数据库配置" class="empty-state">
      <Button type="primary" @click="openAddModal">
        <template #icon><Plus class="size-4" /></template>
        添加第一个数据库
      </Button>
    </Empty>
    
    <!-- 添加弹窗 -->
    <Modal
      v-model:open="addModalVisible"
      title="添加数据库"
      :confirm-loading="addModalLoading"
      @ok="confirmAdd"
    >
      <Form layout="vertical" style="margin-top: 16px;">
        <Form.Item label="名称" required>
          <Input 
            v-model:value="addModalForm.name" 
            placeholder="如：主数据库" 
          />
        </Form.Item>
        <Form.Item label="数据库类型">
          <Select
            v-model:value="addModalForm.dbType"
            :options="dbTypeOptions"
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
