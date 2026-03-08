import { computed, inject, nextTick, onBeforeUnmount, onMounted, ref, type Ref } from 'vue';

import type { VariableInfo, VariableGroup } from '../utils/variable-collector';
import { collectAvailableVariables, VARIABLE_GROUP_LABELS } from '../utils/variable-collector';
import type { WorkflowParam } from '../../components/WorkflowParamsPanel.vue';
import type { StepNode } from '../WorkflowTreeEditor.vue';
import { useProjectStore } from '#/store/project';

export interface UseVariableCompletionOptions {
  /** 当前输入值（reactive getter） */
  getValue: () => string;
  /** 外部传入的变量列表（优先于自动收集） */
  variables?: Ref<VariableInfo[] | undefined>;
  /** 获取原生输入元素 */
  getElement: () => HTMLInputElement | HTMLTextAreaElement | null;
  /** 计算弹窗定位（返回 fixed 坐标） */
  getPopoverPosition: (el: HTMLInputElement | HTMLTextAreaElement, cursorPos: number) => { left: number; top: number };
  /** 值变更回调 */
  onValueChange: (value: string) => void;
}

export function useVariableCompletion(options: UseVariableCompletionOptions) {
  const wrapperRef = ref<HTMLElement | null>(null);
  const popoverRef = ref<HTMLElement | null>(null);

  const showPopover = ref(false);
  const popoverStyle = ref<Record<string, string>>({});
  const searchText = ref('');
  const activeIndex = ref(0);
  const triggerStart = ref(-1);

  // --- 变量收集 ---
  const workflowDefinition = inject<any>('workflowDefinition', null);
  const injectedNodeId = inject<any>('currentNodeId', null);
  const projectStore = useProjectStore();

  const allVariables = computed<VariableInfo[]>(() => {
    const ext = options.variables?.value;
    if (ext?.length) return ext;

    if (workflowDefinition?.value) {
      const def = workflowDefinition.value;
      const nodeId = injectedNodeId?.value ?? injectedNodeId;

      const envVariables = projectStore.variableConfigs.map((config) => ({
        name: config.name,
        type: config.extra?.var_type || 'string',
        description: config.description,
      }));

      return collectAvailableVariables({
        params: def.params as WorkflowParam[] | undefined,
        variables: def.variables as Record<string, any> | undefined,
        steps: def.steps as StepNode[] | undefined,
        currentNodeId: nodeId as string | undefined,
        envVariables,
      });
    }
    return [];
  });

  // --- 搜索过滤 ---
  const filteredVariables = computed(() => {
    const query = searchText.value.toLowerCase().trim();
    if (!query) return allVariables.value;
    return allVariables.value.filter(
      (v) =>
        v.name.toLowerCase().includes(query) ||
        v.label.toLowerCase().includes(query) ||
        (v.description && v.description.toLowerCase().includes(query)),
    );
  });

  const groupedVariables = computed(() => {
    const groups: Array<{ group: VariableGroup; label: string; items: VariableInfo[] }> = [];
    const map = new Map<VariableGroup, VariableInfo[]>();

    for (const v of filteredVariables.value) {
      let arr = map.get(v.group);
      if (!arr) {
        arr = [];
        map.set(v.group, arr);
      }
      arr.push(v);
    }

    const order: VariableGroup[] = ['variable', 'env', 'sys'];
    for (const g of order) {
      const items = map.get(g);
      if (items?.length) {
        groups.push({ group: g, label: VARIABLE_GROUP_LABELS[g], items });
      }
    }
    return groups;
  });

  const flatFiltered = computed(() => filteredVariables.value);

  function getPopoverEl(): HTMLElement | null {
    const ref = popoverRef.value as any;
    if (!ref) return null;
    return ref.rootRef ?? ref.$el ?? ref;
  }

  // --- 弹窗控制 ---
  function openPopover(el: HTMLInputElement | HTMLTextAreaElement, cursorPos: number) {
    const pos = options.getPopoverPosition(el, cursorPos);
    popoverStyle.value = {
      left: `${pos.left}px`,
      top: `${pos.top}px`,
    };
    showPopover.value = true;

    nextTick(() => {
      const popEl = getPopoverEl();
      if (!popEl) return;
      const pRect = popEl.getBoundingClientRect();
      if (pRect.bottom > window.innerHeight - 10) {
        const elRect = el.getBoundingClientRect();
        popoverStyle.value = {
          ...popoverStyle.value,
          top: `${elRect.top - pRect.height - 4}px`,
        };
      }
      if (pRect.right > window.innerWidth - 10) {
        popoverStyle.value = {
          ...popoverStyle.value,
          left: `${window.innerWidth - pRect.width - 10}px`,
        };
      }
    });
  }

  function closePopover() {
    showPopover.value = false;
    searchText.value = '';
    triggerStart.value = -1;
    activeIndex.value = 0;
  }

  // --- 输入处理 ---
  function handleInput(e: Event) {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement;
    const val = target.value;
    options.onValueChange(val);

    const cursorPos = target.selectionStart ?? 0;

    if (cursorPos > 0 && val[cursorPos - 1] === '$') {
      triggerStart.value = cursorPos - 1;
      searchText.value = '';
      activeIndex.value = 0;
      openPopover(target, cursorPos);
      return;
    }

    if (showPopover.value && triggerStart.value >= 0) {
      const textAfterDollar = val.slice(triggerStart.value + 1, cursorPos);
      const stripped = textAfterDollar.startsWith('{') ? textAfterDollar.slice(1) : textAfterDollar;
      searchText.value = stripped;
      activeIndex.value = 0;

      if (triggerStart.value >= cursorPos || /[\s\n]/.test(textAfterDollar)) {
        closePopover();
      }
    }
  }

  // --- 键盘导航 ---
  function handleKeydown(e: KeyboardEvent) {
    if (!showPopover.value) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex.value = Math.min(activeIndex.value + 1, flatFiltered.value.length - 1);
      scrollActiveIntoView();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex.value = Math.max(activeIndex.value - 1, 0);
      scrollActiveIntoView();
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (flatFiltered.value.length > 0) {
        e.preventDefault();
        selectVariable(flatFiltered.value[activeIndex.value]!);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closePopover();
    }
  }

  function scrollActiveIntoView() {
    nextTick(() => {
      const popEl = getPopoverEl();
      const el = popEl?.querySelector('.var-item.active');
      el?.scrollIntoView({ block: 'nearest' });
    });
  }

  // --- 选择插入 ---
  function selectVariable(v: VariableInfo) {
    const el = options.getElement();
    if (!el) return;

    const cursorPos = el.selectionStart ?? 0;
    const insertion = `\${${v.name}}`;

    el.focus();
    el.setSelectionRange(triggerStart.value, cursorPos);

    if (!document.execCommand('insertText', false, insertion)) {
      const val = options.getValue();
      const before = val.slice(0, triggerStart.value);
      const after = val.slice(cursorPos);
      const newVal = before + insertion + after;
      options.onValueChange(newVal);
      nextTick(() => {
        const newPos = before.length + insertion.length;
        el.setSelectionRange(newPos, newPos);
      });
    } else {
      options.onValueChange(el.value);
    }

    closePopover();
  }

  // --- 点击外部关闭 ---
  function handleClickOutside(e: MouseEvent) {
    if (!showPopover.value) return;
    const target = e.target as Node;
    const popEl = getPopoverEl();
    if (popEl?.contains(target)) return;
    if (wrapperRef.value?.contains(target)) return;
    closePopover();
  }

  onMounted(() => {
    document.addEventListener('mousedown', handleClickOutside);
  });

  onBeforeUnmount(() => {
    document.removeEventListener('mousedown', handleClickOutside);
  });

  return {
    wrapperRef,
    popoverRef,
    showPopover,
    popoverStyle,
    searchText,
    activeIndex,
    groupedVariables,
    flatFiltered,
    handleInput,
    handleKeydown,
    selectVariable,
    closePopover,
  };
}
