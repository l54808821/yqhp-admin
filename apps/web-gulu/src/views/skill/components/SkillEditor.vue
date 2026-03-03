<script setup lang="ts">
import type { SkillResource } from '#/api/skill';

import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';

import {
  Button,
  Empty,
  Input,
  message,
  Modal,
  Spin,
  Tooltip,
  Tree,
  Upload,
} from 'ant-design-vue';
import { createIconifyIcon } from '@vben/icons';

const FileAddIcon = createIconifyIcon('lucide:file-plus');
const FolderAddIcon = createIconifyIcon('lucide:folder-plus');
const UploadIcon = createIconifyIcon('lucide:upload');
const RefreshIcon = createIconifyIcon('lucide:refresh-cw');

import {
  createSkillResourceApi,
  deleteSkillResourceApi,
  getSkillResourceContentApi,
  getSkillResourcesApi,
  updateSkillResourceApi,
} from '#/api/skill';

const props = defineProps<{ skillId: number }>();

const resources = ref<SkillResource[]>([]);
const loading = ref(false);
const selectedResource = ref<SkillResource | null>(null);
const fileContent = ref('');
const contentLoading = ref(false);
const contentDirty = ref(false);
const saveLoading = ref(false);

// Dialog states
const dialogVisible = ref(false);
const dialogTitle = ref('');
const dialogInput = ref('');
const dialogAction = ref<'newFile' | 'newFolder' | 'rename'>('newFile');
const dialogTargetResource = ref<SkillResource | null>(null);

// Context menu
const contextMenuVisible = ref(false);
const contextMenuStyle = ref({ top: '0px', left: '0px' });
const contextMenuNode = ref<FileTreeNode | null>(null);

interface FileTreeNode {
  title: string;
  key: string;
  isLeaf?: boolean;
  children?: FileTreeNode[];
  resource?: SkillResource;
  dirPath?: string;
}

const treeData = computed<FileTreeNode[]>(() => buildFileTree(resources.value));

const selectedKeys = computed<string[]>(() => {
  return selectedResource.value ? [String(selectedResource.value.id)] : [];
});

function buildFileTree(resources: SkillResource[]): FileTreeNode[] {
  const root: FileTreeNode[] = [];
  const dirMap = new Map<string, FileTreeNode>();

  const sorted = [...resources].sort((a, b) => {
    const aDepth = a.path.split('/').length;
    const bDepth = b.path.split('/').length;
    if (aDepth !== bDepth) return aDepth - bDepth;
    const aIsDir = resources.some((r) => r.path !== a.path && r.path.startsWith(a.path + '/'));
    const bIsDir = resources.some((r) => r.path !== b.path && r.path.startsWith(b.path + '/'));
    if (aIsDir !== bIsDir) return aIsDir ? -1 : 1;
    return a.path.localeCompare(b.path);
  });

  for (const res of sorted) {
    const parts = res.path.split('/');
    if (parts.length === 1) {
      root.push({ title: parts[0], key: String(res.id), isLeaf: true, resource: res });
    } else {
      let currentChildren = root;
      let currentPath = '';
      for (let i = 0; i < parts.length - 1; i++) {
        currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];
        if (!dirMap.has(currentPath)) {
          const dirNode: FileTreeNode = {
            title: parts[i],
            key: `dir:${currentPath}`,
            children: [],
            dirPath: currentPath,
          };
          currentChildren.push(dirNode);
          dirMap.set(currentPath, dirNode);
        }
        currentChildren = dirMap.get(currentPath)!.children!;
      }
      currentChildren.push({
        title: parts[parts.length - 1],
        key: String(res.id),
        isLeaf: true,
        resource: res,
      });
    }
  }
  return root;
}

// ===== Data loading =====

async function loadResources() {
  loading.value = true;
  try {
    resources.value = (await getSkillResourcesApi(props.skillId)) || [];
  } catch {
    resources.value = [];
  } finally {
    loading.value = false;
  }
}

