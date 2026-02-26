<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { createIconifyIcon } from '@vben/icons';
import { message, Modal, Spin } from 'ant-design-vue';

import type { Workflow } from '#/api/workflow';
import { getWorkflowApi, updateWorkflowApi, validateWorkflowDefinitionApi } from '#/api/workflow';
import SplitPane from '#/components/SplitPane.vue';
import { useCategoryStore } from '#/store/category';
import { useProjectStore } from '#/store/project';

const XIcon = createIconifyIcon('lucide:x');
const SparklesIcon = createIconifyIcon('lucide:sparkles');
const SettingsIcon = createIconifyIcon('lucide:settings-2');

import PropertyPanel from '../editor/PropertyPanel.vue';
import WorkflowTreeEditor from '../editor/WorkflowTreeEditor.vue';
import type { StepNode } from '../editor/WorkflowTreeEditor.vue';

import ExecutionModal from './ExecutionModal.vue';
import EditorToolbar from './EditorToolbar.vue';
import DebugContextDrawer from './DebugContextDrawer.vue';
import { AIChatPanel } from './ai-workflow-chat';
import type { WorkflowParam } from './WorkflowParamsPanel.vue';
import type { WorkflowReturn } from './WorkflowReturnsPanel.vue';
import type { ExecutorConfig } from '#/api/executor';
import type { PerformanceConfig } from '#/api/workflow/performance';
import { createExecutionApi } from '#/api/execution';
import { updateWorkflowStatusApi } from '#/api/workflow';

interface Props {
  workflowId: number;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'modified', modified: boolean): void;
  (e: 'titleChange', title: string): void;
}>();

const router = useRouter();
const categoryStore = useCategoryStore();
const projectStore = useProjectStore();

const loading = ref(false);
const saving = ref(false);
const workflow = ref<Workflow | null>(null);
const selectedNode = ref<StepNode | null>(null);
const debugModalOpen = ref(false);
const debugContextDrawerOpen = ref(false);
const debugRunning = ref(false);

const chatPanelEnabled = ref(false);
const activeRightTab = ref<'property' | 'chat'>('property');

const isAIWorkflow = computed(() => workflow.value?.workflow_type === 'ai_workflow');

const showRightPanel = computed(() => !!selectedNode.value || chatPanelEnabled.value);

const effectiveTab = computed(() => {
  if (activeRightTab.value === 'property' && selectedNode.value) return 'property';
  if (activeRightTab.value === 'chat' && chatPanelEnabled.value) return 'chat';
  if (selectedNode.value) return 'property';
  if (chatPanelEnabled.value) return 'chat';
  return null;
});
interface WorkflowDefinitionData {
  name: string;
  variables?: Record<string, any>;
  params?: WorkflowParam[];
  returns?: WorkflowReturn[];
  executorConfig?: ExecutorConfig | null;
  performanceConfig?: PerformanceConfig | null;
  steps: StepNode[];
}

const workflowDefinition = ref<WorkflowDefinitionData>({ name: '', steps: [] });
const historyStack = ref<string[]>([]);
const historyIndex = ref(-1);
const isModified = ref(false);

// 树形编辑器状态（提升到父组件避免切换时丢失）
const treeExpandedKeys = ref<string[]>([]);
const treeSelectedKeys = ref<string[]>([]);
const treeCheckedKeys = ref<string[]>([]);  // 勾选的步骤 ID

// 初始快照，用于判断是否修改
const initialSnapshot = ref('');

// 后端格式转前端格式
function backendToFrontend(steps: any[]): StepNode[] {
  if (!steps) return [];
  return steps.map((step: any) => {
    const node: StepNode = {
      id: step.id,
      type: step.type,
      name: step.name,
      disabled: step.disabled,
      config: step.config,
      loop: step.loop,
    };
    // HTTP 节点：复制前后置处理器
    if (step.type === 'http') {
      if (step.preProcessors?.length) {
        node.preProcessors = step.preProcessors;
      }
      if (step.postProcessors?.length) {
        node.postProcessors = step.postProcessors;
      }
    }
    // loop：children 直接使用
    if (step.type === 'loop' && step.children?.length) {
      node.children = backendToFrontend(step.children);
    }
    // condition：使用 branches（不兼容旧 children/config.type）
    if (step.type === 'condition' && step.branches?.length) {
      node.branches = step.branches.map((br: any) => ({
        id: br.id,
        name: br.name,
        kind: br.kind,
        expression: br.expression,
        steps: backendToFrontend(br.steps || []),
      }));
    }
    return node;
  });
}

