<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { createIconifyIcon } from '@vben/icons';
import {
  AutoComplete,
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
const TrashIcon = createIconifyIcon('lucide:trash-2');
const MoreIcon = createIconifyIcon('lucide:more-horizontal');
const UploadIcon = createIconifyIcon('lucide:upload');
const FileIcon = createIconifyIcon('lucide:file');
const GripIcon = createIconifyIcon('lucide:grip-vertical');

// 常用 HTTP Headers 列表
const COMMON_HEADERS = [
  'Accept',
  'Accept-Charset',
  'Accept-Encoding',
  'Accept-Language',
  'Authorization',
  'Cache-Control',
  'Content-Disposition',
  'Content-Encoding',
  'Content-Language',
  'Content-Length',
  'Content-Type',
  'Cookie',
  'Date',
  'ETag',
  'Expect',
  'Expires',
  'From',
  'Host',
  'If-Match',
  'If-Modified-Since',
  'If-None-Match',
  'If-Range',
  'If-Unmodified-Since',
  'Last-Modified',
  'Location',
  'Max-Forwards',
  'Origin',
  'Pragma',
  'Proxy-Authorization',
  'Range',
  'Referer',
  'Retry-After',
  'Server',
  'Set-Cookie',
  'TE',
  'Trailer',
  'Transfer-Encoding',
  'Upgrade',
  'User-Agent',
  'Vary',
  'Via',
  'Warning',
  'WWW-Authenticate',
  'X-Requested-With',
  'X-Forwarded-For',
  'X-Forwarded-Host',
  'X-Forwarded-Proto',
  'X-Frame-Options',
  'X-Content-Type-Options',
  'X-XSS-Protection',
];

interface Props {
  items: ParamItem[];
  showType?: boolean; // 是否显示类型列（用于 form-data）
  showHeaderSuggestions?: boolean; // 是否显示 Header 联想（用于 headers）
  placeholder?: {
    key?: string;
    value?: string;
  };
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showType: false,
  showHeaderSuggestions: false,
  placeholder: () => ({ key: '参数名', value: '参数值' }),
  disabled: false,
});

// Header 联想选项
const headerOptions = computed(() => {
  return COMMON_HEADERS.map((header) => ({ value: header }));
});

// 过滤 Header 选项
function filterHeaderOptions(inputValue: string) {
  if (!inputValue) return headerOptions.value;
  const lowerInput = inputValue.toLowerCase();
  return COMMON_HEADERS.filter((header) =>
    header.toLowerCase().includes(lowerInput)
  ).map((header) => ({ value: header }));
}

const emit = defineEmits<{
  (e: 'update', items: ParamItem[]): void;
}>();

// 本地数据（包含一个空行用于输入）
const localItems = ref<ParamItem[]>([]);

// 判断参数项是否为空
function isEmptyItem(item: ParamItem): boolean {
  return !item.key && !item.value;
}

// 确保始终有一个空行在末尾
function ensureEmptyRow() {
  const items = localItems.value;
  if (items.length === 0 || !isEmptyItem(items[items.length - 1]!)) {
    localItems.value.push(createParamItem());
  }
}

// 同步外部数据
watch(
  () => props.items,
  (newItems) => {
    localItems.value = JSON.parse(JSON.stringify(newItems || []));
    ensureEmptyRow();
  },
  { immediate: true, deep: true }
);

// 拖拽相关
const dragIndex = ref<number | null>(null);
const dragOverIndex = ref<number | null>(null);

// 触发更新（过滤掉空数据）
function emitUpdate() {
  // 过滤掉空的参数项（key 和 value 都为空）
  const validItems = localItems.value.filter((item) => !isEmptyItem(item));
  emit('update', JSON.parse(JSON.stringify(validItems)));
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
  // 如果是最后一行且不为空，自动添加新行
  ensureEmptyRow();
  emitUpdate();
}

// 更新参数值
function updateValue(index: number, value: string) {
  if (props.disabled) return;
  localItems.value[index]!.value = value;
  // 如果是最后一行且不为空，自动添加新行
  ensureEmptyRow();
  emitUpdate();
}

// 更新描述
function updateDescription(index: number, value: string) {
  if (props.disabled) return;
  localItems.value[index]!.description = value;
  emitUpdate();
}

// 删除参数
function removeParam(index: number) {
  if (props.disabled) return;
  localItems.value.splice(index, 1);
  ensureEmptyRow();
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
    ensureEmptyRow();
    emitUpdate();
  }
}

// 拖拽开始（只能通过拖拽手柄触发）
function handleDragStart(index: number, event: DragEvent) {
  if (props.disabled) return;
  // 检查是否是最后一行空数据，空行不允许拖拽
  if (isEmptyItem(localItems.value[index]!)) {
    event.preventDefault();
    return;
  }
  dragIndex.value = index;
  // 设置拖拽效果
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
  }
}

