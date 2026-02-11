<script setup lang="ts">
/**
 * AI 节点属性面板
 * 模型选择（从 AI 模型管理中选取） + 提示词配置 + 模型参数 + 执行模式 + 单步调试
 */
import { computed, onMounted, ref, watch } from 'vue';

import { createIconifyIcon } from '@vben/icons';
import {
  Button,
  Checkbox,
  Collapse,
  Empty,
  Form,
  Input,
  InputNumber,
  Select,
  Slider,
  Spin,
  Switch,
  Tabs,
  Tag,
  Tooltip,
  message,
} from 'ant-design-vue';

import { type AiModel, getAiModelListApi } from '#/api/ai-model';
import { executeApi } from '#/api/debug';
import { type McpServer, getMcpServerListApi } from '#/api/mcp-server';
import { useDebugContext } from '../../components/execution/composables/useDebugContext';

// 图标
const PlayIcon = createIconifyIcon('lucide:play');
const GripHorizontalIcon = createIconifyIcon('lucide:grip-horizontal');
const SparklesIcon = createIconifyIcon('lucide:sparkles');
const AlertCircleIcon = createIconifyIcon('lucide:alert-circle');

interface AIConfig {
  ai_model_id: number | null;
  ai_model_name: string;
  system_prompt: string;
  prompt: string;
  temperature: number;
  max_tokens: number;
  top_p: number;
  streaming: boolean;
  interactive: boolean;
  interaction_type: string;
  interaction_prompt: string;
  interaction_options: string[];
  interaction_timeout: number;
  interaction_default: string;
  timeout: number;
  tools: string[];
  mcp_server_ids: number[];
  max_tool_rounds: number;
}

interface AIStepNode {
  id: string;
  type: 'ai';
  name: string;
  config: AIConfig;
}

interface ToolCallRecord {
  round: number;
  tool_name: string;
  arguments: string;
  result: string;
  is_error: boolean;
  duration_ms: number;
}

interface AIDebugResponse {
  success: boolean;
  content: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  durationMs: number;
  error?: string;
  toolCalls?: ToolCallRecord[];
}

interface Props {
  node: AIStepNode;
  envId?: number;
  workflowId?: number;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update', node: AIStepNode): void;
}>();

// 调试上下文
const debugContext = useDebugContext();
const hasDebugCtx = computed(() => !!props.workflowId && debugContext.hasContext(props.workflowId));

// 本地数据
const localNode = ref<AIStepNode | null>(null);
const isDebugging = ref(false);
const debugResponse = ref<AIDebugResponse | null>(null);

// 分割面板相关
const containerRef = ref<HTMLElement | null>(null);
const isDragging = ref(false);
const editorPanelHeight = ref(60);

// 模型列表
const modelList = ref<AiModel[]>([]);
const modelLoading = ref(false);
// 交互类型选项
const interactionTypeOptions = [
  { value: 'confirm', label: '确认' },
  { value: 'input', label: '输入' },
  { value: 'select', label: '选择' },
];

// 交互选项文本
const interactionOptionsStr = ref('');

// 内置工具定义
const builtinTools = [
  { name: 'http_request', label: 'HTTP 请求工具', description: '发送 HTTP 请求到指定 URL' },
  { name: 'var_read', label: '变量读取工具', description: '从工作流上下文读取变量' },
  { name: 'var_write', label: '变量写入工具', description: '向工作流上下文写入变量' },
  { name: 'json_parse', label: 'JSON 解析工具', description: '解析 JSON 字符串并提取数据' },
];

// MCP 服务器列表
const mcpServerList = ref<McpServer[]>([]);
const mcpServerLoading = ref(false);

