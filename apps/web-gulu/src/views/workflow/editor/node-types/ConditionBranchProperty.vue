<script setup lang="ts">
import { computed } from 'vue';
import { Form, Input, Select } from 'ant-design-vue';

const props = defineProps<{
  node: any;
}>();

const emit = defineEmits<{
  update: [node: any];
}>();

const kindOptions = [
  { value: 'if', label: 'if' },
  { value: 'else_if', label: 'else if' },
  { value: 'else', label: 'else' },
];

function ensureBranch() {
  // condition_branch 在树里有两种来源：
  // 1) 正常情况：虚拟节点，结构是 { type:'condition_branch', branch: {...} }
  // 2) 异常情况：被当成普通 step 新建，可能只有 { type:'condition_branch', name, config?... }
  // 为避免渲染崩溃，这里兜底补齐 branch
  if (!props.node) return;
  if (!props.node.branch) {
    props.node.branch = {
      id: props.node.id,
      name: props.node.name || '条件分支',
      kind: 'if',
      expression: '',
      steps: [],
    };
  }
  if (!props.node.branch.name) props.node.branch.name = props.node.name || '条件分支';
  if (!props.node.branch.kind) props.node.branch.kind = 'if';
  if (!props.node.branch.steps) props.node.branch.steps = [];
}

const branchName = computed({
  get: () => {
    ensureBranch();
    return props.node?.branch?.name || '';
  },
  set: (val) => {
    ensureBranch();
    props.node.branch.name = val;
    // 同步一份到顶层 name，避免树标题显示不一致
    props.node.name = val;
    handleUpdate();
  },
});

const branchKind = computed({
  get: () => {
    ensureBranch();
    return props.node?.branch?.kind || 'if';
  },
  set: (val) => {
    ensureBranch();
    props.node.branch.kind = val;
    if (val === 'else') {
      props.node.branch.expression = '';
    }
    handleUpdate();
  },
});

const showExpression = computed(() => branchKind.value !== 'else');

const branchExpression = computed({
  get: () => {
    ensureBranch();
    return props.node?.branch?.expression || '';
  },
  set: (val) => {
    ensureBranch();
    props.node.branch.expression = val;
    handleUpdate();
  },
});

function handleUpdate() {
  emit('update', props.node);
}
</script>

<template>
  <Form.Item label="分支名称">
    <Input v-model:value="branchName" placeholder="如：成功/超时/默认" @blur="handleUpdate" />
  </Form.Item>
  <Form.Item label="分支类型">
    <Select v-model:value="branchKind" :options="kindOptions" />
  </Form.Item>
  <Form.Item v-if="showExpression" label="条件表达式">
    <Input.TextArea
      v-model:value="branchExpression"
      :rows="3"
      placeholder="如: ${response.status_code} == 200"
      @blur="handleUpdate"
    />
  </Form.Item>
</template>