// 前端格式转后端格式
function frontendToBackend(steps: StepNode[]): any[] {
  if (!steps) return [];
  return steps.map((step) => {
    const node: any = {
      id: step.id,
      type: step.type,
      name: step.name,
    };

    // 复制 disabled 状态
    if (step.disabled !== undefined) {
      node.disabled = step.disabled;
    }

    // 复制 config
    if (step.config) {
      node.config = step.config;
    }

    // HTTP 节点：复制前后置处理器
    if (step.type === 'http') {
      if (step.preProcessors?.length) {
        node.preProcessors = step.preProcessors;
      }
      if (step.postProcessors?.length) {
        node.postProcessors = step.postProcessors;
      }
    }

    // 条件节点：只使用 branches 新结构
    if (step.type === 'condition') {
      node.branches = (step.branches || []).map((br: any) => ({
        id: br.id,
        name: br.name,
        kind: br.kind,
        expression: br.expression,
        steps: frontendToBackend(br.steps || []),
      }));
    }

    // 循环节点：直接使用与后端一致的字段结构
    if (step.type === 'loop') {
      node.loop = {
        mode: step.loop?.mode || 'for',
        count: step.loop?.count || 0,
        items: step.loop?.items || '',
        item_var: step.loop?.item_var || '',
        condition: step.loop?.condition || '',
        max_iterations: step.loop?.max_iterations || 0,
        break_condition: step.loop?.break_condition || '',
        continue_condition: step.loop?.continue_condition || '',
      };
      // 循环的子步骤放在 children 中
      if (step.children?.length) {
        node.children = frontendToBackend(step.children);
      }
    }

    return node;
  });
}

onMounted(async () => {
  await loadWorkflow();
});

watch(
  () => props.workflowId,
  async () => {
    await loadWorkflow();
  },
);

async function loadWorkflow() {
  if (!props.workflowId) return;
  try {
    loading.value = true;
    workflow.value = await getWorkflowApi(props.workflowId);
    if (workflow.value?.definition) {
      try {
        const parsed = JSON.parse(workflow.value.definition);
        workflowDefinition.value = {
          name: parsed.name || '',
          variables: parsed.variables || {},
          params: parsed.params || [],
          returns: parsed.returns || [],
          executorConfig: parsed.executorConfig || null,
          performanceConfig: parsed.performanceConfig || null,
          steps: backendToFrontend(parsed.steps || []),
        };
      } catch {
        workflowDefinition.value = { name: workflow.value.name, variables: {}, params: [], returns: [], executorConfig: null, performanceConfig: null, steps: [] };
      }
    }
    // 初始化历史记录
    initialSnapshot.value = JSON.stringify(workflowDefinition.value);
    historyStack.value = [initialSnapshot.value];
    historyIndex.value = 0;
    isModified.value = false;
    selectedNode.value = null;
    chatPanelEnabled.value = false;
    emit('modified', false);
    emit('titleChange', workflow.value?.name || '');
  } catch {
    message.error('加载工作流失败');
  } finally {
    loading.value = false;
  }
}

function pushHistory() {
  const snapshot = JSON.stringify(workflowDefinition.value);
  // 如果当前不在历史末尾，删除后面的记录
  if (historyIndex.value < historyStack.value.length - 1) {
    historyStack.value = historyStack.value.slice(0, historyIndex.value + 1);
  }
  historyStack.value.push(snapshot);
  historyIndex.value = historyStack.value.length - 1;

  // 检查是否修改
  const modified = snapshot !== initialSnapshot.value;
  if (modified !== isModified.value) {
    isModified.value = modified;
    emit('modified', modified);
  }
}

