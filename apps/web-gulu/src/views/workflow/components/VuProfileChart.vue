<script setup lang="ts">
import { computed } from 'vue';

import type { ExecutionMode, Stage } from '#/api/workflow/performance';

interface Props {
  mode: ExecutionMode;
  vus?: number;
  duration?: string;
  iterations?: number;
  stages?: Stage[];
}

const props = withDefaults(defineProps<Props>(), {
  vus: 10,
  duration: '30s',
  iterations: 100,
  stages: () => [],
});

const W = 480;
const H = 100;
const PAD_X = 40;
const PAD_Y = 16;
const CHART_W = W - PAD_X * 2;
const CHART_H = H - PAD_Y * 2;

function parseDurationToSeconds(d: string | undefined): number {
  if (!d) return 0;
  let total = 0;
  const hMatch = d.match(/(\d+)\s*h/);
  const mMatch = d.match(/(\d+)\s*m(?!s)/);
  const sMatch = d.match(/(\d+)\s*s/);
  if (hMatch) total += Number.parseInt(hMatch[1]!) * 3600;
  if (mMatch) total += Number.parseInt(mMatch[1]!) * 60;
  if (sMatch) total += Number.parseInt(sMatch[1]!);
  return total || 30;
}

function formatDuration(seconds: number): string {
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return m > 0 ? `${h}h${m}m` : `${h}h`;
  }
  if (seconds >= 60) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s > 0 ? `${m}m${s}s` : `${m}m`;
  }
  return `${seconds}s`;
}

interface Point {
  x: number;
  y: number;
}

const chartData = computed(() => {
  const mode = props.mode;
  const isStaged = mode === 'ramping-vus' || mode === 'ramping-arrival-rate';

  if (isStaged && props.stages?.length) {
    return buildStagedData(props.stages);
  }
  return buildConstantData();
});

function buildConstantData() {
  const vus = props.vus || 10;
  const totalSec = parseDurationToSeconds(props.duration);
  const maxY = vus;
  const points: Point[] = [
    { x: PAD_X, y: PAD_Y + CHART_H - (vus / maxY) * CHART_H },
    { x: PAD_X + CHART_W, y: PAD_Y + CHART_H - (vus / maxY) * CHART_H },
  ];
  return {
    points,
    maxY,
    totalDuration: totalSec,
    yLabel: props.mode === 'constant-arrival-rate' ? 'RPS' : 'VU',
  };
}

function buildStagedData(stages: Stage[]) {
  const totalSec = stages.reduce(
    (sum, s) => sum + parseDurationToSeconds(s.duration),
    0,
  );
  const maxY = Math.max(...stages.map((s) => s.target), 1);

  const points: Point[] = [];
  let elapsed = 0;

  points.push({
    x: PAD_X,
    y: PAD_Y + CHART_H,
  });

  for (const stage of stages) {
    const dur = parseDurationToSeconds(stage.duration);
    elapsed += dur;
    const x = PAD_X + (elapsed / totalSec) * CHART_W;
    const y = PAD_Y + CHART_H - (stage.target / maxY) * CHART_H;
    points.push({ x, y });
  }

  return {
    points,
    maxY,
    totalDuration: totalSec,
    yLabel: props.mode === 'ramping-arrival-rate' ? 'RPS' : 'VU',
  };
}

const linePath = computed(() => {
  const pts = chartData.value.points;
  if (pts.length === 0) return '';
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
});

const areaPath = computed(() => {
  const pts = chartData.value.points;
  if (pts.length === 0) return '';
  const baseline = PAD_Y + CHART_H;
  const start = `M${pts[0]!.x},${baseline}`;
  const lines = pts.map((p) => `L${p.x},${p.y}`).join(' ');
  const end = `L${pts[pts.length - 1]!.x},${baseline} Z`;
  return `${start} ${lines} ${end}`;
});

const yAxisLabel = computed(() => `${chartData.value.maxY} ${chartData.value.yLabel}`);
const xAxisLabel = computed(() => formatDuration(chartData.value.totalDuration));
</script>

<template>
  <div class="vu-profile-chart">
    <svg :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="vuGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--ant-color-primary, #1677ff)" stop-opacity="0.25" />
          <stop offset="100%" stop-color="var(--ant-color-primary, #1677ff)" stop-opacity="0.02" />
        </linearGradient>
      </defs>

      <!-- grid lines -->
      <line
        :x1="PAD_X" :y1="PAD_Y"
        :x2="PAD_X" :y2="PAD_Y + CHART_H"
        class="axis-line"
      />
      <line
        :x1="PAD_X" :y1="PAD_Y + CHART_H"
        :x2="PAD_X + CHART_W" :y2="PAD_Y + CHART_H"
        class="axis-line"
      />
      <line
        :x1="PAD_X" :y1="PAD_Y"
        :x2="PAD_X + CHART_W" :y2="PAD_Y"
        class="grid-line"
      />
      <line
        :x1="PAD_X" :y1="PAD_Y + CHART_H / 2"
        :x2="PAD_X + CHART_W" :y2="PAD_Y + CHART_H / 2"
        class="grid-line"
      />

      <!-- area fill -->
      <path :d="areaPath" fill="url(#vuGradient)" />

      <!-- line -->
      <path :d="linePath" class="chart-line" />

      <!-- data points -->
      <circle
        v-for="(pt, i) in chartData.points"
        :key="i"
        :cx="pt.x"
        :cy="pt.y"
        r="2.5"
        class="data-point"
      />

      <!-- Y axis max label -->
      <text
        :x="PAD_X - 4"
        :y="PAD_Y + 4"
        class="axis-label"
        text-anchor="end"
      >
        {{ yAxisLabel }}
      </text>

      <!-- Y axis 0 label -->
      <text
        :x="PAD_X - 4"
        :y="PAD_Y + CHART_H + 4"
        class="axis-label"
        text-anchor="end"
      >
        0
      </text>

      <!-- X axis total duration -->
      <text
        :x="PAD_X + CHART_W"
        :y="PAD_Y + CHART_H + 14"
        class="axis-label"
        text-anchor="end"
      >
        {{ xAxisLabel }}
      </text>
    </svg>
  </div>
</template>

<style scoped>
.vu-profile-chart {
  width: 100%;
  border-radius: 8px;
  background: var(--ant-color-fill-quaternary, #fafafa);
  border: 1px solid var(--ant-color-border-secondary, #f0f0f0);
  padding: 8px 4px 4px;
}

.vu-profile-chart svg {
  width: 100%;
  height: auto;
  display: block;
}

.axis-line {
  stroke: var(--ant-color-border, #d9d9d9);
  stroke-width: 1;
}

.grid-line {
  stroke: var(--ant-color-border-secondary, #f0f0f0);
  stroke-width: 0.5;
  stroke-dasharray: 4 3;
}

.chart-line {
  fill: none;
  stroke: var(--ant-color-primary, #1677ff);
  stroke-width: 2;
  stroke-linejoin: round;
  stroke-linecap: round;
}

.data-point {
  fill: var(--ant-color-primary, #1677ff);
  stroke: #fff;
  stroke-width: 1.5;
}

.axis-label {
  font-size: 9px;
  fill: var(--ant-color-text-quaternary, #bbb);
  font-family: -apple-system, system-ui, sans-serif;
}
</style>
