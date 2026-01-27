import { computed, ref, watch } from 'vue';
import type { Ref, ComputedRef } from 'vue';
import type { StepResult } from '#/api/debug';
import type { TreeNode, WorkflowDefinition } from '../types';

export interface UseStepTreeOptions {
  stepResults: Ref<StepResult[]>;
  definition?: Ref<WorkflowDefinition | undefined>;
  generateNodeKey: (result: StepResult) => string;
}

export function useStepTree(options: UseStepTreeOptions) {
  const { stepResults, definition, generateNodeKey } = options;

  const selectedStepKey = ref<string | null>(null);
  const expandedKeys = ref<string[]>([]);

  // 动态构建树结构
  const treeData = computed<TreeNode[]>(() => {
    const rootNodes: TreeNode[] = [];
    const nodeMap = new Map<string, TreeNode>();
    const parentChildMap = new Map<string, Map<number, TreeNode[]>>();

    // 从当前 workflow 定义中构建 stepId -> 分支信息 映射
    const stepToBranch = new Map<
      string,
      { conditionId: string; branchId: string; branchName: string; kind: string }
    >();

    function buildStepBranchMap(steps: any[]) {
      for (const step of steps || []) {
        if (step.type === 'condition' && step.branches?.length) {
          for (const br of step.branches) {
            const branchName = br.name || (br.kind === 'else' ? '默认' : '条件分支');
            for (const child of br.steps || []) {
              stepToBranch.set(child.id, {
                conditionId: step.id,
                branchId: br.id,
                branchName,
                kind: br.kind,
              });
              if (child.children?.length) {
                buildStepBranchMap(child.children);
              }
            }
          }
        }
        if (step.children?.length) {
          buildStepBranchMap(step.children);
        }
      }
    }

    if (definition?.value?.steps?.length) {
      buildStepBranchMap(definition.value.steps);
    }

    // 先为每个 StepResult 创建基础节点
    for (const result of stepResults.value) {
      const nodeKey = generateNodeKey(result);
      const node: TreeNode = {
        key: nodeKey,
        title: result.stepName,
        type: result.stepType || 'unknown',
        status: result.status,
        duration: result.durationMs,
        stepResult: result,
        iteration: result.iteration,
        children: [],
      };
      nodeMap.set(nodeKey, node);

      if (result.parentId) {
        const iteration = result.iteration || 0;
        if (!parentChildMap.has(result.parentId)) {
          parentChildMap.set(result.parentId, new Map());
        }
        const iterMap = parentChildMap.get(result.parentId)!;
        if (!iterMap.has(iteration)) {
          iterMap.set(iteration, []);
        }
        iterMap.get(iteration)!.push(node);
      } else {
        rootNodes.push(node);
      }
    }

    // 第二遍：根据步骤类型组织子节点结构
    for (const result of stepResults.value) {
      // 循环节点：按迭代分组
      if (result.stepType === 'loop' && parentChildMap.has(result.stepId)) {
        const nodeKey = generateNodeKey(result);
        const parentNode = nodeMap.get(nodeKey);
        if (parentNode) {
          const iterMap = parentChildMap.get(result.stepId)!;
          const iterations = Array.from(iterMap.keys()).sort((a, b) => a - b);
          for (const iter of iterations) {
            const children = iterMap.get(iter)!;
            if (iter > 0) {
              const iterNode: TreeNode = {
                key: `${result.stepId}_iteration_${iter}`,
                title: `第 ${iter} 次迭代`,
                type: 'iteration',
                status: children.every((c) => c.status === 'success')
                  ? 'success'
                  : children.some((c) => c.status === 'failed')
                    ? 'failed'
                    : children.some((c) => c.status === 'running')
                      ? 'running'
                      : 'pending',
                children: children,
              };
              parentNode.children!.push(iterNode);
            } else {
              parentNode.children!.push(...children);
            }
          }
        }
      }

      // 条件节点：直接将子步骤挂到条件节点下
      if (result.stepType === 'condition' && parentChildMap.has(result.stepId)) {
        const nodeKey = generateNodeKey(result);
        const parentNode = nodeMap.get(nodeKey);
        if (!parentNode) continue;

        const iterMap = parentChildMap.get(result.stepId)!;
        const allChildren: TreeNode[] = [];
        for (const children of iterMap.values()) {
          allChildren.push(...children);
        }

        parentNode.children!.push(...allChildren);

        // 从第一个子步骤推断命中的分支名称
        if (allChildren.length > 0 && stepToBranch.size > 0) {
          const firstChildStepId = allChildren[0]?.stepResult?.stepId;
          if (firstChildStepId && stepToBranch.has(firstChildStepId)) {
            const branchInfo = stepToBranch.get(firstChildStepId)!;
            if (branchInfo.conditionId === result.stepId) {
              parentNode.branchName = branchInfo.branchName;
            }
          }
        }
      }
    }

    return rootNodes;
  });

  // 选中的树节点
  const selectedTreeNode = computed<TreeNode | null>(() => {
    if (!selectedStepKey.value) return null;

    function findNode(nodes: TreeNode[], key: string): TreeNode | null {
      for (const node of nodes) {
        if (node.key === key) return node;
        if (node.children?.length) {
          const found = findNode(node.children, key);
          if (found) return found;
        }
      }
      return null;
    }

    return findNode(treeData.value, selectedStepKey.value);
  });

  // 选中的步骤详情
  const selectedStep = computed<StepResult | null>(() => {
    if (!selectedStepKey.value) return null;
    for (const result of stepResults.value) {
      const nodeKey = generateNodeKey(result);
      if (nodeKey === selectedStepKey.value) {
        return result;
      }
    }
    return null;
  });

  // 判断是否选中了迭代节点
  const isIterationSelected = computed(() => {
    return selectedTreeNode.value?.type === 'iteration';
  });

  // 展开所有节点
  function expandAllNodes() {
    const keys: string[] = [];
    function collectKeys(nodes: TreeNode[]) {
      for (const node of nodes) {
        keys.push(node.key);
        if (node.children && node.children.length > 0) {
          collectKeys(node.children);
        }
      }
    }
    collectKeys(treeData.value);
    expandedKeys.value = keys;
  }

  // 监听树数据变化，自动展开所有节点
  watch(
    () => treeData.value,
    () => {
      expandAllNodes();
    },
    { deep: true }
  );

  // 树节点选择
  function handleTreeSelect(selectedKeys: (string | number)[]) {
    const key = selectedKeys[0];
    selectedStepKey.value = key ? String(key) : null;
  }

  // 设置选中的步骤
  function setSelectedStep(result: StepResult) {
    selectedStepKey.value = generateNodeKey(result);
  }

  // 重置选择
  function resetSelection() {
    selectedStepKey.value = null;
    expandedKeys.value = [];
  }

  return {
    selectedStepKey,
    expandedKeys,
    treeData,
    selectedTreeNode,
    selectedStep,
    isIterationSelected,
    handleTreeSelect,
    setSelectedStep,
    resetSelection,
    expandAllNodes,
  };
}
