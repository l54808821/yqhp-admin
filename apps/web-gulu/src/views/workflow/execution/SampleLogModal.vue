<script setup lang="ts">
import { ref, watch } from 'vue';

import {
  Badge,
  Descriptions,
  Input,
  Modal,
  Pagination,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'ant-design-vue';

import type { SampleLog, SampleLogQuery } from '#/api/execution';

import { getSampleLogsApi } from '#/api/execution';

interface Props {
  open: boolean;
  executionId: number;
  stepOptions?: { label: string; value: string }[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
}>();

const loading = ref(false);
const dataSource = ref<SampleLog[]>([]);
const total = ref(0);
const query = ref<SampleLogQuery>({
  page: 1,
  pageSize: 15,
});

const expandedRowKeys = ref<number[]>([]);

const columns = [
  { title: '时间', dataIndex: 'timestamp', key: 'timestamp', width: 180 },
  { title: '步骤', dataIndex: 'step_name', key: 'step_name', width: 140, ellipsis: true },
  { title: '方法', dataIndex: 'request_method', key: 'request_method', width: 70 },
  { title: 'URL', dataIndex: 'request_url', key: 'request_url', ellipsis: true },
  { title: '状态码', dataIndex: 'response_status', key: 'response_status', width: 80 },
  { title: '耗时', dataIndex: 'duration_ms', key: 'duration_ms', width: 90 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 80 },
];

const statusColorMap: Record<string, string> = {
  success: 'success',
  failed: 'error',
  timeout: 'warning',
};

const statusTextMap: Record<string, string> = {
  success: '成功',
  failed: '失败',
  timeout: '超时',
};

function formatTimestamp(ts: string) {
  try {
    const d = new Date(ts);
    return d.toLocaleString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    });
  } catch {
    return ts;
  }
}

const methodColors: Record<string, string> = {
  GET: 'blue',
  POST: 'green',
  PUT: 'orange',
  DELETE: 'red',
  PATCH: 'purple',
};

