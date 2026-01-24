<script setup lang="ts">
import { computed } from 'vue';
import { Button, Form, Tag, Empty } from 'ant-design-vue';

const props = defineProps<{
  node: any;
}>();

const emit = defineEmits<{
  update: [node: any];
}>();

const branches = computed(() => props.node.branches || []);

// 生成新分支 ID
function newBranchId() {
  return `br_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// 添加分支
function addBranch() {
  if (!props.node.branches) {
    props.node.branches = [];
  }
  props.node.branches.push({
    id: newBranchId(),
    name: `条件${props.node.branches.length + 1}`,
    kind: 'else_if',
    expression: '',
    steps: [],
  });
  emit('update', props.node);
}

// 获取分支类型的显示标签
function getKindLabel(kind: string) {
  switch (kind) {
    case 'if':
      return 'IF';
    case 'else_if':
      return 'ELSE IF';
    case 'else':
      return 'ELSE';
    default:
      return kind?.toUpperCase() || 'IF';
  }
}

// 获取分支类型的颜色
function getKindColor(kind: string) {
  switch (kind) {
    case 'if':
      return 'blue';
    case 'else_if':
      return 'orange';
    case 'else':
      return 'default';
    default:
      return 'default';
  }
}
</script>

<template>
  <Form.Item label="分支概览">
    <div class="branches-overview">
      <Empty v-if="branches.length === 0" description="暂无分支，请在左侧树中添加" :image="Empty.PRESENTED_IMAGE_SIMPLE" />
      <div v-else class="branch-list">
        <div v-for="(br, index) in branches" :key="br.id" class="branch-item">
          <div class="branch-header">
            <span class="branch-index">{{ index + 1 }}.</span>
            <Tag :color="getKindColor(br.kind)" size="small">{{ getKindLabel(br.kind) }}</Tag>
            <span class="branch-name">{{ br.name || '未命名分支' }}</span>
          </div>
          <div v-if="br.kind !== 'else' && br.expression" class="branch-expression">
            <code>{{ br.expression }}</code>
          </div>
          <div v-else-if="br.kind !== 'else'" class="branch-expression empty">
            <span>未设置条件表达式</span>
          </div>
        </div>
      </div>
      <Button type="dashed" block class="add-branch-btn" @click="addBranch">
        + 添加分支
      </Button>
      <div class="tip-text">
        <span>提示：点击左侧树中的分支节点可编辑分支属性</span>
      </div>
    </div>
  </Form.Item>
</template>

<style scoped>
.branches-overview {
  width: 100%;
}

.branch-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.branch-item {
  padding: 10px 12px;
  border: 1px solid hsl(var(--border));
  border-radius: 6px;
  background: hsl(var(--card));
}

.branch-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.branch-index {
  font-weight: 500;
  color: hsl(var(--muted-foreground));
  min-width: 20px;
}

.branch-name {
  font-weight: 500;
  color: hsl(var(--foreground));
}

.branch-expression {
  margin-top: 6px;
  padding: 6px 8px;
  background: hsl(var(--muted));
  border-radius: 4px;
  font-size: 12px;
}

.branch-expression code {
  color: hsl(var(--foreground));
  word-break: break-all;
}

.branch-expression.empty {
  color: hsl(var(--muted-foreground));
  font-style: italic;
}

.add-branch-btn {
  margin-top: 12px;
}

.tip-text {
  margin-top: 12px;
  padding: 8px;
  background: hsl(var(--muted) / 0.5);
  border-radius: 4px;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  text-align: center;
}
</style>
