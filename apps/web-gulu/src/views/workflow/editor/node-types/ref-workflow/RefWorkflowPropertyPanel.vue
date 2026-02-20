<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { Alert, Form, Input, Select, SelectOption, Spin } from 'ant-design-vue';

import type { Workflow } from '#/api/workflow';
import { getWorkflowApi, getWorkflowsByProjectApi } from '#/api/workflow';

const props = defineProps<{
  node: any;
  workflowId?: number;
  projectId?: number;
}>();

const emit = defineEmits<{
  update: [node: any];
}>();

interface ParamDef {
  name: string;
  type: string;
  defaultValue?: string;
  description?: string;
  required: boolean;
}

const workflows = ref<Workflow[]>([]);
const loadingWorkflows = ref(false);
const targetParams = ref<ParamDef[]>([]);
const loadingParams = ref(false);

const selectedWorkflowId = computed({
  get: () => props.node?.config?.workflow_id ?? null,
  set: (val) => {
    if (!props.node?.config) return;
    props.node.config.workflow_id = val;
  },
});

// 加载项目下的工作流列表
async function loadWorkflows() {
  if (!props.projectId) return;
  loadingWorkflows.value = true;
  try {
    const list = await getWorkflowsByProjectApi(props.projectId);
    // 排除当前工作流自身
    workflows.value = (list || []).filter((w) => w.id !== props.workflowId);
  } catch {
    workflows.value = [];
  } finally {
    loadingWorkflows.value = false;
  }
}

// 加载目标工作流的参数定义
async function loadTargetParams(workflowId: number) {
  loadingParams.value = true;
  targetParams.value = [];
  try {
    const wf = await getWorkflowApi(workflowId);
    if (wf?.definition) {
      const def = typeof wf.definition === 'string' ? JSON.parse(wf.definition) : wf.definition;
      targetParams.value = def.params || [];
    }
  } catch {
    targetParams.value = [];
  } finally {
    loadingParams.value = false;
  }
}

function handleWorkflowChange(val: number) {
  if (!props.node?.config) return;
  props.node.config.workflow_id = val;
  const wf = workflows.value.find((w) => w.id === val);
  props.node.config.workflow_name = wf?.name || '';
  // 重置参数映射
  props.node.config.params = {};
  emit('update', props.node);
  if (val) {
    loadTargetParams(val);
  } else {
    targetParams.value = [];
  }
}

function handleParamValueChange(paramName: string, value: string) {
  if (!props.node?.config) return;
  if (!props.node.config.params) {
    props.node.config.params = {};
  }
  props.node.config.params[paramName] = value;
  emit('update', props.node);
}

// 监听 projectId 变化加载工作流列表
watch(
  () => props.projectId,
  () => loadWorkflows(),
  { immediate: true },
);

// 选中工作流变化时加载参数
watch(
  () => props.node?.config?.workflow_id,
  (newId) => {
    if (newId) {
      loadTargetParams(newId);
    } else {
      targetParams.value = [];
    }
  },
  { immediate: true },
);
</script>

<template>
  <div class="ref-workflow-panel">
    <Form.Item label="目标工作流">
      <Select
        :value="selectedWorkflowId"
        placeholder="选择要引用的工作流"
        show-search
        :filter-option="(input: string, option: any) =>
          (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
        "
        :loading="loadingWorkflows"
        allow-clear
        @change="handleWorkflowChange"
      >
        <SelectOption
          v-for="wf in workflows"
          :key="wf.id"
          :value="wf.id"
          :label="wf.name"
        >
          {{ wf.name }}
          <span v-if="wf.description" class="wf-desc"> - {{ wf.description }}</span>
        </SelectOption>
      </Select>
    </Form.Item>

    <Alert
      v-if="!projectId"
      type="warning"
      message="请先保存工作流以加载可引用的工作流列表"
      show-icon
      class="mb-3"
    />

    <!-- 参数映射 -->
    <template v-if="selectedWorkflowId">
      <Spin :spinning="loadingParams">
        <div v-if="targetParams.length > 0" class="params-section">
          <div class="params-title">参数映射</div>
          <div class="params-hint">为目标工作流的输入参数指定值，支持 ${变量名} 引用上下文变量</div>
          <div class="params-list">
            <div v-for="param in targetParams" :key="param.name" class="param-row">
              <div class="param-info">
                <span class="param-name">
                  {{ param.name }}
                  <span v-if="param.required" class="required-mark">*</span>
                </span>
                <span class="param-type">{{ param.type }}</span>
                <span v-if="param.description" class="param-desc">{{ param.description }}</span>
              </div>
              <Input
                :value="node.config?.params?.[param.name] ?? param.defaultValue ?? ''"
                :placeholder="param.defaultValue ? `默认: ${param.defaultValue}` : '输入值或 ${变量名}'"
                @change="(e: any) => handleParamValueChange(param.name, e.target.value)"
              />
            </div>
          </div>
        </div>
        <div v-else-if="!loadingParams" class="no-params">
          目标工作流未定义输入参数
        </div>
      </Spin>
    </template>
  </div>
</template>

<style scoped>
.ref-workflow-panel {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.wf-desc {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.params-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.params-title {
  font-size: 13px;
  font-weight: 500;
  color: hsl(var(--foreground));
}

.params-hint {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  margin-bottom: 4px;
}

.params-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.param-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.param-info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.param-name {
  font-weight: 500;
  color: hsl(var(--foreground));
}

.required-mark {
  color: #ff4d4f;
  margin-left: 2px;
}

.param-type {
  padding: 0 4px;
  border-radius: 3px;
  font-size: 11px;
  background: hsl(var(--accent));
  color: hsl(var(--muted-foreground));
}

.param-desc {
  color: hsl(var(--muted-foreground));
  font-size: 11px;
}

.no-params {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  text-align: center;
  padding: 12px 0;
}
</style>
