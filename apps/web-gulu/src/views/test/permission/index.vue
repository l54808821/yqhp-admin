<script lang="ts" setup>
import { computed } from 'vue';

import { AccessControl, useAccess } from '@vben/access';
import { useAccessStore, useUserStore } from '@vben/stores';

import { Button, Card, Descriptions, DescriptionsItem, Space, Tag } from 'ant-design-vue';

const userStore = useUserStore();
const accessStore = useAccessStore();
const { hasAccessByCodes } = useAccess();

// 直接从 store 获取权限码（已在路由守卫中加载）
const permissionCodes = computed(() => accessStore.accessCodes);

// 按钮权限检查（函数方式）
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

    <Card title="权限码列表" class="mb-5">
      <div v-if="permissionCodes.length > 0" class="flex flex-wrap gap-2">
        <Tag v-for="code in permissionCodes" :key="code" color="blue">
          {{ code }}
        </Tag>
      </div>
      <div v-else class="text-gray-500">暂无权限码</div>
    </Card>

    <!-- 方式一：函数方式 v-if + hasAccessByCodes -->
    <Card title="函数方式控制 (v-if + hasAccessByCodes)" class="mb-5">
      <p class="mb-4 text-gray-500">
        使用 hasAccessByCodes 函数判断权限，配合 v-if 控制元素显示
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

    <!-- 方式二：指令方式 v-access:code -->
    <Card title="指令方式控制 (v-access:code)" class="mb-5">
      <p class="mb-4 text-gray-500">
        使用 v-access:code 指令，传入权限码数组，无权限时元素会被移除
      </p>
      <Space>
        <Button v-access:code="['test:permission:view:btn']" type="primary">
          查看按钮 (test:permission:view:btn)
        </Button>
        <Button v-access:code="['test:permission:edit:btn']" type="default">
          编辑按钮 (test:permission:edit:btn)
        </Button>
        <Button
          v-access:code="['test:permission:delete:btn']"
          type="primary"
          danger
        >
          删除按钮 (test:permission:delete:btn)
        </Button>
      </Space>
    </Card>

    <!-- 方式三：组件方式 AccessControl -->
    <Card title="组件方式控制 (AccessControl)" class="mb-5">
      <p class="mb-4 text-gray-500">
        使用 AccessControl 组件包裹，通过 codes 属性传入权限码数组
      </p>
      <Space>
        <AccessControl :codes="['test:permission:view:btn']" type="code">
          <Button type="primary">
            查看按钮 (test:permission:view:btn)
          </Button>
        </AccessControl>
        <AccessControl :codes="['test:permission:edit:btn']" type="code">
          <Button type="default">
            编辑按钮 (test:permission:edit:btn)
          </Button>
        </AccessControl>
        <AccessControl :codes="['test:permission:delete:btn']" type="code">
          <Button type="primary" danger>
            删除按钮 (test:permission:delete:btn)
          </Button>
        </AccessControl>
      </Space>
    </Card>

    <!-- 多权限码示例 -->
    <Card title="多权限码控制" class="mb-5">
      <p class="mb-4 text-gray-500">
        传入多个权限码时，只要拥有其中任意一个权限码即可显示
      </p>
      <Space>
        <Button
          v-access:code="['test:permission:view:btn', 'test:permission:edit:btn']"
          type="primary"
        >
          查看或编辑权限可见
        </Button>
        <AccessControl
          :codes="['test:permission:edit:btn', 'test:permission:delete:btn']"
          type="code"
        >
          <Button type="default"> 编辑或删除权限可见 </Button>
        </AccessControl>
      </Space>
    </Card>
  </div>
</template>
