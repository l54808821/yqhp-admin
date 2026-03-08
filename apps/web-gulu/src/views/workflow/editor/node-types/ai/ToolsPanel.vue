<script setup lang="ts">
/**
 * 工具面板：内置工具（分类展示）+ Skill 能力 + MCP 服务器
 */
import { computed, onMounted, ref } from 'vue';

import {
  Button,
  Form,
  Input,
  Modal,
  Select,
  Tag,
  Tooltip,
  message,
} from 'ant-design-vue';

import { createIconifyIcon } from '@vben/icons';

const XIcon = createIconifyIcon('lucide:x');

import { type McpServer, getMcpServerListApi } from '#/api/mcp-server';
import type { Skill } from '#/api/skill';
import { getSkillListApi } from '#/api/skill';

import type { AIConfig } from './types';
import { builtinTools, toolCategoryLabels } from './types';

interface Props {
  config: AIConfig;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update', patch: Partial<AIConfig>): void;
}>();

// Skill 列表
const skillList = ref<Skill[]>([]);
const skillLoading = ref(false);
const skillModalVisible = ref(false);
const skillSearchKeyword = ref('');
const skillFilterCategory = ref<string | undefined>(undefined);

// MCP 服务器
const mcpServerList = ref<McpServer[]>([]);
const mcpServerLoading = ref(false);

// 内置工具选择弹窗
const toolModalVisible = ref(false);
const toolSearchKeyword = ref('');
const toolFilterCategory = ref<string | undefined>(undefined);

// 已选中的 Skill 列表
const selectedSkills = computed(() => {
  const ids = props.config?.skill_ids || [];
  return skillList.value.filter((s) => ids.includes(s.id));
});

// 弹窗中可选的 Skill（排除已选）
const availableSkills = computed(() => {
  const selectedIds = props.config?.skill_ids || [];
  const keyword = skillSearchKeyword.value.toLowerCase();
  const category = skillFilterCategory.value;
  return skillList.value.filter((s) => {
    if (selectedIds.includes(s.id)) return false;
    if (keyword && !s.name.toLowerCase().includes(keyword) && !(s.description || '').toLowerCase().includes(keyword)) return false;
    if (category && s.category !== category) return false;
    return true;
  });
});

// Skill 分类选项
const skillCategoryOptions = computed(() => {
  const cats = new Set<string>();
  skillList.value.forEach((s) => { if (s.category) cats.add(s.category); });
  return [...cats].map((c) => ({ label: c, value: c }));
});

// 工具分类选项
const toolCategoryOptions = computed(() => {
  const cats = new Set<string>();
  builtinTools.forEach((t) => cats.add(t.category));
  return [...cats].map((c) => ({ label: toolCategoryLabels[c] || c, value: c }));
});

// 按分类分组已选工具
const selectedToolsByCategory = computed(() => {
  const tools = props.config?.tools || [];
  const groups: Record<string, typeof builtinTools> = {};
  for (const toolName of tools) {
    const tool = builtinTools.find((t) => t.name === toolName);
    if (tool) {
      const cat = tool.category;
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(tool);
    }
  }
  return groups;
});

const availableTools = computed(() => {
  const selected = props.config?.tools || [];
  const keyword = toolSearchKeyword.value.toLowerCase();
  const category = toolFilterCategory.value;
  return builtinTools.filter(
    (t) =>
      !selected.includes(t.name) &&
      (!keyword ||
        t.label.toLowerCase().includes(keyword) ||
        t.description.toLowerCase().includes(keyword)) &&
      (!category || t.category === category),
  );
});

// 弹窗中按分类分组
const availableToolsByCategory = computed(() => {
  const groups: Record<string, typeof builtinTools> = {};
  for (const tool of availableTools.value) {
    const cat = tool.category;
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(tool);
  }
  return groups;
});

