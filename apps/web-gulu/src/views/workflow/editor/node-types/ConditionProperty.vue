<script setup lang="ts">
import { computed, ref } from 'vue';
import { Button, Input, Select, Popconfirm } from 'ant-design-vue';
import { GripVertical, X } from '@vben/icons';

const props = defineProps<{
  node: any;
}>();

const emit = defineEmits<{
  update: [node: any];
}>();

const branches = computed(() => props.node.branches || []);

const kindOptions = [
  { value: 'if', label: 'IF' },
  { value: 'else_if', label: 'ELSE IF' },
  { value: 'else', label: 'ELSE' },
];

// 拖拽相关状态
const dragIndex = ref<number | null>(null);
const dragOverIndex = ref<number | null>(null);

// 生成新分支 ID
function newBranchId() {
  return `br_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// 添加分支
function addBranch() {
  if (!props.node.branches) {
    props.node.branches = [];
  }
  props.node.branches.push({
    id: newBranchId(),
    name: `条件${props.node.branches.length + 1}`,
    kind: 'else_if',
    expression: '',
    steps: [],
  });
  emit('update', props.node);
}

// 删除分支
function removeBranch(index: number) {
  props.node.branches.splice(index, 1);
  emit('update', props.node);
}

// 更新分支
function handleUpdate() {
  emit('update', props.node);
}

// 分支类型变更时清空 else 的表达式
function handleKindChange(index: number) {
  if (props.node.branches[index].kind === 'else') {
    props.node.branches[index].expression = '';
  }
  handleUpdate();
}

// 拖拽开始
function handleDragStart(index: number) {
  dragIndex.value = index;
}

// 拖拽经过
function handleDragOver(e: DragEvent, index: number) {
  e.preventDefault();
  dragOverIndex.value = index;
}

// 拖拽离开
function handleDragLeave() {
  dragOverIndex.value = null;
}

// 拖拽结束
function handleDrop(targetIndex: number) {
  if (dragIndex.value === null || dragIndex.value === targetIndex) {
    dragIndex.value = null;
    dragOverIndex.value = null;
    return;
  }

  const branches = props.node.branches;
  const [removed] = branches.splice(dragIndex.value, 1);
  branches.splice(targetIndex, 0, removed);

  dragIndex.value = null;
  dragOverIndex.value = null;
  emit('update', props.node);
}

// 拖拽结束清理
function handleDragEnd() {
  dragIndex.value = null;
  dragOverIndex.value = null;
}
</script>

<template>
  <div class="condition-branches">
    <div class="section-header">
      <span class="section-title">分支列表</span>
      <Button type="primary" size="small" @click="addBranch">+ 添加分支</Button>
    </div>

    <div v-if="branches.length === 0" class="empty-state">
      暂无分支，点击上方按钮添加
    </div>

    <div v-else class="branch-list">
      <div
        v-for="(br, index) in branches"
        :key="br.id"
        class="branch-card"
        :class="{
          'dragging': dragIndex === index,
          'drag-over': dragOverIndex === index && dragIndex !== index,
          'is-if': br.kind === 'if',
          'is-else-if': br.kind === 'else_if',
          'is-else': br.kind === 'else'
        }"
        draggable="true"
        @dragstart="handleDragStart(index)"
        @dragover="handleDragOver($event, index)"
        @dragleave="handleDragLeave"
        @drop="handleDrop(index)"
        @dragend="handleDragEnd"
      >
        <div class="card-header">
          <!-- 拖拽手柄 -->
          <span class="drag-handle" title="拖拽排序">
            <GripVertical class="size-4" />
          </span>

          <!-- 类型选择器（带颜色标签样式） -->
          <Select
            v-model:value="br.kind"
            :options="kindOptions"
            size="small"
            :class="['kind-select', `kind-${br.kind}`]"
            :popupClassName="'kind-select-popup'"
            @change="handleKindChange(index)"
          />

          <!-- 分支名称 -->
          <Input
            v-model:value="br.name"
            size="small"
            placeholder="分支名称"
            class="name-input"
            :bordered="false"
            @blur="handleUpdate"
          />

          <!-- 删除按钮 -->
          <Popconfirm
            title="删除此分支？"
            ok-text="确定"
            cancel-text="取消"
            placement="left"
            @confirm="removeBranch(index)"
          >
            <Button type="text" size="small" class="delete-btn">
              <X class="size-4" />
            </Button>
          </Popconfirm>
        </div>

        <!-- 条件表达式 -->
        <div v-if="br.kind !== 'else'" class="expression-area">
          <Input
            v-model:value="br.expression"
            placeholder="输入条件表达式，如: ${response.status} == 200"
            @blur="handleUpdate"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.condition-branches {
  width: 100%;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: hsl(var(--foreground));
}

.empty-state {
  padding: 24px 16px;
  text-align: center;
  color: hsl(var(--muted-foreground));
  font-size: 13px;
  border: 1px dashed hsl(var(--border));
  border-radius: 8px;
  background: hsl(var(--muted) / 0.3);
}

.branch-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.branch-card {
  border-radius: 8px;
  border: 1px solid hsl(var(--border));
  background: hsl(var(--card));
  overflow: hidden;
  transition: all 0.2s;
}

.branch-card:hover {
  border-color: hsl(var(--primary) / 0.5);
  box-shadow: 0 2px 8px hsl(var(--foreground) / 0.05);
}

.branch-card.dragging {
  opacity: 0.5;
}

.branch-card.drag-over {
  border-color: hsl(var(--primary));
  box-shadow: 0 0 0 2px hsl(var(--primary) / 0.2);
}

/* 根据分支类型添加左边框颜色 */
.branch-card.is-if {
  border-left: 3px solid #1890ff;
}

.branch-card.is-else-if {
  border-left: 3px solid #fa8c16;
}

.branch-card.is-else {
  border-left: 3px solid #8c8c8c;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  background: hsl(var(--muted) / 0.3);
}

.drag-handle {
  cursor: grab;
  color: hsl(var(--muted-foreground));
  display: flex;
  align-items: center;
  padding: 2px;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.branch-card:hover .drag-handle {
  opacity: 1;
}

.drag-handle:active {
  cursor: grabbing;
}

.name-input {
  flex: 1;
  min-width: 0;
}

.name-input :deep(.ant-input) {
  font-weight: 500;
  padding: 0 8px;
}

.name-input :deep(.ant-input:not(:focus)) {
  background: transparent;
}

/* 类型选择器样式 - 标签风格 */
.kind-select {
  flex-shrink: 0;
}


.kind-select :deep(.ant-select-selector) {
  padding: 0 8px !important;
  font-size: 11px !important;
  font-weight: 600 !important;
  border-radius: 4px !important;
  height: 24px !important;
  min-height: 24px !important;
  border: none !important;
}

.kind-select :deep(.ant-select-selection-item) {
  line-height: 22px !important;
  padding-right: 14px !important;
}

.kind-select :deep(.ant-select-arrow) {
  font-size: 10px;
  right: 6px;
}

/* IF 样式 */
.kind-select.kind-if :deep(.ant-select-selector) {
  background: #1890ff20 !important;
  color: #1890ff !important;
}

.kind-select.kind-if :deep(.ant-select-arrow) {
  color: #1890ff;
}

/* ELSE IF 样式 */
.kind-select.kind-else_if :deep(.ant-select-selector) {
  background: #fa8c1620 !important;
  color: #fa8c16 !important;
}

.kind-select.kind-else_if :deep(.ant-select-arrow) {
  color: #fa8c16;
}

/* ELSE 样式 */
.kind-select.kind-else :deep(.ant-select-selector) {
  background: #8c8c8c20 !important;
  color: #8c8c8c !important;
}

.kind-select.kind-else :deep(.ant-select-arrow) {
  color: #8c8c8c;
}

.delete-btn {
  flex-shrink: 0;
  color: hsl(var(--muted-foreground));
  opacity: 0.6;
  transition: all 0.2s;
}

.branch-card:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  color: hsl(var(--destructive)) !important;
}

.expression-area {
  padding: 8px 10px;
  border-top: 1px dashed hsl(var(--border));
}

.expression-area :deep(.ant-input) {
  font-size: 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  background: hsl(var(--muted) / 0.5);
}

.expression-area :deep(.ant-input::placeholder) {
  font-family: inherit;
}
</style>

<!-- 全局样式，用于下拉菜单 -->
<style>
.kind-select-popup {
  min-width: 100px !important;
}

.kind-select-popup .ant-select-item {
  font-size: 12px;
  font-weight: 500;
  padding: 6px 12px;
}
</style>
