<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { message, Spin } from 'ant-design-vue';

import type { Workflow } from '#/api/workflow';
import { getWorkflowApi, updateWorkflowApi, validateWorkflowDefinitionApi } from '#/api/workflow';
import SplitPane from '#/components/SplitPane.vue';

import PropertyPanel from '../editor/PropertyPanel.vue';
import WorkflowTreeEditor from '../editor/WorkflowTreeEditor.vue';
import type { StepNode } from '../editor/WorkflowTreeEditor.vue';

import DebugModal from './DebugModal.vue';
import EditorToolbar from './EditorToolbar.vue';
import ExecuteModal from './ExecuteModal.vue';

interface Props {
  workflowId: number;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'modified', modified: boolean): void;
  (e: 'titleChange', title: string): void;
}>();

const router = useRouter();

const loading = ref(false);
const saving = ref(false);
const workflow = ref<Workflow | null>(null);
const selectedNode = ref<StepNode | null>(null);
const executeModalOpen = ref(false);
const debugModalOpen = ref(false);
const showPropertyPanel = ref(false);
const workflowDefinition = ref<{ name: string; steps: StepNode[] }>({ name: '', steps: [] });
const historyStack = ref<string[]>([]);
const historyIndex = ref(-1);
const isModified = ref(false);

// 树形编辑器状态（提升到父组件避免切换时丢失）
const treeExpandedKeys = ref<string[]>([]);
const treeSelectedKeys = ref<string[]>([]);
const treeCheckedKeys = ref<string[]>([]);  // 勾选的步骤 ID

// 初始快照，用于判断是否修改
const initialSnapshot = ref('');

// 后端格式转前端格式（将 condition.then/loop 转为 children）
function backendToFrontend(steps: any[]): StepNode[] {
  if (!steps) return [];
  return steps.map((step: any) => {
    const node: StepNode = {
      id: step.id,
      type: step.type,
      name: step.name,
      config: step.config,
      condition: step.condition,
      loop: step.loop,
    };
    // 条件节点：将 then 分支作为 children 显示
    if (step.type === 'condition' && step.condition) {
      node.children = backendToFrontend(step.condition.then || []);
    }
    // 循环节点：需要从某个地方获取子步骤（后端可能用 steps 字段）
    if (step.type === 'loop') {
      node.children = backendToFrontend(step.children || []);
    }
    return node;
  });
}

