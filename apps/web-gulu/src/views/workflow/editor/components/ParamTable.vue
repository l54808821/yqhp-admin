<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { createIconifyIcon } from '@vben/icons';
import {
  Button,
  Checkbox,
  Dropdown,
  Input,
  Menu,
  Popconfirm,
  Tooltip,
  Upload,
} from 'ant-design-vue';

import type { ParamItem } from '../types';
import { createParamItem } from '../types';

// 图标
const PlusIcon = createIconifyIcon('lucide:plus');
const TrashIcon = createIconifyIcon('lucide:trash-2');
const MoreIcon = createIconifyIcon('lucide:more-horizontal');
const UploadIcon = createIconifyIcon('lucide:upload');
const FileIcon = createIconifyIcon('lucide:file');
const GripIcon = createIconifyIcon('lucide:grip-vertical');

interface Props {
  items: ParamItem[];
  showType?: boolean; // 是否显示类型列（用于 form-data）
  placeholder?: {
    key?: string;
    value?: string;
  };
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showType: false,
  placeholder: () => ({ key: '参数名', value: '参数值' }),
  disabled: false,
});

const emit = defineEmits<{
  (e: 'update', items: ParamItem[]): void;
}>();

// 本地数据
const localItems = ref<ParamItem[]>([]);

// 同步外部数据
watch(
  () => props.items,
  (newItems) => {
    localItems.value = JSON.parse(JSON.stringify(newItems || []));
  },
  { immediate: true, deep: true }
);

// 拖拽相关
const dragIndex = ref<number | null>(null);
const dragOverIndex = ref<number | null>(null);

// 触发更新
function emitUpdate() {
  emit('update', JSON.parse(JSON.stringify(localItems.value)));
}

// 切换启用状态
function toggleEnabled(index: number) {
  if (props.disabled) return;
  localItems.value[index]!.enabled = !localItems.value[index]!.enabled;
  emitUpdate();
}

// 更新参数名
function updateKey(index: number, value: string) {
  if (props.disabled) return;
  localItems.value[index]!.key = value;
  emitUpdate();
}

// 更新参数值
function updateValue(index: number, value: string) {
  if (props.disabled) return;
  localItems.value[index]!.value = value;
  emitUpdate();
}

// 更新描述
function updateDescription(index: number, value: string) {
  if (props.disabled) return;
  localItems.value[index]!.description = value;
  emitUpdate();
}

// 添加参数
function addParam() {
  if (props.disabled) return;
  localItems.value.push(createParamItem());
  emitUpdate();
}

// 删除参数
function removeParam(index: number) {
  if (props.disabled) return;
  localItems.value.splice(index, 1);
  emitUpdate();
}

// 切换参数类型（文本/文件）
function toggleType(index: number, type: 'text' | 'file') {
  if (props.disabled) return;
  localItems.value[index]!.type = type;
  if (type === 'file') {
    localItems.value[index]!.value = '';
  }
  emitUpdate();
}

// 文件上传处理
function handleFileChange(index: number, info: any) {
  if (props.disabled) return;
  const file = info.file;
  if (file) {
    localItems.value[index]!.value = file.name;
    // 这里可以存储文件对象或转为 base64
    emitUpdate();
  }
}

// 拖拽开始
function handleDragStart(index: number) {
  if (props.disabled) return;
  dragIndex.value = index;
}

// 拖拽经过
function handleDragOver(index: number, event: DragEvent) {
  if (props.disabled) return;
  event.preventDefault();
  dragOverIndex.value = index;
}

// 拖拽结束
function handleDrop(index: number) {
  if (props.disabled) return;
  if (dragIndex.value === null || dragIndex.value === index) {
    dragIndex.value = null;
    dragOverIndex.value = null;
    return;
  }

  const items = [...localItems.value];
  const [draggedItem] = items.splice(dragIndex.value, 1);
  items.splice(index, 0, draggedItem!);
  localItems.value = items;

  dragIndex.value = null;
  dragOverIndex.value = null;
  emitUpdate();
}

// 拖拽离开
function handleDragEnd() {
  dragIndex.value = null;
  dragOverIndex.value = null;
}

// 计算是否有参数
const hasParams = computed(() => localItems.value.length > 0);
</script>

