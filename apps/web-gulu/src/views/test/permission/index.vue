<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';

import { useAccess } from '@vben/access';
import { useUserStore } from '@vben/stores';

import { Button, Card, Descriptions, DescriptionsItem, Space, Tag } from 'ant-design-vue';

import { getAccessCodesApi } from '#/api';

const userStore = useUserStore();
const { hasAccessByCodes } = useAccess();

const permissionCodes = ref<string[]>([]);
const loading = ref(false);

// 获取用户权限码
async function fetchPermissionCodes() {
  loading.value = true;
  try {
    permissionCodes.value = await getAccessCodesApi();
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchPermissionCodes();
});

// 按钮权限检查
const canView = computed(() => hasAccessByCodes(['test:permission:view:btn']));
const canEdit = computed(() => hasAccessByCodes(['test:permission:edit:btn']));
const canDelete = computed(() => hasAccessByCodes(['test:permission:delete:btn']));
</script>

<template>
  <div class="p-5">
    <Card title="用户信息" class="mb-5">
      <Descriptions :column="2" bordered>
        <DescriptionsItem label="用户ID">
          {{ userStore.userInfo?.userId }}
        </DescriptionsItem>
        <DescriptionsItem label="用户名">
          {{ userStore.userInfo?.username }}
        </DescriptionsItem>
        <DescriptionsItem label="昵称">
          {{ userStore.userInfo?.realName }}
        </DescriptionsItem>
        <DescriptionsItem label="头像">
          <img
            v-if="userStore.userInfo?.avatar"
            :src="userStore.userInfo?.avatar"
            alt="avatar"
            class="h-10 w-10 rounded-full"
          />
          <span v-else>无</span>
        </DescriptionsItem>
      </Descriptions>
    </Card>

    <Card title="权限码列表" class="mb-5" :loading="loading">
      <div v-if="permissionCodes.length > 0" class="flex flex-wrap gap-2">
        <Tag v-for="code in permissionCodes" :key="code" color="blue">
          {{ code }}
        </Tag>
      </div>
      <div v-else class="text-gray-500">
        暂无权限码
      </div>
    </Card>

    <Card title="按钮权限测试">
      <p class="mb-4 text-gray-600">
        以下按钮根据用户权限动态显示，只有拥有对应权限码的用户才能看到对应按钮。
      </p>
      <Space>
        <Button v-if="canView" type="primary">
          查看按钮 (test:permission:view:btn)
        </Button>
        <Button v-if="canEdit" type="default">
          编辑按钮 (test:permission:edit:btn)
        </Button>
        <Button v-if="canDelete" type="primary" danger>
          删除按钮 (test:permission:delete:btn)
        </Button>
      </Space>
      <div class="mt-4 text-gray-500">
        <p>权限状态：</p>
        <ul class="list-inside list-disc">
          <li>查看权限: {{ canView ? '✅ 有' : '❌ 无' }}</li>
          <li>编辑权限: {{ canEdit ? '✅ 有' : '❌ 无' }}</li>
          <li>删除权限: {{ canDelete ? '✅ 有' : '❌ 无' }}</li>
        </ul>
      </div>
    </Card>
  </div>
</template>