function addSkill(skillId: number) {
  const ids = [...(props.config.skill_ids || [])];
  if (!ids.includes(skillId)) {
    ids.push(skillId);
  }
  emit('update', { skill_ids: ids });
}

function removeSkill(skillId: number) {
  const ids = (props.config.skill_ids || []).filter((id: number) => id !== skillId);
  emit('update', { skill_ids: ids });
}

function addTool(toolName: string) {
  const tools = [...(props.config.tools || [])];
  if (!tools.includes(toolName)) {
    tools.push(toolName);
  }
  emit('update', { tools });
}

function removeTool(toolName: string) {
  const tools = (props.config.tools || []).filter((t: string) => t !== toolName);
  emit('update', { tools });
}

const mcpServerOptions = computed(() =>
  mcpServerList.value.map((s) => ({
    label: s.name,
    value: s.id,
  })),
);

function mcpFilterOption(input: string, option: any) {
  return (option?.label ?? '').toLowerCase().includes(input.toLowerCase());
}

function handleMcpServerChange(selectedIds: number[]) {
  emit('update', { mcp_server_ids: selectedIds });
}

function getToolCategoryColor(category: string): string {
  const colorMap: Record<string, string> = {
    basic: 'default',
    web: 'blue',
    code: 'purple',
    interaction: 'green',
  };
  return colorMap[category] || 'default';
}

function getSkillCategoryColor(category: string): string {
  const colorMap: Record<string, string> = {
    '编程': 'blue',
    '测试': 'green',
    '写作': 'purple',
    '翻译': 'cyan',
    '分析': 'orange',
  };
  return colorMap[category] || 'default';
}

async function loadSkills() {
  skillLoading.value = true;
  try {
    const res = await getSkillListApi({ page: 1, pageSize: 100, status: 1 });
    skillList.value = res.list || [];
  } catch {
    // ignore
  } finally {
    skillLoading.value = false;
  }
}

async function loadMcpServers() {
  mcpServerLoading.value = true;
  try {
    const res = await getMcpServerListApi({ status: 1, pageSize: 100 });
    mcpServerList.value = res.list || [];
  } catch (error: any) {
    message.error('加载 MCP 服务器列表失败: ' + (error.message || '未知错误'));
  } finally {
    mcpServerLoading.value = false;
  }
}

function openSkillModal() {
  skillSearchKeyword.value = '';
  skillFilterCategory.value = undefined;
  skillModalVisible.value = true;
}

function openToolModal() {
  toolSearchKeyword.value = '';
  toolFilterCategory.value = undefined;
  toolModalVisible.value = true;
}

onMounted(() => {
  loadSkills();
  loadMcpServers();
});
</script>

