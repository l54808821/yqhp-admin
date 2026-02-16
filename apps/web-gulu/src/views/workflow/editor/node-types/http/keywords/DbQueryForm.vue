<script setup lang="ts">
import { ref, watch } from 'vue';

import { Input, Select } from 'ant-design-vue';

import type { DbQueryConfig } from '../../../types';
import { createDbQueryConfig } from '../../../types';

interface Props {
  config: DbQueryConfig;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update', config: DbQueryConfig): void;
}>();

// 本地数据
const localConfig = ref<DbQueryConfig>(createDbQueryConfig());

// TODO: 从后端获取数据源列表
const datasourceOptions = ref([
  { label: '请选择数据源', value: 0 },
]);

// 同步外部数据
watch(
  () => props.config,
  (newConfig) => {
    if (newConfig) {
      localConfig.value = JSON.parse(JSON.stringify(newConfig));
    } else {
      localConfig.value = createDbQueryConfig();
    }
  },
  { immediate: true, deep: true }
);

// 触发更新
function emitUpdate() {
  emit('update', JSON.parse(JSON.stringify(localConfig.value)));
}

// 更新数据源
function updateDatasource(value: number) {
  localConfig.value.datasourceId = value;
  emitUpdate();
}

// 更新 SQL
function updateSql(value: string) {
  localConfig.value.sql = value;
  emitUpdate();
}

// 更新变量名
function updateVariableName(value: string) {
  localConfig.value.variableName = value;
  emitUpdate();
}

// 示例 SQL
const exampleSql = `-- 查询示例
SELECT id, name, email
FROM users
WHERE status = 'active'
LIMIT 10;

-- 支持变量: \${userId}`;
</script>

<template>
  <div class="db-query-form">
    <div class="inline-form">
      <Select
        :value="localConfig.datasourceId"
        :options="datasourceOptions"
        placeholder="选择数据源"
        size="small"
        class="field-datasource"
        @change="updateDatasource"
      />
      <Input
        :value="localConfig.variableName"
        placeholder="保存到变量（可选）"
        size="small"
        class="field-var"
        @change="(e: any) => updateVariableName(e.target.value)"
      />
    </div>
    <Input.TextArea
      :value="localConfig.sql"
      :placeholder="exampleSql"
      :rows="4"
      size="small"
      class="sql-editor"
      @change="(e: any) => updateSql(e.target.value)"
    />
  </div>
</template>

<style scoped>
.db-query-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.inline-form {
  display: flex;
  align-items: center;
  gap: 8px;
}

.field-datasource {
  min-width: 160px;
  flex-shrink: 0;
}

.field-var {
  flex: 1;
  min-width: 120px;
}

.sql-editor {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
}

.sql-editor :deep(.ant-input) {
  border-radius: 6px;
}
</style>
