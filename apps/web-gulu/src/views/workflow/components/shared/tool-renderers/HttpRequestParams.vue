<script setup lang="ts">
import { computed } from 'vue';

import { createIconifyIcon } from '@vben/icons';

import { formatJSON, highlightCode, tryParseJSON } from './useHighlight';

const GlobeIcon = createIconifyIcon('lucide:globe');

const props = defineProps<{
  name: string;
  arguments: string;
}>();

const parsed = computed(() => tryParseJSON(props.arguments));
const method = computed(() => (parsed.value?.method || 'GET').toUpperCase());
const url = computed(() => parsed.value?.url || '');
const headers = computed(() => parsed.value?.headers);
const body = computed(() => parsed.value?.body || '');

const methodClass = computed(() => {
  const m = method.value;
  if (m === 'GET') return 'method-get';
  if (m === 'POST') return 'method-post';
  if (m === 'PUT') return 'method-put';
  if (m === 'PATCH') return 'method-patch';
  if (m === 'DELETE') return 'method-delete';
  return 'method-default';
});

const formattedBody = computed(() => {
  if (!body.value) return '';
  const p = tryParseJSON(body.value);
  if (p !== null) return formatJSON(body.value);
  return body.value;
});

const highlightedBody = computed(() => {
  if (!formattedBody.value) return '';
  const p = tryParseJSON(body.value);
  if (p !== null) return highlightCode(formattedBody.value, 'json');
  return '';
});
</script>

<template>
  <div class="http-params">
    <div class="request-line">
      <GlobeIcon class="request-icon" />
      <span class="method-badge" :class="methodClass">{{ method }}</span>
      <span class="request-url">{{ url }}</span>
    </div>

    <div v-if="headers" class="param-group">
      <div class="group-label">Headers</div>
      <div class="headers-list">
        <div v-for="(val, key) in headers" :key="key" class="header-item">
          <span class="header-key">{{ key }}:</span>
          <span class="header-val">{{ val }}</span>
        </div>
      </div>
    </div>

    <div v-if="body" class="param-group">
      <div class="group-label">Body</div>
      <pre v-if="highlightedBody" class="json-body"><code class="hljs" v-html="highlightedBody" /></pre>
      <pre v-else class="text-body">{{ formattedBody }}</pre>
    </div>
  </div>
</template>

<style scoped>
.http-params {
  min-width: 280px;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.request-line {
  display: flex;
  align-items: center;
  gap: 6px;
}

.request-icon {
  width: 12px;
  height: 12px;
  color: hsl(var(--muted-foreground));
  flex-shrink: 0;
}

.method-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 3px;
  letter-spacing: 0.3px;
  flex-shrink: 0;
}

.method-get { background: rgba(82, 196, 26, 0.15); color: #52c41a; }
.method-post { background: rgba(24, 144, 255, 0.15); color: #1890ff; }
.method-put { background: rgba(250, 173, 20, 0.15); color: #faad14; }
.method-patch { background: rgba(250, 173, 20, 0.15); color: #faad14; }
.method-delete { background: rgba(255, 77, 79, 0.15); color: #ff4d4f; }
.method-default { background: hsl(var(--muted) / 30%); color: hsl(var(--muted-foreground)); }

.request-url {
  font-family: 'SF Mono', 'Menlo', monospace;
  font-size: 11px;
  color: hsl(var(--foreground));
  word-break: break-all;
  line-height: 1.4;
}

.param-group {
  padding-top: 6px;
  border-top: 1px dashed hsl(var(--border));
}

.group-label {
  font-size: 10px;
  font-weight: 600;
  color: hsl(var(--muted-foreground));
  margin-bottom: 3px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.headers-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.header-item {
  font-size: 11px;
  font-family: 'SF Mono', 'Menlo', monospace;
  line-height: 1.5;
}

.header-key {
  color: hsl(var(--primary));
  margin-right: 4px;
}

.header-val {
  color: hsl(var(--foreground));
}

.json-body {
  margin: 0;
  padding: 6px 8px;
  font-size: 11px;
  line-height: 1.5;
  font-family: 'SF Mono', 'Menlo', monospace;
  background: #1e1e2e;
  color: #cdd6f4;
  border-radius: 4px;
  max-height: 200px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

.json-body code {
  font-family: inherit;
  font-size: inherit;
}

.text-body {
  margin: 0;
  padding: 6px 8px;
  font-size: 11px;
  line-height: 1.5;
  font-family: 'SF Mono', 'Menlo', monospace;
  white-space: pre-wrap;
  word-break: break-all;
  color: hsl(var(--foreground));
  background: hsl(var(--muted) / 20%);
  border-radius: 4px;
  max-height: 200px;
  overflow-y: auto;
}
</style>
