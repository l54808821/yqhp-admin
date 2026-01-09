<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { message, Spin } from 'ant-design-vue';

import type { Workflow } from '#/api/workflow';

import { getWorkflowApi, updateWorkflowApi, validateWorkflowDefinitionApi } from '#/api/workflow';

import PropertyPanel from './PropertyPanel.vue';
import Toolbar from './Toolbar.vue';
import WorkflowTreeEditor from './WorkflowTreeEditor.vue';
import type { StepNode } from './WorkflowTreeEditor.vue';

const route = useRoute();
const router = useRouter();

const loading = ref(false);
const saving = ref(false);
const workflow = ref<Workflow | null>(null);
const selectedNode = ref<StepNode | null>(null);
const workflowDefinition = ref<{ name: string; steps: StepNode[] }>({ name: '', steps: [] });
const historyStack = ref<string[]>([]);
const historyIndex = ref(-1);

const workflowId = computed(() => {
  // 支持新旧两种路由格式
  return Number(route.params.workflowId || route.params.id);
});

const projectId = computed(() => Number(route.params.projectId) || 0);

onMounted(async () => {
  await loadWorkflow();
});

watch(
  () => [route.params.workflowId, route.params.id],
  async () => {
    await loadWorkflow();
  },
);

async function loadWorkflow() {
  if (!workflowId.value) return;
  try {
    loading.value = true;
    workflow.value = await getWorkflowApi(workflowId.value);
    if (workflow.value?.definition) {
      try {
        workflowDefinition.value = JSON.parse(workflow.value.definition);
      } catch {
        workflowDefinition.value = { name: workflow.value.name, steps: [] };
      }
    }
    // 初始化历史记录
    pushHistory();
  } catch {
    message.error('加载工作流失败');
    handleBack();
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
}

function undo() {
  if (historyIndex.value > 0) {
    historyIndex.value--;
    workflowDefinition.value = JSON.parse(historyStack.value[historyIndex.value]!);
    selectedNode.value = null;
  }
}

function redo() {
  if (historyIndex.value < historyStack.value.length - 1) {
    historyIndex.value++;
    workflowDefinition.value = JSON.parse(historyStack.value[historyIndex.value]!);
    selectedNode.value = null;
  }
}

const canUndo = computed(() => historyIndex.value > 0);
const canRedo = computed(() => historyIndex.value < historyStack.value.length - 1);

async function handleSave() {
  if (!workflow.value) return;
  try {
    saving.value = true;

    // 验证工作流
    const validationResult = await validateWorkflowDefinitionApi(
      JSON.stringify(workflowDefinition.value)
    );
    if (!validationResult.valid && validationResult.errors?.length) {
      message.warning(`验证警告: ${validationResult.errors.map(e => e.message).join(', ')}`);
    }

    await updateWorkflowApi(workflow.value.id, {
      definition: JSON.stringify(workflowDefinition.value),
    });
    message.success('保存成功');
  } catch {
    message.error('保存失败');
  } finally {
    saving.value = false;
  }
}

function handleBack() {
  if (projectId.value) {
    router.push(`/project/${projectId.value}/workflow`);
  } else {
    router.push({ name: 'WorkflowList' });
  }
}

function handleNodeSelect(node: StepNode | null) {
  selectedNode.value = node;
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
</script>

<template>
  <div class="workflow-editor h-full flex flex-col">
    <Spin :spinning="loading" class="h-full">
      <Toolbar
        :workflow="workflow"
        :saving="saving"
        :can-undo="canUndo"
        :can-redo="canRedo"
        @save="handleSave"
        @back="handleBack"
        @undo="undo"
        @redo="redo"
      />
      <div class="flex-1 flex overflow-hidden">
        <WorkflowTreeEditor
          :definition="workflowDefinition"
          @update="handleDefinitionUpdate"
          @select="handleNodeSelect"
        />
        <PropertyPanel
          :node="selectedNode"
          @update="handleNodeUpdate"
        />
      </div>
    </Spin>
  </div>
</template>

<style scoped>
.workflow-editor {
  background: hsl(var(--background));
}

.workflow-editor :deep(.workflow-tree-editor) {
  flex: 1;
  min-width: 400px;
}
</style>