// 同步外部数据
watch(
  () => props.node,
  (newNode) => {
    if (newNode) {
      localNode.value = JSON.parse(JSON.stringify(newNode));
      if (!localNode.value!.config) {
        localNode.value!.config = {
          ai_model_id: null,
          ai_model_name: '',
          system_prompt: '',
          prompt: '',
          temperature: 0.7,
          max_tokens: 4096,
          top_p: 1,
          streaming: true,
          interactive: false,
          interaction_type: 'confirm',
          interaction_prompt: '',
          interaction_options: [],
          interaction_timeout: 300,
          interaction_default: '',
          timeout: 300,
          tools: [],
          mcp_server_ids: [],
          max_tool_rounds: 10,
        };
      }
      // 同步交互选项文本
      const opts = localNode.value!.config.interaction_options;
      interactionOptionsStr.value = Array.isArray(opts) ? opts.join('\n') : '';
    }
  },
  { immediate: true, deep: true },
);

watch(interactionOptionsStr, (val) => {
  if (localNode.value?.config) {
    localNode.value.config.interaction_options = val
      .split('\n')
      .map((s: string) => s.trim())
      .filter((s: string) => s);
    emitUpdate();
  }
});

// 获取已选中的模型详情
const selectedModel = computed(() => {
  if (!localNode.value?.config?.ai_model_id) return null;
  return modelList.value.find((m) => m.id === localNode.value!.config.ai_model_id) || null;
});

// 过滤后的模型列表（用于下拉选项）
const filteredModelOptions = computed(() => {
  return modelList.value.map((m) => ({
    value: m.id,
    label: m.name,
    model: m,
  }));
});

function emitUpdate() {
  if (localNode.value) {
    emit('update', JSON.parse(JSON.stringify(localNode.value)));
  }
}

// 加载模型列表
async function loadModels() {
  modelLoading.value = true;
  try {
    const res = await getAiModelListApi({ status: 1, pageSize: 100 });
    modelList.value = res.list || [];
  } catch (error: any) {
    message.error('加载模型列表失败: ' + (error.message || '未知错误'));
  } finally {
    modelLoading.value = false;
  }
}

// 选择模型
function handleModelSelect(modelId: number) {
  if (!localNode.value?.config) return;
  const model = modelList.value.find((m) => m.id === modelId);
  if (model) {
    localNode.value.config.ai_model_id = model.id;
    localNode.value.config.ai_model_name = model.name;
    emitUpdate();
  }
}

// 清除模型选择
function handleModelClear() {
  if (!localNode.value?.config) return;
  localNode.value.config.ai_model_id = null;
  localNode.value.config.ai_model_name = '';
  emitUpdate();
}

// 模型搜索过滤
function filterModelOption(input: string, option: any) {
  const model = option.model as AiModel;
  const keyword = input.toLowerCase();
  return (
    model.name.toLowerCase().includes(keyword) ||
    model.provider.toLowerCase().includes(keyword) ||
    model.model_id.toLowerCase().includes(keyword)
  );
}

// 能力标签颜色
function getCapabilityColor(tag: string): string {
  const colorMap: Record<string, string> = {
    '对话': 'blue',
    'Tools': 'green',
    'Coder': 'purple',
    '推理': 'orange',
    '视觉': 'cyan',
    'Math': 'red',
    'FIM': 'geekblue',
    'MoE': 'volcano',
  };
  return colorMap[tag] || 'default';
}

// 切换内置工具
function handleToolToggle(toolName: string, checked: boolean) {
  if (!localNode.value?.config) return;
  if (!Array.isArray(localNode.value.config.tools)) {
    localNode.value.config.tools = [];
  }
  if (checked) {
    if (!localNode.value.config.tools.includes(toolName)) {
      localNode.value.config.tools.push(toolName);
    }
  } else {
    localNode.value.config.tools = localNode.value.config.tools.filter((t: string) => t !== toolName);
  }
  emitUpdate();
}

// 判断工具是否启用
function isToolEnabled(toolName: string): boolean {
  return Array.isArray(localNode.value?.config?.tools) && localNode.value.config.tools.includes(toolName);
}

// MCP 服务器选择变更
function handleMcpServerChange(selectedIds: number[]) {
  if (!localNode.value?.config) return;
  localNode.value.config.mcp_server_ids = selectedIds;
  emitUpdate();
}

