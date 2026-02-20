<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useAppConfig } from '@vben/hooks';
import { useAccessStore } from '@vben/stores';

import { Button, message, Spin, Tag, Tooltip, Typography } from 'ant-design-vue';

import type { AiModel } from '#/api/ai-model';
import { getAiModelApi } from '#/api/ai-model';
import type { AiChatConfig } from '#/components/ai-chat';
import { AiChatView } from '#/components/ai-chat';

const route = useRoute();
const router = useRouter();
const accessStore = useAccessStore();
const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);

const modelInfo = ref<AiModel | null>(null);
const modelLoading = ref(true);

const chatConfig = computed<AiChatConfig>(() => ({
  modelId: Number(route.params.modelId) || 0,
  apiBaseUrl: apiURL,
  token: accessStore.accessToken || undefined,
}));

async function loadModel() {
  const modelId = Number(route.params.modelId);
  if (!modelId) {
    message.error('无效的模型ID');
    return;
  }
  modelLoading.value = true;
  try {
    modelInfo.value = await getAiModelApi(modelId);
  } catch {
    message.error('加载模型信息失败');
  } finally {
    modelLoading.value = false;
  }
}

function goBack() {
  const projectId = route.params.projectId;
  router.push(`/project/${projectId}/ai-model`);
}

onMounted(() => {
  loadModel();
});
</script>

<template>
  <div class="chat-page">
    <!-- 顶部栏 -->
    <div class="chat-header">
      <div class="chat-header__left">
        <Button type="text" @click="goBack">
          <template #icon>
            <span style="font-size: 18px">←</span>
          </template>
        </Button>
        <Spin v-if="modelLoading" size="small" />
        <template v-else-if="modelInfo">
          <Typography.Text strong style="font-size: 16px">
            {{ modelInfo.name }}
          </Typography.Text>
          <Tag v-if="modelInfo.version" color="blue">
            v{{ modelInfo.version }}
          </Tag>
          <Typography.Text type="secondary" style="margin-left: 4px">
            {{ modelInfo.provider }}
          </Typography.Text>
          <Tooltip :title="modelInfo.model_id">
            <Tag color="processing" style="margin-left: 8px">
              {{ modelInfo.model_id }}
            </Tag>
          </Tooltip>
        </template>
      </div>
    </div>

    <!-- 聊天视图 -->
    <div class="chat-content">
      <Spin v-if="modelLoading" class="chat-loading" />
      <AiChatView
        v-else-if="modelInfo"
        :config="chatConfig"
        :model-name="modelInfo.name"
        :model-description="modelInfo.description"
        :capability-tags="modelInfo.capability_tags"
        @back="goBack"
      />
    </div>
  </div>
</template>

<style scoped>
.chat-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: var(--ant-color-bg-layout, #f5f5f5);
}

.chat-header {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: var(--ant-color-bg-container, #fff);
  border-bottom: 1px solid var(--ant-color-border, #f0f0f0);
}

.chat-header__left {
  display: flex;
  gap: 8px;
  align-items: center;
}

.chat-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.chat-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}
</style>
