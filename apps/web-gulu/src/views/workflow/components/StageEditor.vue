<script setup lang="ts">
import { ref, watch } from 'vue';

import { createIconifyIcon } from '@vben/icons';
import {
  Button,
  Dropdown,
  Input,
  InputNumber,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
} from 'ant-design-vue';

import type { Stage } from '#/api/workflow/performance';

import { STAGE_PRESETS } from '#/api/workflow/performance';

const Plus = createIconifyIcon('lucide:plus');
const Trash = createIconifyIcon('lucide:trash-2');
const GripVertical = createIconifyIcon('lucide:grip-vertical');
const Layers = createIconifyIcon('lucide:layers');

interface Props {
  stages: Stage[];
  readonly?: boolean;
  targetLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false,
  targetLabel: '目标 VU',
});

const emit = defineEmits<{
  (e: 'update:stages', stages: Stage[]): void;
}>();

const localStages = ref<Stage[]>([]);

watch(
  () => props.stages,
  (val) => {
    localStages.value = (val || []).map((s) => ({ ...s }));
  },
  { immediate: true, deep: true },
);

function emitUpdate() {
  emit('update:stages', localStages.value.map((s) => ({ ...s })));
}

function addStage() {
  const last = localStages.value[localStages.value.length - 1];
  localStages.value.push({
    duration: '30s',
    target: last ? last.target : 10,
  });
  emitUpdate();
}

function removeStage(index: number) {
  localStages.value.splice(index, 1);
  emitUpdate();
}

function updateDuration(index: number, value: string) {
  if (localStages.value[index]) {
    localStages.value[index].duration = value;
    emitUpdate();
  }
}

function updateTarget(index: number, value: number | null) {
  if (localStages.value[index]) {
    localStages.value[index].target = value ?? 0;
    emitUpdate();
  }
}

function updateName(index: number, value: string) {
  if (localStages.value[index]) {
    localStages.value[index].name = value || undefined;
    emitUpdate();
  }
}

function applyPreset(key: string) {
  const preset = STAGE_PRESETS.find((p) => p.key === key);
  if (preset) {
    localStages.value = preset.stages.map((s) => ({ ...s }));
    emitUpdate();
  }
}

const dragIndex = ref<number | null>(null);

function handleDragStart(index: number) {
  dragIndex.value = index;
}

function handleDragOver(e: DragEvent, index: number) {
  e.preventDefault();
  if (dragIndex.value === null || dragIndex.value === index) return;
  const item = localStages.value.splice(dragIndex.value, 1)[0];
  if (item) {
    localStages.value.splice(index, 0, item);
    dragIndex.value = index;
  }
}

function handleDragEnd() {
  dragIndex.value = null;
  emitUpdate();
}
</script>

<template>
  <div class="stage-editor">
    <div class="stage-header">
      <Typography.Text type="secondary" class="stage-count">
        {{ localStages.length }} 个阶段
      </Typography.Text>
      <Dropdown v-if="!readonly" :trigger="['click']" placement="bottomRight">
        <Button type="link" size="small" class="preset-btn">
          <template #icon><Layers class="size-3.5" /></template>
          预设模板
        </Button>
        <template #overlay>
          <Menu @click="({ key }: any) => applyPreset(key as string)">
            <MenuItem v-for="preset in STAGE_PRESETS" :key="preset.key">
              <div class="preset-item">
                <span class="preset-label">{{ preset.label }}</span>
                <Typography.Text type="secondary" class="preset-desc">
                  {{ preset.desc }}
                </Typography.Text>
              </div>
            </MenuItem>
          </Menu>
        </template>
      </Dropdown>
    </div>

    <div class="stage-list">
      <div
        v-for="(stage, index) in localStages"
        :key="index"
        class="stage-row"
        :class="{ dragging: dragIndex === index }"
        :draggable="!readonly"
        @dragstart="handleDragStart(index)"
        @dragover="(e) => handleDragOver(e, index)"
        @dragend="handleDragEnd"
      >
        <div v-if="!readonly" class="drag-handle">
          <GripVertical class="size-3.5 text-gray-400" />
        </div>
        <span class="stage-index">{{ index + 1 }}</span>
        <Tooltip title="阶段名称（可选）">
          <Input
            :value="stage.name"
            placeholder="名称"
            size="small"
            class="stage-name-input"
            :disabled="readonly"
            @change="(e: any) => updateName(index, e.target.value)"
          />
        </Tooltip>
        <Tooltip title="持续时间（如 30s, 2m, 1h）">
          <Input
            :value="stage.duration"
            placeholder="持续时间"
            size="small"
            class="stage-duration-input"
            :disabled="readonly"
            @change="(e: any) => updateDuration(index, e.target.value)"
          />
        </Tooltip>
        <Tooltip :title="targetLabel">
          <InputNumber
            :value="stage.target"
            :min="0"
            :placeholder="targetLabel"
            size="small"
            class="stage-target-input"
            :disabled="readonly"
            @change="(val) => updateTarget(index, val as number | null)"
          />
        </Tooltip>
        <Button
          v-if="!readonly"
          type="text"
          size="small"
          danger
          class="stage-remove-btn"
          @click="removeStage(index)"
        >
          <template #icon><Trash class="size-3.5" /></template>
        </Button>
      </div>
    </div>

    <Button
      v-if="!readonly"
      type="dashed"
      size="small"
      block
      class="add-stage-btn"
      @click="addStage"
    >
      <template #icon><Plus class="size-3.5" /></template>
      添加阶段
    </Button>
  </div>
</template>

<style scoped>
.stage-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stage-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stage-count {
  font-size: 12px;
}

.preset-btn {
  font-size: 12px;
  padding: 0;
  height: auto;
}

.preset-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.preset-label {
  font-weight: 500;
}

.preset-desc {
  font-size: 11px;
}

.stage-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stage-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  border-radius: 6px;
  background: var(--ant-color-fill-quaternary, #fafafa);
  transition: all 0.2s;
}

.stage-row:hover {
  background: var(--ant-color-fill-tertiary, #f0f0f0);
}

.stage-row.dragging {
  opacity: 0.5;
}

.drag-handle {
  cursor: grab;
  display: flex;
  align-items: center;
  padding: 2px;
}

.drag-handle:active {
  cursor: grabbing;
}

.stage-index {
  font-size: 11px;
  color: var(--ant-color-text-quaternary);
  min-width: 16px;
  text-align: center;
}

.stage-name-input {
  width: 70px;
  flex-shrink: 0;
}

.stage-duration-input {
  width: 80px;
  flex-shrink: 0;
}

.stage-target-input {
  width: 80px;
  flex-shrink: 0;
}

.stage-remove-btn {
  flex-shrink: 0;
}

.add-stage-btn {
  margin-top: 4px;
}
</style>
