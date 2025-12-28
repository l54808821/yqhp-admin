<script setup lang="ts">
import type { Key } from 'ant-design-vue/es/_util/type';
import type { RoleApi } from '#/api/system/role';
import type { TreeProps } from 'ant-design-vue';

import { computed, ref, watch } from 'vue';

import {
  Button,
  Drawer,
  Form,
  FormItem,
  Input,
  InputNumber,
  message,
  Radio,
  RadioGroup,
  Switch,
  Tag,
  Tree,
} from 'ant-design-vue';

import { createRoleApi, getRoleApi, getRoleResourceIdsApi, updateRoleApi } from '#/api';

const emit = defineEmits<{
  success: [];
}>();

// 抽屉状态
const visible = ref(false);
const loading = ref(false);
const isEdit = ref(false);

// 表单数据
const formData = ref<Partial<RoleApi.CreateParams & { id?: number }>>({});
const resources = ref<any[]>([]);
// checkStrictly 为 true 时是对象格式，为 false 时是数组格式
const checkedKeysStrict = ref<{ checked: number[]; halfChecked: number[] }>({
  checked: [],
  halfChecked: [],
});
const checkedKeysNormal = ref<number[]>([]);

// 搜索权限
const searchKeyword = ref('');
// 展开的节点
const expandedKeys = ref<number[]>([]);
// 是否自动展开父节点
const autoExpandParent = ref(true);
// 完全受控开关
const checkStrictly = ref(true);

// 资源类型映射
const resourceTypeMap: Record<number, { label: string; color: string }> = {
  1: { label: '目录', color: 'blue' },
  2: { label: '菜单', color: 'green' },
  3: { label: '按钮', color: 'orange' },
};

// 计算选中的权限数量
const checkedCount = computed(() => {
  return checkStrictly.value
    ? checkedKeysStrict.value.checked.length
    : checkedKeysNormal.value.length;
});

// 获取最终选中的 keys
function getCheckedResourceIds(): number[] {
  return checkStrictly.value
    ? checkedKeysStrict.value.checked
    : checkedKeysNormal.value;
}

// 切换模式时同步选中状态
watch(checkStrictly, (strict) => {
  if (strict) {
    // 从普通模式切换到严格模式
    checkedKeysStrict.value = { checked: [...checkedKeysNormal.value], halfChecked: [] };
  } else {
    // 从严格模式切换到普通模式
    checkedKeysNormal.value = [...checkedKeysStrict.value.checked];
  }
});

// 获取所有节点的 key
function getAllKeys(data: any[]): number[] {
  const keys: number[] = [];
  function traverse(nodes: any[]) {
    for (const node of nodes) {
      keys.push(node.id);
      if (node.children?.length) {
        traverse(node.children);
      }
    }
  }
  traverse(data);
  return keys;
}

// 过滤树节点（搜索功能）
const filterTreeNode: TreeProps['filterTreeNode'] = (node) => {
  if (!searchKeyword.value) return true;
  const title = node.name as string;
  return title.toLowerCase().includes(searchKeyword.value.toLowerCase());
};

// 搜索时高亮匹配的节点
function onSearch(value: string) {
  if (!value) {
    expandedKeys.value = [];
    return;
  }
  // 找到所有匹配的节点及其父节点
  const matchedKeys: number[] = [];
  function findMatched(nodes: any[], parentKeys: number[] = []) {
    for (const node of nodes) {
      const currentPath = [...parentKeys, node.id];
      if (node.name?.toLowerCase().includes(value.toLowerCase())) {
        matchedKeys.push(...currentPath);
      }
      if (node.children?.length) {
        findMatched(node.children, currentPath);
      }
    }
  }
  findMatched(resources.value);
  expandedKeys.value = [...new Set(matchedKeys)];
  autoExpandParent.value = true;
}

// 展开全部
function expandAll() {
  expandedKeys.value = getAllKeys(resources.value);
}

// 收起全部
function collapseAll() {
  expandedKeys.value = [];
}

// 展开节点变化
function onExpand(keys: Key[]) {
  expandedKeys.value = keys as number[];
  autoExpandParent.value = false;
}

// 重置表单数据
function resetFormData() {
  formData.value = {
    name: '',
    code: '',
    sort: 0,
    status: 1,
    remark: '',
  };
  checkedKeysStrict.value = { checked: [], halfChecked: [] };
  checkedKeysNormal.value = [];
  searchKeyword.value = '';
  expandedKeys.value = [];
  checkStrictly.value = true;
}

// 打开抽屉
interface OpenParams {
  appId: number;
  resources: any[];
  id?: number;
}

