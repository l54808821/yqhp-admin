<script setup lang="ts">
import type {
  CreateSkillParams,
  Skill,
  SkillResource,
  UpdateSkillParams,
} from '#/api/skill';

import { ref, watch } from 'vue';

import {
  Button,
  Col,
  Empty,
  Form,
  Input,
  InputNumber,
  Drawer,
  message,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Switch,
  Tabs,
  Tag,
} from 'ant-design-vue';

import {
  createSkillApi,
  createSkillResourceApi,
  deleteSkillResourceApi,
  getSkillResourcesApi,
  SKILL_CATEGORY_OPTIONS,
  SKILL_ICON_OPTIONS,
  updateSkillApi,
} from '#/api/skill';

const emit = defineEmits<{
  success: [];
}>();

const visible = ref(false);
const drawerTitle = ref('新增 Skill');
const editingId = ref<number | null>(null);
const submitLoading = ref(false);
const activeTab = ref('basic');

const formState = ref<CreateSkillParams & { tags: string[]; recommended_tools: string[] }>({
  name: '',
  slug: '',
  description: '',
  icon: '',
  category: '',
  tags: [],
  system_prompt: '',
  license: '',
  compatibility: '',
  allowed_tools: '',
  recommended_tools: [],
  recommended_mcp_server_ids: [],
  sort: 0,
  status: 1,
});

// 资源文件
const resourceList = ref<SkillResource[]>([]);
const resourceLoading = ref(false);
const addResourceVisible = ref(false);
const addResourceForm = ref({
  category: 'scripts' as 'scripts' | 'references' | 'assets',
  filename: '',
  content: '',
});

