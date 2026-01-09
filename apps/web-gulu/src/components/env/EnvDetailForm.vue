<script setup lang="ts">
import { ref, watch } from 'vue';

import {
  Button,
  Collapse,
  Form,
  Input,
  message,
  Switch,
  Table,
} from 'ant-design-vue';

import type { Env } from '#/api/env';

import { updateEnvApi } from '#/api/env';

interface Props {
  env: Env;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'updated'): void;
}>();

const saving = ref(false);
const formData = ref({
  name: '',
  description: '',
  status: 1,
});

// 域名配置
const domains = ref<{ code: string; url: string }[]>([]);
// 变量配置
const variables = ref<{ key: string; value: string }[]>([]);
// 数据库配置
const databases = ref<{ code: string; host: string; port: number; database: string; username: string }[]>([]);
// MQ配置
const mqConfigs = ref<{ code: string; host: string; port: number; username: string }[]>([]);

watch(
  () => props.env,
  (env) => {
    if (env) {
      formData.value = {
        name: env.name,
        description: env.description || '',
        status: env.status,
      };
      // TODO: 从后端加载配置数据
      // 这里暂时使用空数据
      domains.value = [];
      variables.value = [];
      databases.value = [];
      mqConfigs.value = [];
    }
  },
  { immediate: true },
);

async function handleSave() {
  try {
    saving.value = true;
    await updateEnvApi(props.env.id, {
      name: formData.value.name,
      description: formData.value.description,
      status: formData.value.status,
    });
    message.success('保存成功');
    emit('updated');
  } catch {
    message.error('保存失败');
  } finally {
    saving.value = false;
  }
}

// 域名表格列
const domainColumns = [
  { title: '代码', dataIndex: 'code', key: 'code' },
  { title: 'URL', dataIndex: 'url', key: 'url' },
  { title: '操作', key: 'action', width: 80 },
];

// 变量表格列
const variableColumns = [
  { title: '变量名', dataIndex: 'key', key: 'key' },
  { title: '变量值', dataIndex: 'value', key: 'value' },
  { title: '操作', key: 'action', width: 80 },
];

// 数据库表格列
const databaseColumns = [
  { title: '代码', dataIndex: 'code', key: 'code' },
  { title: '主机', dataIndex: 'host', key: 'host' },
  { title: '端口', dataIndex: 'port', key: 'port', width: 80 },
  { title: '数据库', dataIndex: 'database', key: 'database' },
  { title: '操作', key: 'action', width: 80 },
];

// MQ表格列
const mqColumns = [
  { title: '代码', dataIndex: 'code', key: 'code' },
  { title: '主机', dataIndex: 'host', key: 'host' },
  { title: '端口', dataIndex: 'port', key: 'port', width: 80 },
  { title: '操作', key: 'action', width: 80 },
];

function addDomain() {
  domains.value.push({ code: '', url: '' });
}

function removeDomain(index: number) {
  domains.value.splice(index, 1);
}

function addVariable() {
  variables.value.push({ key: '', value: '' });
}

function removeVariable(index: number) {
  variables.value.splice(index, 1);
}

function addDatabase() {
  databases.value.push({ code: '', host: '', port: 3306, database: '', username: '' });
}

function removeDatabase(index: number) {
  databases.value.splice(index, 1);
}

function addMqConfig() {
  mqConfigs.value.push({ code: '', host: '', port: 5672, username: '' });
}

function removeMqConfig(index: number) {
  mqConfigs.value.splice(index, 1);
}
</script>

