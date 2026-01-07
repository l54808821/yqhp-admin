<script setup lang="ts">
import type { ResourceApi } from '#/api/system/resource';

import { computed, ref, watch } from 'vue';

import { IconPicker } from '@vben/common-ui';

import {
  Form,
  FormItem,
  Input,
  InputNumber,
  message,
  Modal,
  Radio,
  RadioGroup,
  Switch,
  TreeSelect,
} from 'ant-design-vue';

import { createResourceApi, getResourceApi, updateResourceApi } from '#/api';

const emit = defineEmits<{
  success: [];
}>();

// 弹框状态
const visible = ref(false);
const loading = ref(false);
const isEdit = ref(false);

// 表单数据
const formData = ref<Partial<ResourceApi.CreateParams & { id?: number }>>({});
const resources = ref<any[]>([]);

// 是否显示路径和组件
const showPathAndComponent = computed(() => {
  return formData.value.type === 1 || formData.value.type === 2;
});

// 重置表单数据
function resetFormData() {
  formData.value = {
    parentId: undefined,
    name: '',
    code: '',
    type: 2,
    path: '',
    component: '',
    redirect: '',
    icon: '',
    sort: 0,
    isHidden: false,
    isCache: true,
    isFrame: false,
    status: 1,
    remark: '',
  };
}

// 打开弹框
interface OpenParams {
  appId: number;
  resources: any[];
  parentId?: number;
  id?: number;
}

async function open(params: OpenParams) {
  resetFormData();
  resources.value = params.resources;
  formData.value.appId = params.appId;

  if (params.id) {
    isEdit.value = true;
    const record = await getResourceApi(params.id);
    formData.value = {
      id: record.id,
      appId: record.appId,
      parentId: record.parentId || undefined,
      name: record.name,
      code: record.code,
      type: record.type,
      path: record.path,
      component: record.component,
      redirect: record.redirect,
      icon: record.icon,
      sort: record.sort,
      isHidden: record.isHidden,
      isCache: record.isCache,
      isFrame: record.isFrame,
      status: record.status,
      remark: record.remark,
    };
  } else {
    isEdit.value = false;
    formData.value.parentId = params.parentId;
  }

  visible.value = true;
}

// 类型变化时重置部分字段
watch(
  () => formData.value.type,
  (newType) => {
    if (newType === 3) {
      formData.value.path = '';
      formData.value.component = '';
      formData.value.redirect = '';
      formData.value.icon = '';
    }
  },
);

// 提交
async function handleSubmit() {
  if (!formData.value.name) {
    message.error('请输入菜单名称');
    return;
  }

  loading.value = true;
  try {
    if (isEdit.value) {
      await updateResourceApi(formData.value as ResourceApi.UpdateParams);
      message.success('更新成功');
    } else {
      await createResourceApi(formData.value as ResourceApi.CreateParams);
      message.success('创建成功');
    }
    visible.value = false;
    emit('success');
  } finally {
    loading.value = false;
  }
}

// 暴露open方法
defineExpose({ open });
</script>

<template>
  <Modal
    v-model:open="visible"
    :title="isEdit ? '编辑菜单' : '新增菜单'"
    :confirm-loading="loading"
    width="650px"
    @ok="handleSubmit"
  >
    <Form :label-col="{ span: 5 }" :wrapper-col="{ span: 18 }">
      <FormItem label="上级菜单">
        <TreeSelect
          v-model:value="formData.parentId"
          :tree-data="resources"
          :field-names="{ label: 'name', value: 'id', children: 'children' }"
          placeholder="请选择上级菜单"
          allow-clear
          tree-default-expand-all
        />
      </FormItem>
      <FormItem label="菜单类型" required>
        <RadioGroup v-model:value="formData.type">
          <Radio :value="1">目录</Radio>
          <Radio :value="2">菜单</Radio>
          <Radio :value="3">按钮</Radio>
        </RadioGroup>
      </FormItem>
      <FormItem label="菜单名称" required>
        <Input v-model:value="formData.name" placeholder="请输入菜单名称" />
      </FormItem>
      <FormItem label="权限标识">
        <Input v-model:value="formData.code" placeholder="请输入权限标识" />
      </FormItem>
      <template v-if="showPathAndComponent">
        <FormItem label="路由路径">
          <Input v-model:value="formData.path" placeholder="请输入路由路径" />
        </FormItem>
        <FormItem v-if="formData.type === 2" label="组件路径">
          <Input
            v-model:value="formData.component"
            placeholder="请输入组件路径"
          />
        </FormItem>
        <FormItem v-if="formData.type === 1" label="重定向">
          <Input
            v-model:value="formData.redirect"
            placeholder="请输入重定向路径"
          />
        </FormItem>
        <FormItem label="图标">
          <IconPicker v-model="formData.icon" class="w-full" />
        </FormItem>
      </template>
      <FormItem label="排序">
        <InputNumber
          v-model:value="formData.sort"
          :min="0"
          style="width: 100%"
        />
      </FormItem>
      <template v-if="showPathAndComponent">
        <FormItem label="是否隐藏">
          <Switch v-model:checked="formData.isHidden" />
        </FormItem>
        <FormItem label="是否缓存">
          <Switch v-model:checked="formData.isCache" />
        </FormItem>
        <FormItem label="是否外链">
          <Switch v-model:checked="formData.isFrame" />
        </FormItem>
      </template>
      <FormItem label="状态">
        <RadioGroup v-model:value="formData.status">
          <Radio :value="1">启用</Radio>
          <Radio :value="0">禁用</Radio>
        </RadioGroup>
      </FormItem>
      <FormItem label="备注">
        <Input.TextArea
          v-model:value="formData.remark"
          placeholder="请输入备注"
          :rows="3"
        />
      </FormItem>
    </Form>
  </Modal>
</template>
