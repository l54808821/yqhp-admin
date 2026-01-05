<script lang="ts" setup>
import type { VbenFormSchema } from '@vben/common-ui';
import type { Recordable } from '@vben/types';

import { computed, h, ref } from 'vue';
import { useRouter } from 'vue-router';

import { AuthenticationRegister, z } from '@vben/common-ui';
import { $t } from '@vben/locales';
import { preferences } from '@vben/preferences';
import { useAccessStore, useUserStore } from '@vben/stores';

import { message } from 'ant-design-vue';

import { getAccessCodesApi, registerApi } from '#/api';

defineOptions({ name: 'Register' });

const router = useRouter();
const accessStore = useAccessStore();
const userStore = useUserStore();
const loading = ref(false);

const formSchema = computed((): VbenFormSchema[] => {
  return [
    {
      component: 'VbenInput',
      componentProps: {
        placeholder: '请输入用户名（4-20个字符）',
      },
      fieldName: 'username',
      label: $t('authentication.username'),
      rules: z
        .string()
        .min(4, { message: '用户名长度应为4-20个字符' })
        .max(20, { message: '用户名长度应为4-20个字符' }),
    },
    {
      component: 'VbenInputPassword',
      componentProps: {
        passwordStrength: true,
        placeholder: '请输入密码（6-20个字符）',
      },
      fieldName: 'password',
      label: $t('authentication.password'),
      renderComponentContent() {
        return {
          strengthText: () => $t('authentication.passwordStrength'),
        };
      },
      rules: z
        .string()
        .min(6, { message: '密码长度应为6-20个字符' })
        .max(20, { message: '密码长度应为6-20个字符' }),
    },
    {
      component: 'VbenInputPassword',
      componentProps: {
        placeholder: $t('authentication.confirmPassword'),
      },
      dependencies: {
        rules(values) {
          const { password } = values;
          return z
            .string({ required_error: $t('authentication.passwordTip') })
            .min(1, { message: $t('authentication.passwordTip') })
            .refine((value) => value === password, {
              message: $t('authentication.confirmPasswordTip'),
            });
        },
        triggerFields: ['password'],
      },
      fieldName: 'confirmPassword',
      label: $t('authentication.confirmPassword'),
    },
    {
      component: 'VbenInput',
      componentProps: {
        placeholder: '请输入昵称（选填）',
      },
      fieldName: 'nickname',
      label: '昵称',
      rules: z.string().optional(),
    },
    {
      component: 'VbenInput',
      componentProps: {
        placeholder: '请输入邮箱（选填）',
      },
      fieldName: 'email',
      label: '邮箱',
      rules: z
        .string()
        .email({ message: '请输入有效的邮箱地址' })
        .optional()
        .or(z.literal('')),
    },
    {
      component: 'VbenCheckbox',
      fieldName: 'agreePolicy',
      renderComponentContent: () => ({
        default: () =>
          h('span', [
            $t('authentication.agree'),
            h(
              'a',
              {
                class: 'vben-link ml-1 ',
                href: '',
              },
              `${$t('authentication.privacyPolicy')} & ${$t('authentication.terms')}`,
            ),
          ]),
      }),
      rules: z.boolean().refine((value) => !!value, {
        message: $t('authentication.agreeTip'),
      }),
    },
  ];
});

async function handleSubmit(values: Recordable<any>) {
  loading.value = true;
  try {
    const result = await registerApi({
      username: values.username,
      password: values.password,
      confirmPassword: values.confirmPassword,
      nickname: values.nickname || '',
      email: values.email || '',
    });

    // 保存token
    accessStore.setAccessToken(result.accessToken);

    // 获取权限码
    const accessCodes = await getAccessCodesApi();
    accessStore.setAccessCodes(accessCodes);

    // 保存用户信息
    userStore.setUserInfo({
      userId: String(result.userInfo.id),
      username: result.userInfo.username,
      realName: result.userInfo.nickname || result.userInfo.username,
      avatar: result.userInfo.avatar || '',
      roles: result.userInfo.roles?.map((r) => r.code) || [],
    });

    message.success('注册成功！');

    // 跳转到首页
    router.push(preferences.app.defaultHomePath);
  } catch (error: any) {
    message.error(error?.message || '注册失败，请稍后重试');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <AuthenticationRegister
    :form-schema="formSchema"
    :loading="loading"
    @submit="handleSubmit"
  />
</template>