function undo() {
  if (historyIndex.value > 0) {
    historyIndex.value--;
    workflowDefinition.value = JSON.parse(historyStack.value[historyIndex.value]!);
    if (selectedNode.value) {
      const node = findNodeById(workflowDefinition.value.steps, selectedNode.value.id);
      if (node) {
        selectedNode.value = node;
      } else {
        selectedNode.value = null;
        treeSelectedKeys.value = [];
      }
    }
    checkModified();
  }
}

function redo() {
  if (historyIndex.value < historyStack.value.length - 1) {
    historyIndex.value++;
    workflowDefinition.value = JSON.parse(historyStack.value[historyIndex.value]!);
    if (selectedNode.value) {
      const node = findNodeById(workflowDefinition.value.steps, selectedNode.value.id);
      if (node) {
        selectedNode.value = node;
      } else {
        selectedNode.value = null;
        treeSelectedKeys.value = [];
      }
    }
    checkModified();
  }
}

// 根据 ID 查找节点（支持 condition.branches[].steps）
function findNodeById(steps: StepNode[], id: string): StepNode | null {
  for (const step of steps) {
    if (step.id === id) return step;

    // condition：递归到分支 steps
    if (step.type === 'condition' && step.branches?.length) {
      for (const br of step.branches) {
        const found = findNodeById(br.steps || [], id);
        if (found) return found;
      }
    }

    // loop/其它：递归 children
    if (step.children?.length) {
      const found = findNodeById(step.children, id);
      if (found) return found;
    }
  }
  return null;
}

function checkModified() {
  const snapshot = JSON.stringify(workflowDefinition.value);
  const modified = snapshot !== initialSnapshot.value;
  if (modified !== isModified.value) {
    isModified.value = modified;
    emit('modified', modified);
  }
}

const canUndo = computed(() => historyIndex.value > 0);
const canRedo = computed(() => historyIndex.value < historyStack.value.length - 1);

async function handleSave() {
  if (!workflow.value) return;
  try {
    saving.value = true;

    // 转换为后端格式
    const backendDefinition: Record<string, any> = {
      name: workflowDefinition.value.name,
      steps: frontendToBackend(workflowDefinition.value.steps),
    };
    if (workflowDefinition.value.variables && Object.keys(workflowDefinition.value.variables).length > 0) {
      backendDefinition.variables = workflowDefinition.value.variables;
    }
    if (workflowDefinition.value.params && workflowDefinition.value.params.length > 0) {
      backendDefinition.params = workflowDefinition.value.params;
    }
    if (workflowDefinition.value.returns && workflowDefinition.value.returns.length > 0) {
      backendDefinition.returns = workflowDefinition.value.returns;
    }
    if (workflowDefinition.value.executorConfig) {
      backendDefinition.executorConfig = workflowDefinition.value.executorConfig;
    }
    if (workflowDefinition.value.performanceConfig) {
      backendDefinition.performanceConfig = workflowDefinition.value.performanceConfig;
    }

    // 验证工作流
    const validationResult = await validateWorkflowDefinitionApi(
      JSON.stringify(backendDefinition)
    );
    if (!validationResult.valid && validationResult.errors?.length) {
      message.warning(`验证警告: ${validationResult.errors.map(e => e.message).join(', ')}`);
    }

    await updateWorkflowApi(workflow.value.id, {
      definition: JSON.stringify(backendDefinition),
    });
    message.success('保存成功');

    // 更新初始快照
    initialSnapshot.value = JSON.stringify(workflowDefinition.value);
    isModified.value = false;
    emit('modified', false);
  } catch {
    message.error('保存失败');
  } finally {
    saving.value = false;
  }
}

function handleNodeSelect(node: StepNode | null) {
  selectedNode.value = node;
  if (node) {
    activeRightTab.value = 'property';
  }
  treeSelectedKeys.value = node ? [node.id] : [];
}

function handleExpandedKeysChange(keys: string[]) {
  treeExpandedKeys.value = keys;
}

function handleSelectedKeysChange(keys: string[]) {
  treeSelectedKeys.value = keys;
}

function closePropertyTab() {
  selectedNode.value = null;
  treeSelectedKeys.value = [];
}

function closeChatTab() {
  chatPanelEnabled.value = false;
}

function handleDefinitionUpdate(def: { name: string; steps: StepNode[] }) {
  workflowDefinition.value = { ...workflowDefinition.value, ...def };
  pushHistory();
}