async function loadFileContent(res: SkillResource) {
  contentLoading.value = true;
  try {
    const data = await getSkillResourceContentApi(props.skillId, res.id);
    fileContent.value = data.content || '';
  } catch {
    fileContent.value = '';
    message.error('加载文件内容失败');
  } finally {
    contentLoading.value = false;
  }
}

// ===== File selection =====

async function handleSelectFile(_keys: any, info: { node: FileTreeNode }) {
  if (!info.node.isLeaf || !info.node.resource) return;
  if (contentDirty.value && selectedResource.value) {
    const confirmed = await confirmDiscard();
    if (!confirmed) return;
  }
  selectedResource.value = info.node.resource;
  contentDirty.value = false;
  await loadFileContent(info.node.resource);
}

function confirmDiscard(): Promise<boolean> {
  return new Promise((resolve) => {
    Modal.confirm({
      title: '文件未保存',
      content: `${selectedResource.value!.path} 有未保存的修改，是否丢弃？`,
      okText: '丢弃',
      cancelText: '取消',
      onOk: () => resolve(true),
      onCancel: () => resolve(false),
    });
  });
}

// ===== Save =====

function handleContentChange() {
  contentDirty.value = true;
}

async function handleSaveFile() {
  if (!selectedResource.value) return;
  saveLoading.value = true;
  try {
    await updateSkillResourceApi(props.skillId, selectedResource.value.id, {
      content: fileContent.value,
    });
    contentDirty.value = false;
    message.success('保存成功');
    loadResources();
  } catch {
    message.error('保存失败');
  } finally {
    saveLoading.value = false;
  }
}

// ===== New File =====

function handleNewFile(prefixDir = '') {
  dialogTitle.value = '新建文件';
  dialogInput.value = prefixDir ? `${prefixDir}/` : '';
  dialogAction.value = 'newFile';
  dialogTargetResource.value = null;
  dialogVisible.value = true;
  nextTick(() => {
    const input = document.querySelector('.skill-dialog-input input') as HTMLInputElement;
    input?.focus();
  });
}

// ===== New Folder =====

function handleNewFolder(prefixDir = '') {
  dialogTitle.value = '新建文件夹';
  dialogInput.value = prefixDir ? `${prefixDir}/` : '';
  dialogAction.value = 'newFolder';
  dialogTargetResource.value = null;
  dialogVisible.value = true;
}

// ===== Rename =====

function handleRename(res: SkillResource) {
  dialogTitle.value = '重命名';
  dialogInput.value = res.path;
  dialogAction.value = 'rename';
  dialogTargetResource.value = res;
  dialogVisible.value = true;
}

// ===== Dialog confirm =====

async function handleDialogConfirm() {
  const value = dialogInput.value.trim();
  if (!value) return message.warning('请输入内容');

  try {
    if (dialogAction.value === 'newFile') {
      await createSkillResourceApi(props.skillId, { path: value, content: '' });
      message.success('文件创建成功');
    } else if (dialogAction.value === 'newFolder') {
      const placeholder = `${value}/.gitkeep`;
      await createSkillResourceApi(props.skillId, { path: placeholder, content: '' });
      message.success('文件夹创建成功');
    } else if (dialogAction.value === 'rename' && dialogTargetResource.value) {
      const oldRes = dialogTargetResource.value;
      const oldContent = fileContent.value;
      let content = '';
      try {
        const data = await getSkillResourceContentApi(props.skillId, oldRes.id);
        content = data.content || '';
      } catch { /* use empty */ }
      await createSkillResourceApi(props.skillId, { path: value, content });
      await deleteSkillResourceApi(props.skillId, oldRes.id);
      if (selectedResource.value?.id === oldRes.id) {
        selectedResource.value = null;
        fileContent.value = '';
        contentDirty.value = false;
      }
      message.success('重命名成功');
    }
    dialogVisible.value = false;
    await loadResources();
  } catch (e: any) {
    message.error(e?.message || '操作失败');
  }
}

// ===== Delete =====

