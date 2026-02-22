<script setup lang="ts">
import type {
  KnowledgeBase,
  KnowledgeEntity,
  KnowledgeRelation,
} from '#/api/knowledge-base';

import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue';

import {
  Badge,
  Empty,
  Radio,
  Select,
  Spin,
  Table,
  Tag,
  Tooltip,
  message,
} from 'ant-design-vue';
import { Graph } from '@antv/g6';
import { GitFork, List, Network } from 'lucide-vue-next';

import {
  getGraphEntitiesApi,
  getGraphRelationsApi,
} from '#/api/knowledge-base';

interface Props {
  kb: KnowledgeBase;
}

const props = defineProps<Props>();

const loading = ref(false);
const entities = ref<KnowledgeEntity[]>([]);
const relations = ref<KnowledgeRelation[]>([]);

const rightPanel = ref<'entities' | 'relations'>('entities');
const filterEntityType = ref<string | undefined>(undefined);
const filterRelationType = ref<string | undefined>(undefined);
const selectedNodeId = ref<number | null>(null);

const graphContainerRef = ref<HTMLDivElement>();
let graphInstance: Graph | null = null;

const ENTITY_TYPE_COLORS: Record<string, string> = {
  '人物': '#5B8FF9',
  '组织': '#5AD8A6',
  '地点': '#F6BD16',
  '事件': '#E86452',
  '概念': '#6DC8EC',
  '技术': '#945FB9',
  '产品': '#FF9845',
  '时间': '#1E9493',
};

const DEFAULT_COLOR = '#697B8C';

function getEntityColor(entityType: string): string {
  return ENTITY_TYPE_COLORS[entityType] || DEFAULT_COLOR;
}

const entityTypes = computed(() => {
  const types = new Set(entities.value.map((e) => e.entity_type));
  return [...types].sort();
});

const relationTypes = computed(() => {
  const types = new Set(relations.value.map((r) => r.relation_type));
  return [...types].sort();
});

const filteredEntities = computed(() => {
  let list = entities.value;
  if (filterEntityType.value) {
    list = list.filter((e) => e.entity_type === filterEntityType.value);
  }
  if (selectedNodeId.value !== null) {
    const selectedEntity = entities.value.find((e) => e.id === selectedNodeId.value);
    if (selectedEntity) {
      const connectedNames = new Set<string>();
      connectedNames.add(selectedEntity.name);
      for (const r of relations.value) {
        if (r.source_name === selectedEntity.name) connectedNames.add(r.target_name);
        if (r.target_name === selectedEntity.name) connectedNames.add(r.source_name);
      }
      list = list.filter((e) => connectedNames.has(e.name));
    }
  }
  return list;
});

const filteredRelations = computed(() => {
  let list = relations.value;
  if (filterRelationType.value) {
    list = list.filter((r) => r.relation_type === filterRelationType.value);
  }
  if (selectedNodeId.value !== null) {
    const selectedEntity = entities.value.find((e) => e.id === selectedNodeId.value);
    if (selectedEntity) {
      list = list.filter(
        (r) =>
          r.source_name === selectedEntity.name ||
          r.target_name === selectedEntity.name,
      );
    }
  }
  return list;
});

