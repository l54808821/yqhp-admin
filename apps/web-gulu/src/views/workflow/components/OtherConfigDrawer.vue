<script setup lang="ts">
import { ref } from 'vue';

import { createIconifyIcon } from '@vben/icons';
import { Drawer, Tabs } from 'ant-design-vue';

import type { ExecutorConfig } from '#/api/executor';
import type { PerformanceConfig } from '#/api/workflow/performance';

import ExecutorConfigPanel from './ExecutorConfigPanel.vue';
import PerformanceConfigPanel from './PerformanceConfigPanel.vue';

const ServerIcon = createIconifyIcon('lucide:server');
const GaugeIcon = createIconifyIcon('lucide:gauge');

interface Props {
  open: boolean;
  executorConfig: ExecutorConfig | null;
  performanceConfig: PerformanceConfig | null;
  readonly?: boolean;
  isPerformanceWorkflow?: boolean;
}

withDefaults(defineProps<Props>(), {
  readonly: false,
  isPerformanceWorkflow: false,
});

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'update:executorConfig', config: ExecutorConfig | null): void;
  (e: 'update:performanceConfig', config: PerformanceConfig | null): void;
}>();

const activeTab = ref('executor');

function handleClose() {
  emit('update:open', false);
}
</script>

<template>
  <Drawer
    :open="open"
    title="其他配置"
    placement="right"
    :width="700"
    :mask-closable="true"
    :body-style="{ padding: 0 }"
    :header-style="{ padding: '12px 20px' }"
    @close="handleClose"
  >
    <Tabs v-model:activeKey="activeTab" size="small" class="config-tabs">
      <Tabs.TabPane key="executor">
        <template #tab>
          <span class="tab-label">
            <ServerIcon class="tab-icon" />
            执行机配置
          </span>
        </template>
        <div class="tab-content">
          <ExecutorConfigPanel
            :config="executorConfig"
            :readonly="readonly"
            @update:config="(cfg) => emit('update:executorConfig', cfg)"
          />
        </div>
      </Tabs.TabPane>
      <Tabs.TabPane v-if="isPerformanceWorkflow" key="performance">
        <template #tab>
          <span class="tab-label">
            <GaugeIcon class="tab-icon" />
            压测配置
          </span>
        </template>
        <div class="tab-content">
          <PerformanceConfigPanel
            :config="performanceConfig"
            :readonly="readonly"
            @update:config="(cfg) => emit('update:performanceConfig', cfg)"
          />
        </div>
      </Tabs.TabPane>
    </Tabs>
  </Drawer>
</template>

<style scoped>
.config-tabs {
  height: 100%;
}

.config-tabs :deep(.ant-tabs-nav) {
  padding: 0 20px;
  margin-bottom: 0;
}

.config-tabs :deep(.ant-tabs-content) {
  height: 100%;
}

.tab-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.tab-icon {
  width: 14px;
  height: 14px;
}

.tab-content {
  padding: 16px 20px;
  overflow-y: auto;
  max-height: calc(100vh - 110px);
}
</style>
