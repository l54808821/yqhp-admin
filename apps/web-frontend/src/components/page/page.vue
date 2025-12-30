<script setup lang="ts">
/**
 * 自适应高度 Page 组件
 */
defineOptions({
  name: 'FlexPage',
});

interface PageProps {
  title?: string;
  description?: string;
  contentClass?: string;
  autoContentHeight?: boolean;
  headerClass?: string;
  footerClass?: string;
  heightOffset?: number;
}

withDefaults(defineProps<PageProps>(), {
  autoContentHeight: false,
  heightOffset: 0,
});
</script>

<template>
  <div class="page-container">
    <div
      v-if="description || $slots.description || title || $slots.title || $slots.extra"
      class="page-header bg-card border-border"
      :class="headerClass"
    >
      <div class="flex-auto">
        <slot name="title">
          <div v-if="title" class="mb-2 flex text-lg font-semibold">
            {{ title }}
          </div>
        </slot>
        <slot name="description">
          <p v-if="description" class="text-muted-foreground">
            {{ description }}
          </p>
        </slot>
      </div>
      <div v-if="$slots.extra">
        <slot name="extra"></slot>
      </div>
    </div>

    <div class="page-content" :class="contentClass">
      <slot></slot>
    </div>

    <div
      v-if="$slots.footer"
      class="page-footer bg-card"
      :class="footerClass"
    >
      <slot name="footer"></slot>
    </div>
  </div>
</template>

<style scoped>
.page-container {
  position: relative;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 50px);
  max-height: calc(100vh - 50px);
  overflow: hidden;
}

.page-header {
  flex: 0 0 auto;
  display: flex;
  align-items: flex-end;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border);
}

.page-content {
  flex: 1 1 auto;
  min-height: 0;
  padding: 1rem;
  overflow: hidden;
}

.page-footer {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  padding: 1rem 1.5rem;
}
</style>
