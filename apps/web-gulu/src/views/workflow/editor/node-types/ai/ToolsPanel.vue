<script setup lang="ts">
/**
 * 工具面板：内置工具选择 + MCP 服务器 + 最大调用轮次
 */
import { computed, onMounted, ref } from 'vue';

import {
  Button,
  Checkbox,
  Form,
  Input,
  InputNumber,
  Modal,
  Spin,
  Tag,
  message,
} from 'ant-design-vue';

import { type McpServer, getMcpServerListApi } from '#/api/mcp-server';

import type { AIConfig } from './types';
import { builtinTools } from './types';

interface Props {
  config: AIConfig;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update', patch: Partial<AIConfig>): void;
}>();

// MCP 服务器
const mcpServerList = ref<McpServer[]>([]);
const mcpServerLoading = ref(false);

// 工具选择弹窗
const toolModalVisible = ref(false);
const toolSearchKeyword = ref('');

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

onMounted(() => {
  loadMcpServers();
});
</script>

<template>
  <Form layout="vertical" class="config-form">
    <!-- 内置工具 -->
    <div class="tools-section-title">
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
    <!-- 已选工具列表 -->
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
        style="width: 100%"
        @change="(val: any) => emit('update', { max_tool_rounds: val })"
      />
      <div class="param-hint">
        AI 模型调用工具的最大轮次，防止无限循环
      </div>
    </Form.Item>
  </Form>

  <!-- 工具选择弹窗 -->
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
  margin-top: 10px;
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

/* 工具选择弹窗 */
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