function handleVariablesUpdate(variables: Record<string, any>) {
  workflowDefinition.value = { ...workflowDefinition.value, variables };
  pushHistory();
}

function handleParamsUpdate(params: WorkflowParam[]) {
  workflowDefinition.value = { ...workflowDefinition.value, params };
  pushHistory();
}

function handleReturnsUpdate(returns: WorkflowReturn[]) {
  workflowDefinition.value = { ...workflowDefinition.value, returns };
  pushHistory();
}

function handleExecutorConfigUpdate(config: ExecutorConfig | null) {
  workflowDefinition.value = { ...workflowDefinition.value, executorConfig: config };
  pushHistory();
}

function handlePerformanceConfigUpdate(config: PerformanceConfig | null) {
  workflowDefinition.value = { ...workflowDefinition.value, performanceConfig: config };
  pushHistory();
}

function handleNodeUpdate(node: any) {
  // condition_branch 是虚拟节点，需要把内部的 branch 写回所属的 condition.branches 中
  if (node?.type === 'condition_branch' && node.parentConditionId && node.branch?.id) {
    const updated = updateConditionBranch(
      workflowDefinition.value.steps,
      node.parentConditionId,
      node.branch,
    );
    if (updated) {
      pushHistory();
    }
    return;
  }

  // 普通步骤：按 ID 直接更新
  updateNodeInSteps(workflowDefinition.value.steps, node as StepNode);
  pushHistory();
}

// 处理节点删除（主要用于分支删除）
function handleNodeDelete(node: any) {
  if (!node) return;

  // condition_branch 是虚拟节点，需要从所属的 condition.branches 中删除
  if (node?.type === 'condition_branch' && node.parentConditionId && node.branch?.id) {
    const deleted = deleteConditionBranch(
      workflowDefinition.value.steps,
      node.parentConditionId,
      node.branch.id,
    );
    if (deleted) {
      selectedNode.value = null;
      treeSelectedKeys.value = [];
      pushHistory();
    }
    return;
  }

  // 普通步骤删除：按 ID 删除
  const deleted = deleteNodeFromSteps(workflowDefinition.value.steps, node.id);
  if (deleted) {
    selectedNode.value = null;
    treeSelectedKeys.value = [];
    pushHistory();
  }
}

// 从 condition 节点的 branches 中删除指定分支
function deleteConditionBranch(
  steps: StepNode[],
  conditionId: string,
  branchId: string,
): boolean {
  for (const step of steps) {
    if (step.id === conditionId && step.type === 'condition' && step.branches?.length) {
      const index = step.branches.findIndex((br: any) => br.id === branchId);
      if (index !== -1) {
        step.branches.splice(index, 1);
        return true;
      }
    }

    // 递归 condition.branches[].steps
    if (step.type === 'condition' && step.branches?.length) {
      for (const br of step.branches) {
        if (br.steps?.length && deleteConditionBranch(br.steps, conditionId, branchId)) {
          return true;
        }
      }
    }

    // 递归 children（loop 等）
    if (step.children?.length && deleteConditionBranch(step.children, conditionId, branchId)) {
      return true;
    }
  }
  return false;
}

// 从 steps 中删除指定节点
function deleteNodeFromSteps(steps: StepNode[], nodeId: string): boolean {
  for (let i = 0; i < steps.length; i++) {
    if (steps[i]!.id === nodeId) {
      steps.splice(i, 1);
      return true;
    }

    const step = steps[i]!;

    // condition：递归到分支 steps
    if (step.type === 'condition' && step.branches?.length) {
      for (const br of step.branches) {
        if (br.steps?.length && deleteNodeFromSteps(br.steps, nodeId)) {
          return true;
        }
      }
    }

    // loop/其它：递归 children
    if (step.children?.length && deleteNodeFromSteps(step.children, nodeId)) {
      return true;
    }
  }
  return false;
}