// 加载 MCP 服务器列表
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

// 截断文本
function truncateText(text: string, maxLen: number = 200): string {
  if (!text) return '';
  return text.length > maxLen ? text.slice(0, maxLen) + '...' : text;
}

// 执行 AI 节点（阻塞模式）
async function handleRun() {
  if (!localNode.value || isDebugging.value) return;

  if (!localNode.value.config.ai_model_id) {
    message.warning('请先选择 AI 模型');
    return;
  }
  if (!localNode.value.config.prompt?.trim()) {
    message.warning('请输入用户提示词');
    return;
  }

  isDebugging.value = true;

  // 获取调试上下文缓存的变量
  const cachedVariables = props.workflowId
    ? debugContext.getVariables(props.workflowId)
    : undefined;

  try {
    const response = await executeApi({
      step: {
        id: localNode.value.id,
        type: 'ai',
        name: localNode.value.name || 'AI 节点',
        config: {
          ai_model_id: localNode.value.config.ai_model_id,
          system_prompt: localNode.value.config.system_prompt || '',
          prompt: localNode.value.config.prompt || '',
          temperature: localNode.value.config.temperature,
          max_tokens: localNode.value.config.max_tokens,
          top_p: localNode.value.config.top_p,
          timeout: localNode.value.config.timeout || 0,
          streaming: false, // 单步调试使用非流式
          interactive: false, // 单步调试不启用交互
          tools: localNode.value.config.tools || [],
          mcp_server_ids: localNode.value.config.mcp_server_ids || [],
          max_tool_rounds: localNode.value.config.max_tool_rounds || 10,
        },
      },
      variables: cachedVariables as Record<string, unknown> | undefined,
      envId: props.envId || 0,
      mode: 'debug',
      stream: false,
      persist: false,
    }, ((localNode.value.config.timeout || 300) + 30) * 1000); // HTTP 超时 = AI 超时 + 30s 缓冲

    const stepResult = response.steps?.[0];
    if (stepResult) {
      const result = stepResult.result as any;
      if (result) {
        debugResponse.value = {
          success: !stepResult.error,
          content: result.content || '',
          model: result.model || '',
          promptTokens: result.prompt_tokens || 0,
          completionTokens: result.completion_tokens || 0,
          totalTokens: result.total_tokens || 0,
          durationMs: stepResult.durationMs || 0,
          error: result.error || stepResult.error,
          toolCalls: Array.isArray(result.tool_calls) ? result.tool_calls : undefined,
        };
      } else {
        debugResponse.value = {
          success: stepResult.success,
          content: '',
          model: '',
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          durationMs: stepResult.durationMs || 0,
          error: stepResult.error,
        };
      }
    } else {
      message.warning('未获取到执行结果');
    }
  } catch (error: any) {
    debugResponse.value = {
      success: false,
      content: '',
      model: '',
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      durationMs: 0,
      error: error.message || '执行失败',
    };
    message.error(error.message || '执行失败');
  } finally {
    isDebugging.value = false;
  }
}

// 拖拽分割条
function startDrag(e: MouseEvent) {
  isDragging.value = true;
  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', stopDrag);
  e.preventDefault();
}

function onDrag(e: MouseEvent) {
  if (!isDragging.value || !containerRef.value) return;
  const rect = containerRef.value.getBoundingClientRect();
  const offsetY = e.clientY - rect.top;
  const percentage = (offsetY / rect.height) * 100;
  editorPanelHeight.value = Math.min(80, Math.max(20, percentage));
}

function stopDrag() {
  isDragging.value = false;
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
}

onMounted(() => {
  loadModels();
  loadMcpServers();
});
</script>

