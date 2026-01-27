<script setup lang="ts">
import { createIconifyIcon } from '@vben/icons';
import { Alert, Card, Descriptions, Tag } from 'ant-design-vue';
import type { StepResult, TreeNode } from './types';

import HttpStepDetail from './step-details/HttpStepDetail.vue';
import ScriptStepDetail from './step-details/ScriptStepDetail.vue';
import ConditionStepDetail from './step-details/ConditionStepDetail.vue';
import LoopStepDetail from './step-details/LoopStepDetail.vue';

const CheckCircleOutlined = createIconifyIcon('lucide:check-circle');
const CloseCircleOutlined = createIconifyIcon('lucide:x-circle');
const LoadingOutlined = createIconifyIcon('lucide:loader-2');
const ClockCircleOutlined = createIconifyIcon('lucide:clock');
const BanOutlined = createIconifyIcon('lucide:ban');

interface Props {
  selectedStep: StepResult | null;
  selectedTreeNode: TreeNode | null;
  isIterationSelected: boolean;
  aiContent: string | null;
  currentAIStepId: string | null;
}

defineProps<Props>();

// 获取步骤状态图标
function getStepIcon(status?: string) {
  switch (status) {
    case 'success':
      return CheckCircleOutlined;
    case 'failed':
      return CloseCircleOutlined;
    case 'running':
      return LoadingOutlined;
    case 'skipped':
      return BanOutlined;
    default:
      return ClockCircleOutlined;
  }
}

// 获取步骤状态颜色
function getStepColor(status?: string) {
  switch (status) {
    case 'success':
      return '#52c41a';
    case 'failed':
      return '#ff4d4f';
    case 'running':
      return '#1890ff';
    case 'skipped':
      return '#faad14';
    default:
      return '#d9d9d9';
  }
}

// 格式化时长
function formatDuration(ms?: number) {
  if (!ms) return '-';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}
</script>