function handleDeleteFile(res?: SkillResource) {
  const target = res || selectedResource.value;
  if (!target) return;
  Modal.confirm({
    title: '删除文件',
    content: `确定删除 ${target.path}？`,
    okText: '删除',
    okType: 'danger',
    onOk: async () => {
      try {
        await deleteSkillResourceApi(props.skillId, target.id);
        message.success('删除成功');
        if (selectedResource.value?.id === target.id) {
          selectedResource.value = null;
          fileContent.value = '';
          contentDirty.value = false;
        }
        await loadResources();
      } catch {
        message.error('删除失败');
      }
    },
  });
}

function handleDeleteFolder(dirPath: string) {
  const filesToDelete = resources.value.filter((r) => r.path.startsWith(dirPath + '/'));
  if (filesToDelete.length === 0) return;
  Modal.confirm({
    title: '删除文件夹',
    content: `确定删除 ${dirPath}/ 及其下的 ${filesToDelete.length} 个文件？`,
    okText: '删除',
    okType: 'danger',
    onOk: async () => {
      try {
        for (const f of filesToDelete) {
          await deleteSkillResourceApi(props.skillId, f.id);
        }
        if (selectedResource.value && selectedResource.value.path.startsWith(dirPath + '/')) {
          selectedResource.value = null;
          fileContent.value = '';
          contentDirty.value = false;
        }
        message.success('删除成功');
        await loadResources();
      } catch {
        message.error('删除失败');
      }
    },
  });
}

// ===== Upload =====

function handleUploadFile(info: any, prefixDir = '') {
  const file = info.file as File;
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    const content = reader.result as string;
    const path = prefixDir ? `${prefixDir}/${file.name}` : file.name;
    try {
      await createSkillResourceApi(props.skillId, { path, content });
      message.success(`上传 ${file.name} 成功`);
      await loadResources();
    } catch {
      message.error('上传失败');
    }
  };
  reader.readAsText(file);
}

// ===== Context menu =====

function handleContextMenu(event: MouseEvent, node: FileTreeNode) {
  event.preventDefault();
  event.stopPropagation();
  contextMenuNode.value = node;
  contextMenuStyle.value = {
    top: `${event.clientY}px`,
    left: `${event.clientX}px`,
  };
  contextMenuVisible.value = true;
}

function handleContextMenuClick(action: string) {
  contextMenuVisible.value = false;
  const node = contextMenuNode.value;
  if (!node) return;

  if (node.isLeaf && node.resource) {
    switch (action) {
      case 'rename':
        handleRename(node.resource);
        break;
      case 'delete':
        handleDeleteFile(node.resource);
        break;
      case 'newFile': {
        const dir = node.resource.path.includes('/')
          ? node.resource.path.substring(0, node.resource.path.lastIndexOf('/'))
          : '';
        handleNewFile(dir);
        break;
      }
    }
  } else if (node.dirPath) {
    switch (action) {
      case 'newFile':
        handleNewFile(node.dirPath);
        break;
      case 'newFolder':
        handleNewFolder(node.dirPath);
        break;
      case 'deleteFolder':
        handleDeleteFolder(node.dirPath);
        break;
    }
  }
}

function closeContextMenu() {
  contextMenuVisible.value = false;
}

function getFileIcon(path: string): string {
  if (path === 'SKILL.md') return '📋';
  const ext = path.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'py': return '🐍';
    case 'js': case 'ts': return '📜';
    case 'sh': case 'bash': return '⚙️';
    case 'md': return '📝';
    case 'json': return '📦';
    case 'yaml': case 'yml': return '⚙️';
    case 'pptx': return '📊';
    case 'docx': return '📄';
    case 'txt': return '📃';
    default: return '📄';
  }
}

function formatSize(bytes: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + 'B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'K';
  return (bytes / 1024 / 1024).toFixed(1) + 'M';
}

onMounted(() => {
  loadResources();
  document.addEventListener('click', closeContextMenu);
});

onUnmounted(() => {
  document.removeEventListener('click', closeContextMenu);
});
</script>