const entityColumns = [
  { title: '名称', dataIndex: 'name', key: 'name', ellipsis: true },
  { title: '类型', dataIndex: 'entity_type', key: 'entity_type', width: 80 },
  { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
  { title: '提及', dataIndex: 'mention_count', key: 'mention_count', width: 60, align: 'center' as const },
];

const relationColumns = [
  { title: '源实体', dataIndex: 'source_name', key: 'source_name', ellipsis: true },
  { title: '关系', dataIndex: 'relation_type', key: 'relation_type', width: 100, ellipsis: true },
  { title: '目标实体', dataIndex: 'target_name', key: 'target_name', ellipsis: true },
  { title: '权重', dataIndex: 'weight', key: 'weight', width: 60, align: 'center' as const },
];

async function loadData() {
  loading.value = true;
  try {
    const [ents, rels] = await Promise.all([
      getGraphEntitiesApi(props.kb.id),
      getGraphRelationsApi(props.kb.id),
    ]);
    entities.value = ents;
    relations.value = rels;
    await nextTick();
    setTimeout(() => {
      renderGraph();
    }, 100);
  } catch {
    message.error('加载图谱数据失败');
  } finally {
    loading.value = false;
  }
}

async function renderGraph() {
  if (!graphContainerRef.value) return;
  if (entities.value.length === 0) return;

  if (graphInstance) {
    graphInstance.destroy();
    graphInstance = null;
  }

  const container = graphContainerRef.value;
  const width = container.clientWidth || 800;
  const height = container.clientHeight || 600;

  const nameToNodeId = new Map<string, string>();
  const nodes = entities.value.map((e) => {
    const nodeId = `n-${e.id}`;
    nameToNodeId.set(e.name, nodeId);
    return {
      id: nodeId,
      data: {
        label: e.name,
        entityType: e.entity_type,
        description: e.description,
        mentionCount: e.mention_count,
        cluster: e.entity_type,
      },
    };
  });

  const edges = relations.value
    .filter(
      (r) =>
        nameToNodeId.has(r.source_name) &&
        nameToNodeId.has(r.target_name),
    )
    .map((r) => ({
      id: `e-${r.id}`,
      source: nameToNodeId.get(r.source_name)!,
      target: nameToNodeId.get(r.target_name)!,
      data: {
        label: r.relation_type,
        weight: r.weight,
      },
    }));

  graphInstance = new Graph({
    container,
    width,
    height,
    autoFit: 'view',
    data: { nodes, edges },
    node: {
      type: 'circle',
      style: {
        size: (d: any) => {
          const mc = d.data?.mentionCount || 1;
          return Math.min(20 + mc * 4, 60);
        },
        fill: (d: any) => getEntityColor(d.data?.entityType || ''),
        stroke: (d: any) => getEntityColor(d.data?.entityType || ''),
        fillOpacity: 0.85,
        lineWidth: 2,
        labelText: (d: any) => d.data?.label || '',
        labelFontSize: 11,
        labelFill: '#333',
        labelPlacement: 'bottom',
        labelOffsetY: 4,
      },
      state: {
        active: {
          stroke: '#000',
          lineWidth: 3,
          fillOpacity: 1,
        },
        inactive: {
          fillOpacity: 0.15,
          strokeOpacity: 0.15,
          labelOpacity: 0.3,
        },
      },
    },
    edge: {
      type: 'line',
      style: {
        stroke: '#C0C4CC',
        lineWidth: 1,
        endArrow: true,
        endArrowSize: 6,
        labelText: (d: any) => d.data?.label || '',
        labelFontSize: 10,
        labelFill: '#909399',
        labelBackground: true,
        labelBackgroundFill: 'rgba(255,255,255,0.85)',
        labelBackgroundRadius: 2,
        labelPadding: [1, 4],
      },
      state: {
        active: {
          stroke: '#5B8FF9',
          lineWidth: 2,
        },
        inactive: {
          strokeOpacity: 0.1,
          labelOpacity: 0.2,
        },
      },
    },
    layout: {
      type: 'd3-force',
      manyBody: { strength: -200 },
      link: { distance: 150 },
      collide: { radius: 40 },
    },
    behaviors: [
      'drag-canvas',
      'zoom-canvas',
      'drag-element',
    ],
  });

  graphInstance.on('node:click', (evt: any) => {
    const rawId = evt.target?.id;
    const nodeId = Number(String(rawId).replace('n-', ''));
    if (selectedNodeId.value === nodeId) {
      selectedNodeId.value = null;
      clearHighlight();
    } else {
      selectedNodeId.value = nodeId;
      highlightNode(`n-${nodeId}`);
    }
  });

  graphInstance.on('canvas:click', () => {
    selectedNodeId.value = null;
    clearHighlight();
  });

  await graphInstance.render();
}

async function highlightNode(nodeId: string) {
  if (!graphInstance) return;
  const data = graphInstance.getData();
  const connectedNodeIds = new Set<string>();
  connectedNodeIds.add(nodeId);
  const connectedEdgeIds = new Set<string>();

  for (const edge of data.edges || []) {
    if (edge.source === nodeId || edge.target === nodeId) {
      connectedNodeIds.add(edge.source as string);
      connectedNodeIds.add(edge.target as string);
      connectedEdgeIds.add(edge.id as string);
    }
  }

  await graphInstance.setElementState(
    Object.fromEntries(
      (data.nodes || []).map((n: any) => [
        n.id,
        connectedNodeIds.has(n.id) ? 'active' : 'inactive',
      ]),
    ),
  );
  await graphInstance.setElementState(
    Object.fromEntries(
      (data.edges || []).map((e: any) => [
        e.id,
        connectedEdgeIds.has(e.id) ? 'active' : 'inactive',
      ]),
    ),
  );
}

async function clearHighlight() {
  if (!graphInstance) return;
  const data = graphInstance.getData();
  await graphInstance.setElementState(
    Object.fromEntries(
      (data.nodes || []).map((n: any) => [n.id, []]),
    ),
  );
  await graphInstance.setElementState(
    Object.fromEntries(
      (data.edges || []).map((e: any) => [e.id, []]),
    ),
  );
}

function handleEntityRowClick(record: KnowledgeEntity) {
  const nodeId = record.id;
  if (selectedNodeId.value === nodeId) {
    selectedNodeId.value = null;
    clearHighlight();
  } else {
    selectedNodeId.value = nodeId;
    highlightNode(`n-${nodeId}`);
  }
}

function handleClearSelection() {
  selectedNodeId.value = null;
  clearHighlight();
}

watch(
  () => [filterEntityType.value, filterRelationType.value],
  () => {
    selectedNodeId.value = null;
    clearHighlight();
  },
);

onMounted(() => {
  loadData();
});

onBeforeUnmount(() => {
  if (graphInstance) {
    graphInstance.destroy();
    graphInstance = null;
  }
});
</script>

<template>
  <div class="graph-tab">
    <Spin :spinning="loading" class="graph-tab-spin">
      <template v-if="entities.length === 0 && !loading">
        <div class="graph-empty">
          <Empty description="暂无图谱数据，请先上传文档并等待实体抽取完成" />
        </div>
      </template>

      <template v-else-if="!loading">
        <div class="graph-layout">
          <!-- 左侧：图谱画布 -->
          <div class="graph-canvas-area">
            <div class="graph-canvas-header">
              <div class="graph-canvas-title">
                <Network :size="14" />
                <span>知识图谱</span>
                <Badge
                  :count="entities.length"
                  :number-style="{ backgroundColor: '#6366f1' }"
                  :overflow-count="9999"
                />
              </div>
              <div class="graph-legend">
                <template v-for="type in entityTypes" :key="type">
                  <span class="legend-item">
                    <span
                      class="legend-dot"
                      :style="{ backgroundColor: getEntityColor(type) }"
                    />
                    <span class="legend-label">{{ type }}</span>
                  </span>
                </template>
              </div>
            </div>
            <div ref="graphContainerRef" class="graph-container" />
          </div>

          <!-- 右侧：列表面板 -->
          <div class="graph-list-panel">
            <div class="panel-tabs">
              <Radio.Group
                v-model:value="rightPanel"
                size="small"
                button-style="solid"
              >
                <Radio.Button value="entities">
                  <span class="radio-btn-content">
                    <GitFork :size="12" />
                    实体 ({{ entities.length }})
                  </span>
                </Radio.Button>
                <Radio.Button value="relations">
                  <span class="radio-btn-content">
                    <List :size="12" />
                    关系 ({{ relations.length }})
                  </span>
                </Radio.Button>
              </Radio.Group>

              <Tooltip v-if="selectedNodeId !== null" title="清除选中">
                <a class="clear-selection" @click="handleClearSelection">
                  清除筛选
                </a>
              </Tooltip>
            </div>

            <!-- 实体列表 -->
            <template v-if="rightPanel === 'entities'">
              <div class="panel-filter">
                <Select
                  v-model:value="filterEntityType"
                  placeholder="按类型筛选"
                  allow-clear
                  size="small"
                  style="width: 100%"
                >
                  <Select.Option
                    v-for="t in entityTypes"
                    :key="t"
                    :value="t"
                  >
                    <span class="type-option">
                      <span
                        class="legend-dot"
                        :style="{ backgroundColor: getEntityColor(t) }"
                      />
                      {{ t }}
                    </span>
                  </Select.Option>
                </Select>
              </div>
              <div class="panel-table-wrap">
                <Table
                  :columns="entityColumns"
                  :data-source="filteredEntities"
                  :pagination="{ pageSize: 50, size: 'small', showSizeChanger: false }"
                  size="small"
                  row-key="id"
                  :custom-row="(record: KnowledgeEntity) => ({
                    onClick: () => handleEntityRowClick(record),
                    class: record.id === selectedNodeId ? 'row-active' : '',
                    style: { cursor: 'pointer' },
                  })"
                >
                  <template #bodyCell="{ column, record }">
                    <template v-if="column.key === 'entity_type'">
                      <Tag
                        :color="getEntityColor((record as KnowledgeEntity).entity_type)"
                        size="small"
                        style="margin: 0"
                      >
                        {{ (record as KnowledgeEntity).entity_type }}
                      </Tag>
                    </template>
                    <template v-if="column.key === 'description'">
                      <Tooltip
                        v-if="(record as KnowledgeEntity).description"
                        :title="(record as KnowledgeEntity).description"
                      >
                        <span class="desc-text">
                          {{ (record as KnowledgeEntity).description }}
                        </span>
                      </Tooltip>
                      <span v-else class="desc-empty">-</span>
                    </template>
                  </template>
                </Table>
              </div>
            </template>

            <!-- 关系列表 -->
            <template v-if="rightPanel === 'relations'">
              <div class="panel-filter">
                <Select
                  v-model:value="filterRelationType"
                  placeholder="按关系类型筛选"
                  allow-clear
                  size="small"
                  style="width: 100%"
                >
                  <Select.Option
                    v-for="t in relationTypes"
                    :key="t"
                    :value="t"
                  >
                    {{ t }}
                  </Select.Option>
                </Select>
              </div>
              <div class="panel-table-wrap">
                <Table
                  :columns="relationColumns"
                  :data-source="filteredRelations"
                  :pagination="{ pageSize: 50, size: 'small', showSizeChanger: false }"
                  size="small"
                  row-key="id"
                >
                  <template #bodyCell="{ column, record }">
                    <template v-if="column.key === 'source_name'">
                      <span class="entity-link">
                        {{ (record as KnowledgeRelation).source_name }}
                      </span>
                    </template>
                    <template v-if="column.key === 'target_name'">
                      <span class="entity-link">
                        {{ (record as KnowledgeRelation).target_name }}
                      </span>
                    </template>
                    <template v-if="column.key === 'relation_type'">
                      <Tag size="small" style="margin: 0">
                        {{ (record as KnowledgeRelation).relation_type }}
                      </Tag>
                    </template>
                  </template>
                </Table>
              </div>
            </template>
          </div>
        </div>
      </template>
    </Spin>
  </div>
