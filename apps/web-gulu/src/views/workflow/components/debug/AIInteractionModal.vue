<script setup lang="ts">
import { Button, Input, Modal, Radio, RadioGroup, Space } from 'ant-design-vue';
import type { AIInteractionData } from './types';

interface Props {
  open: boolean;
  data: AIInteractionData | null;
  value: string;
  countdown: number;
}

defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:value', value: string): void;
  (e: 'confirm'): void;
  (e: 'skip'): void;
}>();
</script>

<template>
  <Modal :open="open" title="AI 交互" :closable="false" :maskClosable="false" :footer="null">
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

      <!-- 选择模式 -->
      <div v-else-if="data.type === 'select'">
        <RadioGroup :value="value" @update:value="emit('update:value', $event)">
          <Space direction="vertical">
            <Radio v-for="option in data.options" :key="option.value" :value="option.value">
              {{ option.label }}
            </Radio>
          </Space>
        </RadioGroup>
        <div class="interaction-actions">
          <Space>
            <Button @click="emit('skip')">跳过</Button>
            <Button type="primary" @click="emit('confirm')">提交</Button>
          </Space>
        </div>
      </div>

      <!-- 倒计时 -->
      <div v-if="countdown > 0" class="countdown">剩余时间：{{ countdown }} 秒</div>
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
}

.confirm-buttons {
  text-align: center;
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