<template>
  <div ref="containerRef" class="ai-panel" v-if="localNode">
    <!-- 配置区域 -->
    <div
      class="config-section"
      :style="{ height: debugResponse || isDebugging ? `${editorPanelHeight}%` : '100%' }"
    >
      <!-- 工具栏 -->
      <div class="toolbar">
        <div class="toolbar-title">
          <SparklesIcon class="size-4" />
          <span>AI 配置</span>
        </div>
        <div class="toolbar-spacer" />
        <Tooltip v-if="hasDebugCtx" title="使用调试上下文变量">
          <span class="debug-ctx-dot" />
        </Tooltip>
        <Button
          type="primary"
          size="small"
          :loading="isDebugging"
          :disabled="!localNode.config?.ai_model_id || !localNode.config?.prompt?.trim()"
          @click="handleRun"
        >
          <template #icon><PlayIcon class="size-4" /></template>
          运 行
        </Button>
      </div>

      <!-- 配置内容（可滚动） -->
      <div class="config-content">
        <Tabs size="small">
          <!-- 基本配置 -->
          <Tabs.TabPane key="basic" tab="基本配置">
            <Form layout="vertical" class="config-form">
              <!-- 模型选择 -->
              <Form.Item label="AI 模型" required>
                <Select
                  :value="localNode.config?.ai_model_id ?? undefined"
                  placeholder="搜索并选择模型..."
                  show-search
                  allow-clear
                  :loading="modelLoading"
                  :filter-option="filterModelOption"
                  :options="filteredModelOptions"
                  :not-found-content="modelLoading ? undefined : null"
                  @change="(val: any) => val ? handleModelSelect(val) : handleModelClear()"
                  @clear="handleModelClear"
                >
                  <template #notFoundContent>
                    <Empty
                      :image="Empty.PRESENTED_IMAGE_SIMPLE"
                      description="暂无可用模型，请先在 AI 模型管理中添加"
                    />
                  </template>
                  <template #option="{ model: m }">
                    <div class="model-option">
                      <div class="model-option-main">
                        <span class="model-option-name">{{ m.name }}</span>
                        <span class="model-option-provider">{{ m.provider }}</span>
                      </div>
                      <div class="model-option-info">
                        <span class="model-option-id">{{ m.model_id }}</span>
                        <Tag
                          v-for="tag in (m.capability_tags || []).slice(0, 3)"
                          :key="tag"
                          :color="getCapabilityColor(tag)"
                          size="small"
                          class="model-option-tag"
                        >
                          {{ tag }}
                        </Tag>
                      </div>
                    </div>
                  </template>
                </Select>
                <!-- 刷新按钮 -->
                <Button
                  type="link"
                  size="small"
                  :loading="modelLoading"
                  style="padding: 0; margin-top: 4px"
                  @click="loadModels"
                >
                  刷新模型列表
                </Button>
              </Form.Item>

              <!-- 已选模型信息 -->
              <div v-if="selectedModel" class="selected-model-info">
                <div class="model-info-row">
                  <span class="model-info-label">提供商</span>
                  <span class="model-info-value">{{ selectedModel.provider }}</span>
                </div>
                <div class="model-info-row">
                  <span class="model-info-label">模型 ID</span>
                  <span class="model-info-value">{{ selectedModel.model_id }}</span>
                </div>
                <div v-if="selectedModel.context_length" class="model-info-row">
                  <span class="model-info-label">上下文</span>
                  <span class="model-info-value">{{ (selectedModel.context_length / 1024).toFixed(0) }}K</span>
                </div>
                <div v-if="selectedModel.capability_tags?.length" class="model-info-row">
                  <span class="model-info-label">能力</span>
                  <span class="model-info-value">
                    <Tag
                      v-for="tag in selectedModel.capability_tags"
                      :key="tag"
                      :color="getCapabilityColor(tag)"
                      size="small"
                    >
                      {{ tag }}
                    </Tag>
                  </span>
                </div>
                <div v-if="selectedModel.description" class="model-info-row">
                  <span class="model-info-label">描述</span>
                  <span class="model-info-value model-desc">{{ selectedModel.description }}</span>
                </div>
              </div>

              <!-- 超时时间 -->
              <Form.Item label="超时时间（秒）" style="margin-top: 16px">
                <InputNumber
                  v-model:value="localNode.config.timeout"
                  :min="0"
                  :max="3600"
                  :step="30"
                  placeholder="默认 300 秒"
                  style="width: 100%"
                  @change="emitUpdate"
                />
                <div class="param-hint">
                  AI 调用的最大等待时间。设为 0 则使用系统默认值（5 分钟）。
                </div>
              </Form.Item>
            </Form>
          </Tabs.TabPane>

          <!-- 提示词 -->
          <Tabs.TabPane key="prompt" tab="提示词">
            <Form layout="vertical" class="config-form">
              <Form.Item label="系统提示词">
                <Input.TextArea
                  v-model:value="localNode.config.system_prompt"
                  :rows="4"
                  placeholder="设置 AI 的角色和行为"
                  @blur="emitUpdate"
                />
              </Form.Item>
              <Form.Item label="用户提示词" required>
                <Input.TextArea
                  v-model:value="localNode.config.prompt"
                  :rows="6"
                  placeholder="支持 ${variable} 格式引用变量"
                  @blur="emitUpdate"
                />
              </Form.Item>
            </Form>
          </Tabs.TabPane>

          <!-- 模型参数 -->
          <Tabs.TabPane key="params" tab="模型参数">
            <Form layout="vertical" class="config-form">
              <Form.Item label="Temperature">
                <div class="slider-row">
                  <Slider
                    v-model:value="localNode.config.temperature"
                    :min="0"
                    :max="2"
                    :step="0.1"
                    class="slider"
                    @change="emitUpdate"
                  />
                  <InputNumber
                    v-model:value="localNode.config.temperature"
                    :min="0"
                    :max="2"
                    :step="0.1"
                    :precision="1"
                    class="slider-input"
                    @change="emitUpdate"
                  />
                </div>
                <div class="param-hint">
                  控制输出的随机性。较低的值使输出更确定，较高的值使输出更多样化。
                </div>
              </Form.Item>

              <Form.Item label="Max Tokens">
                <InputNumber
                  v-model:value="localNode.config.max_tokens"
                  :min="1"
                  :max="128000"
                  style="width: 100%"
                  @change="emitUpdate"
                />
                <div class="param-hint">生成的最大 token 数量。</div>
              </Form.Item>

              <Form.Item label="Top P">
                <div class="slider-row">
                  <Slider
                    v-model:value="localNode.config.top_p"
                    :min="0"
                    :max="1"
                    :step="0.05"
                    class="slider"
                    @change="emitUpdate"
                  />
                  <InputNumber
                    v-model:value="localNode.config.top_p"
                    :min="0"
                    :max="1"
                    :step="0.05"
                    :precision="2"
                    class="slider-input"
                    @change="emitUpdate"
                  />
                </div>
              </Form.Item>
            </Form>
          </Tabs.TabPane>

          <!-- 执行模式 -->
          <Tabs.TabPane key="mode" tab="执行模式">
            <Form layout="vertical" class="config-form">
              <Form.Item label="流式输出">
                <Switch v-model:checked="localNode.config.streaming" @change="emitUpdate" />
                <div class="param-hint">启用后，AI 输出将实时流式显示。</div>
              </Form.Item>

              <Form.Item label="人机交互">
                <Switch v-model:checked="localNode.config.interactive" @change="emitUpdate" />
                <div class="param-hint">启用后，AI 输出完成后会暂停等待用户确认或输入。</div>
              </Form.Item>

              <template v-if="localNode.config.interactive">
                <Collapse>
                  <Collapse.Panel key="interaction" header="交互配置">
                    <Form.Item label="交互类型">
                      <Select
                        v-model:value="localNode.config.interaction_type"
                        :options="interactionTypeOptions"
                        @change="emitUpdate"
                      />
                    </Form.Item>

                    <Form.Item label="交互提示">
                      <Input
                        v-model:value="localNode.config.interaction_prompt"
                        placeholder="请确认是否继续？"
                        @blur="emitUpdate"
                      />
                    </Form.Item>

                    <Form.Item
                      v-if="localNode.config.interaction_type === 'select'"
                      label="选项（每行一个）"
                    >
                      <Input.TextArea
                        v-model:value="interactionOptionsStr"
                        :rows="4"
                        placeholder="选项1&#10;选项2&#10;选项3"
                      />
                    </Form.Item>

                    <Form.Item label="超时时间（秒）">
                      <InputNumber
                        v-model:value="localNode.config.interaction_timeout"
                        :min="0"
                        :max="3600"
                        style="width: 100%"
                        @change="emitUpdate"
                      />
                      <div class="param-hint">0 表示不超时。超时后将使用默认值继续。</div>
                    </Form.Item>

                    <Form.Item label="默认值">
                      <Input
                        v-model:value="localNode.config.interaction_default"
                        placeholder="超时时使用的默认值"
                        @blur="emitUpdate"
                      />
                    </Form.Item>
                  </Collapse.Panel>
                </Collapse>
              </template>
            </Form>
          </Tabs.TabPane>

          <!-- 工具 -->
          <Tabs.TabPane key="tools" tab="工具">
            <Form layout="vertical" class="config-form">
              <!-- 内置工具 -->
              <div class="tools-section-title">内置工具</div>
              <div class="builtin-tools-list">
                <div
                  v-for="tool in builtinTools"
                  :key="tool.name"
                  class="builtin-tool-item"
                >
                  <div class="builtin-tool-info">
                    <span class="builtin-tool-name">{{ tool.label }}</span>
                    <span class="builtin-tool-desc">{{ tool.description }}</span>
                  </div>
                  <Switch
                    :checked="isToolEnabled(tool.name)"
                    size="small"
                    @change="(checked: boolean) => handleToolToggle(tool.name, checked)"
                  />
                </div>
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
                <div v-if="mcpServerList.length === 0 && !mcpServerLoading" class="mcp-empty">
                  暂无可用的 MCP 服务器
                </div>
                <Checkbox.Group
                  v-else
                  :value="localNode.config.mcp_server_ids || []"
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
                      <Tag size="small" :color="server.transport === 'stdio' ? 'blue' : 'green'">
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
                  v-model:value="localNode.config.max_tool_rounds"
                  :min="1"
                  :max="50"
                  style="width: 100%"
                  @change="emitUpdate"
                />
                <div class="param-hint">
                  AI 模型调用工具的最大轮次，防止无限循环
                </div>
              </Form.Item>
            </Form>
          </Tabs.TabPane>
        </Tabs>
      </div>
    </div>

    <!-- 分割条 -->
    <div
      v-if="debugResponse || isDebugging"
      class="resize-bar"
      :class="{ dragging: isDragging }"
      @mousedown="startDrag"
    >
      <GripHorizontalIcon class="resize-icon" />
    </div>

    <!-- 调试响应区域 -->
    <div
      v-if="debugResponse || isDebugging"
      class="response-section"
      :style="{ height: `calc(${100 - editorPanelHeight}% - 4px)` }"
    >
      <Spin :spinning="isDebugging" tip="AI 执行中...">
        <div v-if="debugResponse" class="ai-response">
          <!-- 响应头部信息 -->
          <div class="response-header">
            <div class="response-meta">
              <Tag :color="debugResponse.success ? 'success' : 'error'">
                {{ debugResponse.success ? '成功' : '失败' }}
              </Tag>
              <span v-if="debugResponse.model" class="meta-item">
                {{ debugResponse.model }}
              </span>
              <span class="meta-item">
                {{ debugResponse.durationMs }}ms
              </span>
            </div>
            <div v-if="debugResponse.totalTokens > 0" class="response-tokens">
              <Tooltip title="Prompt Tokens">
                <span class="token-item">P: {{ debugResponse.promptTokens }}</span>
              </Tooltip>
              <Tooltip title="Completion Tokens">
                <span class="token-item">C: {{ debugResponse.completionTokens }}</span>
              </Tooltip>
              <Tooltip title="Total Tokens">
                <span class="token-item total">T: {{ debugResponse.totalTokens }}</span>
              </Tooltip>
            </div>
          </div>

          <!-- 错误信息 -->
          <div v-if="debugResponse.error" class="response-error">
            <AlertCircleIcon class="size-4" />
            <span>{{ debugResponse.error }}</span>
          </div>

          <!-- 工具调用记录 -->
          <div v-if="debugResponse.toolCalls?.length" class="tool-calls-section">
            <Collapse size="small">
              <Collapse.Panel key="tool-calls">
                <template #header>
                  <span class="tool-calls-header">
                    工具调用记录（{{ debugResponse.toolCalls.length }} 次）
                  </span>
                </template>
                <div
                  v-for="(tc, idx) in debugResponse.toolCalls"
                  :key="idx"
                  class="tool-call-record"
                >
                  <div class="tool-call-header">
                    <Tag size="small" color="blue">第 {{ tc.round }} 轮</Tag>
                    <span class="tool-call-name">{{ tc.tool_name }}</span>
                    <Tag size="small" :color="tc.is_error ? 'error' : 'success'">
                      {{ tc.is_error ? '失败' : '成功' }}
                    </Tag>
                    <span class="tool-call-duration">{{ tc.duration_ms }}ms</span>
                  </div>
                  <div class="tool-call-detail">
                    <div class="tool-call-row">
                      <span class="tool-call-label">参数</span>
                      <code class="tool-call-code">{{ truncateText(tc.arguments) }}</code>
                    </div>
                    <div class="tool-call-row">
                      <span class="tool-call-label">结果</span>
                      <code class="tool-call-code" :class="{ 'is-error': tc.is_error }">{{ truncateText(tc.result) }}</code>
                    </div>
                  </div>
                </div>
              </Collapse.Panel>
            </Collapse>
          </div>

          <!-- AI 回复内容 -->
          <div v-if="debugResponse.content" class="response-content">
            <pre class="response-text">{{ debugResponse.content }}</pre>
          </div>
        </div>
        <div v-else class="loading-placeholder" />
      </Spin>
    </div>
  </div>