<template>
  <Form layout="vertical" class="config-form">
    <!-- 内置工具 -->
    <div class="tools-section-title">
      内置工具
      <Tag size="small" color="processing">{{ (config.tools || []).length }} / {{ builtinTools.length }}</Tag>
      <Button
        type="primary"
        size="small"
        style="margin-left: auto"
        @click="openToolModal"
      >
        + 添加
      </Button>
    </div>

    <div v-if="(config.tools || []).length > 0" class="tool-chips-wrap">
      <template v-for="(tools, category) in selectedToolsByCategory" :key="category">
        <Tooltip v-for="tool in tools" :key="tool.name" :title="tool.description" placement="top">
          <span class="tool-chip" :class="`tool-chip--${category}`">
            {{ tool.label }}
            <XIcon class="tool-chip-x" @click.stop="removeTool(tool.name)" />
          </span>
        </Tooltip>
      </template>
    </div>
    <div v-else class="tools-empty-hint">
      暂未添加工具
    </div>

    <!-- Skill 能力 -->
    <div class="tools-section-title" style="margin-top: 10px">
      Skill 能力
      <Button
        type="primary"
        size="small"
        style="margin-left: auto"
        @click="openSkillModal"
      >
        + 添加
      </Button>
    </div>

    <div v-if="selectedSkills.length > 0" class="tool-chips-wrap">
      <Tooltip v-for="skill in selectedSkills" :key="skill.id" :title="skill.description" placement="top">
        <span class="tool-chip tool-chip--skill">
          {{ skill.name }}
          <XIcon class="tool-chip-x" @click.stop="removeSkill(skill.id)" />
        </span>
      </Tooltip>
    </div>
    <div v-else class="tools-empty-hint">
      暂未添加 Skill
    </div>

    <!-- MCP 服务器 -->
    <div class="tools-section-title" style="margin-top: 10px">
      MCP 服务器
    </div>
    <Select
      mode="multiple"
      :value="config.mcp_server_ids || []"
      :loading="mcpServerLoading"
      placeholder="选择 MCP 服务器..."
      :options="mcpServerOptions"
      :filter-option="mcpFilterOption"
      style="width: 100%"
      size="small"
      allow-clear
      @change="(val: any) => handleMcpServerChange(val as number[])"
    />

  </Form>

  <!-- Skill 选择弹窗 -->
  <Modal
    v-model:open="skillModalVisible"
    title="添加 Skill 能力"
    :footer="null"
    :width="520"
    :destroyOnClose="true"
    @cancel="skillSearchKeyword = ''; skillFilterCategory = undefined"
  >
    <div class="skill-modal-filters">
      <Input
        v-model:value="skillSearchKeyword"
        placeholder="搜索 Skill 名称或描述..."
        allowClear
        style="flex: 1"
      />
      <Select
        v-model:value="skillFilterCategory"
        placeholder="分类"
        allowClear
        :options="skillCategoryOptions"
        style="width: 120px"
      />
    </div>
    <div class="skill-modal-list">
      <div
        v-for="skill in availableSkills"
        :key="skill.id"
        class="skill-modal-item"
        @click="addSkill(skill.id)"
      >
        <div class="skill-modal-info">
          <div class="skill-modal-header">
            <span class="skill-modal-name">{{ skill.name }}</span>
            <Tag v-if="skill.type === 1" color="gold" size="small">内置</Tag>
            <Tag v-if="skill.category" :color="getSkillCategoryColor(skill.category)" size="small">
              {{ skill.category }}
            </Tag>
          </div>
          <span class="skill-modal-desc">{{ skill.description }}</span>
        </div>
        <Button type="link" size="small">添加</Button>
      </div>
      <div v-if="availableSkills.length === 0" class="skill-modal-empty">
        {{ skillSearchKeyword || skillFilterCategory ? '没有匹配的 Skill' : '所有 Skill 已添加' }}
      </div>
    </div>
  </Modal>

  <!-- 内置工具选择弹窗（分类展示） -->
  <Modal
    v-model:open="toolModalVisible"
    title="添加工具"
    :footer="null"
    :width="480"
    :destroyOnClose="true"
    @cancel="toolSearchKeyword = ''; toolFilterCategory = undefined"
  >
    <div class="tool-modal-filters">
      <Input
        v-model:value="toolSearchKeyword"
        placeholder="搜索工具..."
        allowClear
        style="flex: 1"
      />
      <Select
        v-model:value="toolFilterCategory"
        placeholder="分类"
        allowClear
        :options="toolCategoryOptions"
        style="width: 120px"
      />
    </div>
    <div class="tool-modal-list">
      <template v-for="(tools, category) in availableToolsByCategory" :key="category">
        <div class="tool-modal-category-header">
          <Tag :color="getToolCategoryColor(category as string)" size="small">
            {{ toolCategoryLabels[category as string] || category }}
          </Tag>
        </div>
        <div
          v-for="tool in tools"
          :key="tool.name"
          class="tool-modal-item"
          @click="addTool(tool.name)"
        >
          <div class="tool-modal-info">
            <span class="tool-modal-name">{{ tool.label }}</span>
            <span class="tool-modal-desc">{{ tool.description }}</span>
          </div>
          <Button type="link" size="small">添加</Button>
        </div>
      </template>
      <div v-if="availableTools.length === 0" class="tool-modal-empty">
        {{ toolSearchKeyword || toolFilterCategory ? '没有匹配的工具' : '所有工具已添加' }}
      </div>
    </div>
  </Modal>
