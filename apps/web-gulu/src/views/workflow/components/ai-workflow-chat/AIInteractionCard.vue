<script setup lang="ts">
import { ref, watch } from 'vue';

import { createIconifyIcon } from '@vben/icons';
import { Button, Input, Radio, RadioGroup, Space, Tag } from 'ant-design-vue';

import type { AIInteractionData } from '#/api/debug';

const UserIcon = createIconifyIcon('lucide:user-round');

const OTHER_VALUE = '__other__';

interface Props {
  data: AIInteractionData;
  countdown?: number;
}

const props = withDefaults(defineProps<Props>(), {
  countdown: 0,
});

const emit = defineEmits<{
  (e: 'confirm', value: string): void;
  (e: 'skip'): void;
}>();

const inputValue = ref(props.data.defaultValue || '');
const customText = ref('');

watch(
  () => props.data,
  (d) => {
    inputValue.value = d.defaultValue || '';
    customText.value = '';
  },
);

function handleConfirmClick() {
  emit('confirm', 'confirm');
}

function handleRejectClick() {
  emit('confirm', 'reject');
}

function handleInputSubmit() {
  emit('confirm', inputValue.value);
}

function handleSelectSubmit() {
  if (inputValue.value === OTHER_VALUE) {
    emit('confirm', customText.value || '(未填写)');
  } else {
    emit('confirm', inputValue.value);
  }
}
</script>

<template>
  <div class="interaction-card">
    <div class="interaction-card-header">
      <UserIcon class="interaction-card-icon" />
      <span>需要你的输入</span>
      <Tag v-if="countdown > 0" color="warning" class="interaction-countdown">
        {{ countdown }}s
      </Tag>
    </div>
    <div class="interaction-card-body">
      <div class="interaction-prompt">{{ data.prompt }}</div>

      <!-- 确认模式 -->
      <div v-if="data.type === 'confirm'" class="interaction-actions">
        <Space>
          <Button type="primary" size="small" @click="handleConfirmClick">确认</Button>
          <Button size="small" @click="handleRejectClick">拒绝</Button>
        </Space>
      </div>

      <!-- 输入模式 -->
      <div v-else-if="data.type === 'input'">
        <Input.TextArea
          v-model:value="inputValue"
          :rows="3"
          placeholder="请输入..."
          class="interaction-input"
        />
        <div class="interaction-actions">
          <Space>
            <Button size="small" @click="emit('skip')">跳过</Button>
            <Button type="primary" size="small" @click="handleInputSubmit">提交</Button>
          </Space>
        </div>
      </div>

      <!-- 选择模式 -->
      <div v-else-if="data.type === 'select'">
        <RadioGroup v-model:value="inputValue" class="interaction-select">
          <Space direction="vertical">
            <Radio
              v-for="option in data.options"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </Radio>
            <Radio :value="OTHER_VALUE">其他</Radio>
          </Space>
        </RadioGroup>
        <div v-if="inputValue === OTHER_VALUE" class="interaction-other-input">
          <Input.TextArea
            v-model:value="customText"
            :rows="2"
            placeholder="请输入你的想法..."
          />
        </div>
        <div class="interaction-actions">
          <Space>
            <Button size="small" @click="emit('skip')">跳过</Button>
            <Button
              type="primary"
              size="small"
              :disabled="inputValue === OTHER_VALUE && !customText.trim()"
              @click="handleSelectSubmit"
            >
              提交
            </Button>
          </Space>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.interaction-card {
  border: 1px solid hsl(var(--primary) / 40%);
  border-radius: 12px;
  background: hsl(var(--primary) / 5%);
  overflow: hidden;
  margin: 8px 0;
}

.interaction-card-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 500;
  color: hsl(var(--primary));
  border-bottom: 1px solid hsl(var(--primary) / 15%);
}

.interaction-card-icon {
  width: 16px;
  height: 16px;
}

.interaction-countdown {
  margin-left: auto;
  font-size: 11px;
}

.interaction-card-body {
  padding: 12px;
}

.interaction-prompt {
  font-size: 14px;
  margin-bottom: 12px;
  white-space: pre-wrap;
  line-height: 1.6;
  color: hsl(var(--foreground));
}

.interaction-input {
  margin-bottom: 8px;
}

.interaction-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

.interaction-select {
  width: 100%;
  margin-bottom: 4px;
}

.interaction-other-input {
  margin-top: 8px;
  padding-left: 24px;
  margin-bottom: 4px;
}
</style>
