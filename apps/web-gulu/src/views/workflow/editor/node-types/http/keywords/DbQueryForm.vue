<script setup lang="ts">
import { ref, watch } from 'vue';

import { Form, Input, Select } from 'ant-design-vue';

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
    <Form layout="vertical" size="small">
      <div class="form-row">
        <Form.Item label="数据源" class="form-item">
          <Select
            :value="localConfig.datasourceId"
            :options="datasourceOptions"
            placeholder="选择数据源"
            @change="updateDatasource"
          />
        </Form.Item>
        <Form.Item label="保存结果到变量" class="form-item">
          <Input
            :value="localConfig.variableName"
            placeholder="变量名（可选）"
            @change="(e: any) => updateVariableName(e.target.value)"
          />
        </Form.Item>
      </div>

      <Form.Item label="SQL 语句">
        <Input.TextArea
          :value="localConfig.sql"
          :placeholder="exampleSql"
          :rows="8"
          class="sql-editor"
          @change="(e: any) => updateSql(e.target.value)"
        />
      </Form.Item>
    </Form>

    <div class="form-tips">
      <div class="tip-item">
        <span class="tip-label">提示：</span>
        <span class="tip-text">SQL 中可以使用 ${'{'}variableName{'}'} 引用变量</span>
      </div>
      <div class="tip-item">
        <span class="tip-label">结果：</span>
        <span class="tip-text">查询结果将以 JSON 数组格式保存到指定变量</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.db-query-form {
  max-width: 600px;
}

.form-row {
  display: flex;
  gap: 12px;
}

.form-item {
  flex: 1;
  margin-bottom: 12px;
}

.sql-editor {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
}

.sql-editor :deep(.ant-input) {
  border-radius: 6px;
}

.form-tips {
  margin-top: 12px;
  padding: 8px 12px;
  background: hsl(var(--accent) / 30%);
  border-radius: 6px;
}

.tip-item {
  font-size: 12px;
  line-height: 1.8;
}

.tip-label {
  color: hsl(var(--foreground) / 70%);
}

.tip-text {
  color: hsl(var(--foreground) / 50%);
}

:deep(.ant-form-item) {
  margin-bottom: 12px;
}

:deep(.ant-form-item-label) {
  padding-bottom: 4px;
}

:deep(.ant-form-item-label > label) {
  font-size: 12px;
  color: hsl(var(--foreground) / 70%);
}
</style>