<template>
  <div class="param-table">
    <!-- 表头 -->
    <div class="param-header">
      <div class="param-col param-col-drag"></div>
      <div class="param-col param-col-checkbox"></div>
      <div class="param-col param-col-key">参数名</div>
      <div class="param-col param-col-value">参数值</div>
      <div v-if="showType" class="param-col param-col-type">类型</div>
      <div class="param-col param-col-actions">操作</div>
    </div>

    <!-- 参数列表 -->
    <div class="param-body">
      <div
        v-for="(item, index) in localItems"
        :key="item.id"
        class="param-row"
        :class="{
          'param-row-disabled': !item.enabled,
          'param-row-dragging': dragIndex === index,
          'param-row-drag-over': dragOverIndex === index,
        }"
        draggable="true"
        @dragstart="handleDragStart(index)"
        @dragover="handleDragOver(index, $event)"
        @drop="handleDrop(index)"
        @dragend="handleDragEnd"
      >
        <!-- 拖拽手柄 -->
        <div class="param-col param-col-drag">
          <GripIcon class="drag-handle" />
        </div>

        <!-- 启用复选框 -->
        <div class="param-col param-col-checkbox">
          <Checkbox
            :checked="item.enabled"
            :disabled="disabled"
            @change="toggleEnabled(index)"
          />
        </div>

        <!-- 参数名 -->
        <div class="param-col param-col-key">
          <Input
            :value="item.key"
            :placeholder="placeholder.key"
            :disabled="disabled"
            size="small"
            @change="(e: any) => updateKey(index, e.target.value)"
          />
        </div>

        <!-- 参数值 -->
        <div class="param-col param-col-value">
          <template v-if="showType && item.type === 'file'">
            <Upload
              :show-upload-list="false"
              :before-upload="() => false"
              :disabled="disabled"
              @change="(info: any) => handleFileChange(index, info)"
            >
              <Button size="small" :disabled="disabled">
                <template #icon><UploadIcon class="size-3" /></template>
                {{ item.value || '选择文件' }}
              </Button>
            </Upload>
          </template>
          <template v-else>
            <Input
              :value="item.value"
              :placeholder="placeholder.value"
              :disabled="disabled"
              size="small"
              @change="(e: any) => updateValue(index, e.target.value)"
            />
          </template>
        </div>

        <!-- 类型选择（仅 form-data） -->
        <div v-if="showType" class="param-col param-col-type">
          <Dropdown :trigger="['click']" :disabled="disabled">
            <Button size="small" type="text" :disabled="disabled">
              <template #icon>
                <FileIcon v-if="item.type === 'file'" class="size-3" />
                <span v-else class="type-text">Aa</span>
              </template>
            </Button>
            <template #overlay>
              <Menu @click="({ key }: any) => toggleType(index, key)">
                <Menu.Item key="text">文本</Menu.Item>
                <Menu.Item key="file">文件</Menu.Item>
              </Menu>
            </template>
          </Dropdown>
        </div>

        <!-- 操作按钮 -->
        <div class="param-col param-col-actions">
          <Dropdown :trigger="['click']" :disabled="disabled">
            <Tooltip title="更多">
              <Button type="text" size="small" :disabled="disabled">
                <template #icon><MoreIcon class="size-4" /></template>
              </Button>
            </Tooltip>
            <template #overlay>
              <Menu>
                <Menu.Item key="description">
                  <Input
                    :value="item.description"
                    placeholder="描述"
                    size="small"
                    @change="(e: any) => updateDescription(index, e.target.value)"
                    @click.stop
                  />
                </Menu.Item>
              </Menu>
            </template>
          </Dropdown>
          <Popconfirm
            title="确定删除此参数？"
            :disabled="disabled"
            @confirm="removeParam(index)"
          >
            <Tooltip title="删除">
              <Button type="text" size="small" danger :disabled="disabled">
                <template #icon><TrashIcon class="size-4" /></template>
              </Button>
            </Tooltip>
          </Popconfirm>
        </div>
      </div>
    </div>

    <!-- 添加参数按钮 -->
    <div class="param-footer">
      <Button
        type="text"
        size="small"
        class="add-param-btn"
        :disabled="disabled"
        @click="addParam"
      >
        <template #icon><PlusIcon class="size-4" /></template>
        添加参数
      </Button>
    </div>
  </div>
</template>

<style scoped>
.param-table {
  width: 100%;
  border: 1px solid hsl(var(--border));
  border-radius: 6px;
  overflow: hidden;
}

.param-header {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: hsl(var(--accent) / 30%);
  border-bottom: 1px solid hsl(var(--border));
  font-size: 12px;
  font-weight: 500;
  color: hsl(var(--foreground) / 70%);
}

.param-body {
  max-height: 300px;
  overflow-y: auto;
}

.param-row {
  display: flex;
  align-items: center;
  padding: 6px 12px;
  border-bottom: 1px solid hsl(var(--border) / 50%);
  transition: background-color 0.2s;
}

.param-row:last-child {
  border-bottom: none;
}

.param-row:hover {
  background: hsl(var(--accent) / 20%);
}

.param-row-disabled {
  opacity: 0.5;
}

.param-row-dragging {
  opacity: 0.5;
  background: hsl(var(--accent) / 40%);
}

.param-row-drag-over {
  border-top: 2px solid hsl(var(--primary));
}

.param-col {
  flex-shrink: 0;
}

.param-col-drag {
  width: 24px;
  cursor: grab;
}

.param-col-drag:active {
  cursor: grabbing;
}

.drag-handle {
  width: 16px;
  height: 16px;
  color: hsl(var(--foreground) / 40%);
}

.param-col-checkbox {
  width: 32px;
}

.param-col-key {
  flex: 1;
  min-width: 120px;
  padding-right: 8px;
}

.param-col-value {
  flex: 2;
  min-width: 200px;
  padding-right: 8px;
}

.param-col-type {
  width: 50px;
}

.param-col-actions {
  width: 80px;
  display: flex;
  justify-content: flex-end;
  gap: 4px;
}

.type-text {
  font-size: 10px;
  font-weight: 600;
}

.param-footer {
  padding: 8px 12px;
  border-top: 1px solid hsl(var(--border) / 50%);
}

.add-param-btn {
  color: hsl(var(--primary));
}

.add-param-btn:hover {
  background: hsl(var(--primary) / 10%);
}

/* 输入框样式 */
:deep(.ant-input) {
  border-radius: 4px;
}

:deep(.ant-input:focus) {
  border-color: hsl(var(--primary));
  box-shadow: 0 0 0 2px hsl(var(--primary) / 20%);
}
</style>