</template>

<style scoped>
.config-form {
  padding-top: 0;
}

.tools-section-title {
  font-size: 13px;
  font-weight: 500;
  color: hsl(var(--foreground));
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.tools-section-title :deep(.ant-tag) {
  margin: 0;
}

/* ---- 工具 / Skill 芯片流式布局 ---- */
.tool-chips-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tool-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  font-size: 12px;
  line-height: 20px;
  border-radius: 4px;
  border: 1px solid hsl(var(--border));
  background: hsl(var(--card));
  color: hsl(var(--foreground));
  cursor: default;
  transition: border-color 0.15s, background 0.15s;
  white-space: nowrap;
}

.tool-chip:hover {
  border-color: hsl(var(--primary) / 50%);
  background: hsl(var(--primary) / 6%);
}

.tool-chip--web { border-color: hsl(210 80% 70% / 40%); }
.tool-chip--code { border-color: hsl(270 60% 70% / 40%); }
.tool-chip--file { border-color: hsl(30 70% 60% / 40%); }
.tool-chip--interaction { border-color: hsl(145 60% 50% / 40%); }
.tool-chip--skill { border-color: hsl(200 70% 60% / 40%); }

.tool-chip-x {
  width: 12px;
  height: 12px;
  color: hsl(var(--muted-foreground) / 60%);
  cursor: pointer;
  flex-shrink: 0;
  transition: color 0.15s;
  border-radius: 2px;
}

.tool-chip-x:hover {
  color: hsl(var(--destructive, 0 84% 60%));
}

.tools-empty-hint {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  padding: 6px 0;
  text-align: center;
}

/* ---- Skill 选择弹窗 ---- */
.skill-modal-filters {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.skill-modal-list {
  max-height: 400px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.skill-modal-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid hsl(var(--border));
  cursor: pointer;
  transition: all 0.2s;
}

.skill-modal-item:hover {
  border-color: hsl(var(--primary));
  background: hsl(var(--primary) / 6%);
}

.skill-modal-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  flex: 1;
}

.skill-modal-header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.skill-modal-header :deep(.ant-tag) {
  margin: 0;
  font-size: 10px;
  line-height: 16px;
  padding: 0 4px;
}

.skill-modal-name {
  font-size: 13px;
  font-weight: 500;
  color: hsl(var(--foreground));
}

.skill-modal-desc {
  font-size: 11px;
  color: hsl(var(--muted-foreground));
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.skill-modal-empty {
  text-align: center;
  padding: 20px 0;
  color: hsl(var(--muted-foreground));
  font-size: 13px;
}

/* ---- 内置工具选择弹窗 ---- */
.tool-modal-filters {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.tool-modal-list {
  max-height: 420px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tool-modal-category-header {
  padding: 6px 0 2px;
}

.tool-modal-category-header :deep(.ant-tag) {
  margin: 0;
  font-size: 11px;
}

.tool-modal-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid hsl(var(--border));
  cursor: pointer;
  transition: all 0.2s;
}

.tool-modal-item:hover {
  border-color: hsl(var(--primary));
  background: hsl(var(--primary) / 6%);
}

.tool-modal-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.tool-modal-name {
  font-size: 13px;
  font-weight: 500;
  color: hsl(var(--foreground));
}

.tool-modal-desc {
  font-size: 11px;
  color: hsl(var(--muted-foreground));
}

.tool-modal-empty {
  text-align: center;
  padding: 20px 0;
  color: hsl(var(--muted-foreground));
  font-size: 13px;
}
</style>