// 拖拽经过
function handleDragOver(index: number, event: DragEvent) {
  if (props.disabled) return;
  if (dragIndex.value === null) return;
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

// 判断是否是最后一个空行
function isLastEmptyRow(index: number): boolean {
  return (
    index === localItems.value.length - 1 &&
    isEmptyItem(localItems.value[index]!)
  );
}
</script>

<template>
  <div class="param-table">
    <!-- 表头 -->
    <div class="param-header">
      <div class="param-col param-col-drag"></div>
      <div class="param-col param-col-checkbox"></div>
      <div class="param-col param-col-key"><span class="header-text">参数名</span></div>
      <div v-if="showType" class="param-col param-col-type">类型</div>
      <div class="param-col param-col-value"><span class="header-text">参数值</span></div>
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
          'param-row-empty': isLastEmptyRow(index),
        }"
        @dragover="handleDragOver(index, $event)"
        @drop="handleDrop(index)"
        @dragend="handleDragEnd"
      >
        <!-- 拖拽手柄 -->
        <div
          class="param-col param-col-drag"
          :class="{ 'drag-disabled': isLastEmptyRow(index) }"
          :draggable="!isLastEmptyRow(index)"
          @dragstart="handleDragStart(index, $event)"
        >
          <GripIcon v-if="!isLastEmptyRow(index)" class="drag-handle" />
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
          <AutoComplete
            v-if="showHeaderSuggestions"
            :value="item.key"
            :options="filterHeaderOptions(item.key)"
            :placeholder="placeholder.key"
            :disabled="disabled"
            @change="(value: any) => updateKey(index, value)"
            @select="(value: any) => updateKey(index, value)"
          />
          <Input
            v-else
            :value="item.key"
            :placeholder="placeholder.key"
            :disabled="disabled"
            @change="(e: any) => updateKey(index, e.target.value)"
          />
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
              @change="(e: any) => updateValue(index, e.target.value)"
            />
          </template>
        </div>

        <!-- 操作按钮 -->
        <div class="param-col param-col-actions">
          <Dropdown :trigger="['click']" :disabled="disabled || isLastEmptyRow(index)">
            <Tooltip title="更多">
              <Button type="text" size="small" :disabled="disabled || isLastEmptyRow(index)">
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
            placement="topRight"
            :disabled="disabled || isLastEmptyRow(index)"
            :overlay-style="{ minWidth: '180px' }"
            @confirm="removeParam(index)"
          >
            <Tooltip title="删除">
              <Button type="text" size="small" danger :disabled="disabled || isLastEmptyRow(index)">
                <template #icon><TrashIcon class="size-4" /></template>
              </Button>
            </Tooltip>
          </Popconfirm>
        </div>
      </div>
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

.param-header,
.param-row {
  display: flex;
  align-items: stretch;
}

.param-header {
  min-height: 36px;
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
  min-height: 36px;
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

.param-row-empty {
  background: hsl(var(--accent) / 10%);
}

.param-col {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  box-sizing: border-box;
}

.param-col-drag {
  width: 24px;
  cursor: grab;
  justify-content: center;
}

.param-col-drag:active {
  cursor: grabbing;
}

.param-col-drag.drag-disabled {
  cursor: default;
}

.drag-handle {
  width: 16px;
  height: 16px;
  color: hsl(var(--foreground) / 40%);
  transition: color 0.2s;
}

.drag-handle:hover {
  color: hsl(var(--foreground) / 70%);
}

.param-col-checkbox {
  width: 32px;
  justify-content: center;
}

.param-col-key {
  flex: 1;
  min-width: 120px;
}

.param-col-type {
  width: 50px;
  justify-content: center;
}

.param-col-value {
  flex: 2;
  min-width: 200px;
}

.param-col-actions {
  width: 80px;
  display: flex;
  justify-content: center;
  gap: 2px;
}

.type-text {
  font-size: 10px;
  font-weight: 600;
}

/* Header 文本的 padding，与 input 的 padding 对齐 */
.header-text {
  padding: 0 12px;
}

/* 输入框样式 - 填充整个单元格 */
:deep(.ant-input) {
  border: none;
  border-radius: 0;
  width: 100%;
  height: 100%;
  min-height: 36px;
  padding: 8px 12px;
  background: transparent;
  transition: all 0.2s;
  box-sizing: border-box;
}

:deep(.ant-input:hover) {
  background: hsl(var(--accent) / 20%);
}

:deep(.ant-input:focus) {
  border: 1px solid hsl(var(--primary));
  box-shadow: 0 0 0 2px hsl(var(--primary) / 20%);
  background: hsl(var(--background));
}

/* AutoComplete 样式 - 填充整个单元格 */
:deep(.ant-select-auto-complete) {
  width: 100%;
  height: 100%;
}

:deep(.ant-select-auto-complete .ant-select-selector) {
  border: none !important;
  border-radius: 0 !important;
  min-height: 36px !important;
  padding: 4px 12px !important;
  background: transparent !important;
  box-shadow: none !important;
}

:deep(.ant-select-auto-complete .ant-select-selector:hover) {
  background: hsl(var(--accent) / 20%) !important;
}

:deep(.ant-select-auto-complete.ant-select-focused .ant-select-selector) {
  border: 1px solid hsl(var(--primary)) !important;
  box-shadow: 0 0 0 2px hsl(var(--primary) / 20%) !important;
  background: hsl(var(--background)) !important;
}

:deep(.ant-select-auto-complete .ant-select-selection-search-input) {
  height: 100% !important;
}
</style>