</template>

<style scoped>
.graph-tab {
  height: 100%;
  overflow: hidden;
}

.graph-tab-spin {
  height: 100%;
}

.graph-tab :deep(.ant-spin-nested-loading),
.graph-tab :deep(.ant-spin-container) {
  height: 100%;
}

.graph-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.graph-layout {
  display: flex;
  height: 100%;
  gap: 0;
}

.graph-canvas-area {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid hsl(var(--border));
}

.graph-canvas-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  border-bottom: 1px solid hsl(var(--border));
  background: hsl(var(--card));
  flex-shrink: 0;
}

.graph-canvas-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  color: hsl(var(--foreground));
}

.graph-legend {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: hsl(var(--muted-foreground));
}

.legend-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-label {
  white-space: nowrap;
}

.graph-container {
  flex: 1;
  min-height: 0;
  background: hsl(var(--muted) / 30%);
}

.graph-list-panel {
  width: 380px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: hsl(var(--card));
}

.panel-tabs {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid hsl(var(--border));
  flex-shrink: 0;
}

.panel-tabs :deep(.ant-radio-button-wrapper) {
  font-size: 12px;
  white-space: nowrap;
  min-width: 90px;
  padding: 0 12px;
  text-align: center;
}

.radio-btn-content {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.clear-selection {
  font-size: 12px;
  color: hsl(var(--primary));
  cursor: pointer;
  white-space: nowrap;
}

.clear-selection:hover {
  text-decoration: underline;
}

.panel-filter {
  padding: 8px 12px;
  border-bottom: 1px solid hsl(var(--border));
  flex-shrink: 0;
}

.type-option {
  display: flex;
  align-items: center;
  gap: 6px;
}

.panel-table-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-table-wrap :deep(.ant-table-wrapper) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.panel-table-wrap :deep(.ant-table-wrapper .ant-spin-nested-loading) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.panel-table-wrap :deep(.ant-table-wrapper .ant-spin-container) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.panel-table-wrap :deep(.ant-table) {
  font-size: 12px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.panel-table-wrap :deep(.ant-table .ant-table-container) {
  height: 100%;
}

.panel-table-wrap :deep(.ant-table .ant-table-content) {
  overflow-y: auto !important;
  max-height: 100%;
}

.panel-table-wrap :deep(.ant-table-thead > tr > th) {
  font-size: 12px;
  padding: 6px 8px;
}

.panel-table-wrap :deep(.ant-table-tbody > tr > td) {
  padding: 5px 8px;
}

.panel-table-wrap :deep(.row-active) {
  background: hsl(var(--primary) / 8%) !important;
}

.panel-table-wrap :deep(.ant-table-pagination) {
  display: flex;
  flex-shrink: 0;
  margin: 8px 0;
  padding: 0 8px;
  border-top: 1px solid hsl(var(--border));
  padding-top: 8px;
}

.desc-text {
  color: hsl(var(--muted-foreground));
  font-size: 12px;
}

.desc-empty {
  color: hsl(var(--muted-foreground) / 40%);
}

.entity-link {
  color: hsl(var(--primary));
  font-size: 12px;
}
</style>