function updateNodeInSteps(steps: StepNode[], updatedNode: StepNode): boolean {
  for (let i = 0; i < steps.length; i++) {
    if (steps[i]!.id === updatedNode.id) {
      steps[i] = updatedNode;
      return true;
    }

    const step = steps[i]!;

    // condition：递归到分支 steps
    if (step.type === 'condition' && step.branches?.length) {
      for (const br of step.branches) {
        if (br.steps?.length) {
          if (updateNodeInSteps(br.steps, updatedNode)) {
            return true;
          }
        }
      }
    }

    // loop/其它：递归 children
    if (step.children?.length) {
      if (updateNodeInSteps(step.children, updatedNode)) {
        return true;
      }
    }
  }
  return false;
}

// 在 steps 树中查找指定 condition 节点，并更新其 branches 中的某个分支
function updateConditionBranch(
  steps: StepNode[],
  conditionId: string,
  updatedBranch: any,
): boolean {
  for (const step of steps) {
    if (step.id === conditionId && step.type === 'condition' && step.branches?.length) {
      const index = step.branches.findIndex((br: any) => br.id === updatedBranch.id);
      const old = step.branches[index];
      if (index !== -1 && old) {
        // 只替换分支的核心字段，保留 steps 等结构
        step.branches[index] = {
          ...old,
          ...updatedBranch,
          id: old.id, // 保持分支 ID 不变
        };
        return true;
      }
    }

    // 递归 condition.branches[].steps
    if (step.type === 'condition' && step.branches?.length) {
      for (const br of step.branches) {
        if (br.steps?.length && updateConditionBranch(br.steps, conditionId, updatedBranch)) {
          return true;
        }
      }
    }

    // 递归 children（loop 等）
    if (step.children?.length && updateConditionBranch(step.children, conditionId, updatedBranch)) {
      return true;
    }
  }
  return false;
}

// 更新工作流名称（供外部调用，如左侧树重命名时同步）
function updateWorkflowName(newName: string) {
  if (workflow.value) {
    workflow.value.name = newName;
  }
  workflowDefinition.value.name = newName;
}

// 暴露方法给父组件
defineExpose({
  save: handleSave,
  isModified: () => isModified.value,
  updateWorkflowName,
});

// 执行相关
function handleExecute() {
  if (isModified.value) {
    message.warning('请先保存工作流');
    return;
  }

  if (!projectStore.currentEnvId) {
    message.warning('请先在右上角选择执行环境');
    return;
  }

  const executorCfg = workflowDefinition.value.executorConfig;
  if (!executorCfg || !executorCfg.strategy || executorCfg.strategy === 'local') {
    message.warning('请先在「其他配置」中配置执行策略');
    return;
  }

  const envId = projectStore.currentEnvId!;
  const workflowId = workflow.value!.id;

  Modal.confirm({
    title: '确认执行',
    content: '确定要执行该工作流吗？',
    okText: '执行',
    cancelText: '取消',
    onOk: async () => {
      try {
        const execution = await createExecutionApi({
          workflow_id: workflowId,
          env_id: envId,
          executor_id:
            executorCfg.strategy === 'manual'
              ? (executorCfg.executor_id ?? undefined)
              : undefined,
          mode: 'execute',
          performance_config:
            workflowDefinition.value.performanceConfig || undefined,
        });
        message.success('执行已提交');
        handleExecuteSuccess(execution.id);
      } catch {
        message.error('提交执行失败');
      }
    },
  });
}

function handleExecuteSuccess(executionId: number) {
  if (workflow.value?.workflow_type === 'performance') {
    router.push({ name: 'ExecutionReport', params: { executionId: String(executionId) } });
  } else {
    router.push({ name: 'ExecutionDetail', params: { executionId: String(executionId) } });
  }
}

// 调试相关
const executionModalRef = ref<InstanceType<typeof ExecutionModal> | null>(null);

function handleDebug() {
  // 重新调试：重置 ExecutionModal 的状态
  executionModalRef.value?.resetForNewExecution();
  debugModalOpen.value = true;
}

function handleShowDebugPanel() {
  // 仅打开面板查看进度，不重新启动
  debugModalOpen.value = true;
}

function handleCheckedKeysChange(keys: string[]) {
  treeCheckedKeys.value = keys;
}

function handleDebugComplete() {
  debugRunning.value = false;
}

function handleDebugStarted() {
  debugRunning.value = true;
}

function handleViewDebugContext() {
  debugContextDrawerOpen.value = true;
}