<template>
  <div class="skill-editor">
    <!-- Sidebar: file tree -->
    <div class="skill-editor__sidebar">
      <div class="skill-editor__sidebar-header">
        <span class="skill-editor__sidebar-title">文件</span>
        <div class="skill-editor__sidebar-actions">
          <Tooltip title="新建文件">
            <Button type="text" size="small" @click="handleNewFile()">
              <FileAddIcon />
            </Button>
          </Tooltip>
          <Tooltip title="新建文件夹">
            <Button type="text" size="small" @click="handleNewFolder()">
              <FolderAddIcon />
            </Button>
          </Tooltip>
          <Upload :showUploadList="false" :beforeUpload="() => false" :multiple="true" @change="(info: any) => handleUploadFile(info)">
            <Tooltip title="上传文件">
              <Button type="text" size="small">
                <UploadIcon />
              </Button>
            </Tooltip>
          </Upload>
          <Tooltip title="刷新">
            <Button type="text" size="small" @click="loadResources">
              <RefreshIcon />
            </Button>
          </Tooltip>
        </div>
      </div>

      <Spin :spinning="loading" size="small">
        <Tree
          v-if="treeData.length > 0"
          :tree-data="treeData"
          :selected-keys="selectedKeys"
          default-expand-all
          block-node
          @select="handleSelectFile"
        >
          <template #title="nodeData">
            <span
              class="file-tree-node"
              @contextmenu.prevent="(e: MouseEvent) => handleContextMenu(e, nodeData as any as FileTreeNode)"
            >
              <span v-if="nodeData.isLeaf" class="file-tree-icon">{{ getFileIcon(nodeData.resource?.path || nodeData.title) }}</span>
              <span v-else class="file-tree-icon">📁</span>
              <span class="file-tree-name">{{ nodeData.title }}</span>
              <span v-if="nodeData.resource" class="file-tree-size">{{ formatSize(nodeData.resource.size) }}</span>
            </span>
          </template>
        </Tree>
        <Empty v-else :image="Empty.PRESENTED_IMAGE_SIMPLE" description="暂无文件" />
      </Spin>
    </div>

    <!-- Content: editor -->
    <div class="skill-editor__content">
      <template v-if="selectedResource">
        <div class="skill-editor__content-header">
          <div class="skill-editor__content-path">
            <span>{{ selectedResource.path }}</span>
            <span v-if="contentDirty" class="skill-editor__dirty-dot" title="未保存">●</span>
          </div>
          <div class="skill-editor__content-actions">
            <Button size="small" @click="handleRename(selectedResource!)">重命名</Button>
            <Button size="small" danger @click="handleDeleteFile()">删除</Button>
            <Button
              type="primary"
              size="small"
              :loading="saveLoading"
              :disabled="!contentDirty"
              @click="handleSaveFile"
            >
              保存
            </Button>
          </div>
        </div>
        <Spin :spinning="contentLoading" class="skill-editor__content-body">
          <Input.TextArea
            v-model:value="fileContent"
            class="skill-editor__textarea"
            :rows="30"
            @change="handleContentChange"
          />
        </Spin>
      </template>
      <div v-else class="skill-editor__empty">
        <Empty description="选择左侧文件进行编辑" :image="Empty.PRESENTED_IMAGE_SIMPLE" />
      </div>
    </div>
  </div>

  <!-- Context menu -->
  <Teleport to="body">
    <div
      v-if="contextMenuVisible"
      class="context-menu"
      :style="contextMenuStyle"
    >
      <template v-if="contextMenuNode?.isLeaf">
        <div class="context-menu-item" @click="handleContextMenuClick('rename')">重命名</div>
        <div class="context-menu-item" @click="handleContextMenuClick('newFile')">在同级新建文件</div>
        <div class="context-menu-divider" />
        <div class="context-menu-item context-menu-item--danger" @click="handleContextMenuClick('delete')">删除</div>
      </template>
      <template v-else>
        <div class="context-menu-item" @click="handleContextMenuClick('newFile')">新建文件</div>
        <div class="context-menu-item" @click="handleContextMenuClick('newFolder')">新建子文件夹</div>
        <div class="context-menu-divider" />
        <div class="context-menu-item context-menu-item--danger" @click="handleContextMenuClick('deleteFolder')">删除文件夹</div>
      </template>
    </div>
  </Teleport>

  <!-- Dialog: new file / new folder / rename -->
  <Modal
    v-model:open="dialogVisible"
    :title="dialogTitle"
    :width="480"
    @ok="handleDialogConfirm"
  >
    <Input
      v-model:value="dialogInput"
      class="skill-dialog-input"
      :placeholder="dialogAction === 'newFolder' ? '文件夹路径（如 scripts, validators/sub）' : '文件路径（如 SKILL.md, scripts/extract.py）'"
      @press-enter="handleDialogConfirm"
    />
  </Modal>