</template>

<style scoped>
.ai-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: hsl(var(--background));
  overflow: hidden;
}

.config-section {
  display: flex;
  flex-direction: column;
  min-height: 200px;
  overflow: hidden;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: hsl(var(--card));
  border-bottom: 1px solid hsl(var(--border));
  flex-shrink: 0;
}

.toolbar-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
  color: hsl(var(--foreground));
}

.toolbar-spacer {
  flex: 1;
}

.debug-ctx-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #52c41a;
  box-shadow: 0 0 4px #52c41a80;
  flex-shrink: 0;
}

.config-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0 16px 16px;
}

.config-form {
  padding-top: 0;
}

.config-content :deep(.ant-tabs-nav) {
  margin-bottom: 8px;
}

.config-content :deep(.ant-tabs-content) {
  padding-top: 0;
}

/* 模型选项样式 */
.model-option {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px 0;
}

.model-option-main {
  display: flex;
  align-items: center;
  gap: 8px;
}

.model-option-name {
  font-weight: 500;
}

.model-option-provider {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.model-option-info {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.model-option-id {
  font-size: 11px;
  color: hsl(var(--muted-foreground));
  font-family: monospace;
}

.model-option-tag {
  font-size: 10px;
  line-height: 1;
  padding: 0 4px;
  margin: 0;
}

/* 已选模型信息 */
.selected-model-info {
  background: hsl(var(--muted) / 30%);
  border-radius: 8px;
  padding: 12px;
  margin-top: 8px;
}

.model-info-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 6px;
}

.model-info-row:last-child {
  margin-bottom: 0;
}

.model-info-label {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  width: 56px;
  flex-shrink: 0;
}

.model-info-value {
  font-size: 12px;
  color: hsl(var(--foreground));
  word-break: break-all;
}

.model-desc {
  color: hsl(var(--muted-foreground));
}

/* 参数相关 */
.slider-row {
  display: flex;
  gap: 12px;
  align-items: center;
}

.slider {
  flex: 1;
}

.slider-input {
  width: 80px;
}

.param-hint {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

/* 分割条 */
.resize-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 4px;
  background: hsl(var(--border));
  cursor: row-resize;
  transition: background 0.2s;
  flex-shrink: 0;
}

.resize-bar:hover,
.resize-bar.dragging {
  background: hsl(var(--primary) / 40%);
}

.resize-icon {
  width: 20px;
  height: 8px;
  color: hsl(var(--foreground) / 25%);
}

.resize-bar:hover .resize-icon,
.resize-bar.dragging .resize-icon {
  color: hsl(var(--primary));
}

/* 响应区域 */
.response-section {
  display: flex;
  flex-direction: column;
  min-height: 150px;
  overflow: hidden;
  background: hsl(var(--card));
}

.response-section :deep(.ant-spin-nested-loading),
.response-section :deep(.ant-spin-container) {
  height: 100%;
}

.loading-placeholder {
  height: 100%;
  min-height: 150px;
}

.ai-response {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.response-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  border-bottom: 1px solid hsl(var(--border));
  flex-shrink: 0;
  flex-wrap: wrap;
  gap: 8px;
}

.response-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.meta-item {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.response-tokens {
  display: flex;
  align-items: center;
  gap: 12px;
}

.token-item {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  font-family: monospace;
}

.token-item.total {
  font-weight: 600;
  color: hsl(var(--foreground));
}

.response-error {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px 16px;
  background: hsl(var(--destructive) / 10%);
  color: hsl(var(--destructive));
  font-size: 13px;
  flex-shrink: 0;
}

.response-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
}

.response-text {
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 13px;
  line-height: 1.6;
  color: hsl(var(--foreground));
  margin: 0;
  font-family: inherit;
}

/* 工具配置 Tab */
.tools-section-title {
  font-size: 13px;
  font-weight: 500;
  color: hsl(var(--foreground));
  margin-bottom: 8px;
  display: flex;
  align-items: center;
}

.builtin-tools-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.builtin-tool-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: 6px;
  background: hsl(var(--muted) / 20%);
}

