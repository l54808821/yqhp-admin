<script setup lang="ts">
import { computed, inject, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';

import { Input } from 'ant-design-vue';
import { createIconifyIcon } from '@vben/icons';

import type { VariableInfo, VariableGroup } from '../utils/variable-collector';
import { collectAvailableVariables, VARIABLE_GROUP_LABELS } from '../utils/variable-collector';
import type { WorkflowParam } from '../../components/WorkflowParamsPanel.vue';
import type { StepNode } from '../WorkflowTreeEditor.vue';
import { useProjectStore } from '#/store/project';

const SearchIcon = createIconifyIcon('lucide:search');
const VariableIcon = createIconifyIcon('lucide:variable');

interface Props {
  value?: string;
  rows?: number;
  placeholder?: string;
  variables?: VariableInfo[];
}

const props = withDefaults(defineProps<Props>(), {
  value: '',
  rows: 4,
  placeholder: '',
});

const emit = defineEmits<{
  (e: 'update:value', value: string): void;
  (e: 'blur'): void;
}>();

const wrapperRef = ref<HTMLElement | null>(null);
const textareaRef = ref<InstanceType<typeof Input.TextArea> | null>(null);
const popoverRef = ref<HTMLElement | null>(null);

const showPopover = ref(false);
const popoverStyle = ref<Record<string, string>>({});
const searchText = ref('');
const activeIndex = ref(0);
const triggerStart = ref(-1);

// inject workflow context for auto-collecting variables
const workflowDefinition = inject<any>('workflowDefinition', null);
const injectedNodeId = inject<any>('currentNodeId', null);
const projectStore = useProjectStore();

const allVariables = computed<VariableInfo[]>(() => {
  if (props.variables?.length) return props.variables;

  if (workflowDefinition?.value) {
    const def = workflowDefinition.value;
    const nodeId = injectedNodeId?.value ?? injectedNodeId;

    // 获取环境变量
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

function getNativeTextarea(): HTMLTextAreaElement | null {
  const comp = textareaRef.value as any;
  if (!comp) return null;
  const el = comp.$el || comp;
  if (el instanceof HTMLTextAreaElement) return el;
  return el?.querySelector?.('textarea') ?? null;
}

function handleInput(e: Event) {
  const target = e.target as HTMLTextAreaElement;
  const val = target.value;
  emit('update:value', val);

  const cursorPos = target.selectionStart ?? 0;

  // detect '$' trigger: look backwards from cursor for a '$' that starts a variable input
  if (cursorPos > 0) {
    const charBefore = val[cursorPos - 1];
    if (charBefore === '$') {
      triggerStart.value = cursorPos - 1;
      searchText.value = '';
      activeIndex.value = 0;
      showPopoverAtCursor(target, cursorPos);
      return;
    }
  }

  if (showPopover.value && triggerStart.value >= 0) {
    // update search text: everything between '$' and cursor, stripping leading '{'
    const textAfterDollar = val.slice(triggerStart.value + 1, cursorPos);
    const stripped = textAfterDollar.startsWith('{') ? textAfterDollar.slice(1) : textAfterDollar;
    searchText.value = stripped;
    activeIndex.value = 0;

    // close if user deleted the '$' or typed space/newline
    if (triggerStart.value >= cursorPos || /[\s\n]/.test(textAfterDollar)) {
      closePopover();
    }
  }
}

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
    const el = popoverRef.value?.querySelector('.var-item.active');
    el?.scrollIntoView({ block: 'nearest' });
  });
}

function selectVariable(v: VariableInfo) {
  const ta = getNativeTextarea();
  if (!ta) return;

  const cursorPos = ta.selectionStart ?? 0;
  const insertion = `\${${v.name}}`;

  ta.focus();
  ta.setSelectionRange(triggerStart.value, cursorPos);

  // 使用 insertText 保留浏览器原生 undo 历史
  if (!document.execCommand('insertText', false, insertion)) {
    // fallback: 手动插入
    const val = props.value || '';
    const before = val.slice(0, triggerStart.value);
    const after = val.slice(cursorPos);
    const newVal = before + insertion + after;
    emit('update:value', newVal);
    nextTick(() => {
      const newPos = before.length + insertion.length;
      ta.setSelectionRange(newPos, newPos);
    });
  } else {
    emit('update:value', ta.value);
  }

  closePopover();
}

function showPopoverAtCursor(textarea: HTMLTextAreaElement, cursorPos: number) {
  const coords = getCaretCoordinates(textarea, cursorPos);
  const wrapperRect = wrapperRef.value?.getBoundingClientRect();
  const taRect = textarea.getBoundingClientRect();

  if (!wrapperRect) return;

  const offsetLeft = taRect.left - wrapperRect.left + coords.left;
  const offsetTop = taRect.top - wrapperRect.top + coords.top + coords.height + 4;

  popoverStyle.value = {
    left: `${Math.max(0, Math.min(offsetLeft, wrapperRect.width - 280))}px`,
    top: `${offsetTop}px`,
  };

  showPopover.value = true;

  nextTick(() => {
    const el = popoverRef.value;
    if (!el || !wrapperRef.value) return;
    const pRect = el.getBoundingClientRect();
    if (pRect.bottom > window.innerHeight - 10) {
      const above = taRect.top - wrapperRect.top + coords.top - pRect.height - 4;
      popoverStyle.value = {
        ...popoverStyle.value,
        top: `${Math.max(0, above)}px`,
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

function handleClickOutside(e: MouseEvent) {
  if (!showPopover.value) return;
  const target = e.target as Node;
  if (popoverRef.value?.contains(target)) return;
  if (wrapperRef.value?.contains(target)) return;
  closePopover();
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleClickOutside);
});

/**
 * 计算 textarea 中光标的像素坐标（mirror div 技术）
 */
function getCaretCoordinates(
  element: HTMLTextAreaElement,
  position: number,
): { top: number; left: number; height: number } {
  const div = document.createElement('div');
  const style = getComputedStyle(element);

  const properties = [
    'direction', 'boxSizing', 'width', 'height', 'overflowX', 'overflowY',
    'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
    'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'fontStyle', 'fontVariant', 'fontWeight', 'fontStretch', 'fontSize',
    'fontSizeAdjust', 'lineHeight', 'fontFamily', 'textAlign', 'textTransform',
    'textIndent', 'textDecoration', 'letterSpacing', 'wordSpacing',
    'tabSize', 'MozTabSize', 'whiteSpace', 'wordWrap', 'wordBreak',
  ] as const;

  div.id = 'variable-textarea-mirror';
  document.body.appendChild(div);

  const divStyle = div.style;
  divStyle.whiteSpace = 'pre-wrap';
  divStyle.wordWrap = 'break-word';
  divStyle.position = 'absolute';
  divStyle.visibility = 'hidden';
  divStyle.overflow = 'hidden';

  for (const prop of properties) {
    (divStyle as any)[prop] = style.getPropertyValue(
      prop.replace(/([A-Z])/g, '-$1').toLowerCase(),
    );
  }

  div.textContent = element.value.substring(0, position);

  const span = document.createElement('span');
  span.textContent = element.value.substring(position) || '.';
  div.appendChild(span);

  const rect = {
    top: span.offsetTop - element.scrollTop,
    left: span.offsetLeft - element.scrollLeft,
    height: parseInt(style.lineHeight) || parseInt(style.fontSize) * 1.2,
  };

  document.body.removeChild(div);
  return rect;
}
</script>

<template>
  <div ref="wrapperRef" class="variable-input-wrapper">
    <Input.TextArea
      ref="textareaRef"
      :value="value"
      :rows="rows"
      :placeholder="placeholder"
      @input="handleInput"
      @keydown="handleKeydown"
      @blur="emit('blur')"
    />
    <Teleport to="body">
      <div
        v-if="showPopover"
        ref="popoverRef"
        class="var-popover"
        :style="{
          position: 'fixed',
          left: `${(wrapperRef?.getBoundingClientRect().left ?? 0) + parseFloat(popoverStyle.left || '0')}px`,
          top: `${(wrapperRef?.getBoundingClientRect().top ?? 0) + parseFloat(popoverStyle.top || '0')}px`,
          zIndex: 1060,
        }"
      >
        <div class="var-search">
          <SearchIcon class="search-icon" />
          <input
            v-model="searchText"
            class="search-input"
            placeholder="搜索变量"
            @keydown="handleKeydown"
          />
        </div>
        <div class="var-list">
          <template v-if="groupedVariables.length">
            <template v-for="g in groupedVariables" :key="g.group">
              <div class="var-group-label">{{ g.label }}</div>
              <div
                v-for="v in g.items"
                :key="v.name"
                class="var-item"
                :class="{ active: flatFiltered.indexOf(v) === activeIndex }"
                @mousedown.prevent="selectVariable(v)"
                @mouseenter="activeIndex = flatFiltered.indexOf(v)"
              >
                <VariableIcon class="var-icon" />
                <span class="var-name">{{ v.name }}</span>
                <span class="var-type">{{ v.type }}</span>
              </div>
            </template>
          </template>
          <div v-else class="var-empty">无匹配变量</div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.variable-input-wrapper {
  position: relative;
  width: 100%;
}

.var-popover {
  width: 280px;
  background: hsl(var(--popover, 0 0% 100%));
  border: 1px solid hsl(var(--border, 0 0% 90%));
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.var-search {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-bottom: 1px solid hsl(var(--border, 0 0% 90%));
}

.search-icon {
  width: 14px;
  height: 14px;
  color: hsl(var(--muted-foreground, 0 0% 55%));
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 13px;
  background: transparent;
  color: hsl(var(--foreground, 0 0% 10%));
}

.search-input::placeholder {
  color: hsl(var(--muted-foreground, 0 0% 55%));
}

.var-list {
  max-height: 240px;
  overflow-y: auto;
  padding: 4px 0;
}

.var-group-label {
  padding: 4px 12px 2px;
  font-size: 11px;
  font-weight: 600;
  color: hsl(var(--muted-foreground, 0 0% 55%));
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.var-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  cursor: pointer;
  transition: background 0.1s;
}

.var-item:hover,
.var-item.active {
  background: hsl(var(--accent, 0 0% 95%));
}

.var-icon {
  width: 14px;
  height: 14px;
  color: hsl(var(--primary, 220 90% 56%));
  flex-shrink: 0;
}

.var-name {
  flex: 1;
  font-size: 13px;
  color: hsl(var(--foreground, 0 0% 10%));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.var-type {
  font-size: 11px;
  color: hsl(var(--muted-foreground, 0 0% 55%));
  flex-shrink: 0;
}

.var-empty {
  padding: 16px;
  text-align: center;
  font-size: 13px;
  color: hsl(var(--muted-foreground, 0 0% 55%));
}
</style>
