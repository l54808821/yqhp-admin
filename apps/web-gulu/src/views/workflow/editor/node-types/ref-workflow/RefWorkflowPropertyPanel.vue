<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { Alert, Form, Input, Select, SelectOption, Spin, Tag, Tooltip } from 'ant-design-vue';

import { createIconifyIcon } from '@vben/icons';
import type { Workflow } from '#/api/workflow';
import { getWorkflowApi, getWorkflowsByProjectApi } from '#/api/workflow';

const ArrowDownToLine = createIconifyIcon('lucide:arrow-down-to-line');
const ArrowUpFromLine = createIconifyIcon('lucide:arrow-up-from-line');
const Info = createIconifyIcon('lucide:info');

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

interface ReturnDef {
  name: string;
  type: string;
  description?: string;
}

const workflows = ref<Workflow[]>([]);
const loadingWorkflows = ref(false);
const targetParams = ref<ParamDef[]>([]);
const targetReturns = ref<ReturnDef[]>([]);
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

// 加载目标工作流的参数和返回值定义
async function loadTargetDefinitions(workflowId: number) {
  loadingParams.value = true;
  targetParams.value = [];
  targetReturns.value = [];
  try {
    const wf = await getWorkflowApi(workflowId);
    if (wf?.definition) {
      const def = typeof wf.definition === 'string' ? JSON.parse(wf.definition) : wf.definition;
      targetParams.value = def.params || [];
      targetReturns.value = def.returns || [];
    }
  } catch {
    targetParams.value = [];
    targetReturns.value = [];
  } finally {
    loadingParams.value = false;
  }
}

function handleWorkflowChange(val: number) {
  if (!props.node?.config) return;
  props.node.config.workflow_id = val;
  const wf = workflows.value.find((w) => w.id === val);
  props.node.config.workflow_name = wf?.name || '';
  // 重置参数映射和输出映射
  props.node.config.params = {};
  props.node.config.outputs = {};
  emit('update', props.node);
  if (val) {
    loadTargetDefinitions(val);
  } else {
    targetParams.value = [];
    targetReturns.value = [];
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

function handleOutputMappingChange(returnName: string, parentVarName: string) {
  if (!props.node?.config) return;
  if (!props.node.config.outputs) {
    props.node.config.outputs = {};
  }
  if (parentVarName.trim()) {
    props.node.config.outputs[parentVarName.trim()] = returnName;
  } else {
    // 移除之前可能映射到该返回值的条目
    const toRemove = Object.keys(props.node.config.outputs).find(
      (k) => props.node.config.outputs[k] === returnName,
    );
    if (toRemove) {
      delete props.node.config.outputs[toRemove];
    }
  }
  emit('update', props.node);
}

function getOutputVarForReturn(returnName: string): string {
  const outputs = props.node?.config?.outputs;
  if (!outputs) return '';
  for (const [parentVar, childVar] of Object.entries(outputs)) {
    if (childVar === returnName) return parentVar;
  }
  return '';
}

// 监听 projectId 变化加载工作流列表
watch(
  () => props.projectId,
  () => loadWorkflows(),
  { immediate: true },
);

// 选中工作流变化时加载参数和返回值
watch(
  () => props.node?.config?.workflow_id,
  (newId) => {
    if (newId) {
      loadTargetDefinitions(newId);
    } else {
      targetParams.value = [];
      targetReturns.value = [];
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

    <!-- 参数 & 输出映射 -->
    <template v-if="selectedWorkflowId">
      <Spin :spinning="loadingParams">
        <!-- 入参卡片 -->
        <div class="mapping-card">
          <div class="card-header">
            <div class="card-header-left">
              <ArrowUpFromLine class="card-icon input-icon" />
              <span class="card-title">入参</span>
            </div>
            <Tag v-if="targetParams.length > 0" class="card-count">{{ targetParams.length }}</Tag>
          </div>
          <div v-if="targetParams.length > 0" class="card-body">
            <div v-for="param in targetParams" :key="param.name" class="mapping-row">
              <div class="row-label">
                <span class="mapping-name">
                  {{ param.name }}<span v-if="param.required" class="required-mark">*</span>
                </span>
                <Tag class="type-tag">{{ param.type }}</Tag>
                <Tooltip v-if="param.description" :title="param.description">
                  <Info class="info-icon" />
                </Tooltip>
              </div>
              <Input
                class="row-input"
                :value="node.config?.params?.[param.name] ?? param.defaultValue ?? ''"
                :placeholder="param.defaultValue ? `默认: ${param.defaultValue}` : '${变量名}'"
                @change="(e: any) => handleParamValueChange(param.name, e.target.value)"
              />
            </div>
          </div>
          <div v-else class="card-empty">目标工作流未定义入参</div>
        </div>

        <!-- 出参卡片 -->
        <div class="mapping-card">
          <div class="card-header">
            <div class="card-header-left">
              <ArrowDownToLine class="card-icon output-icon" />
              <span class="card-title">出参</span>
            </div>
            <Tag v-if="targetReturns.length > 0" class="card-count">{{ targetReturns.length }}</Tag>
          </div>
          <div v-if="targetReturns.length > 0" class="card-body">
            <div v-for="ret in targetReturns" :key="ret.name" class="mapping-row">
              <div class="row-label">
                <span class="mapping-name">{{ ret.name }}</span>
                <Tag class="type-tag">{{ ret.type }}</Tag>
                <Tooltip v-if="ret.description" :title="ret.description">
                  <Info class="info-icon" />
                </Tooltip>
              </div>
              <Input
                class="row-input"
                :value="getOutputVarForReturn(ret.name)"
                placeholder="接收变量名"
                @change="(e: any) => handleOutputMappingChange(ret.name, e.target.value)"
              />
            </div>
          </div>
          <div v-else class="card-empty">目标工作流未定义出参</div>
        </div>
      </Spin>
    </template>
  </div>
</template>

<style scoped>
.ref-workflow-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.wf-desc {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

/* 映射卡片 */
.mapping-card {
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 4px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  background: hsl(var(--accent) / 40%);
  border-bottom: 1px solid hsl(var(--border) / 50%);
}

.card-header-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.card-icon {
  width: 14px;
  height: 14px;
}

.card-icon.input-icon {
  color: #1677ff;
}

.card-icon.output-icon {
  color: #52c41a;
}

.card-title {
  font-size: 13px;
  font-weight: 600;
  color: hsl(var(--foreground));
}

.card-count {
  font-size: 11px;
  line-height: 1;
  min-width: 0;
  padding: 1px 6px;
  border-radius: 10px;
}

.card-body {
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.card-empty {
  padding: 12px;
  text-align: center;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

/* 单行映射 */
.mapping-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.row-label {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  min-width: 80px;
  max-width: 45%;
}

.mapping-name {
  font-size: 12px;
  font-weight: 500;
  font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
  color: hsl(var(--foreground));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.required-mark {
  color: #ff4d4f;
  margin-left: 1px;
}

.type-tag {
  font-size: 10px;
  line-height: 1;
  padding: 1px 4px;
  border-radius: 3px;
  color: hsl(var(--muted-foreground));
  flex-shrink: 0;
}

.info-icon {
  width: 14px;
  height: 14px;
  color: hsl(var(--muted-foreground));
  cursor: help;
  flex-shrink: 0;
  transition: color 0.15s;
}

.info-icon:hover {
  color: hsl(var(--primary));
}

.row-input {
  flex: 1;
  min-width: 0;
}
</style>
