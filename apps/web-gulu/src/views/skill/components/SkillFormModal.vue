<script setup lang="ts">
import type { CreateSkillParams, Skill, UpdateSkillParams } from '#/api/skill';

import { ref, watch } from 'vue';

import {
  Button,
  Col,
  Form,
  Input,
  InputNumber,
  Drawer,
  message,
  Row,
  Select,
  Space,
  Switch,
  Tag,
} from 'ant-design-vue';

import {
  createSkillApi,
  SKILL_CATEGORY_OPTIONS,
  SKILL_ICON_OPTIONS,
  updateSkillApi,
} from '#/api/skill';

const emit = defineEmits<{ success: [] }>();

const visible = ref(false);
const drawerTitle = ref('新增 Skill');
const editingId = ref<number | null>(null);
const submitLoading = ref(false);

const formState = ref<CreateSkillParams & { tags: string[] }>({
  name: '',
  slug: '',
  description: '',
  icon: '',
  category: '',
  tags: [],
  license: '',
  compatibility: '',
  allowed_tools: '',
  sort: 0,
  status: 1,
});

function generateSlugFromName(name: string): string {
  if (!name?.trim()) return '';
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[\u4e00-\u9fff]/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function handleGenerateSlug() {
  formState.value.slug = generateSlugFromName(formState.value.name);
}

watch(
  () => formState.value.name,
  (name) => {
    if (!formState.value.slug && name) {
      formState.value.slug = generateSlugFromName(name);
    }
  },
);

const customTagInput = ref('');
const categoryOptions = SKILL_CATEGORY_OPTIONS.map((c) => ({ label: c, value: c }));
const iconOptions = SKILL_ICON_OPTIONS.map((i) => ({ label: `${i.label} (${i.value})`, value: i.value }));

function open(record?: Skill) {
  if (record) {
    drawerTitle.value = '编辑 Skill';
    editingId.value = record.id;
    formState.value = {
      name: record.name,
      slug: record.slug || '',
      description: record.description || '',
      icon: record.icon || '',
      category: record.category || '',
      tags: record.tags || [],
      license: record.license || '',
      compatibility: record.compatibility || '',
      allowed_tools: record.allowed_tools || '',
      author: record.author || '',
      source_url: record.source_url || '',
      sort: record.sort || 0,
      status: record.status,
    };
  } else {
    drawerTitle.value = '新增 Skill';
    editingId.value = null;
    formState.value = {
      name: '',
      slug: '',
      description: '',
      icon: '',
      category: '',
      tags: [],
      license: '',
      compatibility: '',
      allowed_tools: '',
      sort: 0,
      status: 1,
    };
  }
  visible.value = true;
}

async function handleSubmit() {
  if (!formState.value.name) return message.warning('请输入 Skill 名称');

  submitLoading.value = true;
  try {
    if (editingId.value) {
      const params: UpdateSkillParams = { ...formState.value };
      await updateSkillApi(editingId.value, params);
      message.success('更新成功');
    } else {
      await createSkillApi(formState.value);
      message.success('创建成功');
    }
    visible.value = false;
    emit('success');
  } catch {
    message.error('操作失败');
  } finally {
    submitLoading.value = false;
  }
}

function addCustomTag() {
  const tag = customTagInput.value.trim();
  if (tag && !formState.value.tags?.includes(tag)) {
    if (!formState.value.tags) formState.value.tags = [];
    formState.value.tags.push(tag);
    customTagInput.value = '';
  }
}

function removeCustomTag(tag: string) {
  if (formState.value.tags) {
    formState.value.tags = formState.value.tags.filter((t) => t !== tag);
  }
}

defineExpose({ open });
</script>

<template>
  <Drawer
    v-model:open="visible"
    :title="drawerTitle"
    width="640px"
    :destroy-on-close="false"
  >
    <Form :model="formState" layout="vertical">
      <Row :gutter="24">
        <Col :span="12">
          <Form.Item label="Skill 名称" required>
            <Input v-model:value="formState.name" placeholder="如：代码审查专家" />
          </Form.Item>
        </Col>
        <Col :span="12">
          <Form.Item label="Slug" extra="kebab-case 格式">
            <div style="display: flex; gap: 8px">
              <Input v-model:value="formState.slug" placeholder="如 code-review" style="flex: 1" />
              <Button size="small" @click="handleGenerateSlug">生成</Button>
            </div>
          </Form.Item>
        </Col>
      </Row>
      <Row :gutter="24">
        <Col :span="8">
          <Form.Item label="分类">
            <Select v-model:value="formState.category" placeholder="选择分类" :options="categoryOptions" allow-clear style="width: 100%" />
          </Form.Item>
        </Col>
        <Col :span="8">
          <Form.Item label="图标">
            <Select v-model:value="formState.icon" placeholder="选择图标" :options="iconOptions" allow-clear show-search style="width: 100%" />
          </Form.Item>
        </Col>
        <Col :span="8">
          <Form.Item label="状态">
            <Switch
              v-model:checked="formState.status"
              :checked-value="1"
              :un-checked-value="0"
              checked-children="启用"
              un-checked-children="禁用"
            />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item label="描述">
        <Input.TextArea
          v-model:value="formState.description"
          placeholder="描述 Skill 的功能和适用场景（建议包含 Use when... 触发词）"
          :rows="3"
        />
      </Form.Item>
      <Form.Item label="标签">
        <div class="mb-2">
          <Tag v-for="tag in formState.tags" :key="tag" closable @close="removeCustomTag(tag)">{{ tag }}</Tag>
        </div>
        <Space>
          <Input v-model:value="customTagInput" placeholder="输入标签" style="width: 200px" @press-enter="addCustomTag" />
          <Button type="dashed" size="small" @click="addCustomTag">添加</Button>
        </Space>
      </Form.Item>
      <Row :gutter="24">
        <Col :span="8">
          <Form.Item label="作者">
            <Input v-model:value="formState.author" placeholder="如 anthropics" />
          </Form.Item>
        </Col>
        <Col :span="8">
          <Form.Item label="License">
            <Input v-model:value="formState.license" placeholder="如 Apache-2.0" />
          </Form.Item>
        </Col>
        <Col :span="8">
          <Form.Item label="排序">
            <InputNumber v-model:value="formState.sort" :min="0" style="width: 100%" />
          </Form.Item>
        </Col>
      </Row>
    </Form>

    <template #footer>
      <div style="display: flex; justify-content: flex-end; gap: 8px">
        <Button @click="visible = false">取消</Button>
        <Button type="primary" :loading="submitLoading" @click="handleSubmit">
          {{ editingId ? '保存' : '创建' }}
        </Button>
      </div>
    </template>
  </Drawer>
</template>
