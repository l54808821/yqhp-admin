<script setup lang="ts">
import type { RoleApi } from '#/api/system/role';
import type { UserApi } from '#/api/system/user';

import { ref } from 'vue';

import {
  Avatar,
  Button,
  Card,
  Form,
  FormItem,
  Input,
  message,
  Modal,
  Select,
  Switch,
  TreeSelect,
} from 'ant-design-vue';

import { createUserApi, getAllAppsApi, getRoleListApi, getUserApi, updateUserApi } from '#/api';

const emit = defineEmits<{
  success: [];
}>();

// 弹框状态
const visible = ref(false);
const loading = ref(false);
const isEdit = ref(false);

// 表单数据
const formData = ref<
  Partial<UserApi.CreateParams & UserApi.UpdateParams & { id?: number }>
>({});
const depts = ref<any[]>([]);

// 应用和角色数据
const apps = ref<any[]>([]);
const appRolesMap = ref<Map<number, RoleApi.Role[]>>(new Map());
const loadingRoles = ref<Set<number>>(new Set());

// 当前配置的应用角色
const appRolesConfig = ref<UserApi.AppRoleConfig[]>([]);

// 获取应用下的角色
async function loadRolesForApp(appId: number) {
  if (appRolesMap.value.has(appId)) return;

  loadingRoles.value.add(appId);
  try {
    const res = await getRoleListApi({ appId, pageSize: 1000 });
    appRolesMap.value.set(appId, res.list);
  } finally {
    loadingRoles.value.delete(appId);
  }
}

// 添加应用角色配置
function addAppRoleConfig() {
  appRolesConfig.value.push({ appId: 0, roleIds: [] });
}

// 移除应用角色配置
function removeAppRoleConfig(index: number) {
  appRolesConfig.value.splice(index, 1);
}

// 应用选择变化时加载角色
function handleAppChange(index: number, appId: number) {
  const config = appRolesConfig.value[index];
  if (config) {
    config.appId = appId;
    config.roleIds = [];
  }
  if (appId) {
    loadRolesForApp(appId);
  }
}

// 获取可选的应用（排除已选的）
function getAvailableApps(currentIndex: number) {
  const selectedAppIds = appRolesConfig.value
    .filter((_, i) => i !== currentIndex)
    .map((c) => c.appId)
    .filter((id) => id > 0);
  return apps.value.filter((app) => !selectedAppIds.includes(app.id));
}

// 获取应用下的角色选项
function getRolesForApp(appId: number) {
  return appRolesMap.value.get(appId) || [];
}

// 打开弹框
interface OpenParams {
  depts: any[];
  id?: number; // 编辑时传 id
}

// 重置表单数据
function resetFormData() {
  formData.value = {
    gender: 0,
    status: 1,
    avatar: '',
    username: '',
    nickname: '',
    email: '',
    phone: '',
    deptId: undefined,
    remark: '',
    password: '',
  };
  appRolesConfig.value = [];
}

async function open(params: OpenParams) {
  // 先重置表单，避免数据残留
  resetFormData();

  depts.value = params.depts;

  // 加载应用列表
  if (apps.value.length === 0) {
    const appsRes = await getAllAppsApi();
    apps.value = appsRes;
  }

  if (params.id) {
    isEdit.value = true;
    // 通过 id 获取最新数据
    const record = await getUserApi(params.id);
    formData.value = {
      id: record.id,
      username: record.username,
      nickname: record.nickname,
      avatar: record.avatar,
      email: record.email,
      phone: record.phone,
      gender: record.gender,
      status: record.status,
      deptId: record.deptId,
      remark: record.remark,
    };

    // 将用户角色按应用分组
    const rolesByApp = new Map<number, number[]>();
    for (const role of record.roles || []) {
      const appId = role.appId;
      if (!rolesByApp.has(appId)) {
        rolesByApp.set(appId, []);
      }
      rolesByApp.get(appId)!.push(role.id);
      // 预加载该应用的角色列表
      loadRolesForApp(appId);
    }

    appRolesConfig.value = Array.from(rolesByApp.entries()).map(([appId, roleIds]) => ({
      appId,
      roleIds,
    }));
  } else {
    isEdit.value = false;
  }

  visible.value = true;
}