async function fetchData() {
  if (!props.executionId) return;
  loading.value = true;
  try {
    const res = await getSampleLogsApi(props.executionId, query.value);
    dataSource.value = res.list || [];
    total.value = res.total || 0;
  } catch {
    dataSource.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

function handleSearch(keyword: string) {
  query.value.keyword = keyword || undefined;
  query.value.page = 1;
  fetchData();
}

function handleStatusChange(val: any) {
  query.value.status = val || undefined;
  query.value.page = 1;
  fetchData();
}

function handleStepChange(val: any) {
  query.value.step_id = val || undefined;
  query.value.page = 1;
  fetchData();
}

function handlePageChange(page: number, pageSize: number) {
  query.value.page = page;
  query.value.pageSize = pageSize;
  fetchData();
}

function handleClose() {
  emit('update:open', false);
  expandedRowKeys.value = [];
}

function toggleExpand(id: number) {
  const idx = expandedRowKeys.value.indexOf(id);
  if (idx >= 0) {
    expandedRowKeys.value.splice(idx, 1);
  } else {
    expandedRowKeys.value.push(id);
  }
}

function formatHeaders(headers?: Record<string, string>): string {
  if (!headers) return '';
  return Object.entries(headers)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

function truncateBody(body?: string, max = 2000): string {
  if (!body) return '';
  if (body.length <= max) return body;
  return body.slice(0, max) + `\n... (共 ${body.length} 字符，已截断)`;
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      query.value = { page: 1, pageSize: 15 };
      fetchData();
    }
  },
);
</script>

<template>
  <Modal
    :open="open"
    title="采样日志"
    :width="1100"
    :footer="null"
    :destroy-on-close="true"
    @cancel="handleClose"
  >
    <div class="sample-log-container">
      <!-- 搜索与筛选 -->
      <div class="filter-bar">
        <Space wrap>
          <Input.Search
            placeholder="搜索 URL / 错误信息"
            allow-clear
            style="width: 280px"
            @search="handleSearch"
          />
          <Select
            placeholder="状态"
            allow-clear
            style="width: 110px"
            :options="[
              { label: '成功', value: 'success' },
              { label: '失败', value: 'failed' },
              { label: '超时', value: 'timeout' },
            ]"
            @change="(val: any) => handleStatusChange(val)"
          />
          <Select
            v-if="stepOptions?.length"
            placeholder="步骤"
            allow-clear
            style="width: 160px"
            :options="stepOptions"
            @change="(val: any) => handleStepChange(val)"
          />
          <Typography.Text type="secondary" style="font-size: 12px">
            共 {{ total }} 条记录
          </Typography.Text>
        </Space>
      </div>

      <!-- 表格 -->
      <Table
        :columns="columns"
        :data-source="dataSource"
        :loading="loading"
        :pagination="false"
        size="small"
        :scroll="{ y: 420 }"
        row-key="id"
        :expanded-row-keys="expandedRowKeys"
        :custom-row="(record: SampleLog) => ({ onClick: () => toggleExpand(record.id) })"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'timestamp'">
            {{ formatTimestamp(record.timestamp) }}
          </template>
          <template v-else-if="column.key === 'request_method'">
            <Tag :color="methodColors[record.request_method] || 'default'" class="method-tag">
              {{ record.request_method }}
            </Tag>
          </template>
          <template v-else-if="column.key === 'request_url'">
            <Typography.Text
              :ellipsis="{ tooltip: record.request_url }"
              style="max-width: 100%; font-size: 12px"
            >
              {{ record.request_url }}
            </Typography.Text>
          </template>
          <template v-else-if="column.key === 'response_status'">
            <Badge
              :status="(record.response_status || 0) < 400 ? 'success' : 'error'"
              :text="String(record.response_status || '-')"
            />
          </template>
          <template v-else-if="column.key === 'duration_ms'">
            <span :style="{ color: record.duration_ms > 3000 ? '#ff4d4f' : undefined }">
              {{ record.duration_ms?.toFixed(1) }} ms
            </span>
          </template>
          <template v-else-if="column.key === 'status'">
            <Tag :color="statusColorMap[record.status]">
              {{ statusTextMap[record.status] || record.status }}
            </Tag>
          </template>
        </template>

        <template #expandedRowRender="{ record }">
          <div class="expanded-detail">
            <Descriptions :column="1" size="small" bordered>
              <Descriptions.Item label="请求 URL">
                <Typography.Text copyable style="font-size: 12px; word-break: break-all">
                  {{ record.request_method }} {{ record.request_url }}
                </Typography.Text>
              </Descriptions.Item>
              <Descriptions.Item label="请求头">
                <pre class="detail-pre">{{ formatHeaders(record.request_headers) || '-' }}</pre>
              </Descriptions.Item>
              <Descriptions.Item v-if="record.request_body" label="请求体">
                <pre class="detail-pre">{{ truncateBody(record.request_body) }}</pre>
              </Descriptions.Item>
              <Descriptions.Item label="响应状态">
                {{ record.response_status }} | {{ record.duration_ms?.toFixed(1) }} ms
              </Descriptions.Item>
              <Descriptions.Item label="响应头">
                <pre class="detail-pre">{{ formatHeaders(record.response_headers) || '-' }}</pre>
              </Descriptions.Item>
              <Descriptions.Item v-if="record.response_body" label="响应体">
                <pre class="detail-pre">{{ truncateBody(record.response_body) }}</pre>
              </Descriptions.Item>
              <Descriptions.Item v-if="record.error_message" label="错误信息">
                <Typography.Text type="danger" style="font-size: 12px">
                  {{ record.error_message }}
                </Typography.Text>
              </Descriptions.Item>
            </Descriptions>
          </div>
        </template>
      </Table>

      <!-- 分页 -->
      <div v-if="total > 0" class="pagination-bar">
        <Pagination
          :current="query.page"
          :page-size="query.pageSize"
          :total="total"
          size="small"
          show-size-changer
          show-quick-jumper
          :page-size-options="['10', '15', '30', '50']"
          @change="handlePageChange"
        />
      </div>
    </div>
  </Modal>
</template>

<style scoped>
.sample-log-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.method-tag {
  margin: 0;
  font-size: 11px;
  line-height: 18px;
  padding: 0 4px;
}

.pagination-bar {
  display: flex;
  justify-content: flex-end;
  padding-top: 4px;
}

.expanded-detail {
  padding: 4px 0;
}

.detail-pre {
  margin: 0;
  font-size: 11px;
  line-height: 1.5;
  max-height: 200px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
  background: var(--ant-color-fill-quaternary, #fafafa);
  padding: 6px 8px;
  border-radius: 4px;
}
</style>
