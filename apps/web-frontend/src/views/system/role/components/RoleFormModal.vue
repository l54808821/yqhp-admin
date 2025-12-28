<script setup lang="ts">
import type { RoleApi } from '#/api/system/role';

import { ref } from 'vue';

import {
  Form,
  FormItem,
  Input,
  InputNumber,
  message,
  Modal,
  Radio,
  RadioGroup,
  Tree,
} from 'ant-design-vue';

import { createRoleApi, getRoleApi, getRoleResourceIdsApi, updateRoleApi } from '#/api';

const emit = defineEmits<{
  success: [];
}>();

// 弹框状态
const visible = ref(false);
const loading = ref(false);
const isEdit = ref(false);

// 表单数据
const formData = ref<Partial<RoleApi.CreateParams & { id?: number }>>({});
const resources = ref<any[]>([]);
// check-strictly 模式下，checkedKeys 是对象格式
const checkedKeys = ref<{ checked: number[]; halfChecked: number[] }>({
  checked: [],
  halfChecked: [],
});

// 重置表单数据
function resetFormData() {
  formData.value = {
    name: '',
    code: '',
    sort: 0,
    status: 1,
    remark: '',
  };
  checkedKeys.value = { checked: [], halfChecked: [] };
}

// 打开弹框
interface OpenParams {
  appId: number;
  resources: any[];
  id?: number;
}

async function open(params: OpenParams) {
  resetFormData();
  resources.value = params.resources;
  formData.value.appId = params.appId;

  if (params.id) {
    isEdit.value = true;
    const record = await getRoleApi(params.id);
    formData.value = {
      id: record.id,
      appId: record.appId,
      name: record.name,
      code: record.code,
      sort: record.sort,
      status: record.status,
      remark: record.remark,
    };
    // 获取角色的资源ID，设置为 checked
    const resourceIds = await getRoleResourceIdsApi(params.id);
    checkedKeys.value = { checked: resourceIds, halfChecked: [] };
  } else {
    isEdit.value = false;
  }

  visible.value = true;
}


// 提交
async function handleSubmit() {
  if (!formData.value.name) {
    message.error('请输入角色名称');
    return;
  }
  if (!formData.value.code) {
    message.error('请输入角色编码');
    return;
  }

  loading.value = true;
  try {
    const data = {
      ...formData.value,
      // 使用 checked 数组作为 resourceIds
      resourceIds: checkedKeys.value.checked,
    };

    if (isEdit.value) {
      await updateRoleApi(data as RoleApi.UpdateParams);
      message.success('更新成功');
    } else {
      await createRoleApi(data as RoleApi.CreateParams);
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
    :title="isEdit ? '编辑角色' : '新增角色'"
    :confirm-loading="loading"
    width="600px"
    @ok="handleSubmit"
  >
    <Form :label-col="{ span: 5 }" :wrapper-col="{ span: 18 }">
      <FormItem label="角色名称" required>
        <Input v-model:value="formData.name" placeholder="请输入角色名称" />
      </FormItem>
      <FormItem label="角色编码" required>
        <Input
          v-model:value="formData.code"
          :disabled="isEdit"
          placeholder="请输入角色编码"
        />
      </FormItem>
      <FormItem label="排序">
        <InputNumber
          v-model:value="formData.sort"
          :min="0"
          style="width: 100%"
        />
      </FormItem>
      <FormItem label="状态">
        <RadioGroup v-model:value="formData.status">
          <Radio :value="1">启用</Radio>
          <Radio :value="0">禁用</Radio>
        </RadioGroup>
      </FormItem>
      <FormItem label="权限">
        <div class="max-h-[300px] overflow-auto rounded border p-2">
          <Tree
            v-model:checked-keys="checkedKeys"
            :tree-data="resources"
            :field-names="{ title: 'name', key: 'id', children: 'children' }"
            checkable
            check-strictly
            default-expand-all
          />
        </div>
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
