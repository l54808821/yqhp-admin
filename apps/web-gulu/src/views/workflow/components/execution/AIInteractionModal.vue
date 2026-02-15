<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { Button, Input, Modal, Radio, RadioGroup, Space } from 'ant-design-vue';

import type { AIInteractionData } from './types';

interface Props {
  open: boolean;
  data: AIInteractionData | null;
  value: string;
  countdown: number;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:value', value: string): void;
  (e: 'confirm'): void;
  (e: 'skip'): void;
}>();

// "其他"选项的自由输入文本
const customText = ref('');

// 当前选中的是否为"其他"选项
const OTHER_VALUE = '__other__';
const isOtherSelected = computed(() => props.value === OTHER_VALUE);

// 弹窗打开时重置自由输入
watch(
  () => props.open,
  (open) => {
    if (open) {
      customText.value = '';
    }
  },
);

function handleSelectConfirm() {
  if (isOtherSelected.value) {
    emit('update:value', customText.value || '(未填写)');
  }
  emit('confirm');
}
</script>

<template>
  <Modal
    :open="open"
    title="AI 交互"
    :closable="false"
    :maskClosable="false"
    :footer="null"
  >
    <div v-if="data" class="interaction-content">
      <!-- 交互提示 -->
      <div class="interaction-prompt">{{ data.prompt }}</div>

      <!-- 确认模式 -->
      <div v-if="data.type === 'confirm'" class="confirm-buttons">
        <Space>
          <Button
            type="primary"
            @click="
              emit('update:value', 'confirm');
              emit('confirm');
            "
          >
            确认
          </Button>
          <Button
            @click="
              emit('update:value', 'reject');
              emit('confirm');
            "
          >
            拒绝
          </Button>
        </Space>
      </div>

      <!-- 输入模式 -->
      <div v-else-if="data.type === 'input'">
        <Input.TextArea
          :value="value"
          :rows="4"
          placeholder="请输入..."
          @update:value="emit('update:value', $event)"
        />
        <div class="interaction-actions">
          <Space>
            <Button @click="emit('skip')">跳过</Button>
            <Button type="primary" @click="emit('confirm')">提交</Button>
          </Space>
        </div>
      </div>

      <!-- 选择模式（支持"其他"自由输入） -->
      <div v-else-if="data.type === 'select'">
        <RadioGroup
          :value="value"
          @update:value="emit('update:value', $event)"
        >
          <Space direction="vertical" class="select-options">
            <Radio
              v-for="option in data.options"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </Radio>
            <!-- 固定的"其他"选项 -->
            <Radio :value="OTHER_VALUE">
              其他
            </Radio>
          </Space>
        </RadioGroup>

        <!-- "其他"选中时展示输入框 -->
        <div v-if="isOtherSelected" class="other-input">
          <Input.TextArea
            v-model:value="customText"
            :rows="3"
            placeholder="请输入你的想法..."
            auto-focus
          />
        </div>

        <div class="interaction-actions">
          <Space>
            <Button @click="emit('skip')">跳过</Button>
            <Button
              type="primary"
              :disabled="isOtherSelected && !customText.trim()"
              @click="handleSelectConfirm"
            >
              提交
            </Button>
          </Space>
        </div>
      </div>

      <!-- 倒计时 -->
      <div v-if="countdown > 0" class="countdown">
        剩余时间：{{ countdown }} 秒
      </div>
    </div>
  </Modal>
</template>

<style scoped>
.interaction-content {
  padding: 16px 0;
}

.interaction-prompt {
  font-size: 14px;
  margin-bottom: 16px;
  white-space: pre-wrap;
}

.confirm-buttons {
  text-align: center;
}

.select-options {
  width: 100%;
}

.other-input {
  margin-top: 8px;
  padding-left: 24px;
}

.interaction-actions {
  margin-top: 16px;
  text-align: right;
}

.countdown {
  margin-top: 12px;
  text-align: center;
  color: #ff4d4f;
  font-size: 13px;
}
</style>