function generateSlugFromName(name: string): string {
  if (!name?.trim()) return '';
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[\u4e00-\u9fff]/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function handleGenerateSlug() {
  formState.value.slug = generateSlugFromName(formState.value.name);
}

watch(
  () => formState.value.name,
  (name) => {
    if (!formState.value.slug && name) {
      formState.value.slug = generateSlugFromName(name);
    }
  },
);

const customTagInput = ref('');

const categoryOptions = SKILL_CATEGORY_OPTIONS.map((c) => ({ label: c, value: c }));
const iconOptions = SKILL_ICON_OPTIONS.map((i) => ({ label: `${i.label} (${i.value})`, value: i.value }));
const toolOptions = [
  { label: 'HTTP 请求工具', value: 'http_request' },
  { label: '变量读取工具', value: 'var_read' },
  { label: '变量写入工具', value: 'var_write' },
  { label: 'JSON 解析工具', value: 'json_parse' },
  { label: '人机交互工具', value: 'human_interaction' },
];
const resourceCategoryOptions = [
  { label: 'scripts（可执行脚本）', value: 'scripts' },
  { label: 'references（参考文档）', value: 'references' },
  { label: 'assets（模板和资源）', value: 'assets' },
];

function open(record?: Skill) {
  resourceList.value = [];
  activeTab.value = 'basic';
  if (record) {
    drawerTitle.value = '编辑 Skill';
    editingId.value = record.id;
    formState.value = {
      name: record.name,
      slug: record.slug || '',
      description: record.description || '',
      icon: record.icon || '',
      category: record.category || '',
      tags: record.tags || [],
      system_prompt: record.system_prompt,
      license: record.license || '',
      compatibility: record.compatibility || '',
      allowed_tools: record.allowed_tools || '',
      recommended_model_params: record.recommended_model_params || undefined,
      recommended_tools: record.recommended_tools || [],
      recommended_mcp_server_ids: record.recommended_mcp_server_ids || [],
      sort: record.sort || 0,
      status: record.status,
    };
    loadResources(record.id);
  } else {
    drawerTitle.value = '新增 Skill';
    editingId.value = null;
    formState.value = {
      name: '',
      slug: '',
      description: '',
      icon: '',
      category: '',
      tags: [],
      system_prompt: '',
      license: '',
      compatibility: '',
      allowed_tools: '',
      recommended_tools: [],
      recommended_mcp_server_ids: [],
      sort: 0,
      status: 1,
    };
  }
  visible.value = true;
}

async function loadResources(skillId: number) {
  resourceLoading.value = true;
  try {
    resourceList.value = await getSkillResourcesApi(skillId) || [];
  } catch {
    resourceList.value = [];
  } finally {
    resourceLoading.value = false;
  }
}

function getCategoryTagColor(cat: string): string {
  switch (cat) {
    case 'scripts': return 'blue';
    case 'references': return 'green';
    case 'assets': return 'orange';
    default: return 'default';
  }
}

function formatSize(bytes: number): string {
  if (!bytes) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  return (bytes / 1024).toFixed(1) + ' KB';
}

function openAddResource() {
  addResourceForm.value = { category: 'scripts', filename: '', content: '' };
  addResourceVisible.value = true;
}

async function handleAddResource() {
  if (!addResourceForm.value.filename.trim()) return message.warning('请输入文件名');
  if (!editingId.value) return;
  try {
    await createSkillResourceApi(editingId.value, {
      category: addResourceForm.value.category,
      filename: addResourceForm.value.filename.trim(),
      content: addResourceForm.value.content,
    });
    message.success('资源文件添加成功');
    addResourceVisible.value = false;
    loadResources(editingId.value);
  } catch {
    message.error('添加失败');
  }
}

async function handleDeleteResource(resourceId: number) {
  if (!editingId.value) return;
  try {
    await deleteSkillResourceApi(editingId.value, resourceId);
    message.success('已删除');
    loadResources(editingId.value);
  } catch {
    message.error('删除失败');
  }
}

async function handleSubmit() {
  if (!formState.value.name) return message.warning('请输入 Skill 名称');
  if (!formState.value.system_prompt) return message.warning('请输入系统提示词');

  submitLoading.value = true;
  try {
    if (editingId.value) {
      const params: UpdateSkillParams = { ...formState.value };
      await updateSkillApi(editingId.value, params);
      message.success('更新成功');
    } else {
      await createSkillApi(formState.value);
      message.success('创建成功');
    }
    visible.value = false;
    emit('success');
  } catch {
    message.error('操作失败');
  } finally {
    submitLoading.value = false;
  }
}

function addCustomTag() {
  const tag = customTagInput.value.trim();
  if (tag && !formState.value.tags?.includes(tag)) {
    if (!formState.value.tags) formState.value.tags = [];
    formState.value.tags.push(tag);
    customTagInput.value = '';
  }
}

function removeCustomTag(tag: string) {
  if (formState.value.tags) {
    formState.value.tags = formState.value.tags.filter((t) => t !== tag);
  }
}

defineExpose({ open });
</script>

<template>
  <Drawer
    v-model:open="visible"
    :title="drawerTitle"
    width="75%"
    :body-style="{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }"
    :destroy-on-close="false"
  >
    <Tabs v-model:activeKey="activeTab" class="skill-tabs">
        <!-- Tab 1: 基本信息 -->
        <Tabs.TabPane key="basic" tab="基本信息">
          <div class="tab-content">
            <Form :model="formState" layout="vertical">
              <Row :gutter="24">
                <Col :span="12">
                  <Form.Item label="Skill 名称" required>
                    <Input v-model:value="formState.name" placeholder="如：代码审查专家" />
                  </Form.Item>
                </Col>
                <Col :span="12">
                  <Form.Item label="Slug" extra="kebab-case 格式，如 code-review">
                    <div style="display: flex; gap: 8px">
                      <Input v-model:value="formState.slug" placeholder="如 code-review" style="flex: 1" />
                      <Button size="small" @click="handleGenerateSlug">生成</Button>
                    </div>
                  </Form.Item>
                </Col>
              </Row>
              <Row :gutter="24">
                <Col :span="8">
                  <Form.Item label="分类">
                    <Select v-model:value="formState.category" placeholder="选择分类" :options="categoryOptions" allow-clear style="width: 100%" />
                  </Form.Item>
                </Col>
                <Col :span="8">
                  <Form.Item label="图标">
                    <Select v-model:value="formState.icon" placeholder="选择图标" :options="iconOptions" allow-clear show-search style="width: 100%" />
                  </Form.Item>
                </Col>
                <Col :span="8">
                  <Form.Item label="状态">
                    <Switch
                      v-model:checked="formState.status"
                      :checked-value="1"
                      :un-checked-value="0"
                      checked-children="启用"
                      un-checked-children="禁用"
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item label="描述">
                <Input.TextArea
                  v-model:value="formState.description"
                  placeholder="描述 Skill 的功能和适用场景（建议包含 Use when... 触发词）"
                  :rows="3"
                />
              </Form.Item>
              <Form.Item label="标签">
                <div class="mb-2">
                  <Tag v-for="tag in formState.tags" :key="tag" closable @close="removeCustomTag(tag)">{{ tag }}</Tag>
                </div>
                <Space>
                  <Input v-model:value="customTagInput" placeholder="输入标签" style="width: 200px" @press-enter="addCustomTag" />
                  <Button type="dashed" size="small" @click="addCustomTag">添加</Button>
                </Space>
              </Form.Item>
              <Form.Item label="推荐内置工具">
                <Select
                  v-model:value="formState.recommended_tools"
                  mode="multiple"
                  placeholder="选择推荐使用的内置工具"
                  :options="toolOptions"
                  style="width: 100%"
                />
              </Form.Item>
              <Row :gutter="24">
                <Col :span="12">
                  <Form.Item label="排序">
                    <InputNumber v-model:value="formState.sort" :min="0" style="width: 100%" />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </div>
        </Tabs.TabPane>

        <!-- Tab 2: 系统提示词 -->
        <Tabs.TabPane key="prompt" tab="系统提示词">
          <div class="tab-content">
            <Input.TextArea
              v-model:value="formState.system_prompt"
              placeholder="设定 AI 的角色、能力和行为规范（SKILL.md body 内容）"
              class="prompt-textarea prompt-textarea--full"
            />
          </div>
        </Tabs.TabPane>

        <!-- Tab 3: 资源文件（仅编辑模式） -->
        <Tabs.TabPane v-if="editingId" key="resources">
          <template #tab>
            资源文件
            <span v-if="resourceList.length > 0" class="tab-badge">{{ resourceList.length }}</span>
          </template>
          <div class="tab-content">
            <div class="resource-toolbar">
              <span class="resource-hint">
                管理 scripts/、references/、assets/ 目录下的资源文件
              </span>
              <Button type="primary" size="small" @click="openAddResource">+ 添加文件</Button>
            </div>

            <div v-if="resourceList.length > 0" class="resource-list">
              <div v-for="res in resourceList" :key="res.id" class="resource-item">
                <div class="resource-item__info">
                  <Tag :color="getCategoryTagColor(res.category)" size="small">{{ res.category }}</Tag>
                  <span class="resource-item__name">{{ res.filename }}</span>
                  <span class="resource-item__meta">{{ res.content_type }} / {{ formatSize(res.size) }}</span>
                </div>
                <Popconfirm title="确定删除该资源文件？" @confirm="handleDeleteResource(res.id)">
                  <Button type="text" size="small" danger>删除</Button>
                </Popconfirm>
              </div>
            </div>
            <Empty
              v-else-if="!resourceLoading"
              :image="Empty.PRESENTED_IMAGE_SIMPLE"
              description="暂无资源文件，点击上方按钮添加 scripts、references 或 assets"
            />
          </div>
        </Tabs.TabPane>

        <!-- Tab 4: Agent Skills 规范 -->
        <Tabs.TabPane key="spec" tab="Agent Skills 规范">
          <div class="tab-content">
            <Form :model="formState" layout="vertical">
              <Row :gutter="24">
                <Col :span="12">
                  <Form.Item label="License" extra="许可证名称或引用文件">
                    <Input v-model:value="formState.license" placeholder="如 Apache-2.0" />
                  </Form.Item>
                </Col>
                <Col :span="12">
                  <Form.Item label="Compatibility" extra="运行环境要求">
                    <Input v-model:value="formState.compatibility" placeholder="如 Requires git, docker" />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item label="Allowed Tools" extra="预批准工具列表（空格分隔）">
                <Input v-model:value="formState.allowed_tools" placeholder="如 Bash(git:*) Bash(jq:*) Read" />
              </Form.Item>
              <div class="spec-tip">
                以上字段遵循
                <a href="https://agentskills.io/specification" target="_blank" rel="noopener">Agent Skills 开放标准</a>
                ，导出时会生成标准的 SKILL.md 文件。
              </div>
            </Form>
          </div>
        </Tabs.TabPane>
    </Tabs>

    <!-- 底部按钮 -->
    <template #footer>
      <div style="display: flex; justify-content: flex-end; gap: 8px">
        <Button @click="visible = false">取消</Button>
        <Button type="primary" :loading="submitLoading" @click="handleSubmit">
          {{ editingId ? '保存' : '创建' }}
        </Button>
      </div>
    </template>
  </Drawer>

  <!-- 添加资源文件弹窗 -->
  <Modal
    v-model:open="addResourceVisible"
    title="添加资源文件"
    :width="640"
    @ok="handleAddResource"
  >
    <Form :model="addResourceForm" layout="vertical">
      <Row :gutter="16">
        <Col :span="10">
          <Form.Item label="类别" required>
            <Select v-model:value="addResourceForm.category" :options="resourceCategoryOptions" style="width: 100%" />
          </Form.Item>
        </Col>
        <Col :span="14">
          <Form.Item label="文件名" required>
            <Input v-model:value="addResourceForm.filename" placeholder="如 extract.py、REFERENCE.md" />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item label="文件内容">
        <Input.TextArea
          v-model:value="addResourceForm.content"
          :rows="16"
          placeholder="输入文件内容"
          class="prompt-textarea"
        />
      </Form.Item>
    </Form>
  </Modal>
</template>

<style scoped>
.skill-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.skill-tabs :deep(.ant-tabs-nav) {
  padding: 0 24px;
  margin-bottom: 0;
  flex-shrink: 0;
}

.skill-tabs :deep(.ant-tabs-content-holder) {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.skill-tabs :deep(.ant-tabs-content) {
  height: 100%;
}

.skill-tabs :deep(.ant-tabs-tabpane) {
  height: 100%;
}

.tab-content {
  padding: 24px;
  height: 100%;
  overflow-y: auto;
}

.prompt-textarea {
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.6;
}

.prompt-textarea--full {
  height: calc(100% - 8px) !important;
  min-height: 500px;
  resize: none;
}

.tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  margin-left: 6px;
  font-size: 11px;
  font-weight: 500;
  color: var(--ant-color-primary);
  background: var(--ant-color-primary-bg);
  border-radius: 9px;
}

.resource-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.resource-hint {
  font-size: 13px;
  color: var(--ant-color-text-secondary);
}

.resource-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.resource-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-radius: 8px;
  border: 1px solid var(--ant-color-border, #d9d9d9);
  background: var(--ant-color-bg-container, #fff);
  transition: all 0.2s;
}

.resource-item:hover {
  border-color: var(--ant-color-primary, #1677ff);
  background: var(--ant-color-primary-bg, #e6f4ff);
}

.resource-item__info {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.resource-item__info :deep(.ant-tag) {
  margin: 0;
  flex-shrink: 0;
}

.resource-item__name {
  font-size: 13px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.resource-item__meta {
  font-size: 11px;
  color: var(--ant-color-text-secondary, #999);
  flex-shrink: 0;
}

.spec-tip {
  margin-top: 16px;
  padding: 12px 16px;
  font-size: 13px;
  color: var(--ant-color-text-secondary);
  background: var(--ant-color-bg-layout);
  border-radius: 8px;
}

.spec-tip a {
  color: var(--ant-color-primary);
}
</style>