<template>
  <Card class="detail-panel" size="small" title="步骤详情">
    <template #default>
      <div class="detail-panel-body">
        <template v-if="selectedStep">
          <!-- HTTP 步骤使用专用组件 -->
          <HttpStepDetail
            v-if="selectedStep.stepType === 'http'"
            :step-result="selectedStep"
          />

          <!-- 脚本步骤使用专用组件 -->
          <ScriptStepDetail
            v-else-if="selectedStep.stepType === 'script'"
            :step-result="selectedStep"
          />

          <!-- 条件判断步骤使用专用组件 -->
          <ConditionStepDetail
            v-else-if="selectedStep.stepType === 'condition'"
            :step-result="selectedStep"
          />

          <!-- 循环步骤使用专用组件 -->
          <LoopStepDetail
            v-else-if="selectedStep.stepType === 'loop'"
            :step-result="selectedStep"
          />

          <!-- 其他步骤类型使用通用展示 -->
          <template v-else>
            <Descriptions :column="1" size="small" bordered>
              <Descriptions.Item label="步骤名称">{{ selectedStep.stepName }}</Descriptions.Item>
              <Descriptions.Item label="步骤ID">{{ selectedStep.stepId }}</Descriptions.Item>
              <Descriptions.Item label="步骤类型">{{
                selectedStep.stepType || '-'
              }}</Descriptions.Item>
              <Descriptions.Item v-if="selectedStep.parentId" label="父步骤">{{
                selectedStep.parentId
              }}</Descriptions.Item>
              <Descriptions.Item v-if="selectedStep.iteration" label="迭代次数"
                >第 {{ selectedStep.iteration }} 次</Descriptions.Item
              >
              <Descriptions.Item label="状态">
                <Tag v-if="selectedStep.status === 'running'" color="processing">执行中</Tag>
                <Tag v-else-if="selectedStep.status === 'success'" color="success">成功</Tag>
                <Tag v-else-if="selectedStep.status === 'failed'" color="error">失败</Tag>
                <Tag v-else color="default">等待</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="耗时">{{
                formatDuration(selectedStep.durationMs)
              }}</Descriptions.Item>
            </Descriptions>

            <!-- 错误信息 -->
            <div v-if="selectedStep.error" class="detail-section">
              <div class="section-title">错误信息</div>
              <Alert type="error" :message="selectedStep.error" />
            </div>

            <!-- AI 输出内容 -->
            <div v-if="selectedStep.stepType === 'ai' && aiContent" class="detail-section">
              <div class="section-title">AI 输出</div>
              <div class="ai-output">
                <pre>{{ aiContent }}</pre>
                <span v-if="currentAIStepId === selectedStep.stepId" class="typing-cursor">|</span>
              </div>
            </div>

            <!-- 输出数据 -->
            <div
              v-if="selectedStep.output && Object.keys(selectedStep.output).length > 0"
              class="detail-section"
            >
              <div class="section-title">输出数据</div>
              <pre class="output-json">{{ JSON.stringify(selectedStep.output, null, 2) }}</pre>
            </div>

            <!-- 步骤日志 -->
            <div v-if="selectedStep.logs && selectedStep.logs.length > 0" class="detail-section">
              <div class="section-title">步骤日志</div>
              <div class="step-logs">
                <div v-for="(log, idx) in selectedStep.logs" :key="idx" class="log-line">
                  {{ log }}
                </div>
              </div>
            </div>
          </template>
        </template>

        <!-- 迭代节点详情 -->
        <template v-else-if="isIterationSelected && selectedTreeNode">
          <Descriptions :column="1" size="small" bordered>
            <Descriptions.Item label="迭代名称">{{ selectedTreeNode.title }}</Descriptions.Item>
            <Descriptions.Item label="节点类型">循环迭代</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag v-if="selectedTreeNode.status === 'running'" color="processing">执行中</Tag>
              <Tag v-else-if="selectedTreeNode.status === 'success'" color="success">成功</Tag>
              <Tag v-else-if="selectedTreeNode.status === 'failed'" color="error">失败</Tag>
              <Tag v-else color="default">等待</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="子步骤数量">{{
              selectedTreeNode.children?.length || 0
            }}</Descriptions.Item>
          </Descriptions>

          <!-- 子步骤列表 -->
          <div v-if="selectedTreeNode.children?.length" class="detail-section">
            <div class="section-title">迭代内步骤</div>
            <div class="branch-steps-list">
              <div
                v-for="child in selectedTreeNode.children"
                :key="child.key"
                class="branch-step-item"
              >
                <component
                  :is="getStepIcon(child.status)"
                  :style="{ color: getStepColor(child.status), marginRight: '6px' }"
                />
                <span class="step-name">{{ child.title }}</span>
                <Tag v-if="child.status === 'success'" color="success" size="small">成功</Tag>
                <Tag v-else-if="child.status === 'failed'" color="error" size="small">失败</Tag>
                <Tag v-else-if="child.status === 'running'" color="processing" size="small"
                  >执行中</Tag
                >
                <span v-if="child.duration" class="step-duration">{{
                  formatDuration(child.duration)
                }}</span>
              </div>
            </div>
          </div>
        </template>

        <div v-else class="empty-tip">请选择左侧步骤查看详情</div>
      </div>
    </template>
  </Card>
</template>

<style scoped>
.detail-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.detail-panel :deep(.ant-card-body) {
  flex: 1;
  padding: 0;
  overflow: hidden;
}

.detail-panel-body {
  height: 100%;
  overflow: hidden;
  padding: 8px;
  display: flex;
  flex-direction: column;
}

.detail-section {
  margin-top: 16px;
}

.section-title {
  font-weight: 500;
  margin-bottom: 8px;
  color: #333;
}

.output-json {
  background: #f5f5f5;
  padding: 8px;
  border-radius: 4px;
  font-size: 12px;
  overflow: auto;
  max-height: 200px;
}

.ai-output {
  background: #f0f7ff;
  padding: 12px;
  border-radius: 4px;
  font-size: 13px;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 300px;
  overflow: auto;
}

.ai-output pre {
  margin: 0;
  font-family: inherit;
}

.typing-cursor {
  animation: blink 1s infinite;
}

@keyframes blink {
  0%,
  50% {
    opacity: 1;
  }
  51%,
  100% {
    opacity: 0;
  }
}

.step-logs {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 8px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
  max-height: 150px;
  overflow: auto;
}

.log-line {
  white-space: pre-wrap;
  word-break: break-all;
}

.empty-tip {
  text-align: center;
  color: #999;
  padding: 20px;
}

.branch-steps-list {
  background: #fafafa;
  border-radius: 4px;
  padding: 8px;
}

.branch-step-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  border-radius: 4px;
  transition: background 0.2s;
}

.branch-step-item:hover {
  background: #f0f0f0;
}

.branch-step-item .step-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.branch-step-item .step-duration {
  font-size: 11px;
  color: #999;
  margin-left: 8px;
}
</style>
