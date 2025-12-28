<script setup lang="ts">
import type { UserDisplayProps, UserInfo } from './types';

import { computed } from 'vue';

import { VbenAvatar } from '@vben-core/shadcn-ui';

import { getRegisteredUserCache } from './types';

const props = withDefaults(defineProps<UserDisplayProps>(), {
  userId: null,
  showAvatar: false,
  avatarSize: 'small',
  clickable: false,
  separator: ', ',
  maxCount: 3,
  emptyText: '-',
});

const emit = defineEmits<{
  click: [userId: number];
}>();

// 标准化用户ID列表
const userIds = computed(() => {
  if (!props.userId) return [];
  return Array.isArray(props.userId) ? props.userId : [props.userId];
});

// 头像大小
const avatarSizeValue = computed(() => {
  if (typeof props.avatarSize === 'number') return props.avatarSize;
  return { default: 32, large: 40, small: 24 }[props.avatarSize] || 24;
});

// 显示的用户列表（响应式，会在缓存加载后自动更新）
const displayUsers = computed(() => {
  const cache = getRegisteredUserCache();
  if (!cache) return [];
  // 访问响应式的 userCacheMap，确保缓存更新时重新计算
  const map = cache.userCacheMap.value;
  return userIds.value
    .slice(0, props.maxCount)
    .map((id) => map.get(id))
    .filter((u): u is UserInfo => !!u);
});

// 超出数量
const overflowCount = computed(() => {
  const total = userIds.value.length;
  return total > props.maxCount ? total - props.maxCount : 0;
});

// 获取显示名称
function getDisplayName(user: UserInfo) {
  return user.nickname || user.username || props.emptyText;
}

// 获取头像文字
function getAvatarText(user: UserInfo) {
  return (user.nickname || user.username || '').charAt(0).toUpperCase();
}

function handleClick(userId: number) {
  if (props.clickable) {
    emit('click', userId);
  }
}
</script>

<template>
  <span v-if="userIds.length === 0 || displayUsers.length === 0">{{
    emptyText
  }}</span>
  <span v-else class="inline-flex items-center gap-1">
    <template v-for="(user, index) in displayUsers" :key="user.id">
      <span
        :class="[
          'inline-flex items-center gap-1',
          { 'hover:text-primary cursor-pointer': clickable },
        ]"
        @click="handleClick(user.id)"
      >
        <VbenAvatar
          v-if="showAvatar"
          :alt="getDisplayName(user)"
          :src="user.avatar"
          :style="{
            height: `${avatarSizeValue}px`,
            width: `${avatarSizeValue}px`,
          }"
        >
          <span class="text-xs">{{ getAvatarText(user) }}</span>
        </VbenAvatar>
        <span class="truncate">{{ getDisplayName(user) }}</span>
      </span>
      <span
        v-if="index < displayUsers.length - 1"
        class="text-muted-foreground"
        >{{ separator }}</span
      >
    </template>
    <span v-if="overflowCount > 0" class="text-muted-foreground text-sm"
      >+{{ overflowCount }}</span
    >
  </span>
</template>