<template>
  <div class="env-detail-form">
    <div class="form-header">
      <h3>{{ env.name }}</h3>
      <Button type="primary" :loading="saving" @click="handleSave">
        保存
      </Button>
    </div>

    <Form layout="vertical">
      <Form.Item label="环境名称">
        <Input v-model:value="formData.name" />
      </Form.Item>
      <Form.Item label="描述">
        <Input.TextArea v-model:value="formData.description" :rows="2" />
      </Form.Item>
      <Form.Item label="状态">
        <Switch
          :checked="formData.status === 1"
          checked-children="启用"
          un-checked-children="禁用"
          @change="(checked: any) => formData.status = checked ? 1 : 0"
        />
      </Form.Item>
    </Form>

    <Collapse :default-active-key="['domains']">
      <!-- 域名配置 -->
      <Collapse.Panel key="domains" header="域名配置">
        <div class="config-section">
          <Button type="dashed" size="small" class="mb-2" @click="addDomain">
            添加域名
          </Button>
          <Table
            :columns="domainColumns"
            :data-source="domains"
            :pagination="false"
            size="small"
          >
            <template #bodyCell="{ column, record, index }">
              <template v-if="column.key === 'code'">
                <Input v-model:value="record.code" size="small" placeholder="代码" />
              </template>
              <template v-else-if="column.key === 'url'">
                <Input v-model:value="record.url" size="small" placeholder="URL" />
              </template>
              <template v-else-if="column.key === 'action'">
                <Button type="link" size="small" danger @click="removeDomain(index)">
                  删除
                </Button>
              </template>
            </template>
          </Table>
        </div>
      </Collapse.Panel>

      <!-- 变量配置 -->
      <Collapse.Panel key="variables" header="变量配置">
        <div class="config-section">
          <Button type="dashed" size="small" class="mb-2" @click="addVariable">
            添加变量
          </Button>
          <Table
            :columns="variableColumns"
            :data-source="variables"
            :pagination="false"
            size="small"
          >
            <template #bodyCell="{ column, record, index }">
              <template v-if="column.key === 'key'">
                <Input v-model:value="record.key" size="small" placeholder="变量名" />
              </template>
              <template v-else-if="column.key === 'value'">
                <Input v-model:value="record.value" size="small" placeholder="变量值" />
              </template>
              <template v-else-if="column.key === 'action'">
                <Button type="link" size="small" danger @click="removeVariable(index)">
                  删除
                </Button>
              </template>
            </template>
          </Table>
        </div>
      </Collapse.Panel>

      <!-- 数据库配置 -->
      <Collapse.Panel key="databases" header="数据库配置">
        <div class="config-section">
          <Button type="dashed" size="small" class="mb-2" @click="addDatabase">
            添加数据库
          </Button>
          <Table
            :columns="databaseColumns"
            :data-source="databases"
            :pagination="false"
            size="small"
          >
            <template #bodyCell="{ column, record, index }">
              <template v-if="column.key === 'code'">
                <Input v-model:value="record.code" size="small" placeholder="代码" />
              </template>
              <template v-else-if="column.key === 'host'">
                <Input v-model:value="record.host" size="small" placeholder="主机" />
              </template>
              <template v-else-if="column.key === 'port'">
                <Input v-model:value="record.port" size="small" type="number" />
              </template>
              <template v-else-if="column.key === 'database'">
                <Input v-model:value="record.database" size="small" placeholder="数据库" />
              </template>
              <template v-else-if="column.key === 'action'">
                <Button type="link" size="small" danger @click="removeDatabase(index)">
                  删除
                </Button>
              </template>
            </template>
          </Table>
        </div>
      </Collapse.Panel>

      <!-- MQ配置 -->
      <Collapse.Panel key="mq" header="MQ配置">
        <div class="config-section">
          <Button type="dashed" size="small" class="mb-2" @click="addMqConfig">
            添加MQ
          </Button>
          <Table
            :columns="mqColumns"
            :data-source="mqConfigs"
            :pagination="false"
            size="small"
          >
            <template #bodyCell="{ column, record, index }">
              <template v-if="column.key === 'code'">
                <Input v-model:value="record.code" size="small" placeholder="代码" />
              </template>
              <template v-else-if="column.key === 'host'">
                <Input v-model:value="record.host" size="small" placeholder="主机" />
              </template>
              <template v-else-if="column.key === 'port'">
                <Input v-model:value="record.port" size="small" type="number" />
              </template>
              <template v-else-if="column.key === 'action'">
                <Button type="link" size="small" danger @click="removeMqConfig(index)">
                  删除
                </Button>
              </template>
            </template>
          </Table>
        </div>
      </Collapse.Panel>
    </Collapse>
  </div>
</template>

<style scoped>
.env-detail-form {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.form-header h3 {
  margin: 0;
}

.config-section {
  padding: 8px 0;
}

.mb-2 {
  margin-bottom: 8px;
}
</style>
