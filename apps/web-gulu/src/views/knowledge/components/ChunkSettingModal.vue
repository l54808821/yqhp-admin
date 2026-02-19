<script setup lang="ts">
import type { ChunkSetting, KnowledgeBase, KnowledgeDocument } from '#/api/knowledge-base';

import { ref } from 'vue';

import { Button, Drawer, message } from 'ant-design-vue';

import { processDocumentApi } from '#/api/knowledge-base';

import ChunkSettingPanel from './ChunkSettingPanel.vue';

interface Props {
  kb: KnowledgeBase;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const visible = ref(false);
const loading = ref(false);
const docId = ref<number>(0);
const docName = ref('');
const panelRef = ref<InstanceType<typeof ChunkSettingPanel>>();

const chunkSettings = ref<ChunkSetting>({
  separator: '\\n\\n',
  chunk_size: 500,
  chunk_overlap: 50,
  clean_whitespace: true,
  remove_urls: false,
});

function open(doc: KnowledgeDocument) {
  docId.value = doc.id;
  docName.value = doc.name;

  if (doc.chunk_setting) {
    chunkSettings.value = { ...doc.chunk_setting };
  } else {
    chunkSettings.value = {
      separator: '\\n\\n',
      chunk_size: props.kb.chunk_size || 500,
      chunk_overlap: props.kb.chunk_overlap || 50,
      clean_whitespace: true,
      remove_urls: false,
    };
  }

  visible.value = true;
}

async function handleSave() {
  if ((chunkSettings.value.chunk_overlap ?? 0) >= (chunkSettings.value.chunk_size ?? 500)) {
    message.warning('分段重叠长度必须小于分段最大长度');
    return;
  }

  loading.value = true;
  try {
    await processDocumentApi(props.kb.id, docId.value, {
      chunk_setting: { ...chunkSettings.value },
    });
    message.success('已提交重新处理');
    visible.value = false;
    emit('success');
  } catch (e: any) {
    message.error('操作失败: ' + (e.message || '未知错误'));
  } finally {
    loading.value = false;
  }
}

defineExpose({ open });
</script>

<template>
  <Drawer
    v-model:open="visible"
    title="修改分段设置"
    :width="960"
    :destroyOnClose="true"
  >
    <div class="chunk-drawer-tip">
      修改分段设置后将重新处理文档 <strong>{{ docName }}</strong>，原有分块数据会被替换。
    </div>

    <ChunkSettingPanel
      ref="panelRef"
      v-model:settings="chunkSettings"
      :kb-id="props.kb.id"
      :document-id="docId"
      :document-name="docName"
      :default-chunk-size="props.kb.chunk_size || 500"
      :default-chunk-overlap="props.kb.chunk_overlap || 50"
    />

    <template #footer>
      <div class="chunk-drawer-footer">
        <Button @click="visible = false">取消</Button>
        <Button type="primary" :loading="loading" @click="handleSave">
          保存并重新处理
        </Button>
      </div>
    </template>
  </Drawer>
</template>

<style scoped>
.chunk-drawer-tip {
  margin-bottom: 16px;
  padding: 8px 12px;
  font-size: 13px;
  color: hsl(var(--muted-foreground));
  background: hsl(var(--muted) / 30%);
  border-radius: 6px;
  line-height: 1.5;
}

.chunk-drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