.builtin-tool-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.builtin-tool-name {
  font-size: 13px;
  font-weight: 500;
  color: hsl(var(--foreground));
}

.builtin-tool-desc {
  font-size: 11px;
  color: hsl(var(--muted-foreground));
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

/* 工具调用记录 */
.tool-calls-section {
  padding: 0 12px;
  flex-shrink: 0;
}

.tool-calls-header {
  font-size: 12px;
  font-weight: 500;
}

.tool-call-record {
  padding: 8px 0;
  border-bottom: 1px solid hsl(var(--border));
}

.tool-call-record:last-child {
  border-bottom: none;
}

.tool-call-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.tool-call-name {
  font-size: 12px;
  font-weight: 500;
  font-family: monospace;
}

.tool-call-duration {
  font-size: 11px;
  color: hsl(var(--muted-foreground));
  margin-left: auto;
}

.tool-call-detail {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tool-call-row {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.tool-call-label {
  font-size: 11px;
  color: hsl(var(--muted-foreground));
  width: 32px;
  flex-shrink: 0;
}

.tool-call-code {
  font-size: 11px;
  font-family: monospace;
  color: hsl(var(--foreground));
  word-break: break-all;
  background: hsl(var(--muted) / 30%);
  padding: 2px 6px;
  border-radius: 3px;
  flex: 1;
  min-width: 0;
}

.tool-call-code.is-error {
  color: hsl(var(--destructive));
}
</style>