// 前端格式转后端格式（将 children 转为 condition.then）
function frontendToBackend(steps: StepNode[]): any[] {
  if (!steps) return [];
  return steps.map((step) => {
    const node: any = {
      id: step.id,
      type: step.type,
      name: step.name,
    };

    // 复制 config（非条件/循环节点）
    if (step.config) {
      node.config = step.config;
    }

    // 条件节点
    if (step.type === 'condition') {
      node.condition = {
        expression: step.condition?.expression || '',
        then: frontendToBackend(step.children || []),
        else: frontendToBackend(step.condition?.else || []),
      };
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
          steps: backendToFrontend(parsed.steps || []),
        };
      } catch {
        workflowDefinition.value = { name: workflow.value.name, steps: [] };
      }
    }
    // 初始化历史记录
    initialSnapshot.value = JSON.stringify(workflowDefinition.value);
    historyStack.value = [initialSnapshot.value];
    historyIndex.value = 0;
    isModified.value = false;
    selectedNode.value = null;
    showPropertyPanel.value = false;
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
    // 尝试保持当前选中的节点（如果节点还存在）
    if (selectedNode.value) {
      const node = findNodeById(workflowDefinition.value.steps, selectedNode.value.id);
      if (node) {
        selectedNode.value = node;
      } else {
        selectedNode.value = null;
        showPropertyPanel.value = false;
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
    // 尝试保持当前选中的节点（如果节点还存在）
    if (selectedNode.value) {
      const node = findNodeById(workflowDefinition.value.steps, selectedNode.value.id);
      if (node) {
        selectedNode.value = node;
      } else {
        selectedNode.value = null;
        showPropertyPanel.value = false;
        treeSelectedKeys.value = [];
      }
    }
    checkModified();
  }
}

// 根据 ID 查找节点
function findNodeById(steps: StepNode[], id: string): StepNode | null {
  for (const step of steps) {
    if (step.id === id) return step;
    if (step.children) {
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
    const backendDefinition = {
      name: workflowDefinition.value.name,
      steps: frontendToBackend(workflowDefinition.value.steps),
    };

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
  showPropertyPanel.value = !!node;
  // 更新选中状态
  treeSelectedKeys.value = node ? [node.id] : [];
}

function handleExpandedKeysChange(keys: string[]) {
  treeExpandedKeys.value = keys;
}

function handleSelectedKeysChange(keys: string[]) {
  treeSelectedKeys.value = keys;
}

function handleClosePropertyPanel() {
  showPropertyPanel.value = false;
  selectedNode.value = null;
}

function handleDefinitionUpdate(def: { name: string; steps: StepNode[] }) {
  workflowDefinition.value = def;
  pushHistory();
}

function handleNodeUpdate(node: StepNode) {
  // 更新节点
  updateNodeInSteps(workflowDefinition.value.steps, node);
  pushHistory();
}

function updateNodeInSteps(steps: StepNode[], updatedNode: StepNode): boolean {
  for (let i = 0; i < steps.length; i++) {
    if (steps[i]!.id === updatedNode.id) {
      steps[i] = updatedNode;
      return true;
    }
    if (steps[i]!.children) {
      if (updateNodeInSteps(steps[i]!.children!, updatedNode)) {
        return true;
      }
    }
  }
  return false;
}

// 暴露保存方法给父组件
defineExpose({
  save: handleSave,
  isModified: () => isModified.value,
});

// 执行相关
function handleExecute() {
  if (isModified.value) {
    message.warning('请先保存工作流');
    return;
  }
  executeModalOpen.value = true;
}

function handleExecuteSuccess(executionId: number) {
  router.push({ name: 'ExecutionDetail', params: { executionId: String(executionId) } });
}

// 调试相关
function handleDebug() {
  // 移除保存检查，允许调试未保存的工作流
  debugModalOpen.value = true;
}

function handleCheckedKeysChange(keys: string[]) {
  treeCheckedKeys.value = keys;
}

function handleDebugComplete() {
  // 调试完成后的处理
}

// 处理重命名
async function handleRename(newName: string) {
  if (!workflow.value) return;
  try {
    await updateWorkflowApi(workflow.value.id, { name: newName });
    workflow.value.name = newName;
    workflowDefinition.value.name = newName;
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
      @save="handleSave"
      @undo="undo"
      @redo="redo"
      @execute="handleExecute"
      @debug="handleDebug"
      @rename="handleRename"
    />
    <div class="editor-main">
      <Spin :spinning="loading" class="editor-spin">
        <SplitPane
          v-if="showPropertyPanel"
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
              @update="handleDefinitionUpdate"
              @select="handleNodeSelect"
              @update:expanded-keys="handleExpandedKeysChange"
              @update:selected-keys="handleSelectedKeysChange"
              @update:checked-keys="handleCheckedKeysChange"
            />
          </template>
          <template #right>
            <PropertyPanel
              :node="selectedNode"
              @update="handleNodeUpdate"
              @close="handleClosePropertyPanel"
            />
          </template>
        </SplitPane>
        <WorkflowTreeEditor
          v-else
          :definition="workflowDefinition"
          :expanded-keys="treeExpandedKeys"
          :selected-keys="treeSelectedKeys"
          :checked-keys="treeCheckedKeys"
          @update="handleDefinitionUpdate"
          @select="handleNodeSelect"
          @update:expanded-keys="handleExpandedKeysChange"
          @update:selected-keys="handleSelectedKeysChange"
          @update:checked-keys="handleCheckedKeysChange"
        />
      </Spin>
    </div>

    <!-- 执行对话框 -->
    <ExecuteModal
      v-model:open="executeModalOpen"
      :workflow="workflow"
      @success="handleExecuteSuccess"
    />

    <!-- 调试对话框 -->
    <DebugModal
      v-model:open="debugModalOpen"
      :workflow="workflow"
      :definition="workflowDefinition"
      :selected-steps="treeCheckedKeys"
      @complete="handleDebugComplete"
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

/* SplitPane 填满容器 */
.editor-spin :deep(.split-pane) {
  width: 100%;
  height: 100%;
}

/* WorkflowTreeEditor 填满容器 */
.editor-spin :deep(.workflow-tree-editor) {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
}

/* PropertyPanel 填满容器 */
.editor-spin :deep(.property-panel) {
  width: 100%;
  height: 100%;
  min-height: 0;
}
</style>