// AI 工作流：对话调试
function handleChatDebug() {
  if (chatPanelEnabled.value && activeRightTab.value === 'chat') {
    chatPanelEnabled.value = false;
  } else {
    chatPanelEnabled.value = true;
    activeRightTab.value = 'chat';
  }
}

// AI 工作流：发布
async function handlePublish() {
  if (!workflow.value) return;
  if (isModified.value) {
    message.warning('请先保存工作流');
    return;
  }
  try {
    await updateWorkflowStatusApi(workflow.value.id, 1);
    workflow.value.status = 1;
    message.success('发布成功');
    router.push({
      name: 'AIWorkflowApp',
      params: { workflowId: String(workflow.value.id) },
    });
  } catch {
    message.error('发布失败');
  }
}

// 处理重命名
async function handleRename(newName: string) {
  if (!workflow.value) return;
  try {
    await updateWorkflowApi(workflow.value.id, { name: newName });
    workflow.value.name = newName;
    workflowDefinition.value.name = newName;
    // 刷新分类树（后端已同步更新分类名称）
    await categoryStore.loadCategories(workflow.value.project_id);
    emit('titleChange', newName);
    message.success('重命名成功');
  } catch {
    message.error('重命名失败');
  }
}
</script>

<template>
  <div class="workflow-editor">
    <EditorToolbar
      :workflow="workflow"
      :saving="saving"
      :can-undo="canUndo"
      :can-redo="canRedo"
      :modified="isModified"
      :debug-running="debugRunning"
      :chat-active="chatPanelEnabled"
      @save="handleSave"
      @undo="undo"
      @redo="redo"
      @execute="handleExecute"
      @debug="handleDebug"
      @view-debug-context="handleViewDebugContext"
      @show-debug-panel="handleShowDebugPanel"
      @rename="handleRename"
      @chat-debug="handleChatDebug"
      @publish="handlePublish"
    />
    <div class="editor-main">
      <Spin :spinning="loading" class="editor-spin">
        <SplitPane
          v-if="showRightPanel"
          :default-width="450"
          :min-width="300"
          :max-width="800"
          storage-key="workflow-editor-split"
        >
          <template #left>
            <WorkflowTreeEditor
              :definition="workflowDefinition"
              :expanded-keys="treeExpandedKeys"
              :selected-keys="treeSelectedKeys"
              :checked-keys="treeCheckedKeys"
              :project-id="workflow?.project_id"
              :workflow-id="workflow?.id"
              :workflow-type="workflow?.workflow_type"
              @update="handleDefinitionUpdate"
              @select="handleNodeSelect"
              @update:expanded-keys="handleExpandedKeysChange"
              @update:selected-keys="handleSelectedKeysChange"
              @update:checked-keys="handleCheckedKeysChange"
              @update:variables="handleVariablesUpdate"
              @update:params="handleParamsUpdate"
              @update:returns="handleReturnsUpdate"
              @update:executor-config="handleExecutorConfigUpdate"
              @update:performance-config="handlePerformanceConfigUpdate"
            />
          </template>
          <template #right>
            <div class="right-tab-panel">
              <div class="tab-bar">
                <div
                  v-if="selectedNode"
                  class="tab-item"
                  :class="{ 'tab-item--active': effectiveTab === 'property' }"
                  @click="activeRightTab = 'property'"
                >
                  <SettingsIcon class="tab-item-icon" />
                  <span class="tab-item-label">节点属性</span>
                  <button class="tab-close" @click.stop="closePropertyTab">
                    <XIcon class="size-3" />
                  </button>
                </div>
                <div
                  v-if="chatPanelEnabled"
                  class="tab-item"
                  :class="{ 'tab-item--active': effectiveTab === 'chat' }"
                  @click="activeRightTab = 'chat'"
                >
                  <SparklesIcon class="tab-item-icon" />
                  <span class="tab-item-label">AI 对话</span>
                  <button class="tab-close" @click.stop="closeChatTab">
                    <XIcon class="size-3" />
                  </button>
                </div>
              </div>
              <div class="tab-content">
                <PropertyPanel
                  v-show="effectiveTab === 'property'"
                  :node="selectedNode"
                  :env-id="projectStore.currentEnvId"
                  :workflow-id="workflow?.id"
                  :project-id="workflow?.project_id"
                  @update="handleNodeUpdate"
                  @close="closePropertyTab"
                  @delete="handleNodeDelete"
                />
                <AIChatPanel
                  v-if="isAIWorkflow && workflow"
                  v-show="effectiveTab === 'chat'"
                  :workflow="workflow"
                  :env-id="projectStore.currentEnvId"
                  compact
                  :persist-conversation="false"
                />
              </div>
            </div>
          </template>
        </SplitPane>
        <WorkflowTreeEditor
          v-else
          :definition="workflowDefinition"
          :expanded-keys="treeExpandedKeys"
          :selected-keys="treeSelectedKeys"
          :checked-keys="treeCheckedKeys"
          :project-id="workflow?.project_id"
          :workflow-id="workflow?.id"
          :workflow-type="workflow?.workflow_type"
          @update="handleDefinitionUpdate"
          @select="handleNodeSelect"
          @update:expanded-keys="handleExpandedKeysChange"
          @update:selected-keys="handleSelectedKeysChange"
          @update:checked-keys="handleCheckedKeysChange"
          @update:variables="handleVariablesUpdate"
          @update:params="handleParamsUpdate"
          @update:returns="handleReturnsUpdate"
          @update:executor-config="handleExecutorConfigUpdate"
          @update:performance-config="handlePerformanceConfigUpdate"
        />
      </Spin>
    </div>

    <!-- 执行对话框（调试模式：不入库） -->
    <ExecutionModal
      ref="executionModalRef"
      v-model:open="debugModalOpen"
      :workflow="workflow"
      :definition="workflowDefinition"
      :selected-steps="treeCheckedKeys"
      :persist="false"
      @complete="handleDebugComplete"
      @started="handleDebugStarted"
      @disconnected="handleDebugComplete"
    />

    <!-- 调试结果抽屉（查看缓存的执行结果和变量） -->
    <DebugContextDrawer
      v-if="workflow"
      v-model:open="debugContextDrawerOpen"
      :workflow-id="workflow.id"
    />

  </div>