</template>

<style scoped>
.skill-editor {
  display: flex;
  height: calc(100vh - 160px);
  border: 1px solid var(--ant-color-border, #d9d9d9);
  border-radius: 8px;
  overflow: hidden;
  background: var(--ant-color-bg-container, #fff);
}

.skill-editor__sidebar {
  width: 280px;
  min-width: 220px;
  border-right: 1px solid var(--ant-color-border, #d9d9d9);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.skill-editor__sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px 6px 12px;
  border-bottom: 1px solid var(--ant-color-border-secondary, #f0f0f0);
  flex-shrink: 0;
}

.skill-editor__sidebar-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--ant-color-text, #333);
}

.skill-editor__sidebar-actions {
  display: flex;
  align-items: center;
  gap: 0;
}

.skill-editor__sidebar-actions :deep(.ant-btn) {
  width: 28px;
  height: 28px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.skill-editor__sidebar :deep(.ant-spin-nested-loading) {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}

.skill-editor__sidebar :deep(.ant-tree) {
  font-size: 13px;
}

.skill-editor__sidebar :deep(.ant-tree-treenode) {
  padding: 1px 0;
}

.file-tree-node {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  user-select: none;
}

.file-tree-icon {
  font-size: 14px;
  flex-shrink: 0;
}

.file-tree-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-tree-size {
  margin-left: auto;
  font-size: 11px;
  color: var(--ant-color-text-quaternary, #bbb);
  flex-shrink: 0;
  padding-left: 8px;
}

.skill-editor__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.skill-editor__content-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  border-bottom: 1px solid var(--ant-color-border-secondary, #f0f0f0);
  flex-shrink: 0;
}

.skill-editor__content-path {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
}

.skill-editor__dirty-dot {
  color: var(--ant-color-warning, #faad14);
  font-size: 16px;
}

.skill-editor__content-actions {
  display: flex;
  gap: 8px;
}

.skill-editor__content-body {
  flex: 1;
  display: flex;
  min-height: 0;
}

.skill-editor__content-body :deep(.ant-spin-container) {
  flex: 1;
  display: flex;
}

.skill-editor__textarea {
  flex: 1;
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.6;
  border: none !important;
  border-radius: 0 !important;
  resize: none !important;
  box-shadow: none !important;
  height: 100% !important;
}

.skill-editor__textarea:focus {
  box-shadow: none !important;
}

.skill-editor__empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Context menu */
.context-menu {
  position: fixed;
  z-index: 9999;
  min-width: 160px;
  padding: 4px 0;
  background: var(--ant-color-bg-elevated, #fff);
  border-radius: 8px;
  box-shadow: 0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05);
}

.context-menu-item {
  padding: 5px 16px;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s;
}

.context-menu-item:hover {
  background: var(--ant-color-bg-text-hover, #f5f5f5);
}

.context-menu-item--danger {
  color: var(--ant-color-error, #ff4d4f);
}

.context-menu-divider {
  height: 1px;
  margin: 4px 0;
  background: var(--ant-color-border-secondary, #f0f0f0);
}
</style>
