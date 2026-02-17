<script setup lang="ts">
/**
 * 工具面板：Skill 能力 + 内置工具选择 + MCP 服务器 + 最大调用轮次
 */
import { computed, onMounted, ref } from 'vue';

import {
  Button,
  Checkbox,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Spin,
  Tag,
  message,
} from 'ant-design-vue';

import { type McpServer, getMcpServerListApi } from '#/api/mcp-server';
import type { Skill } from '#/api/skill';
import { getSkillListApi } from '#/api/skill';

import type { AIConfig } from './types';
import { builtinTools } from './types';

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

// Skill 分类选项（从数据中提取）
const skillCategoryOptions = computed(() => {
  const cats = new Set<string>();
  skillList.value.forEach((s) => { if (s.category) cats.add(s.category); });
  return [...cats].map((c) => ({ label: c, value: c }));
});

const availableTools = computed(() => {
  const selected = props.config?.tools || [];
  const keyword = toolSearchKeyword.value.toLowerCase();
  return builtinTools.filter(
    (t) =>
      !selected.includes(t.name) &&
      (!keyword ||
        t.label.toLowerCase().includes(keyword) ||
        t.description.toLowerCase().includes(keyword)),
  );
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

function handleMcpServerChange(selectedIds: number[]) {
  emit('update', { mcp_server_ids: selectedIds });
}

function getCategoryColor(category: string): string {
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

onMounted(() => {
  loadSkills();
  loadMcpServers();
});
</script>

<template>
  <Form layout="vertical" class="config-form">
    <!-- Skill 能力 -->
    <div class="tools-section-title">
      Skill 能力
      <Button
        type="primary"
        size="small"
        style="margin-left: auto"
        @click="openSkillModal"
      >
        + 添加 Skill
      </Button>
    </div>
    <div class="skill-hint">
      AI 会根据用户问题自动选择调用已挂载的 Skill。
    </div>

    <!-- 已选 Skill 列表 -->
    <div v-if="selectedSkills.length > 0" class="selected-tools-list">
      <div
        v-for="skill in selectedSkills"
        :key="skill.id"
        class="selected-tool-item"
      >
        <div class="selected-tool-info">
          <div class="selected-tool-header">
            <span class="selected-tool-name">{{ skill.name }}</span>
            <Tag v-if="skill.type === 1" color="gold" size="small">内置</Tag>
            <Tag v-if="skill.category" :color="getCategoryColor(skill.category)" size="small">
              {{ skill.category }}
            </Tag>
          </div>
          <span class="selected-tool-desc">{{ skill.description }}</span>
        </div>
        <Button type="text" size="small" danger @click="removeSkill(skill.id)">
          移除
        </Button>
      </div>
    </div>
    <div v-else class="tools-empty-hint">
      暂未添加 Skill，点击上方按钮添加
    </div>

    <!-- 内置工具 -->
    <div class="tools-section-title" style="margin-top: 20px">
      内置工具
      <Button
        type="primary"
        size="small"
        style="margin-left: auto"
        @click="toolModalVisible = true"
      >
        + 添加工具
      </Button>
    </div>
    <div v-if="(config.tools || []).length > 0" class="selected-tools-list">
      <div
        v-for="toolName in config.tools"
        :key="toolName"
        class="selected-tool-item"
      >
        <div class="selected-tool-info">
          <span class="selected-tool-name">{{
            builtinTools.find((t) => t.name === toolName)?.label || toolName
          }}</span>
          <span class="selected-tool-desc">{{
            builtinTools.find((t) => t.name === toolName)?.description
          }}</span>
        </div>
        <Button type="text" size="small" danger @click="removeTool(toolName)">
          移除
        </Button>
      </div>
    </div>
    <div v-else class="tools-empty-hint">
      暂未添加工具，点击上方按钮添加
    </div>

    <!-- MCP 服务器选择 -->
    <div class="tools-section-title" style="margin-top: 20px">
      MCP 服务器
      <Button
        type="link"
        size="small"
        :loading="mcpServerLoading"
        style="padding: 0; margin-left: 8px"
        @click="loadMcpServers"
      >
        刷新
      </Button>
    </div>
    <Spin :spinning="mcpServerLoading">
      <div
        v-if="mcpServerList.length === 0 && !mcpServerLoading"
        class="mcp-empty"
      >
        暂无可用的 MCP 服务器
      </div>
      <Checkbox.Group
        v-else
        :value="config.mcp_server_ids || []"
        class="mcp-server-group"
        @change="(val: any) => handleMcpServerChange(val as number[])"
      >
        <div
          v-for="server in mcpServerList"
          :key="server.id"
          class="mcp-server-item"
        >
          <Checkbox :value="server.id">
            <span class="mcp-server-name">{{ server.name }}</span>
            <Tag
              size="small"
              :color="server.transport === 'stdio' ? 'blue' : 'green'"
            >
              {{ server.transport }}
            </Tag>
          </Checkbox>
          <div v-if="server.description" class="mcp-server-desc">
            {{ server.description }}
          </div>
        </div>
      </Checkbox.Group>
    </Spin>

    <!-- 最大工具调用轮次 -->
    <Form.Item label="最大工具调用轮次" style="margin-top: 20px">
      <InputNumber
        :value="config.max_tool_rounds"
        :min="1"
        :max="50"
        :placeholder="'默认 10 轮'"
        style="width: 100%"
        @change="(val: any) => emit('update', { max_tool_rounds: val })"
      />
      <div class="param-hint">
        AI 模型调用工具（含 Skill）的最大轮次，防止无限循环。为空时默认 10 轮。
      </div>
    </Form.Item>
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
            <Tag v-if="skill.category" :color="getCategoryColor(skill.category)" size="small">
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

  <!-- 内置工具选择弹窗 -->
  <Modal
    v-model:open="toolModalVisible"
    title="添加工具"
    :footer="null"
    :width="420"
    :destroyOnClose="true"
    @cancel="toolSearchKeyword = ''"
  >
    <Input
      v-model:value="toolSearchKeyword"
      placeholder="搜索工具..."
      allowClear
      style="margin-bottom: 12px"
    />
    <div class="tool-modal-list">
      <div
        v-for="tool in availableTools"
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
      <div v-if="availableTools.length === 0" class="tool-modal-empty">
        {{ toolSearchKeyword ? '没有匹配的工具' : '所有工具已添加' }}
      </div>
    </div>
  </Modal>
</template>

<style scoped>
.config-form {
  padding-top: 0;
}

.param-hint {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.skill-hint {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  margin-bottom: 10px;
}

.tools-section-title {
  font-size: 13px;
  font-weight: 500;
  color: hsl(var(--foreground));
  margin-bottom: 8px;
  display: flex;
  align-items: center;
}

.selected-tools-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.selected-tool-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid hsl(var(--border));
  background: hsl(var(--card));
  transition: all 0.2s;
}

.selected-tool-item:hover {
  border-color: hsl(var(--primary) / 40%);
  background: hsl(var(--primary) / 4%);
}

.selected-tool-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.selected-tool-header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.selected-tool-header :deep(.ant-tag) {
  margin: 0;
  font-size: 10px;
  line-height: 16px;
  padding: 0 4px;
}

.selected-tool-name {
  font-size: 13px;
  font-weight: 500;
  color: hsl(var(--foreground));
}

.selected-tool-desc {
  font-size: 11px;
  color: hsl(var(--muted-foreground));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tools-empty-hint {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  padding: 16px 0;
  text-align: center;
}

/* Skill 选择弹窗 */
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
  padding: 10px 12px;
  border-radius: 8px;
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
  gap: 4px;
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
  padding: 24px 0;
  color: hsl(var(--muted-foreground));
  font-size: 13px;
}

/* 内置工具选择弹窗 */
.tool-modal-list {
  max-height: 360px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tool-modal-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: 8px;
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
  padding: 24px 0;
  color: hsl(var(--muted-foreground));
  font-size: 13px;
}

.mcp-empty {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  padding: 12px 0;
}

.mcp-server-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
}

.mcp-server-item {
  padding: 6px 0;
}

.mcp-server-name {
  margin-right: 6px;
}

.mcp-server-desc {
  font-size: 11px;
  color: hsl(var(--muted-foreground));
  margin-left: 24px;
  margin-top: 2px;
}
</style>