</template>

<style scoped>
.workflow-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background: hsl(var(--background));
}

.editor-main {
  flex: 1;
  position: relative;
  overflow: hidden;
  width: 100%;
  min-height: 0;
}

.editor-spin {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.editor-spin :deep(.ant-spin-nested-loading) {
  width: 100%;
  height: 100%;
}

.editor-spin :deep(.ant-spin-container) {
  width: 100%;
  height: 100%;
}

.editor-spin :deep(.split-pane) {
  width: 100%;
  height: 100%;
}

.editor-spin :deep(.workflow-tree-editor) {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
}

.editor-spin :deep(.property-panel) {
  width: 100%;
  height: 100%;
  min-height: 0;
}

/* Right tab panel */
.right-tab-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  min-height: 0;
}

.tab-bar {
  display: flex;
  align-items: stretch;
  border-bottom: 1px solid hsl(var(--border));
  background: hsl(var(--background));
  flex-shrink: 0;
  height: 36px;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 6px 0 12px;
  font-size: 13px;
  color: hsl(var(--foreground) / 60%);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
  user-select: none;
  white-space: nowrap;
}

.tab-item:hover {
  color: hsl(var(--foreground) / 85%);
  background: hsl(var(--accent) / 20%);
}

.tab-item--active {
  color: hsl(var(--foreground));
  border-bottom-color: hsl(var(--primary));
}

.tab-item-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.tab-item-label {
  overflow: hidden;
  text-overflow: ellipsis;
}

.tab-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  color: hsl(var(--foreground) / 40%);
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.15s, background 0.15s, color 0.15s;
}

.tab-item:hover .tab-close {
  opacity: 1;
}

.tab-close:hover {
  background: hsl(var(--foreground) / 10%);
  color: hsl(var(--foreground) / 80%);
}

.tab-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  position: relative;
}

.tab-content :deep(.property-panel) {
  width: 100%;
  height: 100%;
  min-height: 0;
}

.tab-content :deep(.ai-chat-panel) {
  width: 100%;
  height: 100%;
}
</style>
