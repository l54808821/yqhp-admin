<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  Collapse,
  Form,
  Input,
  InputNumber,
  Select,
  Slider,
  Switch,
  Tabs,
} from 'ant-design-vue';

const props = defineProps<{
  node: any;
}>();

const emit = defineEmits<{
  update: [node: any];
}>();

// 确保 config 存在
if (!props.node.config) {
  props.node.config = {
    provider: 'openai',
    model: 'gpt-4o',
    api_key: '',
    base_url: '',
    system_prompt: '',
    prompt: '',
    temperature: 0.7,
    max_tokens: 2000,
    streaming: true,
    interactive: false,
    interaction_type: 'confirm',
    interaction_prompt: '',
    interaction_options: [],
    interaction_timeout: 300,
    interaction_default: '',
  };
}

const config = computed(() => props.node.config);

// 提供商选项
const providerOptions = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'azure', label: 'Azure OpenAI' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'custom', label: '自定义' },
];

// 模型选项（根据提供商动态变化）
const modelOptions = computed(() => {
  switch (config.value.provider) {
    case 'openai':
      return [
        { value: 'gpt-4o', label: 'GPT-4o' },
        { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
        { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
        { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
        { value: 'o1', label: 'o1' },
        { value: 'o1-mini', label: 'o1 Mini' },
      ];
    case 'azure':
      return [
        { value: 'gpt-4o', label: 'GPT-4o' },
        { value: 'gpt-4', label: 'GPT-4' },
        { value: 'gpt-35-turbo', label: 'GPT-3.5 Turbo' },
      ];
    case 'deepseek':
      return [
        { value: 'deepseek-chat', label: 'DeepSeek Chat' },
        { value: 'deepseek-coder', label: 'DeepSeek Coder' },
        { value: 'deepseek-reasoner', label: 'DeepSeek Reasoner' },
      ];
    default:
      return [];
  }
});

// 交互类型选项
const interactionTypeOptions = [
  { value: 'confirm', label: '确认' },
  { value: 'input', label: '输入' },
  { value: 'select', label: '选择' },
];

// 交互选项（用于 select 类型）
const interactionOptionsStr = ref(
  Array.isArray(config.value.interaction_options)
    ? config.value.interaction_options.join('\n')
    : ''
);

watch(interactionOptionsStr, (val) => {
  config.value.interaction_options = val
    .split('\n')
    .map((s: string) => s.trim())
    .filter((s: string) => s);
  handleUpdate();
});

function handleUpdate() {
  emit('update', props.node);
}

// 提供商变化时重置模型
function handleProviderChange() {
  const models = modelOptions.value;
  if (models.length > 0) {
    const currentModel = config.value.model;
    const modelExists = models.find((m) => m.value === currentModel);
    if (!modelExists) {
      config.value.model = models[0]?.value || '';
    }
  }
  handleUpdate();
}
</script>

<template>
  <Tabs>
    <Tabs.TabPane key="basic" tab="基本配置">
      <Form layout="vertical">
        <Form.Item label="提供商" required>
          <Select
            v-model:value="config.provider"
            :options="providerOptions"
            @change="handleProviderChange"
          />
        </Form.Item>

        <Form.Item label="模型" required>
          <Select
            v-model:value="config.model"
            :options="modelOptions"
            :allow-clear="false"
            @change="handleUpdate"
          />
        </Form.Item>

        <Form.Item label="API Key" required>
          <Input.Password
            v-model:value="config.api_key"
            placeholder="支持 ${ENV_VAR} 格式引用环境变量"
            @blur="handleUpdate"
          />
        </Form.Item>

        <Form.Item
          v-if="config.provider === 'azure' || config.provider === 'custom'"
          label="Base URL"
        >
          <Input
            v-model:value="config.base_url"
            placeholder="API 地址"
            @blur="handleUpdate"
          />
        </Form.Item>

        <Form.Item v-if="config.provider === 'azure'" label="API Version">
          <Input
            v-model:value="config.api_version"
            placeholder="2024-06-01"
            @blur="handleUpdate"
          />
        </Form.Item>
      </Form>
    </Tabs.TabPane>

    <Tabs.TabPane key="prompt" tab="提示词">
      <Form layout="vertical">
        <Form.Item label="系统提示词">
          <Input.TextArea
            v-model:value="config.system_prompt"
            :rows="4"
            placeholder="设置 AI 的角色和行为"
            @blur="handleUpdate"
          />
        </Form.Item>

        <Form.Item label="用户提示词" required>
          <Input.TextArea
            v-model:value="config.prompt"
            :rows="6"
            placeholder="支持 ${variable} 格式引用变量"
            @blur="handleUpdate"
          />
        </Form.Item>
      </Form>
    </Tabs.TabPane>

    <Tabs.TabPane key="params" tab="模型参数">
      <Form layout="vertical">
        <Form.Item label="Temperature">
          <div class="slider-row">
            <Slider
              v-model:value="config.temperature"
              :min="0"
              :max="2"
              :step="0.1"
              class="slider"
              @change="handleUpdate"
            />
            <InputNumber
              v-model:value="config.temperature"
              :min="0"
              :max="2"
              :step="0.1"
              :precision="1"
              class="slider-input"
              @change="handleUpdate"
            />
          </div>
          <div class="param-hint">
            控制输出的随机性。较低的值使输出更确定，较高的值使输出更多样化。
          </div>
        </Form.Item>

        <Form.Item label="Max Tokens">
          <InputNumber
            v-model:value="config.max_tokens"
            :min="1"
            :max="128000"
            style="width: 100%"
            @change="handleUpdate"
          />
          <div class="param-hint">
            生成的最大 token 数量。
          </div>
        </Form.Item>

        <Form.Item label="Top P">
          <div class="slider-row">
            <Slider
              v-model:value="config.top_p"
              :min="0"
              :max="1"
              :step="0.05"
              class="slider"
              @change="handleUpdate"
            />
            <InputNumber
              v-model:value="config.top_p"
              :min="0"
              :max="1"
              :step="0.05"
              :precision="2"
              class="slider-input"
              @change="handleUpdate"
            />
          </div>
        </Form.Item>
      </Form>
    </Tabs.TabPane>

    <Tabs.TabPane key="mode" tab="执行模式">
      <Form layout="vertical">
        <Form.Item label="流式输出">
          <Switch v-model:checked="config.streaming" @change="handleUpdate" />
          <div class="param-hint">
            启用后，AI 输出将实时流式显示。
          </div>
        </Form.Item>

        <Form.Item label="人机交互">
          <Switch v-model:checked="config.interactive" @change="handleUpdate" />
          <div class="param-hint">
            启用后，AI 输出完成后会暂停等待用户确认或输入。
          </div>
        </Form.Item>

        <template v-if="config.interactive">
          <Collapse>
            <Collapse.Panel key="interaction" header="交互配置">
              <Form.Item label="交互类型">
                <Select
                  v-model:value="config.interaction_type"
                  :options="interactionTypeOptions"
                  @change="handleUpdate"
                />
              </Form.Item>

              <Form.Item label="交互提示">
                <Input
                  v-model:value="config.interaction_prompt"
                  placeholder="请确认是否继续？"
                  @blur="handleUpdate"
                />
              </Form.Item>

              <Form.Item
                v-if="config.interaction_type === 'select'"
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
                  v-model:value="config.interaction_timeout"
                  :min="0"
                  :max="3600"
                  style="width: 100%"
                  @change="handleUpdate"
                />
                <div class="param-hint">
                  0 表示不超时。超时后将使用默认值继续。
                </div>
              </Form.Item>

              <Form.Item label="默认值">
                <Input
                  v-model:value="config.interaction_default"
                  placeholder="超时时使用的默认值"
                  @blur="handleUpdate"
                />
              </Form.Item>
            </Collapse.Panel>
          </Collapse>
        </template>
      </Form>
    </Tabs.TabPane>
  </Tabs>
</template>

<style scoped>
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
</style>
