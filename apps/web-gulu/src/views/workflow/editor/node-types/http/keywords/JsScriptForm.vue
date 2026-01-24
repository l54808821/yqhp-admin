<script setup lang="ts">
import { ref, watch } from 'vue';

import { Switch } from 'ant-design-vue';

import { ScriptEditor } from '#/components/code-editor';

import type { JsScriptConfig } from '../../../types';
import { createJsScriptConfig } from '../../../types';

interface Props {
  config: JsScriptConfig;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update', config: JsScriptConfig): void;
}>();

// 本地数据
const localConfig = ref<JsScriptConfig>(createJsScriptConfig());

// 同步外部数据
watch(
  () => props.config,
  (newConfig) => {
    if (newConfig) {
      localConfig.value = JSON.parse(JSON.stringify(newConfig));
    } else {
      localConfig.value = createJsScriptConfig();
    }
  },
  { immediate: true, deep: true }
);

// 触发更新
function emitUpdate() {
  emit('update', JSON.parse(JSON.stringify(localConfig.value)));
}

// 更新脚本
function updateScript(value: string) {
  localConfig.value.script = value;
  emitUpdate();
}

// 更新出错时停止
function updateStopOnError(checked: boolean | string | number) {
  localConfig.value.stopOnError = Boolean(checked);
  emitUpdate();
}
</script>

<template>
  <div class="js-script-form">
    <!-- 脚本编辑器 -->
    <div class="editor-wrapper">
      <ScriptEditor
        :model-value="localConfig.script"
        language="javascript"
        height="300px"
        :show-snippets="true"
        :show-toolbar="true"
        @update:model-value="updateScript"
      />
    </div>

    <!-- 选项 -->
    <div class="options-row">
      <Switch
        :checked="localConfig.stopOnError"
        size="small"
        @change="updateStopOnError"
      />
      <span class="switch-label">脚本出错时停止执行</span>
    </div>
  </div>
</template>

<style scoped>
.js-script-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.editor-wrapper {
  border: 1px solid hsl(var(--border));
  border-radius: 6px;
  overflow: hidden;
}

.options-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.switch-label {
  font-size: 13px;
  color: hsl(var(--foreground) / 80%);
}
</style>
