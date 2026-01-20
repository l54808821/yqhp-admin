<script setup lang="ts">
import { computed } from 'vue';
import { Button, Form, Input, Select, Space } from 'ant-design-vue';

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

const branches = computed({
  get: () => props.node.branches || [],
  set: (val) => {
    props.node.branches = val;
    handleUpdate();
  },
});

function handleUpdate() {
  emit('update', props.node);
}

function newBranchId() {
  return `br_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function addBranch() {
  const list = [...branches.value];
  list.push({
    id: newBranchId(),
    name: `条件${list.length + 1}`,
    kind: 'else_if',
    expression: '',
    steps: [],
  });
  branches.value = list;
}

function removeBranch(id: string) {
  branches.value = branches.value.filter((b: any) => b.id !== id);
}
</script>

<template>
  <Form.Item label="分支列表">
    <Space direction="vertical" style="width: 100%">
      <div v-for="br in branches" :key="br.id" style="padding: 10px; border: 1px solid hsl(var(--border)); border-radius: 6px;">
        <Space direction="vertical" style="width: 100%">
          <Space style="width: 100%; justify-content: space-between;">
            <Input v-model:value="br.name" placeholder="分支名称" @blur="handleUpdate" />
            <Button size="small" danger @click="removeBranch(br.id)">删除</Button>
          </Space>
          <Select v-model:value="br.kind" :options="kindOptions" @change="handleUpdate" />
          <Input.TextArea
            v-if="br.kind !== 'else'"
            v-model:value="br.expression"
            :rows="2"
            placeholder="如: ${response.status_code} == 200"
            @blur="handleUpdate"
          />
        </Space>
      </div>
      <Button type="dashed" block @click="addBranch">添加分支</Button>
    </Space>
  </Form.Item>
</template>
