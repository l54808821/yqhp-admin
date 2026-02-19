<script setup lang="ts">
import type { RetrievalMode } from '#/api/knowledge-base';

import { InputNumber, Radio, Slider } from 'ant-design-vue';

interface Props {
  showGraphModes?: boolean;
  compact?: boolean;
}

withDefaults(defineProps<Props>(), {
  showGraphModes: false,
  compact: false,
});

const retrievalMode = defineModel<RetrievalMode>('retrievalMode', { required: true });
const scoreThreshold = defineModel<number>('scoreThreshold', { required: true });
const topK = defineModel<number>('topK', { required: true });
</script>

<template>
  <div class="retrieval-settings" :class="{ compact }">
    <!-- 检索方式 -->
    <div class="rs-section">
      <div class="rs-label">检索方式</div>
      <template v-if="compact">
        <Radio.Group v-model:value="retrievalMode" class="rs-radio-group">
          <Radio value="vector">向量检索</Radio>
          <Radio value="keyword">关键词检索</Radio>
          <Radio value="hybrid">混合检索</Radio>
          <template v-if="showGraphModes">
            <Radio value="graph">图谱检索</Radio>
            <Radio value="hybrid_graph">混合图谱</Radio>
          </template>
        </Radio.Group>
      </template>
      <template v-else>
        <div class="rs-modes">
          <div
            class="rs-mode-item"
            :class="{ active: retrievalMode === 'vector' }"
            @click="retrievalMode = 'vector'"
          >
            <div class="rs-mode-title">向量检索</div>
            <div class="rs-mode-desc">通过嵌入模型搜索语义最相似的文本分块</div>
          </div>
          <div
            class="rs-mode-item"
            :class="{ active: retrievalMode === 'keyword' }"
            @click="retrievalMode = 'keyword'"
          >
            <div class="rs-mode-title">关键词检索</div>
            <div class="rs-mode-desc">基于全文索引匹配包含关键词的文本分块</div>
          </div>
          <div
            class="rs-mode-item"
            :class="{ active: retrievalMode === 'hybrid' }"
            @click="retrievalMode = 'hybrid'"
          >
            <div class="rs-mode-title">混合检索</div>
            <div class="rs-mode-desc">同时使用向量和关键词检索，合并结果</div>
          </div>
          <template v-if="showGraphModes">
            <div
              class="rs-mode-item"
              :class="{ active: retrievalMode === 'graph' }"
              @click="retrievalMode = 'graph'"
            >
              <div class="rs-mode-title">图谱检索</div>
              <div class="rs-mode-desc">通过知识图谱的实体和关系进行检索</div>
            </div>
            <div
              class="rs-mode-item"
              :class="{ active: retrievalMode === 'hybrid_graph' }"
              @click="retrievalMode = 'hybrid_graph'"
            >
              <div class="rs-mode-title">混合图谱</div>
              <div class="rs-mode-desc">同时使用向量检索和图谱检索，合并结果</div>
            </div>
          </template>
        </div>
      </template>
    </div>

    <!-- Score 阈值 -->
    <div class="rs-section">
      <div class="rs-label">
        相似度阈值
        <span class="rs-value">{{ scoreThreshold.toFixed(2) }}</span>
      </div>
      <template v-if="compact">
        <Slider v-model:value="scoreThreshold" :min="0" :max="1" :step="0.01" />
      </template>
      <template v-else>
        <div class="rs-slider-row">
          <Slider v-model:value="scoreThreshold" :min="0" :max="1" :step="0.05" style="flex: 1" />
          <InputNumber v-model:value="scoreThreshold" :min="0" :max="1" :step="0.05" size="small" style="width: 64px" />
        </div>
      </template>
      <div class="rs-hint">低于此分数的结果将被过滤。建议 0.5 ~ 0.8。</div>
    </div>

    <!-- Top K -->
    <div class="rs-section">
      <div class="rs-label">召回数量（Top-K）</div>
      <template v-if="compact">
        <InputNumber v-model:value="topK" :min="1" :max="20" style="width: 100%" />
      </template>
      <template v-else>
        <div class="rs-slider-row">
          <Slider v-model:value="topK" :min="1" :max="20" style="flex: 1" />
          <InputNumber v-model:value="topK" :min="1" :max="20" size="small" style="width: 64px" />
        </div>
        <div class="rs-hint">最多返回的文本分块数量。</div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.retrieval-settings {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.retrieval-settings.compact {
  gap: 16px;
}

.rs-label {
  font-size: 13px;
  font-weight: 500;
  color: hsl(var(--foreground));
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.rs-value {
  font-size: 13px;
  font-weight: 600;
  color: hsl(var(--primary));
}

.rs-hint {
  font-size: 11px;
  color: hsl(var(--muted-foreground));
  margin-top: 4px;
}

.rs-slider-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* Radio 竖排（compact） */
.rs-radio-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* 卡片选择（非 compact） */
.rs-modes {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.rs-mode-item {
  padding: 10px 12px;
  border: 2px solid hsl(var(--border));
  border-radius: 8px;
  cursor: pointer;
  flex: 1;
  min-width: 120px;
  transition: all 0.15s;
}

.rs-mode-item.active {
  border-color: hsl(var(--primary));
  background: hsl(var(--primary) / 4%);
}

.rs-mode-title {
  font-size: 13px;
  font-weight: 500;
  color: hsl(var(--foreground));
  margin-bottom: 2px;
}

.rs-mode-desc {
  font-size: 11px;
  color: hsl(var(--muted-foreground));
  line-height: 1.4;
}
</style>
