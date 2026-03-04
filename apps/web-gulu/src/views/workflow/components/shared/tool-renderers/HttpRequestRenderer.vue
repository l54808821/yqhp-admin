<script setup lang="ts">
import { computed, ref } from 'vue';

import { createIconifyIcon } from '@vben/icons';

import { formatJSON, highlightCode, tryParseJSON } from './useHighlight';

const GlobeIcon = createIconifyIcon('lucide:globe');
const ChevronDown = createIconifyIcon('lucide:chevron-down');
const ChevronRight = createIconifyIcon('lucide:chevron-right');

const props = defineProps<{
  name: string;
  arguments: string;
  result?: string;
  isError?: boolean;
  status: 'running' | 'completed' | 'error';
}>();

const showDetails = ref(false);

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

const resultParsed = computed(() => {
  if (!props.result) return null;
  return tryParseJSON(props.result);
});

const formattedResult = computed(() => {
  if (!props.result) return '';
  if (resultParsed.value !== null) {
    return formatJSON(props.result);
  }
  return props.result;
});

const highlightedResult = computed(() => {
  if (!formattedResult.value) return '';
  if (resultParsed.value !== null) {
    return highlightCode(formattedResult.value, 'json');
  }
  return '';
});

const statusCode = computed(() => {
  if (!resultParsed.value) return null;
  return resultParsed.value.status_code || resultParsed.value.statusCode || null;
});

const statusCodeClass = computed(() => {
  const code = statusCode.value;
  if (!code) return '';
  if (code >= 200 && code < 300) return 'status-2xx';
  if (code >= 300 && code < 400) return 'status-3xx';
  if (code >= 400 && code < 500) return 'status-4xx';
  return 'status-5xx';
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
  <div class="http-request-renderer">
    <div class="request-line">
      <GlobeIcon class="request-icon" />
      <span class="method-badge" :class="methodClass">{{ method }}</span>
      <span class="request-url">{{ url }}</span>
    </div>

    <div v-if="headers || body" class="details-toggle">
      <button class="toggle-btn" @click.stop="showDetails = !showDetails">
        <component :is="showDetails ? ChevronDown : ChevronRight" class="toggle-icon" />
        <span>{{ showDetails ? '隐藏详情' : '请求详情' }}</span>
      </button>
    </div>

    <div v-if="showDetails" class="request-details">
      <div v-if="headers" class="detail-group">
        <div class="group-label">Headers</div>
        <div class="headers-list">
          <div v-for="(val, key) in headers" :key="key" class="header-item">
            <span class="header-key">{{ key }}:</span>
            <span class="header-val">{{ val }}</span>
          </div>
        </div>
      </div>
      <div v-if="body" class="detail-group">
        <div class="group-label">Body</div>
        <pre v-if="highlightedBody" class="json-body"><code class="hljs" v-html="highlightedBody" /></pre>
        <pre v-else class="text-body">{{ formattedBody }}</pre>
      </div>
    </div>

    <div v-if="result || status === 'completed' || status === 'error'" class="response-section">
      <div class="response-header">
        <span class="section-label">{{ isError ? '错误' : '响应' }}</span>
        <span v-if="statusCode" class="status-badge" :class="statusCodeClass">{{ statusCode }}</span>
      </div>
      <pre v-if="highlightedResult && !isError" class="response-body"><code class="hljs" v-html="highlightedResult" /></pre>
      <pre v-else class="response-body" :class="{ error: isError, empty: !result }">{{ result || '(无输出)' }}</pre>
    </div>
  </div>
</template>

<style scoped>
.http-request-renderer {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.request-line {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
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

.details-toggle {
  display: flex;
}

.toggle-btn {
  display: flex;
  align-items: center;
  gap: 3px;
  background: none;
  border: none;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  font-size: 10px;
  padding: 2px 4px;
  border-radius: 3px;
}

.toggle-btn:hover {
  background: hsl(var(--muted) / 40%);
  color: hsl(var(--foreground));
}

.toggle-icon {
  width: 10px;
  height: 10px;
}

.request-details {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 6px 8px;
  background: hsl(var(--muted) / 15%);
  border-radius: 4px;
  border: 1px solid hsl(var(--border));
}

.group-label {
  font-size: 10px;
  font-weight: 600;
  color: hsl(var(--muted-foreground));
  margin-bottom: 2px;
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

.detail-group + .detail-group {
  padding-top: 6px;
  border-top: 1px dashed hsl(var(--border));
}

.json-body,
.text-body {
  margin: 0;
  padding: 6px 8px;
  font-size: 11px;
  line-height: 1.5;
  font-family: 'SF Mono', 'Menlo', monospace;
  border-radius: 4px;
  max-height: 160px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

.json-body {
  background: #1e1e2e;
  color: #cdd6f4;
}

.text-body {
  background: hsl(var(--muted) / 30%);
  color: hsl(var(--foreground));
}

.response-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.response-header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.section-label {
  font-size: 11px;
  color: hsl(var(--muted-foreground));
  font-weight: 500;
}

.status-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 0 5px;
  border-radius: 3px;
}

.status-2xx { background: rgba(82, 196, 26, 0.15); color: #52c41a; }
.status-3xx { background: rgba(24, 144, 255, 0.15); color: #1890ff; }
.status-4xx { background: rgba(250, 173, 20, 0.15); color: #faad14; }
.status-5xx { background: rgba(255, 77, 79, 0.15); color: #ff4d4f; }

.response-body {
  margin: 0;
  padding: 6px 10px;
  font-size: 11px;
  line-height: 1.5;
  font-family: 'SF Mono', 'Menlo', monospace;
  background: #1e1e2e;
  color: #cdd6f4;
  border-radius: 4px;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 200px;
  overflow-y: auto;
}

.response-body.error {
  color: #ff4d4f;
  background: rgba(255, 77, 79, 0.08);
}

.response-body.empty {
  color: hsl(var(--muted-foreground));
  font-style: italic;
  background: hsl(var(--muted) / 20%);
}
</style>