// 提交
async function handleSubmit() {
  if (!formData.value.username) {
    message.error('请输入用户名');
    return;
  }
  if (!isEdit.value && !formData.value.password) {
    message.error('请输入密码');
    return;
  }

  // 过滤掉未选择应用或角色的配置
  const validAppRoles = appRolesConfig.value.filter(
    (c) => c.appId > 0 && c.roleIds.length > 0
  );

  loading.value = true;
  try {
    if (isEdit.value) {
      await updateUserApi({
        ...formData.value,
        appRoles: validAppRoles,
      } as UserApi.UpdateParams);
      message.success('更新成功');
    } else {
      await createUserApi({
        ...formData.value,
        appRoles: validAppRoles,
      } as UserApi.CreateParams);
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
    :title="isEdit ? '编辑用户' : '新增用户'"
    :confirm-loading="loading"
    width="700px"
    @ok="handleSubmit"
  >
    <Form :label-col="{ span: 5 }" :wrapper-col="{ span: 18 }">
      <FormItem label="用户名" required>
        <Input
          v-model:value="formData.username"
          :disabled="isEdit"
          placeholder="请输入用户名"
        />
      </FormItem>
      <FormItem v-if="!isEdit" label="密码" required>
        <Input.Password
          v-model:value="formData.password"
          placeholder="请输入密码"
        />
      </FormItem>
      <FormItem label="昵称">
        <Input v-model:value="formData.nickname" placeholder="请输入昵称" />
      </FormItem>
      <FormItem label="头像">
        <div class="flex items-center gap-4">
          <Avatar :size="64" :src="formData.avatar">
            {{ formData.nickname?.charAt(0) || 'U' }}
          </Avatar>
          <Input
            v-model:value="formData.avatar"
            placeholder="请输入头像URL"
            class="flex-1"
          />
        </div>
      </FormItem>
      <FormItem label="手机号">
        <Input v-model:value="formData.phone" placeholder="请输入手机号" />
      </FormItem>
      <FormItem label="邮箱">
        <Input v-model:value="formData.email" placeholder="请输入邮箱" />
      </FormItem>
      <FormItem label="性别">
        <Dict
          type="select"
          v-model:value="formData.gender"
          code="sys_user_gender"
          placeholder="请选择性别"
          style="width: 200px"
        />
      </FormItem>
      <FormItem label="部门">
        <TreeSelect
          v-model:value="formData.deptId"
          :tree-data="depts"
          :field-names="{ label: 'name', value: 'id', children: 'children' }"
          placeholder="请选择部门"
          allow-clear
          tree-default-expand-all
        />
      </FormItem>
      <FormItem label="角色配置">
        <div class="space-y-3">
          <Card
            v-for="(config, index) in appRolesConfig"
            :key="index"
            size="small"
            class="relative"
          >
            <Button
              type="text"
              danger
              size="small"
              class="absolute right-2 top-2"
              @click="removeAppRoleConfig(index)"
            >
              删除
            </Button>
            <div class="space-y-2">
              <div class="flex items-center gap-2">
                <span class="w-16 text-right">应用：</span>
                <Select
                  :value="config.appId || undefined"
                  placeholder="请选择应用"
                  style="width: 200px"
                  @change="(val: any) => handleAppChange(index, val as number)"
                >
                  <Select.Option
                    v-for="app in getAvailableApps(index)"
                    :key="app.id"
                    :value="app.id"
                  >
                    {{ app.name }}
                  </Select.Option>
                </Select>
              </div>
              <div v-if="config.appId" class="flex items-center gap-2">
                <span class="w-16 text-right">角色：</span>
                <Select
                  v-model:value="config.roleIds"
                  mode="multiple"
                  placeholder="请选择角色"
                  style="flex: 1"
                  :loading="loadingRoles.has(config.appId)"
                >
                  <Select.Option
                    v-for="role in getRolesForApp(config.appId)"
                    :key="role.id"
                    :value="role.id"
                  >
                    {{ role.name }}
                  </Select.Option>
                </Select>
              </div>
            </div>
          </Card>
          <Button type="dashed" block @click="addAppRoleConfig">
            + 添加应用角色
          </Button>
        </div>
      </FormItem>
      <FormItem label="状态">
        <Switch
          v-model:checked="formData.status"
          :checked-value="1"
          :un-checked-value="0"
          checked-children="启用"
          un-checked-children="禁用"
        />
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