async function open(params: OpenParams) {
  resetFormData();
  resources.value = params.resources;
  formData.value.appId = params.appId;
  // 默认展开所有节点
  expandedKeys.value = getAllKeys(params.resources);

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
    const resourceIds = await getRoleResourceIdsApi(params.id);
    checkedKeysStrict.value = { checked: resourceIds, halfChecked: [] };
    checkedKeysNormal.value = [...resourceIds];
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
      resourceIds: getCheckedResourceIds(),
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

// 关闭抽屉
function handleClose() {
  visible.value = false;
}

// 暴露open方法
defineExpose({ open });
</script>

<template>
  <Drawer
    v-model:open="visible"
    :title="isEdit ? '编辑角色' : '新增角色'"
    width="1100px"
    :body-style="{ padding: '20px', background: '#f5f7fa' }"
    class="role-form-drawer"
  >
    <div class="flex h-full gap-5">
      <!-- 左侧：基本信息 -->
      <div class="w-[400px] flex-shrink-0 rounded-lg border border-gray-200 bg-white">
        <div class="border-b border-gray-100 px-5 py-4">
          <div class="flex items-center gap-2 text-base font-medium text-primary">
            <span class="icon-[ant-design--info-circle-outlined]"></span>
            基本信息
          </div>
        </div>
        <div class="p-5">
          <Form :label-col="{ span: 6 }" :wrapper-col="{ span: 17 }">
            <FormItem label="角色名称" required>
              <Input v-model:value="formData.name" placeholder="请输入角色名称" />
            </FormItem>
            <FormItem label="角色编码" required>
              <Input v-model:value="formData.code" placeholder="请输入角色编码" />
            </FormItem>
            <FormItem label="排序">
              <InputNumber
                v-model:value="formData.sort"
                :min="0"
                placeholder="请输入排序"
                style="width: 100%"
              />
            </FormItem>
            <FormItem label="状态">
              <RadioGroup v-model:value="formData.status">
                <Radio :value="1">启用</Radio>
                <Radio :value="0">禁用</Radio>
              </RadioGroup>
            </FormItem>
            <FormItem label="备注" class="mb-0">
              <Input.TextArea
                v-model:value="formData.remark"
                placeholder="请输入备注"
                :rows="4"
              />
            </FormItem>
          </Form>
        </div>
      </div>

      <!-- 右侧：权限配置 -->
      <div class="flex min-w-0 flex-1 flex-col rounded-lg border bg-white">
        <!-- 标题栏 -->
        <div class="flex items-center justify-between border-b px-6 py-4">
          <div class="flex items-center gap-2 text-base font-medium text-primary">
            <span class="icon-[ant-design--safety-certificate-outlined]"></span>
            权限配置
          </div>
          <span class="text-sm text-gray-500">
            已选择 <span class="font-semibold text-primary">{{ checkedCount }}</span> 项权限
          </span>
        </div>

        <!-- 搜索和操作栏 -->
        <div class="flex flex-shrink-0 items-center justify-between px-6 py-4">
          <Input.Search
            v-model:value="searchKeyword"
            placeholder="搜索权限名称..."
            style="width: 240px"
            allow-clear
            @search="onSearch"
            @change="onSearch(searchKeyword)"
          />
          <div class="flex items-center gap-4">
            <div class="flex items-center gap-2">
              <span class="text-sm text-gray-500">完全受控:</span>
              <Switch v-model:checked="checkStrictly" size="small" />
            </div>
            <Button type="link" size="small" @click="expandAll">
              <template #icon><span class="i-ant-design:node-expand-outlined"></span></template>
              展开全部
            </Button>
            <Button type="link" size="small" @click="collapseAll">
              <template #icon><span class="i-ant-design:node-collapse-outlined"></span></template>
              收起全部
            </Button>
          </div>
        </div>

        <!-- 权限树 -->
        <div class="min-h-0 flex-1 overflow-auto p-4">
          <Tree
            v-if="checkStrictly"
            v-model:checked-keys="checkedKeysStrict"
            v-model:expanded-keys="expandedKeys"
            :tree-data="resources"
            :field-names="{ key: 'id', children: 'children' }"
            :filter-tree-node="filterTreeNode"
            :auto-expand-parent="autoExpandParent"
            check-strictly
            checkable
            @expand="onExpand"
          >
            <template #title="{ name, type }">
              <span class="inline-flex items-center gap-2">
                <span>{{ name }}</span>
                <Tag v-if="resourceTypeMap[type]" :color="resourceTypeMap[type].color" class="ml-1">
                  {{ resourceTypeMap[type].label }}
                </Tag>
              </span>
            </template>
          </Tree>
          <Tree
            v-else
            v-model:checked-keys="checkedKeysNormal"
            v-model:expanded-keys="expandedKeys"
            :tree-data="resources"
            :field-names="{ key: 'id', children: 'children' }"
            :filter-tree-node="filterTreeNode"
            :auto-expand-parent="autoExpandParent"
            checkable
            @expand="onExpand"
          >
            <template #title="{ name, type }">
              <span class="inline-flex items-center gap-2">
                <span>{{ name }}</span>
                <Tag v-if="resourceTypeMap[type]" :color="resourceTypeMap[type].color" class="ml-1">
                  {{ resourceTypeMap[type].label }}
                </Tag>
              </span>
            </template>
          </Tree>
        </div>
      </div>
    </div>

    <!-- 底部按钮 -->
    <template #footer>
      <div class="flex justify-end gap-3">
        <Button @click="handleClose">取消</Button>
        <Button type="primary" :loading="loading" @click="handleSubmit">确定</Button>
      </div>
    </template>
  </Drawer>
</template>

<style scoped>
.role-form-drawer :deep(.ant-drawer-body) {
  display: flex;
  flex-direction: column;
}
</style>
